import { v2 as cloudinary } from 'cloudinary';
import UserProfile from '../models/UserProfile.js';
import { processAvatar } from '../middlewares/upload.js';
import { AppError } from '../../../../shared/middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../../../../shared/utils/apiResponse.js';

// Gateway headers se user info milti hai
const getUserId = (req) => req.headers['x-user-id'];
const getUserRole = (req) => req.headers['x-user-role'];

// ── Get My Profile ─────────────────────────────────────────────
export const getMyProfile = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const profile = await UserProfile.findOne({ userId });
    if (!profile) throw new AppError('Profile not found', 404);
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

    // Step 3: DB update
    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      { avatar: { url: uploadResult.secure_url, publicId: uploadResult.public_id } },
      { new: true }
    );
    if (!profile) throw new AppError('Profile not found', 404);

    return successResponse(res, HTTP_STATUS.OK, 'Avatar uploaded', { avatarUrl: uploadResult.secure_url });
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

    return successResponse(res, HTTP_STATUS.OK, 'Avatar removed');
  } catch (err) { next(err); }
};

// ── Get Enrolled Courses ───────────────────────────────────────
export const getEnrolledCourses = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const profile = await UserProfile.findOne({ userId }).select('enrolledCourses');
    if (!profile) throw new AppError('Profile not found', 404);
    return successResponse(res, HTTP_STATUS.OK, 'Enrolled courses', profile.enrolledCourses);
  } catch (err) { next(err); }
};

// ── Update Course Progress ─────────────────────────────────────
export const updateProgress = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { courseId, progress } = req.body;

    const profile = await UserProfile.findOne({ userId });
    if (!profile) throw new AppError('Profile not found', 404);

    const enrollment = profile.enrolledCourses.find((e) => e.courseId.toString() === courseId);
    if (!enrollment) throw new AppError('Not enrolled in this course', 403);

    enrollment.progress = progress;
    await profile.save();

    return successResponse(res, HTTP_STATUS.OK, 'Progress updated', { progress });
  } catch (err) { next(err); }
};

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

// ── Toggle Wishlist ────────────────────────────────────────────
export const toggleWishlist = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { courseId } = req.params;

    if (!courseId) throw new AppError('Course ID required', 400);

    const profile = await UserProfile.findOne({ userId });
    if (!profile) throw new AppError('Profile not found', 404);

    const index = profile.wishlist.indexOf(courseId);
    if (index === -1) {
      profile.wishlist.push(courseId);
    } else {
      profile.wishlist.splice(index, 1);
    }

    await profile.save();
    return successResponse(res, HTTP_STATUS.OK, 'Wishlist updated', profile.wishlist);
  } catch (err) { next(err); }
};
