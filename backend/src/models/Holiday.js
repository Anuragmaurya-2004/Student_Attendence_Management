const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    name: { type: String, required: true, trim: true },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    // if empty, applies to ALL departments; else scoped to specific departments
    appliesToDepartments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
  },
  { timestamps: true }
);

holidaySchema.index({ date: 1, academicYear: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);
