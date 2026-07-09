import express from 'express';
import multer from 'multer';
import {
  getAllCourses, getCourse, createCourse, updateCourse, deleteCourse,
  uploadThumbnail, addSection, addLecture, getInstructorCourses,
  checkEnrollment, getCourseStudents, enrollUser, updateCourseRating,
} from '../controllers/course.controller.js';
import { getCourseQA, askQuestion, replyToQuestion } from '../controllers/qa.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Public
router.get('/', getAllCourses);
router.get('/mine', getInstructorCourses);
router.get('/:id', getCourse);
router.get('/:id/enrollment', checkEnrollment);

// Course CRUD
router.post('/', createCourse);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);

// Thumbnail
router.post('/:id/thumbnail', upload.single('thumbnail'), uploadThumbnail);

// Curriculum
router.post('/:id/sections', addSection);
router.post('/:id/sections/:sectionId/lectures', addLecture);

// Students
router.get('/:id/students', getCourseStudents);

// Internal - payment service calls this
router.post('/internal/enroll', enrollUser);

// Internal - review service calls this
router.put('/:id/rating', updateCourseRating);

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'course-service' }));
// Q&A Routes
router.get('/:courseId/qa', getCourseQA);
router.post('/:courseId/qa', askQuestion);
router.post('/:courseId/qa/:qaId/reply', replyToQuestion);

export default router;
