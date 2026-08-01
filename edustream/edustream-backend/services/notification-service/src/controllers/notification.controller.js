import nodemailer from 'nodemailer';
import Notification from '../models/Notification.js';
import { AppError } from '../../../../shared/middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../../../../shared/utils/apiResponse.js';

let io;
export const setIo = (socketIo) => { io = socketIo; };

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// ── Internal: Send Notification (called by other services) ────
export const sendNotification = async (req, res, next) => {
  try {
    const { userId, type, message, data, email } = req.body;

    // DB mein save karo
    const notification = await Notification.create({ userId, type, message, data });

    // Socket.io se real-time notification
    if (io) {
      io.to(userId.toString()).emit('notification', {
        id: notification._id, type, message, data, createdAt: notification.createdAt,
      });
    }

    // Email bhi bhejo agar email diya hai
    if (email) {
      transporter.sendMail({
        from: `"EduStream" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'EduStream Notification',
        html: `<p>${message}</p>`,
      }).catch(console.error);
    }

    return successResponse(res, HTTP_STATUS.CREATED, 'Notification sent', notification);
  } catch (err) { next(err); }
};

// ── Get My Notifications ───────────────────────────────────────
export const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);
    return successResponse(res, HTTP_STATUS.OK, 'Notifications fetched', notifications);
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
