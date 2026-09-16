const express = require('express');
const multer = require('multer');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Holiday = require('../models/Holiday');
const AcademicYear = require('../models/AcademicYear');
const { importHolidays, downloadTemplate } = require('../controllers/holidayImportController');

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

router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;

  if (req.query.semester) {
    const value = req.query.semester.toString().toLowerCase();
    if (value === 'odd') {
      filter.semester = { $in: [1, 3, 5, 7] };
    } else if (value === 'even') {
      filter.semester = { $in: [2, 4, 6, 8] };
    } else {
      filter.semester = Number(value);
    }
  }

  const list = await Holiday.find(filter).sort('date');
  res.json(list);
});

router.post('/', authorize('admin'), async (req, res) => {
  const payload = { ...req.body };
  if (payload.semester === '' || payload.semester === null || payload.semester === undefined) {
    payload.semester = null;
  } else {
    payload.semester = Number(payload.semester);
  }
  const holiday = await Holiday.create(payload);
  res.status(201).json(holiday);
});

router.post('/bulk-sundays', authorize('admin'), async (req, res) => {
  const { academicYear, semester } = req.body;
  if (!academicYear) {
    return res.status(400).json({ message: 'Academic year is required.' });
  }

  const year = await AcademicYear.findById(academicYear);
  if (!year) {
    return res.status(404).json({ message: 'Academic year not found.' });
  }

  const selectedSemester = semester && Number(semester) > 0 ? Number(semester) : null;
  const start = new Date(year.startDate);
  const end = new Date(year.endDate);
  const created = [];
  const existingDates = new Set();

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const current = new Date(cursor);
    if (current.getDay() !== 0) continue;

    const dateKey = new Date(current.getFullYear(), current.getMonth(), current.getDate()).toISOString();
    if (existingDates.has(dateKey)) continue;

    const existing = await Holiday.findOne({
      academicYear,
      semester: selectedSemester,
      date: new Date(current.getFullYear(), current.getMonth(), current.getDate()),
    });
    if (existing) {
      existingDates.add(dateKey);
      continue;
    }

    const holiday = await Holiday.create({
      date: current,
      name: 'Sunday',
      academicYear,
      semester: selectedSemester,
    });
    created.push(holiday);
    existingDates.add(dateKey);
  }

  res.status(201).json({ created: created.length, academicYear: year.label, semester: selectedSemester || 'all' });
});

router.post('/import', authorize('admin'), upload.single('file'), importHolidays);
router.get('/import/template', authorize('admin'), downloadTemplate);

router.put('/:id', authorize('admin'), async (req, res) => {
  const holiday = await Holiday.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(holiday);
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  await Holiday.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
