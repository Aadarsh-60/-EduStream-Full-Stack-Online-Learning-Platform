import './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import errorHandler from '../../../shared/middlewares/errorHandler.js';
import courseRoutes from './routes/course.routes.js';


const app = express();
const PORT = process.env.COURSE_SERVICE_PORT || 5003;


app.set('trust proxy', 1)

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/courses', courseRoutes);
app.use(errorHandler);

const start = async () => {
  await mongoose.connect(`${process.env.MONGO_URI}/edustream_courses`);
  console.log('✅ Course DB connected');
  app.listen(PORT, () => console.log(`📚 Course Service running on port ${PORT}`));
};

start();
