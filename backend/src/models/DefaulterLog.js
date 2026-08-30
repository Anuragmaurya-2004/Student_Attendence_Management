const mongoose = require('mongoose');

const defaulterLogSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    type: { type: String, enum: ['theory', 'practical'], required: true },
    attendancePercent: { type: Number, required: true },
    attendedHours: { type: Number, required: true },
    totalHeldHours: { type: Number, required: true },
    notifiedAt: { type: Date },
    channel: { type: String, enum: ['email', 'whatsapp', 'both', 'none'], default: 'none' },
  },
  { timestamps: true }
);

defaulterLogSchema.index({ student: 1, course: 1, type: 1, academicYear: 1 });

module.exports = mongoose.model('DefaulterLog', defaulterLogSchema);
