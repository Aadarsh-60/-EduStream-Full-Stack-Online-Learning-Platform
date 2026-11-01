import { getRabbitChannel, subscribeFallbackEvent } from '../../../../shared/utils/rabbitmq.js';
import { NotificationHubClient, NotificationRequestBuilder } from '@sumitshresht/notificationhub-sdk';
import nodemailer from 'nodemailer';

// Initialize Notification Hub Client dynamically with fallback to project keys
const getNotificationHubClient = () => {
  const apiKey = process.env.NOTIFICATION_HUB_API_KEY || 'nh_live_0vn46yjzGVElza55K8Nz_qQcLCkda1zH';
  const apiSecret = process.env.NOTIFICATION_HUB_API_SECRET || 'NIJ7urdAmU4XNBA5cbUtVXYfNeX2ygVdGV3HrZAnTfbpUZCOi6TsLzjhEs-mVNwU';
  if (!apiKey || !apiSecret) return null;

  try {
    return new NotificationHubClient.Builder()
      .apiKey(apiKey)
      .apiSecret(apiSecret)
      .build();
  } catch (err) {
    console.warn('⚠️ Could not initialize NotificationHub client:', err.message);
    return null;
  }
};

// Nodemailer SMTP Transporter
const getTransporter = () => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: String(process.env.SMTP_PORT) === '465',
    auth: { user, pass },
  });
};

export const handleEmailPayload = async (payload) => {
  const { type, data } = payload || {};
  if (!data) return;

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
      subject = data.title || 'EduStream Notification';
      message = `${data.message}${data.link ? `\n\nLink: ${data.link}` : ''}`;
      break;
    case 'SESSION_REVOKE_EMAIL':
      subject = 'Device Revocation Verification Code';
      message = `Hi ${data.name}, your verification code to revoke a device session is: ${data.otp}\n\nIf you did not request this, please ignore this email.`;
      break;
    default:
      console.warn('Unknown email type:', type);
      subject = 'EduStream Notification';
      message = data.message || '';
  }

  // ── Always log OTP prominently in Render/Server console ──
  if (data.otp) {
    console.log(`\n======================================================`);
    console.log(`🔑 [EMAIL OTP GENERATED]`);
    console.log(`Type:      ${type}`);
    console.log(`Recipient: ${recipient}`);
    console.log(`OTP Code:  ${data.otp}`);
    console.log(`======================================================\n`);
  }

  if (!subject || !message || !recipient) return;

  let delivered = false;

  // ── Attempt 1: Notification Hub SDK ──
  const nhClient = getNotificationHubClient();
  if (nhClient) {
    try {
      console.log(`📡 [NotificationHub] Dispatching ${type} to ${recipient}...`);
      const request = new NotificationRequestBuilder()
        .addChannel('EMAIL')
        .toEmail(recipient)
        .subject(subject)
        .message(message)
        .build();

      const response = await nhClient.notifications().send(request);
      console.log(`✅ [NotificationHub] Sent ${type} to ${recipient} (status: ${response?.status || 'QUEUED'})`);
      delivered = true;
    } catch (nhErr) {
      console.warn(`⚠️ NotificationHub send failed (${nhErr.message}). Falling back to Nodemailer SMTP...`);
    }
  }

  // ── Attempt 2: Direct Nodemailer SMTP Fallback ──
  if (!delivered) {
    const transporter = getTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"EduStream" <${process.env.SMTP_USER}>`,
          to: recipient,
          subject,
          text: message,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
              <h1 style="color: #6366f1; margin-top: 0; font-size: 24px; font-weight: 700;">EduStream</h1>
              <p style="font-size: 16px; color: #334155; line-height: 1.6;">${message.replace(/\n/g, '<br/>')}</p>
              ${data.otp ? `
                <div style="margin: 28px 0; padding: 20px; background: #f8fafc; border: 1px dashed #cbd5e1; text-align: center; border-radius: 8px;">
                  <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; font-family: monospace;">${data.otp}</span>
                </div>
              ` : ''}
              <p style="font-size: 13px; color: #94a3b8; margin-top: 28px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                This is an automated notification from EduStream. If you did not request this, you can safely ignore this email.
              </p>
            </div>
          `,
        });
        console.log(`✅ [Nodemailer] Delivered ${type} to ${recipient} via SMTP`);
        delivered = true;
      } catch (smtpErr) {
        console.error(`❌ [Nodemailer] SMTP send error to ${recipient}:`, smtpErr.message);
      }
    } else {
      console.warn('⚠️ SMTP_USER and SMTP_PASS are not configured in environment variables. Could not send via SMTP.');
    }
  }

  if (!delivered) {
    console.error(`❌ Failed to deliver email to ${recipient}. Please verify SMTP credentials or NotificationHub keys in Render dashboard.`);
  }
};


export const startEmailWorker = async () => {
  const channel = getRabbitChannel();

  if (channel) {
    console.log('📬 Email Worker started, listening for messages on RabbitMQ email_queue...');
    channel.prefetch(1);
    channel.consume('email_queue', async (msg) => {
      if (msg !== null) {
        try {
          const payload = JSON.parse(msg.content.toString());
          await handleEmailPayload(payload);
          channel.ack(msg);
        } catch (error) {
          console.error('❌ Failed to process email message:', error.message);
          channel.ack(msg);
        }
      }
    });
  } else {
    console.log('📬 Email Worker started, listening via in-process EventBus fallback (email.send)...');
    subscribeFallbackEvent('email.send', async (payload) => {
      try {
        await handleEmailPayload(payload);
      } catch (err) {
        console.error('❌ In-process email dispatch error:', err.message);
      }
    });
  }
};

