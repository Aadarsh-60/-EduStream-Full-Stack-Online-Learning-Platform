import express from 'express';
import { createOrder, verifyPayment, razorpayWebhook, getMyPayments, initiateRefund } from '../controllers/payment.controller.js';

const router = express.Router();

// Webhook: needs raw body for HMAC signature verification
router.post('/webhook',      express.raw({ type: 'application/json' }), razorpayWebhook);

router.post('/create-order', createOrder);
router.post('/verify',       verifyPayment);
router.get('/my-payments',   getMyPayments);

// Admin-only: initiate a refund for a captured payment
router.post('/refund',       initiateRefund);

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'payment-service' }));

export default router;
