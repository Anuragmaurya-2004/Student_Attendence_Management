const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Student = require('../models/Student');

// @desc Student scans QR to mark their own attendance
// @route POST /api/attendance/check-in
// body: { sessionId, token }
const checkIn = async (req, res) => {
  const { sessionId, token } = req.body;
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can self check-in via QR' });
  }

  const session = await Session.findById(sessionId);
  if (!session) return res.status(404).json({ message: 'Session not found' });

  if (session.qrToken !== token) {
    return res.status(400).json({ message: 'Invalid QR code' });
  }
  if (!session.qrExpiresAt || session.qrExpiresAt.getTime() < Date.now()) {
    return res.status(400).json({ message: 'QR code has expired. Ask faculty to refresh it.' });
  }

  // Ensure student belongs to this session's class batch
  const student = await Student.findById(req.user.id);
  if (student.classBatch.toString() !== session.classBatch.toString()) {
    return res.status(403).json({ message: 'You are not part of this class/batch' });
  }

  try {
    const attendance = await Attendance.create({
      session: sessionId,
      student: req.user.id,
      status: 'present',
      method: 'qr',
    });
    res.status(201).json(attendance);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Attendance already marked for this session' });
    }
    throw err;
  }
};

// @desc Faculty manually marks/updates attendance for a student in a session
// @route POST /api/attendance/manual
// body: { sessionId, studentId, status }
const markManual = async (req, res) => {
  const { sessionId, studentId, status } = req.body;
  const session = await Session.findById(sessionId);
  if (!session) return res.status(404).json({ message: 'Session not found' });
  if (req.user.role === 'faculty' && session.faculty.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not your session' });
  }

  const attendance = await Attendance.findOneAndUpdate(
    { session: sessionId, student: studentId },
    { status: status || 'present', method: 'manual', markedBy: req.user.id, markedAt: new Date() },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  res.json(attendance);
};

// @desc Bulk mark attendance for a session (e.g. faculty marks whole class at once)
// @route POST /api/attendance/bulk
// body: { sessionId, records: [{ studentId, status }] }
const markBulk = async (req, res) => {
  const { sessionId, records } = req.body;
  const session = await Session.findById(sessionId);
  if (!session) return res.status(404).json({ message: 'Session not found' });
  if (req.user.role === 'faculty' && session.faculty.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not your session' });
  }

  const ops = records.map((r) => ({
    updateOne: {
      filter: { session: sessionId, student: r.studentId },
      update: {
        $set: {
          status: r.status || 'present',
          method: 'manual',
          markedBy: req.user.id,
          markedAt: new Date(),
        },
      },
      upsert: true,
    },
  }));
  const result = await Attendance.bulkWrite(ops);
  res.json({ message: 'Bulk attendance saved', result });
};

// @desc Get attendance records for a session
// @route GET /api/attendance/session/:sessionId
const getBySession = async (req, res) => {
  const records = await Attendance.find({ session: req.params.sessionId }).populate('student', 'name rollNo email');
  res.json(records);
};

// @desc Get attendance history for a student
// @route GET /api/attendance/student/:studentId
const getByStudent = async (req, res) => {
  if (req.user.role === 'student' && req.user.id !== req.params.studentId) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const records = await Attendance.find({ student: req.params.studentId })
    .populate({ path: 'session', populate: { path: 'course classBatch' } })
    .sort('-markedAt');
  res.json(records);
};

module.exports = { checkIn, markManual, markBulk, getBySession, getByStudent };
