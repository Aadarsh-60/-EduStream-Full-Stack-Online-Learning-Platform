import Razorpay from 'razorpay';
import crypto from 'crypto';
import Payment from '../models/Payment.js';
import Course from '../../../course-service/src/models/Course.js';
import { AppError } from '../../../../shared/middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../../../../shared/utils/apiResponse.js';
import { getCache, setCache } from '../../../../shared/utils/cache.js';
import { publishEvent } from '../../../../shared/utils/rabbitmq.js';

// Razorpay instance
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── Shared Internal Helpers ────────────────────────────────────
// These are called by BOTH verifyPayment AND the Webhook.
// WHY: If the user's browser closes mid-payment, Razorpay still fires
// the webhook. Without this, the student would pay but not get access.

// ── Create Order (With Idempotency Key) ────────────────────────
// Step 1: Frontend sends courseId + amount + Idempotency-Key.
// If the user clicks "Buy" twice rapidly, the Idempotency Key ensures 
// we don't create two duplicate orders in Razorpay.
export const createOrder = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const idempotencyKey = req.headers['x-idempotency-key'];
    const { courseId } = req.body;
    if (!courseId) throw new AppError('courseId is required', 400);

    // SECURE FIX: Fetch price directly from the DB — never trust the client
    const course = await Course.findById(courseId).select('price discountPrice title');
    if (!course) throw new AppError('Course not found', 404);

    let amount = course.discountPrice !== undefined && course.discountPrice !== null 
                 ? course.discountPrice 
                 : course.price;
                 
    if (amount === 0) throw new AppError('Free courses cannot be processed via Razorpay', 400);
    
    // Guarantee integer (paise) for Razorpay
    amount = Math.round(Number(amount));

    // ── Idempotency Check via Redis ───────────────────────────
    if (idempotencyKey) {
      const cachedOrder = await getCache(`idempotency:order:${idempotencyKey}`);
      if (cachedOrder) {
        return successResponse(res, HTTP_STATUS.OK, 'Order retrieved (idempotent)', cachedOrder);
      }
    }

    // Prevent duplicate purchase
    const existing = await Payment.findOne({ userId, courseId, status: 'captured' });
    if (existing) throw new AppError('Course already purchased', 409);

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt:  `rcpt_${Date.now()}`,
    });

    // Save as 'pending' in our DB immediately
    await Payment.create({
      userId,
      courseId,
      razorpayOrderId: order.id,
      amount,
    });

    const responsePayload = {
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
    };

    if (idempotencyKey) {
      // Store idempotency key for 24 hours
      await setCache(`idempotency:order:${idempotencyKey}`, responsePayload, 24 * 60 * 60);
    }

    return successResponse(res, HTTP_STATUS.CREATED, 'Order created', responsePayload);
  } catch (err) { next(err); }
};

// ── Verify Payment ─────────────────────────────────────────────
// Step 2: After user pays in Razorpay modal, frontend sends back
// the 3 IDs. We verify the HMAC signature to confirm it's legitimate.
//
// WHY HMAC: Razorpay signs the response with our secret key. If anyone
// tries to fake a "payment success", the signature won't match.
export const verifyPayment = async (req, res, next) => {
  try {
    const userId    = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email']; // Passed by gateway from JWT
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // ── HMAC Signature Verification ───────────────────────────
    // Razorpay generates: HMAC_SHA256(orderId + "|" + paymentId, secret)
    // We regenerate it and compare. If they match, payment is authentic.
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw new AppError('Payment verification failed — invalid signature', 400);
    }

    // Update payment record to 'captured'
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId, userId },
      { razorpayPaymentId, razorpaySignature, status: 'captured' },
      { new: true }
    );
    if (!payment) throw new AppError('Payment record not found', 404);

    // ── Event-Driven Choreography (RabbitMQ) ────────────────
    // Publish the payment.successful event.
    // The course-service will consume this and enroll the user.
    // The notification-service will consume this and send the email.
    await publishEvent('payment_events', 'payment.successful', {
      userId,
      courseId: payment.courseId,
      paymentId: razorpayPaymentId,
      amount: payment.amount,
      email: userEmail
    });

    return successResponse(res, HTTP_STATUS.OK, 'Payment verified & enrolled successfully', {
      paymentId: razorpayPaymentId,
      courseId:  payment.courseId,
    });
  } catch (err) { next(err); }
};

