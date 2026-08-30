const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Department = require('../models/Department');
const AcademicYear = require('../models/AcademicYear');
const Course = require('../models/Course');
const ClassBatch = require('../models/ClassBatch');

router.use(protect);

/* ---------------- Departments ---------------- */
router.get('/departments', async (req, res) => {
  const list = await Department.find().sort('name');
  res.json(list);
});
router.post('/departments', authorize('admin'), async (req, res) => {
  const dept = await Department.create(req.body);
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

/* ---------------- Courses ---------------- */
router.get('/courses', async (req, res) => {
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;
  if (req.query.type) filter.type = req.query.type;
  const list = await Course.find(filter).populate('department academicYear');
  res.json(list);
});
router.post('/courses', authorize('admin'), async (req, res) => {
  const course = await Course.create(req.body);
  res.status(201).json(course);
});
router.put('/courses/:id', authorize('admin'), async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(course);
});
router.delete('/courses/:id', authorize('admin'), async (req, res) => {
  await Course.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

/* ---------------- Class Batches ---------------- */
router.get('/class-batches', async (req, res) => {
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;
  const list = await ClassBatch.find(filter).populate('department academicYear');
  res.json(list);
});
router.post('/class-batches', authorize('admin'), async (req, res) => {
  const batch = await ClassBatch.create(req.body);
  res.status(201).json(batch);
});
router.put('/class-batches/:id', authorize('admin'), async (req, res) => {
  const batch = await ClassBatch.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(batch);
});
router.delete('/class-batches/:id', authorize('admin'), async (req, res) => {
  await ClassBatch.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
