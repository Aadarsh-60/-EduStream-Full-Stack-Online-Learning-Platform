import express from 'express';
import {
  getMyProfile, getPublicProfile, createProfile, updateProfile,
  uploadAvatarHandler, deleteAvatar, getEnrolledCourses, updateProgress, getAllUsers, toggleWishlist
} from '../controllers/user.controller.js';
import { uploadAvatar } from '../middlewares/upload.js';

const router = express.Router();

// Internal route - payment/auth service calls this
router.post('/internal/create', createProfile);

// Profile
router.get('/me', getMyProfile);
router.put('/me', updateProfile);
router.get('/profile/:userId', getPublicProfile);

// Avatar - multer middleware pehle, phir controller
router.post('/me/avatar', uploadAvatar, uploadAvatarHandler);
router.delete('/me/avatar', deleteAvatar);

// Enrolled courses
router.get('/me/enrolled', getEnrolledCourses);
router.put('/me/progress', updateProgress);
router.post('/me/wishlist/:courseId', toggleWishlist);

// Admin
router.get('/admin/all', getAllUsers);

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'user-service' }));

export default router;