// ── Razorpay Webhook ───────────────────────────────────────────
// Razorpay calls this endpoint directly when payment status changes.
//
// WHY THIS IS CRITICAL:
// If the student's browser crashes right after paying (before verifyPayment
// runs), the payment succeeds on Razorpay's side but our server never knew.
// The webhook is the SAFETY NET — it guarantees enrollment even in edge cases.
//
// KEY CONCEPTS demonstrated here:
// 1. Webhook Signature Verification (security)
// 2. Idempotency (prevent double-enrollment if webhook fires twice)
// 3. Event-driven architecture (decoupled from user's browser session)
export const razorpayWebhook = async (req, res, next) => {
  try {
    const webhookSecret    = process.env.RAZORPAY_WEBHOOK_SECRET;
    const webhookSignature = req.headers['x-razorpay-signature'];

    // ── Step 1: Verify Webhook Signature ──────────────────────
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== webhookSignature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const eventId = req.headers['x-razorpay-event-id'];
    
    // ── Replay Attack Protection (Using Redis) ────────────────
    // An attacker might intercept a valid webhook and replay it.
    // We cache the eventId. If it exists in Redis, we drop it immediately.
    if (eventId) {
      const isReplayed = await getCache(`webhook:event:${eventId}`);
      if (isReplayed) {
        return res.json({ success: true, message: 'Event already processed (Replay protection)' });
      }
      await setCache(`webhook:event:${eventId}`, true, 24 * 60 * 60); // Store for 24h
    }

    const { event, payload } = req.body;
    const razorpayPaymentId  = payload?.payment?.entity?.id;
    const razorpayOrderId    = payload?.payment?.entity?.order_id;

    // ── Step 2: Idempotency Check ──────────────────────────────
    // Razorpay can fire the SAME webhook multiple times (network retries).
    // webhookProcessed flag ensures we only act on it ONCE.
    const payment = await Payment.findOne({ razorpayOrderId });
    if (!payment || payment.webhookProcessed) {
      return res.json({ success: true, message: 'Already processed or unknown order' });
    }

    if (event === 'payment.captured') {
      // ── Step 3a: Mark payment as captured ─────────────────────
      payment.status           = 'captured';
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.webhookProcessed  = true;
      await payment.save();

      // ── Step 3b: Publish Event via RabbitMQ ──────────────────
      // This guarantees enrollment and notifications without blocking the webhook response.
      await publishEvent('payment_events', 'payment.successful', {
        userId: payment.userId.toString(),
        courseId: payment.courseId.toString(),
        paymentId: razorpayPaymentId,
        amount: payment.amount,
        email: null // Webhooks don't have JWT, so no email here; user receives in-app notification
      });

    } else if (event === 'payment.failed') {
      payment.status           = 'failed';
      payment.webhookProcessed  = true;
      await payment.save();

      // Notify user that payment failed
      await publishEvent('notification_events', 'email.send', {
        type: 'GENERAL_NOTIFICATION_EMAIL',
        data: {
          userId: payment.userId.toString(), // To allow in-app notifications if needed
          title: '❌ Payment Failed',
          message: 'Your payment could not be processed. Please try again.',
          link: `/courses/${payment.courseId}`,
          linkText: 'View Course'
        }
      });
    }

    // Razorpay expects a fast 200 OK — always return success
    return res.json({ success: true });
  } catch (err) { next(err); }
};

// ── Initiate Refund ────────────────────────────────────────────
// When a student raises a complaint, admin can trigger a refund.
// Calls Razorpay's Refund API, updates our DB, and notifies the user.
//
// WHY: The 'refunded' status already exists in our Payment model.
// Without this endpoint, there's no way to actually trigger it.
export const initiateRefund = async (req, res, next) => {
  try {
    const { paymentId, reason = 'student_request' } = req.body;
    const userRole = req.headers['x-user-role'];

    // Only admins can initiate refunds
    if (userRole !== 'admin') throw new AppError('Only admins can initiate refunds', 403);
    if (!paymentId) throw new AppError('paymentId is required', 400);

    const payment = await Payment.findOne({ razorpayPaymentId: paymentId });
    if (!payment) throw new AppError('Payment not found', 404);
    if (payment.status === 'refunded') throw new AppError('Already refunded', 409);
    if (payment.status !== 'captured') throw new AppError('Only captured payments can be refunded', 400);

    // ── Call Razorpay Refund API ──────────────────────────────
    const refund = await razorpay.payments.refund(paymentId, {
      amount: payment.amount, // Full refund (in paise)
      notes:  { reason },
    });

    // Update our DB
    payment.status           = 'refunded';
    payment.refundId         = refund.id;
    payment.refundReason     = reason;
    await payment.save();

    // Notify the student about the refund
    await publishEvent('notification_events', 'email.send', {
      type: 'GENERAL_NOTIFICATION_EMAIL',
      data: {
        userId: payment.userId.toString(),
        title: '💸 Payment Refunded',
        message: `Your payment of ₹${(payment.amount / 100).toFixed(2)} for the course has been refunded. Reason: ${reason}.`,
        link: `/courses/${payment.courseId}`
      }
    });

    return successResponse(res, HTTP_STATUS.OK, 'Refund initiated successfully', {
      refundId: refund.id,
      amount:   payment.amount,
      status:   refund.status,
    });
  } catch (err) { next(err); }
};

// ── Get My Payments ────────────────────────────────────────────
export const getMyPayments = async (req, res, next) => {
  try {
    const userId  = req.headers['x-user-id'];
    const payments = await Payment.find({ userId }).sort({ createdAt: -1 });
    return successResponse(res, HTTP_STATUS.OK, 'Payments fetched', payments);
  } catch (err) { next(err); }
};
