import { getRabbitChannel } from '../../../../shared/utils/rabbitmq.js';
import { NotificationHubClient, NotificationRequestBuilder } from '@sumitshresht/notificationhub-sdk';

// Initialize Notification Hub Client
const client = new NotificationHubClient.Builder()
  .apiKey(process.env.NOTIFICATION_HUB_API_KEY || 'your-api-key')
  .apiSecret(process.env.NOTIFICATION_HUB_API_SECRET || 'your-api-secret')
  .build();

export const startEmailWorker = async () => {
  const channel = getRabbitChannel();
  if (!channel) {
    console.error('RabbitMQ channel not found, cannot start email worker');
    return;
  }

  console.log('📬 Email Worker started, listening for messages on email_queue...');

  channel.prefetch(1); // Process one message at a time for lowest latency
  channel.consume('email_queue', async (msg) => {
    if (msg !== null) {
      try {
        const payload = JSON.parse(msg.content.toString());
        const { type, data } = payload;
        
        let subject = '';
        let message = '';
        let recipient = data.email;

        switch (type) {
          case 'VERIFICATION_EMAIL':
            subject = 'Verify your EduStream account';
            message = `Welcome to EduStream, ${data.name}! Your verification code is: ${data.otp}`;
            break;
          case 'PASSWORD_RESET_EMAIL':
            subject = 'Reset your EduStream password';
            message = `Hi ${data.name}, your password reset code is: ${data.otp}`;
            break;
          case 'SECURITY_ALERT_EMAIL':
            subject = `Security Alert: ${data.title}`;
            message = `Hi ${data.name}, ${data.description}. Device: ${data.device}, IP: ${data.ip}`;
            break;
          case 'CONTACT_ADMIN_EMAIL':
            subject = `New Contact Form Submission: ${data.subject}`;
            message = `From: ${data.name} (${data.email}). Message: ${data.message}`;
            recipient = process.env.ADMIN_EMAIL || 'admin@edustream.com';
            break;
          case 'GENERAL_NOTIFICATION_EMAIL':
            subject = data.title;
            message = `${data.message}${data.link ? `\n\nLink: ${data.link}` : ''}`;
            break;
          case 'SESSION_REVOKE_EMAIL':
            subject = 'Device Revocation Verification Code';
            message = `Hi ${data.name}, your verification code to revoke a device session is: ${data.otp}\n\nIf you did not request this, please ignore this email.`;
            break;
          default:
            console.warn('Unknown email type:', type);
        }

        if (subject && message) {
          // Build and send the notification via Notification Hub SDK
          const request = new NotificationRequestBuilder()
            .addChannel('EMAIL')
            .toEmail(recipient)
            .subject(subject)
            .message(message)
            .build();

          await client.notifications().send(request);
          console.log(`✅ Successfully sent ${type} to ${data.email} via Notification Hub`);
        }

        // Acknowledge the message so it's removed from the queue
        channel.ack(msg);
      } catch (error) {
        console.error('❌ Failed to process email message:', error.message);
        // Do not acknowledge so it can be retried (or you can nack it)
        // channel.nack(msg, false, false); // Sends it to Dead Letter Queue if configured
        channel.ack(msg); // For development, just ack it so it doesn't loop infinitely
      }
    }
  });
};
