import express from 'express';
import {
  sendNotification, getMyNotifications,
  markAsRead, markAllAsRead, getUnreadCount,
} from '../controllers/notification.controller.js';

const router = express.Router();

router.post('/internal/send', sendNotification);
router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/read-all', markAllAsRead);
router.put('/:notificationId/read', markAsRead);
router.get('/health/check', (req, res) => res.json({ status: 'ok' }));

export default router;
