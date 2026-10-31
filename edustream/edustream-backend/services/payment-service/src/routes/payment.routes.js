import express from 'express';
import { createOrder, verifyPayment, razorpayWebhook, getMyPayments, initiateRefund } from '../controllers/payment.controller.js';
import { verifyToken } from '../../../../shared/middlewares/auth.js';

const router = express.Router();

// Webhook: Razorpay calls this with HMAC signature (NO JWT)
router.post('/webhook', razorpayWebhook);

router.post('/create-order', verifyToken, createOrder);
router.post('/verify',       verifyToken, verifyPayment);
router.get('/my-payments',   verifyToken, getMyPayments);

// Admin-only: initiate a refund for a captured payment
router.post('/refund',       verifyToken, initiateRefund);

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'payment-service' }));

export default router;
