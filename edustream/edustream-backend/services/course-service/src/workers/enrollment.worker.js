import { getRabbitChannel, subscribeFallbackEvent } from '../../../../shared/utils/rabbitmq.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';

export const handleEnrollmentPayload = async (payload) => {
  const { userId, courseId, paymentId, amount } = payload || {};
  if (!userId || !courseId) return;

  // ── Idempotency Check ──
  const existing = await Enrollment.findOne({ userId, courseId });
  if (!existing) {
    await Enrollment.create({ userId, courseId, paymentId, amount });
    await Course.findByIdAndUpdate(courseId, { $inc: { enrolledCount: 1 } });
    console.log(`✅ Successfully enrolled user ${userId} in course ${courseId}`);
  } else {
    console.log(`ℹ️ User ${userId} is already enrolled in course ${courseId}. Skipping...`);
  }
};

export const startEnrollmentWorker = async () => {
  const channel = getRabbitChannel();

  if (channel) {
    console.log('🎓 Enrollment Worker started, listening for payment events on RabbitMQ...');
    channel.consume('enrollment_queue', async (msg) => {
      if (msg !== null) {
        try {
          const payload = JSON.parse(msg.content.toString());
          await handleEnrollmentPayload(payload);
          channel.ack(msg);
        } catch (error) {
          console.error('❌ Failed to process enrollment event:', error.message);
          channel.ack(msg);
        }
      }
    });
  } else {
    console.log('🎓 Enrollment Worker started, listening via in-process EventBus fallback (payment.successful)...');
    subscribeFallbackEvent('payment.successful', async (payload) => {
      try {
        await handleEnrollmentPayload(payload);
      } catch (err) {
        console.error('❌ In-process enrollment failed:', err.message);
      }
    });
  }
};

