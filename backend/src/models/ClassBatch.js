const mongoose = require('mongoose');

const classBatchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "CS-3A"
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    semester: { type: Number, required: true },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  },
  { timestamps: true }
);

classBatchSchema.index({ name: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('ClassBatch', classBatchSchema);
