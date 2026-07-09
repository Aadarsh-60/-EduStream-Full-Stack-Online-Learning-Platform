import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId:  { type: mongoose.Schema.Types.ObjectId, required: true },
    type:    { type: String, required: true }, // enrollment, payment_success, etc.
    message: { type: String, required: true },
    data:    { type: mongoose.Schema.Types.Mixed, default: {} }, // extra info
    isRead:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
