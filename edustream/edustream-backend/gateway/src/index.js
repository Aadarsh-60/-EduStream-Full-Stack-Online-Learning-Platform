import './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v2 as cloudinary } from 'cloudinary';
import cookieParser from 'cookie-parser';

import { verifyToken, optionalAuth } from './middlewares/auth.js';
import { errorResponse } from '../../shared/utils/apiResponse.js';
import errorHandler from '../../shared/middlewares/errorHandler.js';

// Import all routers from microservices
import authRoutes from '../../services/auth-service/src/routes/auth.routes.js';
import userRoutes from '../../services/user-service/src/routes/user.routes.js';
import courseRoutes from '../../services/course-service/src/routes/course.routes.js';
import paymentRoutes from '../../services/payment-service/src/routes/payment.routes.js';
import mediaRoutes from '../../services/media-service/src/routes/media.routes.js';
import reviewRoutes from '../../services/review-service/src/routes/review.routes.js';
import searchRoutes from '../../services/search-service/src/routes/search.routes.js';
import notificationRoutes from '../../services/notification-service/src/routes/notification.routes.js';

// Import IO setters
import { setIo as setMediaIo } from '../../services/media-service/src/controllers/media.controller.js';
import { setIo as setNotificationIo } from '../../services/notification-service/src/controllers/notification.controller.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 5000;

// Force all internal service URLs to point to this monolith instance
const monolithUrl = `http://localhost:${PORT}`;
process.env.AUTH_SERVICE_URL = monolithUrl;
process.env.USER_SERVICE_URL = monolithUrl;
process.env.COURSE_SERVICE_URL = monolithUrl;
process.env.MEDIA_SERVICE_URL = monolithUrl;
process.env.PAYMENT_SERVICE_URL = monolithUrl;
process.env.NOTIFICATION_SERVICE_URL = monolithUrl;
process.env.REVIEW_SERVICE_URL = monolithUrl;
process.env.SEARCH_SERVICE_URL = monolithUrl;

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.raw({ type: 'application/json', limit: '5mb' })); // For webhooks
app.use(morgan('dev'));

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

// ── Cloudinary Setup ──
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Socket.io Setup ──
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
});

setMediaIo(io);
setNotificationIo(io);

io.on('connection', (socket) => {
  socket.on('join', (userId) => socket.join(userId));
  socket.on('disconnect', () => {});
});

// ── Database Connection ──
// Connect to a single database for the monolith
mongoose.connect(`${process.env.MONGO_URI}/edustream_monolith`)
  .then(() => console.log('✅ Monolith DB connected'))
  .catch((err) => console.error('❌ DB Connection Error:', err));

// ── Mount Routes ──
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/courses', optionalAuth, courseRoutes);
app.use('/api/reviews', optionalAuth, reviewRoutes);

app.use('/api/users', verifyToken, userRoutes);
app.use('/api/media', verifyToken, mediaRoutes);
app.use('/api/payments', verifyToken, paymentRoutes);
app.use('/api/notifications', verifyToken, notificationRoutes);

// Health check
app.get('/health', (req, res) => res.json({
  status: 'ok', service: 'EduStream Monolith', timestamp: new Date(),
}));

app.use('*', (req, res) => errorResponse(res, 404, `Route ${req.originalUrl} not found`));

app.use(errorHandler);

httpServer.listen(PORT, () => {
  console.log(`🚀 EduStream Monolith running on port ${PORT}`);
});
