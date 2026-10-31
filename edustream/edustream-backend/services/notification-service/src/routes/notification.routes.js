import express from 'express';
import {
  sendNotification, getMyNotifications,
  markAsRead, markAllAsRead, getUnreadCount,
  getPreferences, updatePreferences,
} from '../controllers/notification.controller.js';
import { verifyToken } from '../../../../shared/middlewares/auth.js';

const router = express.Router();

// ── Internal (called by payment/course/auth services) ─────────
router.post('/internal/send',   sendNotification);

// ── User-facing notification feed ─────────────────────────────
router.get('/',                        verifyToken, getMyNotifications);    // Paginated feed + unreadCount
router.get('/unread-count',            verifyToken, getUnreadCount);
router.put('/read-all',                verifyToken, markAllAsRead);
router.put('/:notificationId/read',    verifyToken, markAsRead);

// ── Notification Preferences (Settings Page) ──────────────────
router.get('/preferences',             verifyToken, getPreferences);        // Get my preferences
router.put('/preferences',             verifyToken, updatePreferences);     // Update my preferences

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'notification-service' }));

export default router;
