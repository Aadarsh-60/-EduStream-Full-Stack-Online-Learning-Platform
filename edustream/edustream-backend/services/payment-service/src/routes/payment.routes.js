import express from 'express';
import { createOrder, verifyPayment, razorpayWebhook, getMyPayments } from '../controllers/payment.controller.js';

const router = express.Router();

// Webhook: raw body chahiye signature verify ke liye
router.post('/webhook', express.raw({ type: 'application/json' }), razorpayWebhook);

router.post('/create-order', createOrder);
router.post('/verify',       verifyPayment);
router.get('/my-payments',   getMyPayments);

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'payment-service' }));

export default router;
