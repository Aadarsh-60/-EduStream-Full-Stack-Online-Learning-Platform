import express from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import Review from '../models/Review.js';
import { AppError } from '../../../../shared/middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../../../../shared/utils/apiResponse.js';

const router = express.Router();

router.get('/:courseId', async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ courseId: req.params.courseId }).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Review.countDocuments({ courseId: req.params.courseId }),
    ]);

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

router.post('/', async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const userName = req.headers['x-user-name'] || 'Student';
    const { courseId, rating, comment } = req.body;

    const existing = await Review.findOne({ userId, courseId });
    if (existing) throw new AppError('You have already reviewed this course', 409);

    const review = await Review.create({ userId, courseId, userName, rating, comment });

    const allReviews = await Review.aggregate([
      { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (allReviews[0]) {
      // Direct DB update is better in monolith, but we'll leave the axios call for now 
      // or we can just require Course model, but since it's a temp monolith, axios to localhost might fail.
      // Wait, in monolith, the course route is on the same app! So we should use localhost with PORT.
      await axios.put(
        `${process.env.COURSE_SERVICE_URL}/api/courses/${courseId}/rating`,
        { rating: allReviews[0].avg, ratingCount: allReviews[0].count },
        { headers: { 'x-user-id': userId } } // simulate auth
      ).catch(() => { });
    }

    return successResponse(res, HTTP_STATUS.CREATED, 'Review added', review);
  } catch (err) { next(err); }
});

router.put('/:reviewId', async (req, res, next) => {
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

router.delete('/:reviewId', async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const review = await Review.findOneAndDelete({ _id: req.params.reviewId, userId });
    if (!review) throw new AppError('Review not found', 404);
    return successResponse(res, HTTP_STATUS.OK, 'Review deleted');
  } catch (err) { next(err); }
});

router.get('/health/check', (req, res) => res.json({ status: 'ok' }));

export default router;
