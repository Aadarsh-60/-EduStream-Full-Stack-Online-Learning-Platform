import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, required: true },

    // Payment reference
    paymentId: { type: String, default: null },
    amount:    { type: Number, required: true },

    // Progress tracking
    progress:         { type: Number, default: 0, min: 0, max: 100 },
    completedLectures: [{ type: mongoose.Schema.Types.ObjectId }],

    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Ek user ek course mein sirf ek baar enroll ho
enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
export default Enrollment;
