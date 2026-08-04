import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true; // allow empty for google auth
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/.test(v);
        },
        message: 'Password must be at least 8 chars long and contain 1 uppercase, 1 lowercase, 1 number, and 1 special character'
      },
      select: false, // query mein by default password nahi aayega
    },
    role: {
      type: String,
      enum: ['student', 'instructor', 'admin'],
      default: 'student',
    },

    // Email verification
    isEmailVerified: { type: Boolean, default: false },
    emailVerifyToken: String,
    emailVerifyExpiry: Date,

    // Refresh tokens - multiple device support
    refreshTokens: [
      {
        token: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Google OAuth
    googleId: { type: String, sparse: true },
    avatar: { type: String, default: null },

    // Password reset
    passwordResetToken: String,
    passwordResetExpiry: Date,

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Password save hone se pehle hash karo
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Password compare method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 7 din se purane refresh tokens hata do
userSchema.methods.cleanExpiredTokens = function () {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  this.refreshTokens = this.refreshTokens.filter((t) => t.createdAt > sevenDaysAgo);
};

const User = mongoose.model('User', userSchema);
export default User;
