import { v2 as cloudinary } from 'cloudinary';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import { AppError } from '../../../../shared/middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../../../../shared/utils/apiResponse.js';

const getUserId   = (req) => req.headers['x-user-id'];
const getUserRole = (req) => req.headers['x-user-role'];
const getUserName = (req) => req.headers['x-user-name'] || 'Instructor';

// ── Get All Courses (with filters) ────────────────────────────
export const getAllCourses = async (req, res, next) => {
  try {
    const { category, level, minPrice, maxPrice, page = 1, limit = 12 } = req.query;

    const filter = { status: 'published' };
    if (category) filter.category = category;
    if (level)    filter.level    = level;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const skip = (page - 1) * limit;
    const [courses, total] = await Promise.all([
      Course.find(filter).select('-sections').skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Course.countDocuments(filter),
    ]);

    return successResponse(res, HTTP_STATUS.OK, 'Courses fetched', {
      courses,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};

// ── Get Single Course ──────────────────────────────────────────
export const getCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) throw new AppError('Course not found', 404);

    // Free lectures hi dikhao agar enrolled nahi hai
    const userId = getUserId(req);
    let courseData = course.toObject();

    if (userId) {
      const enrollment = await Enrollment.findOne({ userId, courseId: course._id });
      if (!enrollment) {
        // Enrolled nahi - paid lectures ka video URL hide karo
        courseData.sections = courseData.sections.map((section) => ({
          ...section,
          lectures: section.lectures.map((lecture) => ({
            ...lecture,
            videoUrl: lecture.isFree ? lecture.videoUrl : null,
          })),
        }));
      }
    }

    return successResponse(res, HTTP_STATUS.OK, 'Course fetched', courseData);
  } catch (err) { next(err); }
};

// ── Create Course (Instructor only) ───────────────────────────
export const createCourse = async (req, res, next) => {
  try {
    const role = getUserRole(req);
    if (role !== 'instructor' && role !== 'admin') throw new AppError('Only instructors can create courses', 403);

    const userId = getUserId(req);
    const { title, description, price, category, level, language, tags, requirements, learningOutcomes } = req.body;

    const course = await Course.create({
      title, description, price, category,
      level: level || 'beginner',
      language: language || 'English',
      tags: tags || [],
      requirements: requirements || [],
      learningOutcomes: learningOutcomes || [],
      instructor: { id: userId, name: getUserName(req) },
      status: 'draft',
    });

    return successResponse(res, HTTP_STATUS.CREATED, 'Course created', course);
  } catch (err) { next(err); }
};

// ── Update Course ──────────────────────────────────────────────
export const updateCourse = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const course = await Course.findById(req.params.id);
    if (!course) throw new AppError('Course not found', 404);

    // Sirf apna course update kar sakta hai (admin ko exception)
    if (course.instructor.id.toString() !== userId && getUserRole(req) !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    const allowedFields = ['title', 'description', 'price', 'discountPrice', 'category', 'level', 'language', 'tags', 'requirements', 'learningOutcomes', 'status'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) course[field] = req.body[field];
    });

    await course.save();
    return successResponse(res, HTTP_STATUS.OK, 'Course updated', course);
  } catch (err) { next(err); }
};

// ── Delete Course ──────────────────────────────────────────────
export const deleteCourse = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const course = await Course.findById(req.params.id);
    if (!course) throw new AppError('Course not found', 404);

    if (course.instructor.id.toString() !== userId && getUserRole(req) !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    // Cloudinary thumbnail delete
    if (course.thumbnail?.publicId) {
      await cloudinary.uploader.destroy(course.thumbnail.publicId);
    }

    await Course.findByIdAndDelete(req.params.id);
    return successResponse(res, HTTP_STATUS.OK, 'Course deleted');
  } catch (err) { next(err); }
};

