const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rollNo: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    parentEmail: { type: String, trim: true, lowercase: true },
    parentPhone: { type: String, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    classBatch: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassBatch', required: true },
    academicYearJoined: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    currentAcademicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    status: { type: String, enum: ['active', 'promoted', 'passed_out', 'dropped'], default: 'active' },
    // history of past class/academic-year assignments, preserved across rollovers
    history: [
      {
        academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
        classBatch: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassBatch' },
        semester: Number,
      },
    ],
    role: { type: String, default: 'student', immutable: true },
  },
  { timestamps: true }
);

studentSchema.index({ rollNo: 1, currentAcademicYear: 1 }, { unique: true });

studentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

studentSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Student', studentSchema);
