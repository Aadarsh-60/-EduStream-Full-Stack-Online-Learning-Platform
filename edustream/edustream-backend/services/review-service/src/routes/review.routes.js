import express from 'express';
import {
  getCourseReviews,
  addReview,
  updateReview,
  deleteReview,
} from '../controllers/review.controller.js';

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'review-service' }));
router.get('/:courseId', getCourseReviews);
router.post('/', addReview);
router.put('/:reviewId', updateReview);
router.delete('/:reviewId', deleteReview);

export default router;
