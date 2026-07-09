import { v2 as cloudinary } from 'cloudinary';
import { AppError } from '../../../../shared/middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../../../../shared/utils/apiResponse.js';

// Socket.io instance - index.js mein set hoga
let io;
export const setIo = (socketIo) => { io = socketIo; };

// ── Upload Video ───────────────────────────────────────────────
// Cloudinary pe upload + Socket.io se progress emit
export const uploadVideo = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!req.file) throw new AppError('Please upload a video', 400);

    const { courseId, lectureId } = req.body;

    // Cloudinary upload with progress tracking
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:        'edustream/videos',
          resource_type: 'video',
          // Cloudinary video optimization
          eager: [{ streaming_profile: 'hd', format: 'm3u8' }], // HLS streaming
          eager_async: true,
          public_id: `video_${courseId}_${lectureId || Date.now()}`,
        },
        (error, result) => {
          if (error) reject(new AppError('Video upload failed', 500));
          else resolve(result);
        }
      );

      // Progress track karo - file ka kitna percent upload hua
      let uploadedBytes = 0;
      const totalBytes = req.file.buffer.length;

      // Simulated chunked progress emit (Cloudinary SDK direct progress nahi deta)
      const progressInterval = setInterval(() => {
        uploadedBytes = Math.min(uploadedBytes + totalBytes * 0.1, totalBytes);
        const percent = Math.round((uploadedBytes / totalBytes) * 100);

        // Socket.io se client ko progress bhejo
        if (io && userId) {
          io.to(userId).emit('uploadProgress', { lectureId, percent });
        }

        if (percent >= 100) clearInterval(progressInterval);
      }, 500);

      stream.end(req.file.buffer);
    });

    return successResponse(res, HTTP_STATUS.OK, 'Video uploaded successfully', {
      videoUrl:  uploadResult.secure_url,
      publicId:  uploadResult.public_id,
      duration:  uploadResult.duration, // seconds
      format:    uploadResult.format,
      hlsUrl:    uploadResult.eager?.[0]?.secure_url || null,
    });
  } catch (err) { next(err); }
};

// ── Upload PDF ─────────────────────────────────────────────────
export const uploadPDF = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('Please upload a PDF', 400);

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'edustream/pdfs', resource_type: 'raw', format: 'pdf' },
        (error, result) => (error ? reject(new AppError('PDF upload failed', 500)) : resolve(result))
      );
      stream.end(req.file.buffer);
    });

    return successResponse(res, HTTP_STATUS.OK, 'PDF uploaded successfully', {
      pdfUrl:  uploadResult.secure_url,
      publicId: uploadResult.public_id,
    });
  } catch (err) { next(err); }
};

// ── Delete Media ───────────────────────────────────────────────
export const deleteMedia = async (req, res, next) => {
  try {
    const { publicId, resourceType = 'video' } = req.body;
    if (!publicId) throw new AppError('publicId required', 400);

    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return successResponse(res, HTTP_STATUS.OK, 'Media deleted');
  } catch (err) { next(err); }
};

// ── Get Video Signature (for direct frontend upload) ──────────
// Frontend directly Cloudinary pe upload kare (gateway ke bina)
// Ye approach better hai large files ke liye
export const getUploadSignature = async (req, res, next) => {
  try {
    const { folder = 'edustream/videos' } = req.query;
    const timestamp = Math.round(new Date().getTime() / 1000);

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      process.env.CLOUDINARY_API_SECRET
    );

    return successResponse(res, HTTP_STATUS.OK, 'Signature generated', {
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey:    process.env.CLOUDINARY_API_KEY,
    });
  } catch (err) { next(err); }
};
