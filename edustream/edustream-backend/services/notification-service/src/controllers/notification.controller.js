import { publishEvent } from '../../../../shared/utils/rabbitmq.js';
import Notification from '../models/Notification.js';
import NotificationPreference from '../models/NotificationPreference.js';
import { AppError } from '../../../../shared/middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../../../../shared/utils/apiResponse.js';

let io;
export const setIo = (socketIo) => { io = socketIo; };

// ── Branded HTML Email Template ────────────────────────────────
// WHY: A plain <p>message</p> email looks like spam and unprofessional.
// Real apps (Udemy, Coursera) send branded emails users trust.
// HOW: We build a reusable HTML template function. The subject and
// content are dynamic, but the brand header/footer are always consistent.
const buildEmailTemplate = ({ title, message, link, linkText = 'View on EduStream' }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #6c63ff, #3ecfcf); padding: 32px 40px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
    .header p  { margin: 4px 0 0; color: rgba(255,255,255,0.85); font-size: 13px; }
    .body { padding: 36px 40px; }
    .body h2 { margin: 0 0 12px; color: #1a1a2e; font-size: 20px; }
    .body p  { margin: 0 0 24px; color: #555; font-size: 15px; line-height: 1.6; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6c63ff, #3ecfcf); color: #fff !important; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; }
    .footer { background: #f9f9f9; padding: 20px 40px; text-align: center; border-top: 1px solid #eee; }
    .footer p { margin: 0; color: #aaa; font-size: 12px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🎓 EduStream</h1>
      <p>Learn. Grow. Achieve.</p>
    </div>
    <div class="body">
      <h2>${title}</h2>
      <p>${message}</p>
      ${link ? `<a href="${link}" class="btn">${linkText}</a>` : ''}
    </div>
    <div class="footer">
      <p>You received this because you have an EduStream account. &copy; ${new Date().getFullYear()} EduStream.</p>
    </div>
  </div>
</body>
</html>
`;

// ── Internal: Send Notification (called by other services) ─────
// This is the core engine. Other services (payment, course) call
// POST /notifications/internal/send to trigger notifications.
//
// FLOW:
// 1. Check user's preferences → should we send inApp? email?
// 2. Save to DB (if inApp is enabled)
// 3. Push real-time via Socket.io
// 4. Send branded HTML email (if email is enabled)
export const sendNotification = async (req, res, next) => {
  try {
    const { userId, type, title, message, data, email, link } = req.body;

    // ── Step 1: Check User Preferences ────────────────────────
    // Find this user's preference document (or use defaults if none set yet)
    let prefs = await NotificationPreference.findOne({ userId });
    if (!prefs) {
      // First notification for this user — create a default preference doc
      prefs = await NotificationPreference.create({ userId });
    }

    // Get the channel settings for this specific notification type
    // e.g., prefs.preferences.get('qa_reply') → { inApp: true, email: false }
    const channelPrefs = prefs.preferences.get(type) || { inApp: true, email: true };

    let notification = null;

    // ── Step 2: Save in-app notification to MongoDB ────────────
    if (channelPrefs.inApp) {
      notification = await Notification.create({ userId, type, message, data, link });

      // ── Step 3: Real-time push via Socket.io ─────────────────
      if (io) {
        io.to(userId.toString()).emit('notification', {
          id:        notification._id,
          type,
          message,
          link,
          data,
          createdAt: notification.createdAt,
        });
      }
    }

    // ── Step 4: Send Branded Email via RabbitMQ ───────────
    if (channelPrefs.email && email) {
      publishEvent('notification_events', 'email.send', {
        type: 'GENERAL_NOTIFICATION_EMAIL',
        data: {
          email,
          title: title || 'EduStream Notification',
          message,
          link,
          linkText: 'View on EduStream'
        }
      }).catch((err) => console.error('Failed to publish general notification event:', err.message));
    }

    return successResponse(res, HTTP_STATUS.CREATED, 'Notification sent', notification);
  } catch (err) { next(err); }
};

// ── Get My Notifications ───────────────────────────────────────
export const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Notification.countDocuments({ userId }),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return successResponse(res, HTTP_STATUS.OK, 'Notifications fetched', {
      notifications,
      unreadCount,
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (err) { next(err); }
};

// ── Mark as Read ───────────────────────────────────────────────
export const markAsRead = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );
    if (!notification) throw new AppError('Notification not found', 404);

    return successResponse(res, HTTP_STATUS.OK, 'Marked as read', notification);
  } catch (err) { next(err); }
};

// ── Mark All as Read ───────────────────────────────────────────
export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    await Notification.updateMany({ userId, isRead: false }, { isRead: true });
    return successResponse(res, HTTP_STATUS.OK, 'All marked as read');
  } catch (err) { next(err); }
};

// ── Unread Count ───────────────────────────────────────────────
export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const count = await Notification.countDocuments({ userId, isRead: false });
    return successResponse(res, HTTP_STATUS.OK, 'Unread count', { count });
  } catch (err) { next(err); }
};

// ── Get / Update Notification Preferences ─────────────────────
export const getPreferences = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    let prefs = await NotificationPreference.findOne({ userId });
    if (!prefs) prefs = await NotificationPreference.create({ userId });

    return successResponse(res, HTTP_STATUS.OK, 'Preferences fetched', {
      preferences: Object.fromEntries(prefs.preferences), // Convert Map → plain object
    });
  } catch (err) { next(err); }
};

export const updatePreferences = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const { preferences } = req.body; // e.g., { qa_reply: { inApp: true, email: false } }

    if (!preferences || typeof preferences !== 'object') {
      throw new AppError('preferences object is required', 400);
    }

    let prefs = await NotificationPreference.findOne({ userId });
    if (!prefs) prefs = await NotificationPreference.create({ userId });

    // Merge incoming changes with existing preferences
    Object.entries(preferences).forEach(([type, channels]) => {
      prefs.preferences.set(type, { ...prefs.preferences.get(type), ...channels });
    });

    await prefs.save();
    return successResponse(res, HTTP_STATUS.OK, 'Preferences updated', {
      preferences: Object.fromEntries(prefs.preferences),
    });
  } catch (err) { next(err); }
};
