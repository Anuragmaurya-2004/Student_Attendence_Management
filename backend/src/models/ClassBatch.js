const mongoose = require('mongoose');

const classBatchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "CS-3A"
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    semester: { type: Number, required: true },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    classroom: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
      radiusMeters: { type: Number, min: 1 },
    },
  },
  { timestamps: true }
);

classBatchSchema.index({ name: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('ClassBatch', classBatchSchema);
