import './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { verifyToken, optionalAuth } from './middlewares/auth.js';
import { errorResponse } from '../../shared/utils/apiResponse.js';


const app = express();
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 5000;



app.set('trust proxy', 1);  //  This tells Express that it is sitting behind a proxy

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));

// Global rate limiter - 1000 requests per 15 min per IP for dev
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  handler: (req, res) => errorResponse(res, 429, 'Too many requests, please try again later'),
});

// Strict limiter for auth routes - brute force rokne ke liye (increased for dev)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  handler: (req, res) => errorResponse(res, 429, 'Too many auth attempts, try after 15 minutes'),
});

app.use(globalLimiter);

// Service URLs
const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
  user: process.env.USER_SERVICE_URL || 'http://localhost:5002',
  course: process.env.COURSE_SERVICE_URL || 'http://localhost:5003',
  media: process.env.MEDIA_SERVICE_URL || 'http://localhost:5004',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:5005',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5006',
  review: process.env.REVIEW_SERVICE_URL || 'http://localhost:5007',
  search: process.env.SEARCH_SERVICE_URL || 'http://localhost:5008',
};

// Proxy factory
const proxy = (target, ws = false) => createProxyMiddleware({
  target,
  changeOrigin: true,
  ws, // Enable WebSocket proxying if true
  pathRewrite: (path, req) => req.originalUrl,
  on: {
    error: (err, req, res) => {
      console.error(`Proxy error → ${target}: ${err.message}`);
      // Send response only if res exists (not for WS)
      if (res && res.writeHead) {
        errorResponse(res, 503, 'Service temporarily unavailable');
      }
    },
  },
});

// ── Public / Mixed Routes ──────────────────────────────────────
app.use('/api/auth', authLimiter, proxy(SERVICES.auth));
app.use('/api/search', proxy(SERVICES.search));  // Search public hai
app.use('/api/courses', optionalAuth, proxy(SERVICES.course));  // Course listing public, but creation protected
app.use('/api/reviews', optionalAuth, proxy(SERVICES.review));  // Reviews public, but adding protected

// Razorpay webhook - JWT nahi, signature verify hoga payment service mein
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), proxy(SERVICES.payment));

// ── Protected Routes (JWT required) ───────────────────────────
app.use('/api/users', verifyToken, proxy(SERVICES.user));
app.use('/api/media', verifyToken, proxy(SERVICES.media));
app.use('/api/payments', verifyToken, proxy(SERVICES.payment));
app.use('/api/notifications', verifyToken, proxy(SERVICES.notification));

// ── WebSockets (Socket.io) ────────────────────────────────────
// Gateway ko httpServer ki zaroorat hoti hai WS handle karne ke liye,
// par express router directly app.use('/socket.io', proxy(..., true)) bhi handle kar leta hai
// http-proxy-middleware documentation ke hisaab se.
app.use('/socket.io', proxy(SERVICES.notification, true));

// ── Health Check ───────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok', service: 'API Gateway', timestamp: new Date(),
  services: Object.keys(SERVICES),
}));

app.use('*', (req, res) => errorResponse(res, 404, `Route ${req.originalUrl} not found`));

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📡 Routing to ${Object.keys(SERVICES).length} microservices`);
});
