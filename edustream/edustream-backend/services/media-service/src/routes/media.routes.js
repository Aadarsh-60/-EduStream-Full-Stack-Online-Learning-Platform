import express from 'express';
import multer from 'multer';
import {
  uploadVideo, uploadPDF, deleteMedia, getUploadSignature,
  compressAndUploadImage, generateSignedVideoUrl
} from '../controllers/media.controller.js';

const router = express.Router();

// Video: 500MB max
const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files allowed'), false);
  },
}).single('video');

// PDF: 20MB max
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'), false);
  },
}).single('pdf');

router.post('/video',     videoUpload, uploadVideo);
router.post('/pdf',       pdfUpload, uploadPDF);
router.delete('/delete',  deleteMedia);
router.get('/signature',  getUploadSignature);

// Image upload with auto-compression (Sharp)
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB raw max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'), false);
  },
}).single('image');

router.post('/image',     imageUpload, compressAndUploadImage);

// Generate a time-limited signed URL for private video playback
router.post('/signed-url', generateSignedVideoUrl);

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'media-service' }));

export default router;
