const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const sessionSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
    classBatch: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassBatch', required: true },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // "10:00"
    endTime: { type: String, required: true }, // "11:00"
    type: { type: String, enum: ['theory', 'practical'], required: true },
    durationHours: { type: Number, required: true, default: 1 },
    status: { type: String, enum: ['scheduled', 'held', 'cancelled'], default: 'scheduled' },
    // QR check-in fields
    qrToken: { type: String, default: () => uuidv4(), unique: true },
    qrExpiresAt: { type: Date },
  },
  { timestamps: true }
);

sessionSchema.index({ classBatch: 1, date: 1 });

module.exports = mongoose.model('Session', sessionSchema);
