import { NotificationHubClient } from '@sumitshresht/notificationhub-sdk';

const client = new NotificationHubClient.Builder()
  .apiKey(process.env.NOTIFICATION_HUB_API_KEY)
  .apiSecret(process.env.NOTIFICATION_HUB_API_SECRET)
  .build();

// NOTE: Please replace these with your actual SMTP credentials (e.g. Gmail App Password)
const smtpConfig = {
  host: 'smtp.gmail.com',
  port: '587', // or 465
  username: 'vikramaadarsh1999@gmail.com',
  password: 'sufbinyaaphycner'
};

async function setup() {
  try {
    console.log('Configuring EMAIL provider...');
    const result = await client.providers().configure('EMAIL', 'SMTP', smtpConfig);
    console.log('✅ Success!', result);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

setup();
