import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId:  { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    type:    { type: String, required: true }, // enrollment, payment_success, course_update, qa_reply
    message: { type: String, required: true },
    data:    { type: mongoose.Schema.Types.Mixed, default: {} }, // extra info
    link:    { type: String, default: null },   // e.g., "/courses/abc123" — clickable notification
    isRead:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for fast unread-count queries per user
notificationSchema.index({ userId: 1, isRead: 1 });

// ── TTL Index: Auto-delete READ notifications older than 90 days ──
// MongoDB runs a background cleanup job every 60 seconds.
// This is a ZERO-CODE way to prevent collection bloat.
// Only deletes when isRead=true (unread ones are preserved forever).
notificationSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 90 * 24 * 60 * 60, // 90 days in seconds
    partialFilterExpression: { isRead: true }, // Only expire READ notifications
  }
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
