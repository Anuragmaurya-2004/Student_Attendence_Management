const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, unique: true, trim: true }, // e.g. "2025-2026"
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AcademicYear', academicYearSchema);
