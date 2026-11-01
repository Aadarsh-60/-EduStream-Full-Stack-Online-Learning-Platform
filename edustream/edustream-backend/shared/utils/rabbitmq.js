import amqp from 'amqplib';
import { EventEmitter } from 'events';

let connection = null;
let channel = null;

// Resilient in-process EventBus fallback for monolithic deployment (e.g. Render free tier)
const fallbackBus = new EventEmitter();
fallbackBus.setMaxListeners(50);

export const connectRabbitMQ = async () => {
  if (connection && channel) return { connection, channel };

  try {
    const rabbitUrl = process.env.RABBITMQ_URL;
    // On production platforms like Render without a cloud AMQP broker URL, avoid spamming ECONNREFUSED
    if (!rabbitUrl || rabbitUrl === 'amqp://localhost') {
      if (process.env.NODE_ENV === 'production' && !process.env.RABBITMQ_URL) {
        console.log('ℹ️ No external RABBITMQ_URL configured on Render. Operating with in-process resilient EventBus.');
        return { connection: null, channel: null };
      }
    }

    const targetUrl = rabbitUrl || 'amqp://localhost';
    connection = await amqp.connect(targetUrl);
    channel = await connection.createChannel();
    
    // Assert exchanges
    await channel.assertExchange('notification_events', 'direct', { durable: true });
    await channel.assertExchange('payment_events', 'direct', { durable: true });
    
    // Assert queues
    await channel.assertQueue('email_queue', { durable: true });
    await channel.assertQueue('enrollment_queue', { durable: true });
    await channel.assertQueue('payment_notification_queue', { durable: true });
    
    // Bind queues to exchanges
    await channel.bindQueue('email_queue', 'notification_events', 'email.send');
    await channel.bindQueue('enrollment_queue', 'payment_events', 'payment.successful');
    await channel.bindQueue('payment_notification_queue', 'payment_events', 'payment.successful');

    console.log('✅ Connected to RabbitMQ successfully');
    
    // Handle connection closure
    connection.on('close', () => {
      console.error('RabbitMQ connection closed. Reconnecting...');
      connection = null;
      channel = null;
      setTimeout(connectRabbitMQ, 5000);
    });

    return { connection, channel };
  } catch (error) {
    console.warn(`⚠️ RabbitMQ broker not reachable (${error.message}). Activating in-process resilient EventBus.`);
    connection = null;
    channel = null;
    return { connection: null, channel: null };
  }
};

export const getRabbitChannel = () => {
  return channel;
};

export const publishEvent = async (exchange, routingKey, message) => {
  try {
    if (!channel && process.env.RABBITMQ_URL) {
      await connectRabbitMQ();
    }

    if (channel) {
      return channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );
    }
  } catch (error) {
    console.warn(`RabbitMQ publish failed for ${exchange} (${routingKey}): ${error.message}. Routing to fallback EventBus.`);
  }

  // Resilient in-process dispatch
  setImmediate(() => {
    try {
      fallbackBus.emit(routingKey, message);
    } catch (dispatchErr) {
      console.error(`Fallback EventBus error on ${routingKey}:`, dispatchErr.message);
    }
  });

  return true;
};

export const subscribeFallbackEvent = (routingKey, handler) => {
  fallbackBus.on(routingKey, handler);
};

