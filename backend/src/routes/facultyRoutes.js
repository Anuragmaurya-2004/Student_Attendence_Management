const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Faculty = require('../models/Faculty');

router.use(protect);

router.get('/', authorize('admin'), async (req, res) => {
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  const list = await Faculty.find(filter).populate('department coursesAssigned');
  res.json(list);
});

router.get('/:id', async (req, res) => {
  if (req.user.role === 'faculty' && req.user.id !== req.params.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const faculty = await Faculty.findById(req.params.id).populate('department coursesAssigned');
  if (!faculty) return res.status(404).json({ message: 'Not found' });
  res.json(faculty);
});

router.post('/', authorize('admin'), async (req, res) => {
  const faculty = await Faculty.create(req.body);
  res.status(201).json(faculty);
});

router.put('/:id', authorize('admin'), async (req, res) => {
  const faculty = await Faculty.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(faculty);
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  await Faculty.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
