const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    semester: { type: Number, required: true },
    type: { type: String, enum: ['theory', 'practical'], required: true },
    weeklyHours: { type: Number, required: true, default: 1 },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    defaulterThresholdPercent: { type: Number, default: 75 }, // override global default per course if needed
  },
  { timestamps: true }
);

courseSchema.index({ code: 1, type: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('Course', courseSchema);
