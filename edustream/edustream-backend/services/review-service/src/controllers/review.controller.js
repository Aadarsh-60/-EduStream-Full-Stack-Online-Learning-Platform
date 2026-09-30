import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Course from '../../../course-service/src/models/Course.js';
import Enrollment from '../../../course-service/src/models/Enrollment.js';
import { AppError } from '../../../../shared/middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../../../../shared/utils/apiResponse.js';

// ── Helper: Recalculate and Update Course Rating ───────────────
// WHY: We need to update the Course's average rating not just when
// a review is added, but also when it's updated or deleted.
const recalculateCourseRating = async (courseId) => {
  const stats = await Review.aggregate([
    { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const rating = stats.length > 0 ? Number(stats[0].avg.toFixed(1)) : 0;
  const ratingCount = stats.length > 0 ? stats[0].count : 0;

  await Course.findByIdAndUpdate(courseId, { rating, ratingCount });
};

// ── Get Course Reviews ──────────────────────────────────────────
export const getCourseReviews = async (req, res, next) => {
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
};

// ── Add Review ─────────────────────────────────────────────────
export const addReview = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const userName = req.headers['x-user-name'] || 'Student';
    const { courseId, rating, comment } = req.body;

    // 1. Check if user is actually enrolled in the course
    const enrollment = await Enrollment.findOne({ userId, courseId });
    if (!enrollment) {
      throw new AppError('You must be enrolled in this course to leave a review.', 403);
    }

    // 2. Prevent duplicate reviews
    const existing = await Review.findOne({ userId, courseId });
    if (existing) throw new AppError('You have already reviewed this course', 409);

    const review = await Review.create({ userId, courseId, userName, rating, comment });

    // 3. Recalculate Course Rating
    await recalculateCourseRating(courseId);

    return successResponse(res, HTTP_STATUS.CREATED, 'Review added', review);
  } catch (err) { next(err); }
};

// ── Update Review ──────────────────────────────────────────────
export const updateReview = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const { rating, comment } = req.body;

    const review = await Review.findOneAndUpdate(
      { _id: req.params.reviewId, userId },
      { rating, comment },
      { new: true, runValidators: true }
    );
    if (!review) throw new AppError('Review not found', 404);

    // FIX: Recalculate rating after update (was missing before!)
    await recalculateCourseRating(review.courseId);

    return successResponse(res, HTTP_STATUS.OK, 'Review updated', review);
  } catch (err) { next(err); }
};

// ── Delete Review ──────────────────────────────────────────────
export const deleteReview = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const review = await Review.findOneAndDelete({ _id: req.params.reviewId, userId });
    if (!review) throw new AppError('Review not found', 404);

    // FIX: Recalculate rating after delete (was missing before!)
    await recalculateCourseRating(review.courseId);

    return successResponse(res, HTTP_STATUS.OK, 'Review deleted');
  } catch (err) { next(err); }
};
