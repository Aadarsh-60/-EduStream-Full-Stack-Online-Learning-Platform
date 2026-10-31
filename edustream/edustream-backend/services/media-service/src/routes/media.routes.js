import express from 'express';
import multer from 'multer';
import {
  uploadVideo, uploadPDF, deleteMedia, getUploadSignature,
  compressAndUploadImage, generateSignedVideoUrl
} from '../controllers/media.controller.js';
import { verifyToken } from '../../../../shared/middlewares/auth.js';

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

router.post('/video',     verifyToken, videoUpload, uploadVideo);
router.post('/pdf',       verifyToken, pdfUpload, uploadPDF);
router.delete('/delete',  verifyToken, deleteMedia);
router.get('/signature',  verifyToken, getUploadSignature);

// Image upload with auto-compression (Sharp)
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB raw max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'), false);
  },
}).single('image');

router.post('/image',      verifyToken, imageUpload, compressAndUploadImage);

// Generate a time-limited signed URL for private video playback
router.post('/signed-url', verifyToken, generateSignedVideoUrl);

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'media-service' }));

export default router;
