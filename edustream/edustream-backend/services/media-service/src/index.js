import './config/env.js';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v2 as cloudinary } from 'cloudinary';
import errorHandler from '../../../shared/middlewares/errorHandler.js';
import mediaRoutes from './routes/media.routes.js';
import { setIo } from './controllers/media.controller.js';


const app = express();
const httpServer = createServer(app);
const PORT = process.env.MEDIA_SERVICE_PORT || 5004;


app.set('trust proxy', 1)

// Socket.io setup - video upload progress ke liye
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
});

// Controller ko io pass karo
setIo(io);

io.on('connection', (socket) => {
  console.log(`📡 Socket connected: ${socket.id}`);

  // User apne userId ke room mein join kare
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  socket.on('disconnect', () => console.log(`Socket disconnected: ${socket.id}`));
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/media', mediaRoutes);
app.use(errorHandler);

httpServer.listen(PORT, () => console.log(`🎥 Media Service running on port ${PORT}`));
