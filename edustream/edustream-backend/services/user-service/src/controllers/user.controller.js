import { v2 as cloudinary } from 'cloudinary';
import UserProfile from '../models/UserProfile.js';
import Enrollment from '../../../course-service/src/models/Enrollment.js';
import { processAvatar } from '../middlewares/upload.js';
import { AppError } from '../../../../shared/middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../../../../shared/utils/apiResponse.js';
import { getCache, setCache, invalidateCache } from '../../../../shared/utils/cache.js';

// Gateway headers se user info milti hai
const getUserId = (req) => req.headers['x-user-id'];
const getUserRole = (req) => req.headers['x-user-role'];

// ── Get My Profile (Cached) ────────────────────────────────────
export const getMyProfile = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    
    // Check Cache
    const cacheKey = `user_profile:${userId}`;
    const cachedProfile = await getCache(cacheKey);
    if (cachedProfile) {
      return successResponse(res, HTTP_STATUS.OK, 'Profile fetched (cached)', cachedProfile);
    }

    const profile = await UserProfile.findOne({ userId });
    if (!profile) throw new AppError('Profile not found', 404);
    
    // Cache for 1 hour
    await setCache(cacheKey, profile, 60 * 60);
    
    return successResponse(res, HTTP_STATUS.OK, 'Profile fetched', profile);
  } catch (err) { next(err); }
};

// ── Get Public Profile ─────────────────────────────────────────
export const getPublicProfile = async (req, res, next) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.params.userId })
      .select('-enrolledCourses -totalEarnings -wishlist');
    if (!profile) throw new AppError('User not found', 404);
    return successResponse(res, HTTP_STATUS.OK, 'Profile fetched', profile);
  } catch (err) { next(err); }
};

// ── Create Profile (called internally after register) ──────────
export const createProfile = async (req, res, next) => {
  try {
    const { userId, name, email, role } = req.body;
    const existing = await UserProfile.findOne({ userId });
    if (existing) return successResponse(res, HTTP_STATUS.OK, 'Profile exists', existing);

    const profile = await UserProfile.create({ userId, name, email, role });
    return successResponse(res, HTTP_STATUS.CREATED, 'Profile created', profile);
  } catch (err) { next(err); }
};

// ── Update Profile ─────────────────────────────────────────────
export const updateProfile = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { name, bio, headline, website, linkedin, twitter } = req.body;

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      { name, bio, headline, website, linkedin, twitter },
      { new: true, runValidators: true }
    );
    if (!profile) throw new AppError('Profile not found', 404);
    
    // Invalidate Cache
    await invalidateCache(`user_profile:${userId}`);
    
    return successResponse(res, HTTP_STATUS.OK, 'Profile updated', profile);
  } catch (err) { next(err); }
};

// ── Upload Avatar ──────────────────────────────────────────────
export const uploadAvatarHandler = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!req.file) throw new AppError('Please upload an image', 400);

    // Step 1: Sharp se compress + resize
    const processedBuffer = await processAvatar(req.file.buffer);

    // Step 2: Cloudinary pe upload (buffer se stream)
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'edustream/avatars', public_id: `avatar_${userId}`, overwrite: true, format: 'webp' },
        (error, result) => {
          if (error) {
            console.error('Cloudinary Error:', error);
            return reject(new AppError(`Upload failed: ${error.message || 'Unknown Cloudinary error'}`, 500));
          }
          resolve(result);
        }
      );
      stream.end(processedBuffer);
    });

    // Step 3: DB update (With Compensating Action for Fault Tolerance)
    try {
      const profile = await UserProfile.findOneAndUpdate(
        { userId },
        { avatar: { url: uploadResult.secure_url, publicId: uploadResult.public_id } },
        { new: true }
      );
      if (!profile) throw new AppError('Profile not found', 404);

      // Invalidate Cache
      await invalidateCache(`user_profile:${userId}`);

      return successResponse(res, HTTP_STATUS.OK, 'Avatar uploaded', { avatarUrl: uploadResult.secure_url });
    } catch (dbError) {
      // 🚨 COMPENSATING ACTION: DB failed, so delete the orphaned image from Cloudinary!
      console.error('DB Update failed after Cloudinary upload. Rolling back image...');
      await cloudinary.uploader.destroy(uploadResult.public_id).catch(() => {});
      throw dbError; // rethrow to be caught by outer catch block
    }
  } catch (err) { next(err); }
};

// ── Delete Avatar ──────────────────────────────────────────────
export const deleteAvatar = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const profile = await UserProfile.findOne({ userId });
    if (!profile) throw new AppError('Profile not found', 404);

    if (profile.avatar?.publicId) {
      await cloudinary.uploader.destroy(profile.avatar.publicId);
    }
    profile.avatar = { url: null, publicId: null };
    await profile.save();

    await invalidateCache(`user_profile:${userId}`);

    return successResponse(res, HTTP_STATUS.OK, 'Avatar removed');
  } catch (err) { next(err); }
};

// ── NOTE: getEnrolledCourses and updateProgress have been REMOVED! ──
// Why? To adhere to microservices boundaries. The Course Service (Enrollment collection)
// is the absolute Single Source of Truth for progress. We do not duplicate it here.

// ── Admin: Get All Users ───────────────────────────────────────
export const getAllUsers = async (req, res, next) => {
  try {
    if (getUserRole(req) !== 'admin') throw new AppError('Access denied', 403);

    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      UserProfile.find().select('-enrolledCourses').skip(skip).limit(Number(limit)),
      UserProfile.countDocuments(),
    ]);

    return successResponse(res, HTTP_STATUS.OK, 'Users fetched', {
      users,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};

// ── Toggle Wishlist (Atomic / Race Condition Free) ─────────────
export const toggleWishlist = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { courseId } = req.params;

    if (!courseId) throw new AppError('Course ID required', 400);

    // Fetch just to see if it exists in the array
    const profile = await UserProfile.findOne({ userId });
    if (!profile) throw new AppError('Profile not found', 404);

    const isInWishlist = profile.wishlist.includes(courseId);

    // ATOMIC UPDATE: Prevents Race Conditions if user spam-clicks the button
    const updatedProfile = await UserProfile.findOneAndUpdate(
      { userId },
      isInWishlist ? { $pull: { wishlist: courseId } } : { $addToSet: { wishlist: courseId } },
      { new: true }
    );

    // Invalidate cache since wishlist changed
    await invalidateCache(`user_profile:${userId}`);

    return successResponse(res, HTTP_STATUS.OK, 'Wishlist updated', updatedProfile.wishlist);
  } catch (err) { next(err); }
};

// ── Get My Enrolled Courses ───────────────────────────────
export const getMyEnrolledCourses = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) throw new AppError('Unauthorized', 401);
    const enrollments = await Enrollment.find({ userId }).sort({ createdAt: -1 });
    return successResponse(res, HTTP_STATUS.OK, 'Enrolled courses fetched', enrollments);
  } catch (err) { next(err); }
};
