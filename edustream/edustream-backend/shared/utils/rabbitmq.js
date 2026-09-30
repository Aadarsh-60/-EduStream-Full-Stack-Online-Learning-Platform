import amqp from 'amqplib';

let connection = null;
let channel = null;

export const connectRabbitMQ = async () => {
  if (connection && channel) return { connection, channel };

  try {
    const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
    connection = await amqp.connect(rabbitUrl);
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
    console.warn('⚠️ RabbitMQ connection failed. Ensure RabbitMQ is running:', error.message);
    // Silent fail so app doesn't crash if RabbitMQ is not available locally yet
  }
};

export const getRabbitChannel = () => {
  return channel;
};

export const publishEvent = async (exchange, routingKey, message) => {
  try {
    if (!channel) await connectRabbitMQ();
    if (!channel) {
      console.warn('RabbitMQ not connected, unable to publish event:', routingKey);
      return false;
    }

    return channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
  } catch (error) {
    console.error(`Error publishing to ${exchange} (${routingKey}):`, error.message);
    return false;
  }
};