// ── Upload Thumbnail ───────────────────────────────────────────
export const uploadThumbnail = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!req.file) throw new AppError('Please upload an image', 400);

    const course = await Course.findById(req.params.id);
    if (!course) throw new AppError('Course not found', 404);

    if (course.instructor.id.toString() !== userId && getUserRole(req) !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    // Purana thumbnail delete
    if (course.thumbnail?.publicId) {
      await cloudinary.uploader.destroy(course.thumbnail.publicId);
    }

    // Cloudinary upload
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'edustream/thumbnails', resource_type: 'image' },
        (error, result) => (error ? reject(new AppError('Upload failed', 500)) : resolve(result))
      );
      stream.end(req.file.buffer);
    });

    course.thumbnail = { url: uploadResult.secure_url, publicId: uploadResult.public_id };
    await course.save();

    return successResponse(res, HTTP_STATUS.OK, 'Thumbnail uploaded', { thumbnailUrl: uploadResult.secure_url });
  } catch (err) { next(err); }
};

// ── Add Section ────────────────────────────────────────────────
export const addSection = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) throw new AppError('Course not found', 404);

    if (course.instructor.id.toString() !== getUserId(req) && getUserRole(req) !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    course.sections.push({ title: req.body.title, order: course.sections.length + 1, lectures: [] });
    await course.save();

    return successResponse(res, HTTP_STATUS.CREATED, 'Section added', course);
  } catch (err) { next(err); }
};

// ── Add Lecture to Section ─────────────────────────────────────
export const addLecture = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) throw new AppError('Course not found', 404);

    if (course.instructor.id.toString() !== getUserId(req) && getUserRole(req) !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    const section = course.sections.id(req.params.sectionId);
    if (!section) throw new AppError('Section not found', 404);

    const { title, description, isFree, videoUrl, duration } = req.body;
    section.lectures.push({
      title,
      description: description || '',
      videoUrl: videoUrl || null,
      duration: duration || 0,
      isFree: isFree || false,
      order: section.lectures.length + 1,
    });

    course.totalLectures = course.sections.reduce((acc, s) => acc + s.lectures.length, 0);
    await course.save();

    return successResponse(res, HTTP_STATUS.CREATED, 'Lecture added', course);
  } catch (err) { next(err); }
};

// ── Get Instructor Courses ─────────────────────────────────────
export const getInstructorCourses = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const courses = await Course.find({ 'instructor.id': userId }).select('-sections');
    return successResponse(res, HTTP_STATUS.OK, 'Instructor courses', courses);
  } catch (err) { next(err); }
};

// ── Check Enrollment ───────────────────────────────────────────
export const checkEnrollment = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const enrollment = await Enrollment.findOne({ userId, courseId: req.params.id });
    return successResponse(res, HTTP_STATUS.OK, 'Enrollment status', { isEnrolled: !!enrollment, enrollment });
  } catch (err) { next(err); }
};

// ── Get Course Students (Instructor) ──────────────────────────
export const getCourseStudents = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) throw new AppError('Course not found', 404);

    if (course.instructor.id.toString() !== getUserId(req) && getUserRole(req) !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    const enrollments = await Enrollment.find({ courseId: req.params.id });
    return successResponse(res, HTTP_STATUS.OK, 'Students fetched', enrollments);
  } catch (err) { next(err); }
};

// ── Internal: Enroll User (called by payment service) ─────────
export const enrollUser = async (req, res, next) => {
  try {
    const { userId, courseId, paymentId, amount } = req.body;

    const existing = await Enrollment.findOne({ userId, courseId });
    if (existing) return successResponse(res, HTTP_STATUS.OK, 'Already enrolled', existing);

    const enrollment = await Enrollment.create({ userId, courseId, paymentId, amount });

    // Course ka enrolled count badhao
    await Course.findByIdAndUpdate(courseId, { $inc: { enrolledCount: 1 } });

    return successResponse(res, HTTP_STATUS.CREATED, 'Enrolled successfully', enrollment);
  } catch (err) { next(err); }
};

// ── Internal: Update Course Rating (called by review service) ─
export const updateCourseRating = async (req, res, next) => {
  try {
    const { rating, ratingCount } = req.body;
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { rating: Number(rating), ratingCount: Number(ratingCount) },
      { new: true }
    );
    if (!course) throw new AppError('Course not found', 404);
    
    return successResponse(res, HTTP_STATUS.OK, 'Rating updated', course);
  } catch (err) { next(err); }
};
