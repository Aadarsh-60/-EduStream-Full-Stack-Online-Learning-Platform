import express from 'express';
import {
  getMyProfile, getPublicProfile, createProfile, updateProfile,
  uploadAvatarHandler, deleteAvatar, getAllUsers, toggleWishlist, getMyEnrolledCourses,
  updateUserRole, deleteUser, adminCreateUser
} from '../controllers/user.controller.js';
import { uploadAvatar } from '../middlewares/upload.js';
import { verifyToken } from '../../../../shared/middlewares/auth.js';

const router = express.Router();

// Internal route - payment/auth service calls this
router.post('/internal/create', createProfile);

// Profile
router.get('/me', verifyToken, getMyProfile);
router.put('/me', verifyToken, updateProfile);
router.get('/profile/:userId', getPublicProfile); // Public profile

// Avatar - multer middleware pehle, phir controller
router.post('/me/avatar', verifyToken, uploadAvatar, uploadAvatarHandler);
router.delete('/me/avatar', verifyToken, deleteAvatar);

// Enrolled courses & Wishlist
router.get('/me/enrolled', verifyToken, getMyEnrolledCourses);
router.post('/me/wishlist/:courseId', verifyToken, toggleWishlist);

// Admin
router.get('/admin/all', verifyToken, getAllUsers);
router.post('/admin/create', verifyToken, adminCreateUser);
router.put('/admin/users/:userId/role', verifyToken, updateUserRole);
router.delete('/admin/users/:userId', verifyToken, deleteUser);

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'user-service' }));

export default router;
