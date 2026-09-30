import express from 'express';
import {
  sendNotification, getMyNotifications,
  markAsRead, markAllAsRead, getUnreadCount,
  getPreferences, updatePreferences,
} from '../controllers/notification.controller.js';

const router = express.Router();

// ── Internal (called by payment/course/auth services) ─────────
router.post('/internal/send',   sendNotification);

// ── User-facing notification feed ─────────────────────────────
router.get('/',                        getMyNotifications);    // Paginated feed + unreadCount
router.get('/unread-count',            getUnreadCount);
router.put('/read-all',                markAllAsRead);
router.put('/:notificationId/read',    markAsRead);

// ── Notification Preferences (Settings Page) ──────────────────
router.get('/preferences',             getPreferences);        // Get my preferences
router.put('/preferences',             updatePreferences);     // Update my preferences

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'notification-service' }));

export default router;
