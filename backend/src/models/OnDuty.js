const mongoose = require('mongoose');

const onDutySchema = new mongoose.Schema(
  {
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
    classBatch: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassBatch' },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true }],
    activityType: {
      type: String,
      enum: [
        'industrial_visit',
        'sports',
        'cultural',
        'hackathon_tech',
        'nss_ncc',
        'college_event',
        'other',
      ],
      default: 'other',
      required: true,
    },
    eventTitle: { type: String, required: true, trim: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'approved',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
    remarks: { type: String, trim: true },
  },
  { timestamps: true }
);

onDutySchema.index({ fromDate: 1, toDate: 1 });
onDutySchema.index({ students: 1 });

module.exports = mongoose.model('OnDuty', onDutySchema);
