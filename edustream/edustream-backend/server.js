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

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((u) => u.trim())
  : ['http://localhost:5173'];

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  return (
    allowedOrigins.includes(origin) ||
    origin.endsWith('.vercel.app') ||
    origin.endsWith('.onrender.com')
  );
};

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      callback(null, isOriginAllowed(origin));
    },
    credentials: true,
  },
});

setIo(io);

io.on('connection', (socket) => {
  socket.on('join', (userId) => socket.join(userId));
  socket.on('disconnect', () => { });
});

// Cloudinary setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
  })
);
app.use(morgan('dev'));

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // Reduced for production
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => errorResponse(res, 429, 'Too many requests, please try again later'),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // Prevents brute-force while allowing legitimate sessions and 2FA
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => errorResponse(res, 429, 'Too many auth attempts, try after 15 minutes'),
});

app.use(globalLimiter);

// ── Public / Mixed Routes ──────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/courses', optionalAuth, courseRoutes);
app.use('/api/reviews', optionalAuth, reviewRoutes);

// ── Service Routes (Self-protecting with internal & JWT rules) ─
app.use('/api/users', userRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);

// Health Check
app.get('/health', (req, res) => res.json({
  status: 'ok', service: 'EduStream Monolith', timestamp: new Date()
}));

app.use('*', (req, res) => errorResponse(res, 404, `Route ${req.originalUrl} not found`));

app.use(errorHandler);

import { connectRabbitMQ } from './shared/utils/rabbitmq.js';
import { startEmailWorker } from './services/notification-service/src/workers/email.worker.js';
import { startEnrollmentWorker } from './services/course-service/src/workers/enrollment.worker.js';
import { startPaymentNotificationWorker } from './services/notification-service/src/workers/payment-notification.worker.js';

const start = async () => {
  try {
    let mongoUri = (process.env.MONGO_URI || 'mongodb://localhost:27017').trim();
    if (!mongoUri.includes('/edustream')) {
      if (mongoUri.includes('?')) {
        mongoUri = mongoUri.replace('?', '/edustream?');
      } else {
        mongoUri = mongoUri.endsWith('/') ? `${mongoUri}edustream` : `${mongoUri}/edustream`;
      }
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB (EduStream Monolith)');
    
    await connectRabbitMQ();
    startEmailWorker();
    startEnrollmentWorker();
    startPaymentNotificationWorker();

    httpServer.listen(PORT, () => {
      console.log(`🚀 Monolithic Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`❌ DB connection failed: ${error.message}`);
    process.exit(1);
  }
};

start();
