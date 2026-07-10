import './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import errorHandler from '../../../shared/middlewares/errorHandler.js';
import paymentRoutes from './routes/payment.routes.js';


const app = express();
const PORT = process.env.PAYMENT_SERVICE_PORT || 5005;


app.set('trust proxy', 1)

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/payments', paymentRoutes);
app.use(errorHandler);

const start = async () => {
  await mongoose.connect(`${process.env.MONGO_URI}/edustream_payments`);
  console.log('✅ Payment DB connected');
  app.listen(PORT, () => console.log(`💳 Payment Service running on port ${PORT}`));
};

start();
