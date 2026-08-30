const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const Session = require('../models/Session');
const Holiday = require('../models/Holiday');

const QR_VALID_MINUTES = parseInt(process.env.QR_TOKEN_VALID_MINUTES || '10', 10);

// @desc Create a session (class/lab slot). Faculty/Admin only.
// @route POST /api/sessions
const createSession = async (req, res) => {
  const { course, classBatch, academicYear, date, startTime, endTime, type, durationHours } = req.body;

  // Prevent creating sessions on a holiday
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  const holiday = await Holiday.findOne({ date: { $gte: dayStart, $lte: dayEnd }, academicYear });
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

  session.qrToken = uuidv4();
  session.qrExpiresAt = new Date(Date.now() + QR_VALID_MINUTES * 60 * 1000);
  session.status = 'held';
  await session.save();

  // QR payload: sessionId + token, verified server-side on scan
  const payload = JSON.stringify({ sessionId: session._id.toString(), token: session.qrToken });
  const qrDataUrl = await QRCode.toDataURL(payload);

  res.json({
    qrDataUrl,
    qrToken: session.qrToken,
    expiresAt: session.qrExpiresAt,
  });
};

// @desc List sessions with filters
// @route GET /api/sessions
const listSessions = async (req, res) => {
  const filter = {};
  if (req.query.course) filter.course = req.query.course;
  if (req.query.classBatch) filter.classBatch = req.query.classBatch;
  if (req.query.faculty) filter.faculty = req.query.faculty;
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

module.exports = { createSession, generateSessionQR, listSessions, getSession };
