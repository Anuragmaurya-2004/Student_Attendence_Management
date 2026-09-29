const express = require('express');
const multer = require('multer');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Department = require('../models/Department');
const AcademicYear = require('../models/AcademicYear');
const Course = require('../models/Course');
const ClassBatch = require('../models/ClassBatch');
const Notification = require('../models/Notification');
const { importCourses, downloadTemplate } = require('../controllers/courseImportController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(xlsx|xls|csv)$/i;
    if (!allowed.test(file.originalname)) {
      return cb(new Error('Only .xlsx, .xls or .csv files are allowed'));
    }
    cb(null, true);
  },
});

router.use(protect);

/* ---------------- Departments ---------------- */
router.get('/departments', async (req, res) => {
  const list = await Department.find().sort('name');
  res.json(list);
});
router.post('/departments', authorize('admin'), async (req, res) => {
  const dept = await Department.create(req.body);
  try {
    await Notification.create({
      title: 'Department Created',
      message: `Department "${dept.name}" (${dept.code}) was created successfully.`,
      type: 'success',
      link: '/admin/setup',
      recipient: req.user.id,
      recipientRole: 'admin',
    });
  } catch (notifErr) {
    console.error('Failed to create department notification:', notifErr);
  }
  res.status(201).json(dept);
});
router.put('/departments/:id', authorize('admin'), async (req, res) => {
  const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(dept);
});
router.delete('/departments/:id', authorize('admin'), async (req, res) => {
  await Department.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

/* ---------------- Academic Years ---------------- */
router.get('/academic-years', async (req, res) => {
  const list = await AcademicYear.find().sort('-startDate');
  res.json(list);
});
router.post('/academic-years', authorize('admin'), async (req, res) => {
  const year = await AcademicYear.create(req.body);
  res.status(201).json(year);
});
router.put('/academic-years/:id/activate', authorize('admin'), async (req, res) => {
  // Deactivate all others, activate this one
  await AcademicYear.updateMany({}, { isActive: false });
  const year = await AcademicYear.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
  res.json(year);
});

const { getDepartmentScope } = require('../utils/userScope');
const Faculty = require('../models/Faculty');

/* ---------------- Courses ---------------- */
router.get('/courses', async (req, res) => {
  const filter = {};
  const deptScope = getDepartmentScope(req);
  if (deptScope) {
    filter.department = deptScope;
  } else if (req.query.department) {
    filter.department = req.query.department;
  }
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;
  if (req.query.type) filter.type = req.query.type;
  const list = await Course.find(filter).populate('department academicYear');
  res.json(list);
});
router.post('/courses', authorize('admin'), async (req, res) => {
  const deptScope = getDepartmentScope(req);
  const data = { ...req.body };
  if (deptScope) data.department = deptScope;
  const course = await Course.create(data);
  try {
    await Notification.create({
      title: 'New Course Added',
      message: `Course "${course.name}" (${course.code}) was added to Semester ${course.semester}.`,
      type: 'success',
      link: '/admin/setup',
      recipient: req.user.id,
      recipientRole: 'admin',
    });
  } catch (notifErr) {
    console.error('Failed to create course notification:', notifErr);
  }
  res.status(201).json(course);
});
router.post('/courses/import', authorize('admin'), upload.single('file'), importCourses);
router.get('/courses/import/template', authorize('admin'), downloadTemplate);
router.put('/courses/:id', authorize('admin'), async (req, res) => {
  const deptScope = getDepartmentScope(req);
  const existing = await Course.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Course not found' });
  if (deptScope && existing.department.toString() !== deptScope) {
    return res.status(403).json({ message: 'Forbidden: You can only edit courses in your department.' });
  }
  const data = { ...req.body };
  if (deptScope) data.department = deptScope;
  const course = await Course.findByIdAndUpdate(req.params.id, data, { new: true });
  res.json(course);
});
router.delete('/courses/:id', authorize('admin'), async (req, res) => {
  const deptScope = getDepartmentScope(req);
  const existing = await Course.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Course not found' });
  if (deptScope && existing.department.toString() !== deptScope) {
    return res.status(403).json({ message: 'Forbidden: You can only delete courses in your department.' });
  }
  await Course.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

/* ---------------- Class Batches ---------------- */
router.get('/class-batches', async (req, res) => {
  const filter = {};
  const deptScope = getDepartmentScope(req);
  if (deptScope) {
    filter.department = deptScope;
  } else if (req.query.department) {
    filter.department = req.query.department;
  }
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;
  const list = await ClassBatch.find(filter)
    .populate('department academicYear')
    .populate('classTeacher', 'name email designation');
  res.json(list);
});
router.post('/class-batches', authorize('admin'), async (req, res) => {
  const deptScope = getDepartmentScope(req);
  const data = { ...req.body };
  if (deptScope) data.department = deptScope;
  const batch = await ClassBatch.create(data);
  if (batch.classTeacher) {
    await Faculty.findByIdAndUpdate(batch.classTeacher, {
      $addToSet: { classTeacherOf: batch._id, classBatchesAssigned: batch._id },
    });
    try {
      await Notification.create({
        title: 'Class Teacher Appointment',
        message: `You have been appointed as the Class Teacher for cohort ${batch.name}. You now have master all-subject attendance view for this cohort.`,
        type: 'info',
        link: '/faculty/my-class',
        recipient: batch.classTeacher,
        recipientModel: 'Faculty',
        recipientRole: 'faculty',
      });
    } catch (notifErr) {
      console.error('Failed to notify appointed class teacher:', notifErr);
    }
  }
  try {
    await Notification.create({
      title: 'Class Batch Created',
      message: `Class batch "${batch.name}" (Semester ${batch.semester || ''}) was added to the academic structure.`,
      type: 'success',
      link: '/admin/setup',
      recipient: req.user.id,
      recipientRole: 'admin',
    });
  } catch (notifErr) {
    console.error('Failed to notify batch creator:', notifErr);
  }
  const populated = await ClassBatch.findById(batch._id)
    .populate('department academicYear')
    .populate('classTeacher', 'name email designation');
  res.status(201).json(populated);
});
router.put('/class-batches/:id', authorize('admin'), async (req, res) => {
  const deptScope = getDepartmentScope(req);
  const existing = await ClassBatch.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Class batch not found' });
  if (deptScope && existing.department.toString() !== deptScope) {
    return res.status(403).json({ message: 'Forbidden: You can only manage batches in your department.' });
  }
  const data = { ...req.body };
  if (deptScope) data.department = deptScope;

  const previousTeacher = existing.classTeacher;
  const batch = await ClassBatch.findByIdAndUpdate(req.params.id, data, { new: true })
    .populate('department academicYear')
    .populate('classTeacher', 'name email designation');

  if (previousTeacher && String(previousTeacher) !== String(batch.classTeacher?._id || batch.classTeacher)) {
    await Faculty.findByIdAndUpdate(previousTeacher, { $pull: { classTeacherOf: batch._id } });
  }
  if (batch.classTeacher) {
    await Faculty.findByIdAndUpdate(batch.classTeacher, {
      $addToSet: { classTeacherOf: batch._id, classBatchesAssigned: batch._id },
    });
    if (String(previousTeacher) !== String(batch.classTeacher?._id || batch.classTeacher)) {
      try {
        await Notification.create({
          title: 'Class Teacher Appointment',
          message: `You have been appointed as the Class Teacher for cohort ${batch.name}. You now have master all-subject attendance view for this cohort.`,
          type: 'info',
          link: '/faculty/my-class',
          recipient: batch.classTeacher._id || batch.classTeacher,
          recipientModel: 'Faculty',
          recipientRole: 'faculty',
        });
      } catch (notifErr) {
        console.error('Failed to notify appointed class teacher on update:', notifErr);
      }
    }
  }
  res.json(batch);
});
router.delete('/class-batches/:id', authorize('admin'), async (req, res) => {
  const deptScope = getDepartmentScope(req);
  const existing = await ClassBatch.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Class batch not found' });
  if (deptScope && existing.department.toString() !== deptScope) {
    return res.status(403).json({ message: 'Forbidden: You can only delete batches in your department.' });
  }
  if (existing.classTeacher) {
    await Faculty.findByIdAndUpdate(existing.classTeacher, { $pull: { classTeacherOf: existing._id } });
  }
  await ClassBatch.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
