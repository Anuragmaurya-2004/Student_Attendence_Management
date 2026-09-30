const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['warning', 'info', 'success', 'reminder'],
      default: 'info',
    },
    link: { type: String, default: '' },
    recipient: { type: mongoose.Schema.Types.ObjectId, refPath: 'recipientModel' },
    recipientModel: { type: String, enum: ['Faculty', 'Student'] },
    recipientRole: {
      type: String,
      enum: ['admin', 'faculty', 'student', 'all'],
      default: 'all',
    },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    classBatch: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassBatch' },
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, required: true },
        readAt: { type: Date, default: Date.now },
      },
    ],
    dismissedBy: [{ type: mongoose.Schema.Types.ObjectId }],
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, recipientRole: 1, createdAt: -1 });
notificationSchema.index({ department: 1, recipientRole: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
