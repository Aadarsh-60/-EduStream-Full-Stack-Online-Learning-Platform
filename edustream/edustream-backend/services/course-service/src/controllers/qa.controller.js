import CourseQA from '../models/CourseQA.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import { successResponse, errorResponse, HTTP_STATUS } from '../../../../shared/utils/apiResponse.js';

const getUserId   = (req) => req.headers['x-user-id'];
const getUserRole = (req) => req.headers['x-user-role'];
const getUserName = (req) => req.headers['x-user-name'] || 'User';

// ── GET Q&A ───────────────────────────────────────────────────
export const getCourseQA = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const qaList = await CourseQA.find({ courseId }).sort({ createdAt: -1 });
    return successResponse(res, HTTP_STATUS.OK, 'Q&A fetched successfully', { qaList });
  } catch (error) {
    next(error);
  }
};

// ── POST Question ─────────────────────────────────────────────
export const askQuestion = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const userRole = getUserRole(req);
    const userName = getUserName(req);

    if (!userId) {
      return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, 'You must be logged in to ask a question');
    }
    const { courseId } = req.params;
    const { question } = req.body;

    if (!question || !question.trim()) {
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, 'Question text is required');
    }

    // Must be enrolled or be the instructor or admin
    if (userRole !== 'admin') {
      const course = await Course.findById(courseId);
      if (!course) return errorResponse(res, HTTP_STATUS.NOT_FOUND, 'Course not found');
      
      const isInstructor = course.instructor.id.toString() === userId.toString();
      if (!isInstructor) {
        const enrollment = await Enrollment.findOne({ courseId, studentId: userId });
        if (!enrollment) {
          return errorResponse(res, HTTP_STATUS.FORBIDDEN, 'You must be enrolled to ask a question');
        }
      }
    }

    const newQA = await CourseQA.create({
      courseId,
      user: { _id: userId, name: userName, role: userRole },
      question: question.trim()
    });

    return successResponse(res, HTTP_STATUS.CREATED, 'Question posted successfully', { qa: newQA });
  } catch (error) {
    next(error);
  }
};

// ── POST Reply ────────────────────────────────────────────────
export const replyToQuestion = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const userRole = getUserRole(req);
    const userName = getUserName(req);

    if (!userId) {
      return errorResponse(res, HTTP_STATUS.UNAUTHORIZED, 'You must be logged in to reply');
    }
    const { courseId, qaId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return errorResponse(res, HTTP_STATUS.BAD_REQUEST, 'Reply text is required');
    }

    const qa = await CourseQA.findOne({ _id: qaId, courseId });
    if (!qa) {
      return errorResponse(res, HTTP_STATUS.NOT_FOUND, 'Question thread not found');
    }

    // Must be enrolled or instructor
    if (userRole !== 'admin') {
      const course = await Course.findById(courseId);
      if (!course) return errorResponse(res, HTTP_STATUS.NOT_FOUND, 'Course not found');
      
      const isInstructor = course.instructor.id.toString() === userId.toString();
      if (!isInstructor) {
        const enrollment = await Enrollment.findOne({ courseId, studentId: userId });
        if (!enrollment) {
          return errorResponse(res, HTTP_STATUS.FORBIDDEN, 'You must be enrolled to reply');
        }
      }
    }

    qa.replies.push({
      user: { _id: userId, name: userName, role: userRole },
      text: text.trim()
    });

    await qa.save();

    return successResponse(res, HTTP_STATUS.OK, 'Reply posted successfully', { qa });
  } catch (error) {
    next(error);
  }
};
