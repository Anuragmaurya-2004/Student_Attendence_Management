const Notification = require('../models/Notification');

/**
 * Creates and saves a notification safely without throwing uncaught exceptions to caller
 */
const createNotification = async ({
  title,
  message,
  type = 'info',
  link = '',
  recipient,
  recipientModel,
  recipientRole = 'all',
  department,
  classBatch,
  metadata,
}) => {
  try {
    return await Notification.create({
      title,
      message,
      type,
      link,
      recipient,
      recipientModel,
      recipientRole,
      department,
      classBatch,
      metadata,
    });
  } catch (err) {
    console.error(`[NotificationService] Error creating notification "${title}":`, err.message);
    return null;
  }
};

/**
 * Creates notifications for multiple recipients in bulk safely
 */
const createBulkNotifications = async (notificationsArray) => {
  try {
    if (!notificationsArray || notificationsArray.length === 0) return [];
    return await Notification.insertMany(notificationsArray, { ordered: false });
  } catch (err) {
    console.error('[NotificationService] Error creating bulk notifications:', err.message);
    return [];
  }
};

module.exports = {
  createNotification,
  createBulkNotifications,
};
