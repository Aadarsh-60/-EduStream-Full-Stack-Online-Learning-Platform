import './config/env.js';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import errorHandler from '../../../shared/middlewares/errorHandler.js';
import { setIo } from './controllers/notification.controller.js';


const app = express();
const httpServer = createServer(app);
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 5006;

const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
});

setIo(io);

io.on('connection', (socket) => {
  socket.on('join', (userId) => socket.join(userId));
  socket.on('disconnect', () => {});
});

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Routes inline (simple service)
import Notification from './models/Notification.js';
import {
  sendNotification, getMyNotifications,
  markAsRead, markAllAsRead, getUnreadCount,
} from './controllers/notification.controller.js';

app.post('/api/notifications/internal/send',   sendNotification);
app.get('/api/notifications',                  getMyNotifications);
app.get('/api/notifications/unread-count',     getUnreadCount);
app.put('/api/notifications/read-all',         markAllAsRead);
app.put('/api/notifications/:notificationId/read', markAsRead);
app.get('/api/notifications/health',           (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

const start = async () => {
  await mongoose.connect(`${process.env.MONGO_URI}/edustream_notifications`);
  console.log('✅ Notification DB connected');
  httpServer.listen(PORT, () => console.log(`🔔 Notification Service running on port ${PORT}`));
};

start();
