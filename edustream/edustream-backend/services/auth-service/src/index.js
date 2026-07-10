import './config/env.js'; // Must be first to load env vars before other imports!
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import './config/passport.js';
import errorHandler from '../../../shared/middlewares/errorHandler.js';
import authRoutes from './routes/auth.routes.js';

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 5001;


app.set('trust proxy', 1)

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use(errorHandler);

const start = async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`🔐 Auth Service running on port ${PORT}`));
};

start();
