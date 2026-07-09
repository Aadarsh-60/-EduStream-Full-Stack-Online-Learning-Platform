import Razorpay from 'razorpay';
import crypto from 'crypto';
import axios from 'axios';
import Payment from '../models/Payment.js';
import { AppError } from '../../../../shared/middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../../../../shared/utils/apiResponse.js';

// Razorpay instance
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── Create Order ───────────────────────────────────────────────
// Step 1: Frontend se courseId aata hai, hum Razorpay order banate hain
export const createOrder = async (req, res, next) => {
  try {
    const userId   = req.headers['x-user-id'];
    const { courseId, amount } = req.body; // amount in paise (₹499 = 49900)

    // Already purchased check
    const existing = await Payment.findOne({ userId, courseId, status: 'captured' });
    if (existing) throw new AppError('Course already purchased', 409);

    // Razorpay order create
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt:  `receipt_${Date.now()}`,
    });

    // DB mein pending payment save karo
    const payment = await Payment.create({
      userId,
      courseId,
      razorpayOrderId: order.id,
      amount,
    });

    return successResponse(res, HTTP_STATUS.CREATED, 'Order created', {
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) { next(err); }
};

// ── Verify Payment ─────────────────────────────────────────────
// Step 2: Frontend payment karne ke baad signature verify karo
export const verifyPayment = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Signature verification - Razorpay ka standard process
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw new AppError('Payment verification failed - invalid signature', 400);
    }

    // Payment DB mein update karo
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId, userId },
      { razorpayPaymentId, razorpaySignature, status: 'captured' },
      { new: true }
    );
    if (!payment) throw new AppError('Payment record not found', 404);

    // Course service ko enrollment ke liye call karo
    await axios.post(`${process.env.COURSE_SERVICE_URL}/api/courses/internal/enroll`, {
      userId,
      courseId:  payment.courseId,
      paymentId: razorpayPaymentId,
      amount:    payment.amount / 100, // paise to rupees
    });

    // Notification service ko call karo
    await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/api/notifications/internal/send`, {
      userId,
      type:    'payment_success',
      message: 'Payment successful! You are now enrolled in the course.',
      data:    { courseId: payment.courseId, amount: payment.amount / 100 },
    }).catch(() => {}); // Notification fail hone pe payment block mat karo

    return successResponse(res, HTTP_STATUS.OK, 'Payment verified & enrolled successfully', {
      paymentId: razorpayPaymentId,
      courseId:  payment.courseId,
    });
  } catch (err) { next(err); }
};

// ── Razorpay Webhook ───────────────────────────────────────────
// Razorpay directly call karta hai agar payment status change ho
export const razorpayWebhook = async (req, res, next) => {
  try {
    const webhookSecret    = process.env.RAZORPAY_WEBHOOK_SECRET;
    const webhookSignature = req.headers['x-razorpay-signature'];

    // Webhook signature verify
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== webhookSignature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const { event, payload } = req.body;
    const razorpayPaymentId = payload?.payment?.entity?.id;
    const razorpayOrderId   = payload?.payment?.entity?.order_id;

    // Idempotency check - same webhook dobara process na ho
    const payment = await Payment.findOne({ razorpayOrderId });
    if (!payment || payment.webhookProcessed) {
      return res.json({ success: true, message: 'Already processed' });
    }

    if (event === 'payment.captured') {
      payment.status = 'captured';
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.webhookProcessed = true;
      await payment.save();
    } else if (event === 'payment.failed') {
      payment.status = 'failed';
      payment.webhookProcessed = true;
      await payment.save();
    }

    return res.json({ success: true });
  } catch (err) { next(err); }
};

// ── Get My Payments ────────────────────────────────────────────
export const getMyPayments = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const payments = await Payment.find({ userId }).sort({ createdAt: -1 });
    return successResponse(res, HTTP_STATUS.OK, 'Payments fetched', payments);
  } catch (err) { next(err); }
};
