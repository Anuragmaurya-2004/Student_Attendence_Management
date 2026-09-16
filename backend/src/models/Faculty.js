const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const facultySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    designation: { type: String, default: 'Assistant Professor', trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    coursesAssigned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    classBatchesAssigned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClassBatch' }],
    role: { type: String, enum: ['faculty', 'admin'], default: 'faculty' },
    mustChangePassword: { type: Boolean, default: false },
    passwordChangedAt: { type: Date },
  },
  { timestamps: true }
);

facultySchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

facultySchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Faculty', facultySchema);
