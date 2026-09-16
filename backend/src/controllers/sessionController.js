const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const Session = require('../models/Session');
const Holiday = require('../models/Holiday');
const ClassBatch = require('../models/ClassBatch');
const Faculty = require('../models/Faculty');
const { DEFAULT_RADIUS_METERS, validateLocation } = require('../services/geofenceService');

const QR_VALID_SECONDS = parseInt(process.env.QR_TOKEN_VALID_SECONDS || '20', 10);
const QR_ROTATION_INTERVAL_SECONDS = parseInt(process.env.QR_ROTATION_INTERVAL_SECONDS || '15', 10);
const QR_GRACE_SECONDS = parseInt(process.env.QR_TOKEN_GRACE_SECONDS || '5', 10);

// @desc Create a session (class/lab slot). Faculty/Admin only.
// @route POST /api/sessions
const createSession = async (req, res) => {
  const { course, classBatch, academicYear, date, startTime, endTime, type, durationHours } = req.body;

  // Prevent creating sessions on a holiday for the same year and, when relevant, the same semester.
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const batch = await ClassBatch.findById(classBatch);
  if (!batch) return res.status(404).json({ message: 'Class batch not found' });

  if (req.user.role === 'faculty') {
    const faculty = await Faculty.findById(req.user.id).select('coursesAssigned classBatchesAssigned');
    const hasCourse = faculty?.coursesAssigned?.some((assignedCourse) => assignedCourse.toString() === course);
    const hasBatch = faculty?.classBatchesAssigned?.some((assignedBatch) => assignedBatch.toString() === classBatch);
    if (!hasCourse || !hasBatch) {
      return res.status(403).json({ message: 'You are not assigned to this subject and class.' });
    }
  }

  const semester = batch?.semester;
  const holidayQuery = {
    date: { $gte: dayStart, $lte: dayEnd },
    academicYear,
    $or: [{ semester: { $exists: false } }, { semester: null }],
  };
  if (semester) {
    holidayQuery.$or.push({ semester });
  }

  const holiday = await Holiday.findOne(holidayQuery);
  if (holiday) {
    return res.status(400).json({ message: `Cannot schedule session on a holiday: ${holiday.name}` });
  }

  const session = await Session.create({
    course,
    classBatch,
    academicYear,
    date,
    startTime,
    endTime,
    type,
    durationHours,
    faculty: req.user.id,
  });
  res.status(201).json(session);
};

// @desc (Re)generate a fresh QR token for a session, with expiry. Faculty only, must own session.
// @route POST /api/sessions/:id/qr
const generateSessionQR = async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) return res.status(404).json({ message: 'Session not found' });
  if (req.user.role === 'faculty' && session.faculty.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not your session' });
  }

  const now = Date.now();
  if (session.qrToken && session.qrExpiresAt) {
    session.qrPreviousToken = session.qrToken;
    session.qrPreviousExpiresAt = new Date(now + QR_GRACE_SECONDS * 1000);
  }
  session.qrToken = uuidv4();
  session.qrExpiresAt = new Date(now + QR_VALID_SECONDS * 1000);
  session.status = 'held';
  await session.save();

  // QR payload: sessionId + token, verified server-side on scan
  const payload = JSON.stringify({ sessionId: session._id.toString(), token: session.qrToken });
  const qrDataUrl = await QRCode.toDataURL(payload);

  res.json({
    qrDataUrl,
    qrToken: session.qrToken,
    expiresAt: session.qrExpiresAt,
    rotationIntervalSeconds: QR_ROTATION_INTERVAL_SECONDS,
  });
};

// @desc Set the classroom location used by QR self check-in for this batch.
// The setting lives on ClassBatch so every session for the same class uses one registered venue.
// @route PUT /api/sessions/:id/location
const updateSessionLocation = async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) return res.status(404).json({ message: 'Session not found' });
  if (req.user.role === 'faculty' && session.faculty.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not your session' });
  }

  const { latitude, longitude, radiusMeters } = req.body;
  const validationError = validateLocation({ latitude, longitude, radiusMeters });
  if (validationError) return res.status(400).json({ message: validationError });

  const batch = await ClassBatch.findByIdAndUpdate(
    session.classBatch,
    { classroom: { latitude: Number(latitude), longitude: Number(longitude), radiusMeters: Number(radiusMeters) || DEFAULT_RADIUS_METERS } },
    { new: true, runValidators: true }
  );
  res.json(batch.classroom);
};

// @desc List sessions with filters
// @route GET /api/sessions
const listSessions = async (req, res) => {
  const filter = {};
  if (req.query.course) filter.course = req.query.course;
  if (req.query.classBatch) filter.classBatch = req.query.classBatch;
  if (req.user.role === 'faculty') {
    filter.faculty = req.user.id;
  } else if (req.query.faculty) {
    filter.faculty = req.query.faculty;
  }
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }
  const sessions = await Session.find(filter)
    .populate('course classBatch faculty')
    .sort('-date');
  res.json(sessions);
};

const getSession = async (req, res) => {
  const session = await Session.findById(req.params.id).populate('course classBatch faculty');
  if (!session) return res.status(404).json({ message: 'Not found' });
  res.json(session);
};

module.exports = { createSession, generateSessionQR, updateSessionLocation, listSessions, getSession };
