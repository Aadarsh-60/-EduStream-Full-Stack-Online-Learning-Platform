import mongoose from 'mongoose';

// Auth service credentials handle karta hai, ye sirf profile data
const userProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
    name:   { type: String, required: true, trim: true },
    email:  { type: String, required: true, unique: true, lowercase: true },
    role:   { type: String, enum: ['student', 'instructor', 'admin'], default: 'student' },

    avatar: {
      url:      { type: String, default: null },
      publicId: { type: String, default: null }, // Cloudinary delete ke liye
    },

    bio:      { type: String, maxlength: 500, default: '' },
    headline: { type: String, maxlength: 120, default: '' },
    website:  { type: String, default: '' },
    linkedin: { type: String, default: '' },
    twitter:  { type: String, default: '' },

    // Note: enrolledCourses was removed!
    // The Course Service (Enrollment collection) is the Single Source of Truth.
    // Tracking high-frequency data (video progress) inside the master profile document 
    // causes severe write-locks and document fragmentation.

    // Student ka wishlist
    wishlist: [{ type: mongoose.Schema.Types.ObjectId }],

    // Instructor ka created courses list
    createdCourses: [{ type: mongoose.Schema.Types.ObjectId }],
    totalEarnings:  { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const UserProfile = mongoose.model('UserProfile', userProfileSchema);
export default UserProfile;
