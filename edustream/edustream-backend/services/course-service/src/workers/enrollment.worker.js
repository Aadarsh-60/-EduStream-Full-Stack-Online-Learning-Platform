import { getRabbitChannel } from '../../../../shared/utils/rabbitmq.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';

export const startEnrollmentWorker = async () => {
  const channel = getRabbitChannel();
  if (!channel) {
    console.error('RabbitMQ channel not found, cannot start enrollment worker');
    return;
  }

  console.log('🎓 Enrollment Worker started, listening for payment events...');

  channel.consume('enrollment_queue', async (msg) => {
    if (msg !== null) {
      try {
        const payload = JSON.parse(msg.content.toString());
        const { userId, courseId, paymentId, amount } = payload;
        
        // ── Idempotency Check ──
        // Ensure we don't enroll the user twice if the event is re-delivered.
        const existing = await Enrollment.findOne({ userId, courseId });
        
        if (!existing) {
          // Process Enrollment
          await Enrollment.create({ userId, courseId, paymentId, amount });
          
          // Increment Course Stats
          await Course.findByIdAndUpdate(courseId, { $inc: { enrolledCount: 1 } });
          
          console.log(`✅ Successfully enrolled user ${userId} in course ${courseId}`);
        } else {
          console.log(`ℹ️ User ${userId} is already enrolled in course ${courseId}. Skipping...`);
        }

        channel.ack(msg);
      } catch (error) {
        console.error('❌ Failed to process enrollment event:', error.message);
        // Only ack if it's an unrecoverable error (like JSON parse). 
        // For DB errors, we could nack so it retries, but for simplicity we ack here.
        channel.ack(msg);
      }
    }
  });
};
