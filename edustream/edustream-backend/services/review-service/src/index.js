import './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import axios from 'axios';
import Review from './models/Review.js';
import { AppError } from '../../../shared/middlewares/errorHandler.js';
import errorHandler from '../../../shared/middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../../../shared/utils/apiResponse.js';


const app = express();
const PORT = process.env.REVIEW_SERVICE_PORT || 5007;


app.set('trust proxy', 1)

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// ── Get Course Reviews ──────────────────────────────────────────
app.get('/api/reviews/:courseId', async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ courseId: req.params.courseId }).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Review.countDocuments({ courseId: req.params.courseId }),
    ]);

    // Average rating
    const avgResult = await Review.aggregate([
      { $match: { courseId: new mongoose.Types.ObjectId(req.params.courseId) } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const avgRating = avgResult[0]?.avgRating?.toFixed(1) || 0;

    return successResponse(res, HTTP_STATUS.OK, 'Reviews fetched', {
      reviews, avgRating: Number(avgRating), total,
      pagination: { page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
});

// ── Add Review ─────────────────────────────────────────────────
app.post('/api/reviews', async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const userName = req.headers['x-user-name'] || 'Student';
    const { courseId, rating, comment } = req.body;

    const existing = await Review.findOne({ userId, courseId });
    if (existing) throw new AppError('You have already reviewed this course', 409);

    const review = await Review.create({ userId, courseId, userName, rating, comment });

    // Course service mein rating update karo
    const allReviews = await Review.aggregate([
      { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (allReviews[0]) {
      await axios.put(
        `${process.env.COURSE_SERVICE_URL}/api/courses/${courseId}/rating`,
        { rating: allReviews[0].avg, ratingCount: allReviews[0].count }
      ).catch(() => { });
    }

    return successResponse(res, HTTP_STATUS.CREATED, 'Review added', review);
  } catch (err) { next(err); }
});

// ── Update Review ──────────────────────────────────────────────
app.put('/api/reviews/:reviewId', async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const { rating, comment } = req.body;

    const review = await Review.findOneAndUpdate(
      { _id: req.params.reviewId, userId },
      { rating, comment },
      { new: true, runValidators: true }
    );
    if (!review) throw new AppError('Review not found', 404);

    return successResponse(res, HTTP_STATUS.OK, 'Review updated', review);
  } catch (err) { next(err); }
});

// ── Delete Review ──────────────────────────────────────────────
app.delete('/api/reviews/:reviewId', async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const review = await Review.findOneAndDelete({ _id: req.params.reviewId, userId });
    if (!review) throw new AppError('Review not found', 404);
    return successResponse(res, HTTP_STATUS.OK, 'Review deleted');
  } catch (err) { next(err); }
});

app.get('/api/reviews/health', (req, res) => res.json({ status: 'ok', service: 'review-service' }));
app.use(errorHandler);

const start = async () => {
  await mongoose.connect(`${process.env.MONGO_URI}/edustream_reviews`);
  console.log('✅ Review DB connected');
  app.listen(PORT, () => console.log(`⭐ Review Service running on port ${PORT}`));
};

start();
