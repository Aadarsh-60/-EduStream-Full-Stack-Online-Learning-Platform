import { getRabbitChannel, subscribeFallbackEvent } from '../../../../shared/utils/rabbitmq.js';
import { NotificationHubClient, NotificationRequestBuilder } from '@sumitshresht/notificationhub-sdk';

// Initialize Notification Hub Client if configured
let client = null;
if (process.env.NOTIFICATION_HUB_API_KEY && process.env.NOTIFICATION_HUB_API_SECRET) {
  try {
    client = new NotificationHubClient.Builder()
      .apiKey(process.env.NOTIFICATION_HUB_API_KEY)
      .apiSecret(process.env.NOTIFICATION_HUB_API_SECRET)
      .build();
  } catch (err) {
    console.warn('⚠️ Could not initialize NotificationHub in payment worker:', err.message);
  }
}

export const handlePaymentNotificationPayload = async (payload) => {
  const { userId, courseId, amount, email } = payload || {};
  if (email && client) {
    try {
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
    } catch (error) {
      console.error('❌ Failed to send payment receipt:', error.message);
    }
  } else if (!email) {
    console.log(`ℹ️ Payment notification event received for user ${userId}, no email specified.`);
  }
};

export const startPaymentNotificationWorker = async () => {
  const channel = getRabbitChannel();

  if (channel) {
    console.log('📨 Payment Notification Worker started, listening for payment events on RabbitMQ...');
    channel.consume('payment_notification_queue', async (msg) => {
      if (msg !== null) {
        try {
          const payload = JSON.parse(msg.content.toString());
          await handlePaymentNotificationPayload(payload);
          channel.ack(msg);
        } catch (error) {
          console.error('❌ Failed to process payment notification message:', error.message);
          channel.ack(msg);
        }
      }
    });
  } else {
    console.log('📨 Payment Notification Worker started, listening via in-process EventBus fallback (payment.successful)...');
    subscribeFallbackEvent('payment.successful', async (payload) => {
      try {
        await handlePaymentNotificationPayload(payload);
      } catch (err) {
        console.error('❌ In-process payment notification error:', err.message);
      }
    });
  }
};

