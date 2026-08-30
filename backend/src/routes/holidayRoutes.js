const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Holiday = require('../models/Holiday');

router.use(protect);

router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;
  const list = await Holiday.find(filter).sort('date');
  res.json(list);
});

router.post('/', authorize('admin'), async (req, res) => {
  const holiday = await Holiday.create(req.body);
  res.status(201).json(holiday);
});

router.put('/:id', authorize('admin'), async (req, res) => {
  const holiday = await Holiday.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(holiday);
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  await Holiday.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
