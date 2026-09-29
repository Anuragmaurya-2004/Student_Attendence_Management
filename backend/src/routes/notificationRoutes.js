const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');
const DefaulterLog = require('../models/DefaulterLog');
const { getDepartmentScope } = require('../utils/userScope');

router.use(protect);

// Helper to seed initial realistic notifications for user role if empty
const ensureInitialNotifications = async (user, deptScope) => {
  const existingCount = await Notification.countDocuments({
    $or: [
      { recipient: user.id },
      { recipientRole: user.role },
      { recipientRole: 'all' },
    ],
    dismissedBy: { $ne: user.id },
  });

  if (existingCount > 0) return;

  if (user.role === 'admin') {
    const defaulterCount = await DefaulterLog.countDocuments();
    await Notification.create([
      {
        title: 'Defaulter Alert',
        message: `${defaulterCount || 4} students are currently below the 75% attendance threshold.`,
        type: 'warning',
        link: '/admin/defaulters',
        recipientRole: 'admin',
        department: deptScope || undefined,
      },
      {
        title: 'On-Duty Application Submitted',
        message: 'Multi-day On-Duty permission active for technical competitions & sports.',
        type: 'info',
        link: '/admin/onduty',
        recipientRole: 'admin',
        department: deptScope || undefined,
      },
      {
        title: 'System Telemetry Synced',
        message: 'Daily attendance logs verified across department class batches.',
        type: 'success',
        link: '/admin',
        recipientRole: 'admin',
      },
    ]);
  } else if (user.role === 'faculty') {
    await Notification.create([
      {
        title: 'Upcoming Lecture Session',
        message: 'Check your assigned class sessions and QR attendance monitors for today.',
        type: 'reminder',
        link: '/faculty',
        recipientRole: 'faculty',
      },
      {
        title: 'On-Duty Exemption Credited',
        message: 'Institutional On-Duty credits have been approved and applied to student sessions.',
        type: 'info',
        link: '/faculty/onduty',
        recipientRole: 'faculty',
      },
      {
        title: 'Class Defaulter Roster Updated',
        message: 'Attendance percentages recalculated for current semester term.',
        type: 'warning',
        link: user.classTeacherOf?.length > 0 ? '/faculty/my-class' : '/faculty/defaulters',
        recipientRole: 'faculty',
      },
    ]);
  } else if (user.role === 'student') {
    await Notification.create([
      {
        title: 'Attendance Recorded',
        message: 'Your check-in has been verified and recorded for recent lecture sessions.',
        type: 'success',
        link: '/student',
        recipient: user.id,
        recipientRole: 'student',
      },
      {
        title: 'On-Duty Grant Status',
        message: 'Official attendance exemptions and university sports credits logged.',
        type: 'info',
        link: '/student',
        recipient: user.id,
        recipientRole: 'student',
      },
      {
        title: 'Safe-Skip Buffer Updated',
        message: 'Monitor your attendance percentage to stay comfortably above the 75% requirement.',
        type: 'reminder',
        link: '/student',
        recipient: user.id,
        recipientRole: 'student',
      },
    ]);
  }
};

// GET /api/notifications
router.get('/', async (req, res) => {
  const deptScope = getDepartmentScope(req);
  await ensureInitialNotifications(req.user, deptScope);

  const query = {
    $and: [
      {
        $or: [
          { recipient: req.user.id },
          { recipientRole: req.user.role },
          { recipientRole: 'all' },
        ],
      },
      {
        $or: [
          { department: { $exists: false } },
          { department: null },
          ...(deptScope ? [{ department: deptScope }] : []),
        ],
      },
      {
        dismissedBy: { $ne: req.user.id },
      },
    ],
  };

  const list = await Notification.find(query).sort({ createdAt: -1 }).limit(30);

  const formatted = list.map((item) => {
    const isRead = (item.readBy || []).some(
      (r) => r.user && r.user.toString() === req.user.id
    );
    return {
      id: item._id.toString(),
      title: item.title,
      message: item.message,
      type: item.type,
      link: item.link || '',
      read: isRead,
      createdAt: item.createdAt,
    };
  });

  res.json(formatted);
});

// PUT /api/notifications/:id/read - Mark single as read
router.put('/:id/read', async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) return res.status(404).json({ message: 'Notification not found' });

  const alreadyRead = (notification.readBy || []).some(
    (r) => r.user && r.user.toString() === req.user.id
  );
  if (!alreadyRead) {
    notification.readBy.push({ user: req.user.id, readAt: new Date() });
    await notification.save();
  }

  res.json({ success: true, message: 'Notification marked as read' });
});

// PUT /api/notifications/mark-all-read - Mark all as read
router.put('/mark-all-read', async (req, res) => {
  const deptScope = getDepartmentScope(req);
  const query = {
    $or: [
      { recipient: req.user.id },
      { recipientRole: req.user.role },
      { recipientRole: 'all' },
    ],
    dismissedBy: { $ne: req.user.id },
  };

  if (deptScope) {
    query.$or.push({ department: deptScope });
  }

  await Notification.updateMany(
    {
      ...query,
      'readBy.user': { $ne: req.user.id },
    },
    {
      $push: { readBy: { user: req.user.id, readAt: new Date() } },
    }
  );

  res.json({ success: true, message: 'All notifications marked as read' });
});

// DELETE /api/notifications/:id - Dismiss notification
router.delete('/:id', async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) return res.status(404).json({ message: 'Notification not found' });

  if (!notification.dismissedBy.includes(req.user.id)) {
    notification.dismissedBy.push(req.user.id);
    await notification.save();
  }

  res.json({ success: true, message: 'Notification dismissed' });
});

module.exports = router;
