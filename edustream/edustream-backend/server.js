import './shared/config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import { v2 as cloudinary } from 'cloudinary';

import { verifyToken, optionalAuth } from './shared/middlewares/auth.js';
import { errorResponse } from './shared/utils/apiResponse.js';
import errorHandler from './shared/middlewares/errorHandler.js';

// Import Routes
import authRoutes from './services/auth-service/src/routes/auth.routes.js';
import userRoutes from './services/user-service/src/routes/user.routes.js';
import courseRoutes from './services/course-service/src/routes/course.routes.js';
import mediaRoutes from './services/media-service/src/routes/media.routes.js';
import paymentRoutes from './services/payment-service/src/routes/payment.routes.js';
import notificationRoutes from './services/notification-service/src/routes/notification.routes.js';
import { setIo } from './services/notification-service/src/controllers/notification.controller.js';
import reviewRoutes from './services/review-service/src/routes/review.routes.js';
import searchRoutes from './services/search-service/src/routes/search.routes.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Socket.io setup
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
});

setIo(io);

io.on('connection', (socket) => {
  socket.on('join', (userId) => socket.join(userId));
  socket.on('disconnect', () => {});
});

// Cloudinary setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));

// Webhook parsing needs raw body
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentRoutes);

app.use(express.json());

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  handler: (req, res) => errorResponse(res, 429, 'Too many requests, please try again later'),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  handler: (req, res) => errorResponse(res, 429, 'Too many auth attempts, try after 15 minutes'),
});

app.use(globalLimiter);

// ── Public / Mixed Routes ──────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/courses', optionalAuth, courseRoutes);
app.use('/api/reviews', optionalAuth, reviewRoutes);

// ── Protected Routes (JWT required) ───────────────────────────
app.use('/api/users', verifyToken, userRoutes);
app.use('/api/media', verifyToken, mediaRoutes);
app.use('/api/payments', verifyToken, paymentRoutes);
app.use('/api/notifications', verifyToken, notificationRoutes);

// Health Check
app.get('/health', (req, res) => res.json({
  status: 'ok', service: 'EduStream Monolith', timestamp: new Date()
}));

app.use('*', (req, res) => errorResponse(res, 404, `Route ${req.originalUrl} not found`));

app.use(errorHandler);

const start = async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}/edustream`);
    console.log('✅ Connected to MongoDB (EduStream Monolith)');
    httpServer.listen(PORT, () => {
      console.log(`🚀 Monolithic Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`❌ DB connection failed: ${error.message}`);
    process.exit(1);
  }
};

start();
