import multer from 'multer';
import sharp from 'sharp';
import { AppError } from '../../../../shared/middlewares/errorHandler.js';

// Memory storage - file disk pe nahi, buffer mein rakho
// Sharp process karega phir Cloudinary upload
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only JPEG, PNG, WebP allowed', 400), false);
  }
};

export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
}).single('avatar');

// Sharp se resize + compress karo before Cloudinary upload
export const processAvatar = async (buffer) => {
  return sharp(buffer)
    .resize(300, 300, { fit: 'cover', position: 'center' })
    .webp({ quality: 80 })
    .toBuffer();
};
