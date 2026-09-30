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
      trim: true,
    },
    password: {
      type: String,
      validate: {
        validator: function (v) {
          if (!v) return true; // allow empty for google auth
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/.test(v);
        },
        message:
          'Password must be at least 8 chars long and contain 1 uppercase, 1 lowercase, 1 number, and 1 special character',
      },
      select: false, // query mein by default password nahi aayega
    },
    role: {
      type: String,
      enum: ['student', 'instructor', 'admin'],
      default: 'student',
    },

    // Email verification (Level 1 & 3)
    isEmailVerified: { type: Boolean, default: false },
    emailVerifyToken: String,
    emailVerifyExpiry: Date,

    // Brute Force & Rate Limit Protection (Level 3)
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },

    // Multi-Factor Authentication - TOTP RFC 6238 (Level 4)
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    twoFactorTempSecret: { type: String, select: false },
    twoFactorRecoveryCodes: [
      {
        codeHash: String,
        used: { type: Boolean, default: false },
        usedAt: Date,
      },
    ],

    // Refresh tokens & Session / Device Tracking (Level 2 & Level 4)
    refreshTokens: [
      {
        token: String,
        device: { type: String, default: 'Web Browser' },
        ip: { type: String, default: '127.0.0.1' },
        createdAt: { type: Date, default: Date.now },
        lastActive: { type: Date, default: Date.now },
      },
    ],
    
    // Trusted Devices to bypass 2FA for 30 days
    trustedDevices: [
      {
        tokenHash: String,
        device: String,
        ip: String,
        expiresAt: Date,
      }
    ],

    // Security Audit Log / Device Tracking (Level 4)
    loginHistory: [
      {
        ip: String,
        device: String,
        status: { type: String, enum: ['success', 'failed_locked', 'mfa_challenge', 'failed_credentials'] },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // Google OAuth (Level 4)
    googleId: { type: String, sparse: true },
    avatar: { type: String, default: null },

    // Password reset (Level 3)
    passwordResetToken: String,
    passwordResetExpiry: Date,

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Password save hone se pehle hash karo (Level 1)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Password compare method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if account is temporarily locked (Level 3)
userSchema.methods.isLocked = function () {
  return Boolean(this.lockUntil && this.lockUntil > Date.now());
};

// Handle failed login attempt (Locks for 15 min after 5 attempts)
userSchema.methods.incLoginAttempts = async function () {
  // If a previous lock has expired, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { failedLoginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { failedLoginAttempts: 1 } };
  // Lock after 5 consecutive failed attempts
  if (this.failedLoginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: new Date(Date.now() + 15 * 60 * 1000) }; // 15 minutes
  }

  return this.updateOne(updates);
};

// Reset login attempts on successful authentication
userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $set: { failedLoginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

// 7 din se purane refresh tokens hata do
userSchema.methods.cleanExpiredTokens = function () {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  this.refreshTokens = this.refreshTokens.filter((t) => t.createdAt > sevenDaysAgo);
};

const User = mongoose.model('User', userSchema);
export default User;
