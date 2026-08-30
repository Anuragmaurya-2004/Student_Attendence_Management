const express = require('express');
const multer = require('multer');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Student = require('../models/Student');
const { importStudents, downloadTemplate } = require('../controllers/studentImportController');

// Memory storage - files are small (student lists) and only need to be
// parsed in-memory by ExcelJS, never written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(xlsx|xls|csv)$/i;
    if (!allowed.test(file.originalname)) {
      return cb(new Error('Only .xlsx, .xls or .csv files are allowed'));
    }
    cb(null, true);
  },
});

router.use(protect);

// List students (admin/faculty) - filter by classBatch, department, academicYear
router.get('/', authorize('admin', 'faculty'), async (req, res) => {
  const filter = {};
  if (req.query.classBatch) filter.classBatch = req.query.classBatch;
  if (req.query.department) filter.department = req.query.department;
  if (req.query.academicYear) filter.currentAcademicYear = req.query.academicYear;
  if (req.query.status) filter.status = req.query.status;
  const students = await Student.find(filter).populate('department classBatch currentAcademicYear');
  res.json(students);
});

// Get single student
router.get('/:id', async (req, res) => {
  // students can only view themselves; faculty/admin can view anyone
  if (req.user.role === 'student' && req.user.id !== req.params.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const student = await Student.findById(req.params.id).populate('department classBatch currentAcademicYear');
  if (!student) return res.status(404).json({ message: 'Not found' });
  res.json(student);
});

// Create student (admin only)
router.post('/', authorize('admin'), async (req, res) => {
  const student = await Student.create(req.body);
  res.status(201).json(student);
});

// Bulk create students from raw JSON (admin only) - expects { students: [...] }
// NOTE: uses individual .save() calls, not insertMany. insertMany() skips
// Mongoose's pre('save') middleware, which is what hashes the password - an
// insertMany-based bulk insert would have stored every bulk-created
// student's password in PLAIN TEXT. .save() runs the hook correctly, and
// also lets one bad row fail without aborting the whole batch.
router.post('/bulk', authorize('admin'), async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ message: '"students" array is required' });
  }

  const results = { created: 0, failed: 0, rows: [] };
  for (const [idx, data] of students.entries()) {
    try {
      const student = new Student(data);
      await student.save();
      results.created += 1;
      results.rows.push({ index: idx, status: 'created', id: student._id });
    } catch (err) {
      results.failed += 1;
      results.rows.push({
        index: idx,
        status: 'failed',
        message: err.code === 11000 ? 'Duplicate roll number or email' : err.message,
      });
    }
  }
  res.status(207).json(results);
});

// Bulk import students from an uploaded Excel/CSV file (admin only).
// Lets a university onboard an entire class in one upload instead of
// adding students one by one.
router.post('/import', authorize('admin'), upload.single('file'), importStudents);
router.get('/import/template', authorize('admin'), downloadTemplate);

// Update student
router.put('/:id', authorize('admin'), async (req, res) => {
  const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(student);
});

// Delete student
router.delete('/:id', authorize('admin'), async (req, res) => {
  await Student.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
