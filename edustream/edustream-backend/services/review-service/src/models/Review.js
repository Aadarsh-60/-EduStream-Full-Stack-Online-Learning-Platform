import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userName: { type: String, required: true },
    rating:   { type: Number, required: true, min: 1, max: 5 },
    comment:  { type: String, maxlength: 1000, default: '' },
  },
  { timestamps: true }
);

// Ek user ek course pe sirf ek review
reviewSchema.index({ userId: 1, courseId: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);
export default Review;
