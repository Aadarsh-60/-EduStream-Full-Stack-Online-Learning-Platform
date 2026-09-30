import { getRabbitChannel } from '../../../../shared/utils/rabbitmq.js';
import { NotificationHubClient, NotificationRequestBuilder } from '@sumitshresht/notificationhub-sdk';

// Initialize Notification Hub Client
const client = new NotificationHubClient.Builder()
  .apiKey(process.env.NOTIFICATION_HUB_API_KEY || 'your-api-key')
  .apiSecret(process.env.NOTIFICATION_HUB_API_SECRET || 'your-api-secret')
  .build();

export const startPaymentNotificationWorker = async () => {
  const channel = getRabbitChannel();
  if (!channel) {
    console.error('RabbitMQ channel not found, cannot start payment notification worker');
    return;
  }

  console.log('📨 Payment Notification Worker started, listening for payment events...');

  channel.consume('payment_notification_queue', async (msg) => {
    if (msg !== null) {
      try {
        const payload = JSON.parse(msg.content.toString());
        const { userId, courseId, amount, email } = payload;
        
        // If email was provided (from JWT headers during verifyPayment)
        if (email) {
          const displayAmount = (amount / 100).toFixed(2);
          
          const subject = '🎉 Payment Successful! Receipt inside.';
          const message = `Your payment of ₹${displayAmount} was successful. You now have full access to the course!\n\nLink: /courses/${courseId}`;

          const request = new NotificationRequestBuilder()
            .addChannel('EMAIL')
            .toEmail(email)
            .subject(subject)
            .message(message)
            .build();

          await client.notifications().send(request);
          console.log(`✅ Successfully sent payment receipt to ${email}`);
        } else {
          // Note: If email is missing (e.g. triggered by webhook without user context),
          // in a full microservice architecture, we would fetch the user's email 
          // from the user-service via RPC or event-sourcing here.
          // For now, we skip the email if we don't have it.
          console.log(`ℹ️ Payment successful for user ${userId}, but no email provided for receipt.`);
        }

        channel.ack(msg);
      } catch (error) {
        console.error('❌ Failed to process payment notification event:', error.message);
        channel.ack(msg); // Ack to prevent infinite loop on failure
      }
    }
  });
};
