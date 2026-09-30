import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
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

// ── Smart Image Upload with Auto-Compression (using Sharp) ─────
// WHY: A user might upload a 10MB raw camera photo as their course
// thumbnail. Serving 10MB images to 10,000 users wastes bandwidth
// and slows down the page. We compress it BEFORE uploading.
//
// HOW: We use the 'sharp' library (the fastest Node.js image processor)
// to: 1) Resize to max 1280px width, 2) Convert to WebP format (50%
// smaller than JPEG at same quality), 3) Then upload to Cloudinary.
export const compressAndUploadImage = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('Please upload an image', 400);

    const originalSizeKB = Math.round(req.file.buffer.length / 1024);

    // ── Step 1: Compress using Sharp ──────────────────────────
    const compressedBuffer = await sharp(req.file.buffer)
      .resize({ width: 1280, withoutEnlargement: true }) // Max 1280px wide, never upscale
      .webp({ quality: 82 })                             // Convert to WebP at 82% quality
      .toBuffer();

    const compressedSizeKB = Math.round(compressedBuffer.length / 1024);
    const savingPercent = Math.round((1 - compressedSizeKB / originalSizeKB) * 100);

    // ── Step 2: Upload the COMPRESSED buffer to Cloudinary ────
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'edustream/images', resource_type: 'image', format: 'webp' },
        (error, result) => (error ? reject(new AppError('Image upload failed', 500)) : resolve(result))
      );
      stream.end(compressedBuffer);
    });

    return successResponse(res, HTTP_STATUS.OK, 'Image uploaded & compressed', {
      imageUrl:      uploadResult.secure_url,
      publicId:      uploadResult.public_id,
      originalSizeKB,
      compressedSizeKB,
      savedPercent:  `${savingPercent}%`, // e.g., "68%" — great talking point!
    });
  } catch (err) { next(err); }
};

// ── Generate Signed URL for Private Video Access ───────────────
// WHY: If a student buys a course, the video URL should NOT be shareable.
// A plain Cloudinary URL (https://res.cloudinary.com/...) is public
// forever — anyone with the link can watch. This is a major security flaw.
//
// HOW: We generate a SIGNED URL that is only valid for 2 hours.
// After 2 hours, the URL expires and becomes invalid.
// Each time the student wants to watch, our backend generates a fresh
// signed URL — so the link can't be shared or hotlinked.
export const generateSignedVideoUrl = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const { publicId } = req.body;

    if (!userId) throw new AppError('Unauthorized', 401);
    if (!publicId) throw new AppError('publicId is required', 400);

    // Generate a signed URL valid for 2 hours (7200 seconds)
    const expiresAt = Math.round(Date.now() / 1000) + 7200;

    const signedUrl = cloudinary.url(publicId, {
      resource_type: 'video',
      sign_url:      true,      // This is the magic flag
      expires_at:    expiresAt, // Unix timestamp for expiry
      secure:        true,
    });

    return successResponse(res, HTTP_STATUS.OK, 'Signed URL generated', {
      signedUrl,
      expiresIn: '2 hours',
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    });
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
