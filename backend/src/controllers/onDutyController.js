const Joi = require('joi');
const OnDuty = require('../models/OnDuty');
const Student = require('../models/Student');
const AcademicYear = require('../models/AcademicYear');
const { applyOnDutyToSessions, removeOnDutyAttendance } = require('../services/onDutyService');

const onDutySchema = Joi.object({
  classBatch: Joi.string().hex().length(24).optional().allow(null, ''),
  students: Joi.array().items(Joi.string().hex().length(24)).min(1).required(),
  activityType: Joi.string()
    .valid('industrial_visit', 'sports', 'cultural', 'hackathon_tech', 'nss_ncc', 'college_event', 'other')
    .required(),
  eventTitle: Joi.string().trim().min(2).required(),
  fromDate: Joi.date().iso().required(),
  toDate: Joi.date().iso().min(Joi.ref('fromDate')).required().messages({
    'date.min': 'To Date must be equal to or after From Date',
  }),
  remarks: Joi.string().allow('', null).optional(),
});

// @desc Create a multi-day On-Duty / Activity Attendance grant
// @route POST /api/onduty
const createOnDuty = async (req, res) => {
  const { error, value } = onDutySchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join(', ') });
  }

  const { classBatch, students: studentIds, activityType, eventTitle, fromDate, toDate, remarks } = value;

  // Find active academic year
  const activeYear = await AcademicYear.findOne({ isActive: true });

  const onDuty = await OnDuty.create({
    academicYear: activeYear?._id,
    classBatch: classBatch || undefined,
    students: studentIds,
    activityType,
    eventTitle,
    fromDate,
    toDate,
    status: 'approved',
    approvedBy: req.user.id,
    remarks,
  });

  // Automatically apply On-Duty to sessions falling in this multi-day date range
  const { sessionsCount, attendanceMarked } = await applyOnDutyToSessions({
    onDutyId: onDuty._id,
    studentIds,
    fromDate,
    toDate,
    eventTitle,
    markedBy: req.user.id,
  });

  const populated = await OnDuty.findById(onDuty._id)
    .populate('students', 'name rollNo email')
    .populate('classBatch', 'name')
    .populate('approvedBy', 'name');

  res.status(201).json({
    message: `On-Duty granted successfully. ${attendanceMarked} attendance records updated across ${sessionsCount} sessions.`,
    onDuty: populated,
    stats: { sessionsCount, attendanceMarked },
  });
};

// @desc Get all On-Duty records with optional filters
// @route GET /api/onduty
const getAllOnDuty = async (req, res) => {
  const filter = {};
  if (req.query.classBatch) filter.classBatch = req.query.classBatch;
  if (req.query.activityType) filter.activityType = req.query.activityType;
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;

  const records = await OnDuty.find(filter)
    .populate('students', 'name rollNo email')
    .populate('classBatch', 'name')
    .populate('approvedBy', 'name')
    .sort({ fromDate: -1 });

  res.json(records);
};

// @desc Get On-Duty records for a specific student
// @route GET /api/onduty/student/:studentId
const getStudentOnDuty = async (req, res) => {
  if (req.user.role === 'student' && req.user.id !== req.params.studentId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const records = await OnDuty.find({ students: req.params.studentId })
    .populate('classBatch', 'name')
    .populate('approvedBy', 'name')
    .sort({ fromDate: -1 });

  res.json(records);
};

// @desc Delete / revoke an On-Duty grant and revert attendance
// @route DELETE /api/onduty/:id
const deleteOnDuty = async (req, res) => {
  const onDuty = await OnDuty.findById(req.params.id);
  if (!onDuty) return res.status(404).json({ message: 'On-Duty record not found' });

  await removeOnDutyAttendance(onDuty._id);
  await OnDuty.findByIdAndDelete(req.params.id);

  res.json({ message: 'On-Duty grant revoked and linked attendance reverted.' });
};

module.exports = {
  createOnDuty,
  getAllOnDuty,
  getStudentOnDuty,
  deleteOnDuty,
};
