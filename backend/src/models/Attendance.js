const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' },
    method: { type: String, enum: ['qr', 'manual'], default: 'qr' },
    markedAt: { type: Date, default: Date.now },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' }, // set when manually marked
  },
  { timestamps: true }
);

// A student can only have one attendance record per session
attendanceSchema.index({ session: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
