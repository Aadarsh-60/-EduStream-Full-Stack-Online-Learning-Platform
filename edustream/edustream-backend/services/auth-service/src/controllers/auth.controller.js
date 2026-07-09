import User from '../models/User.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateRandomToken,
  getTokenExpiry,
  setRefreshTokenCookie,
} from '../utils/token.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendContactAdminEmail } from '../utils/email.js';
import { AppError } from '../../../../shared/middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../../../../shared/utils/apiResponse.js';

// ── Register ──────────────────────────────────────────────────
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) throw new AppError('Email already registered', 409);

    // Generate 6-digit OTP
    const verifyOtp = Math.floor(100000 + Math.random() * 900000).toString();

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student',
      emailVerifyToken: verifyOtp,
      emailVerifyExpiry: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Email send karo (async - user ko wait nahi karwate)
    sendVerificationEmail(email, name, verifyOtp).catch(console.error);

    return successResponse(res, HTTP_STATUS.CREATED, 'Registration successful! Please verify your email.', {
      userId: user._id,
      email: user.email,
    });
  } catch (err) {
    next(err);
  }
};

// ── Verify Email ──────────────────────────────────────────────
export const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) throw new AppError('Email and OTP required', 400);

    const user = await User.findOne({
      email,
      emailVerifyToken: otp,
      emailVerifyExpiry: { $gt: Date.now() },
    });
    if (!user) throw new AppError('Invalid or expired token', 400);

    user.isEmailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpiry = undefined;
    await user.save();

    return successResponse(res, HTTP_STATUS.OK, 'Email verified successfully!');
  } catch (err) {
    next(err);
  }
};

// ── Login ─────────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // password field select:false hai isliye explicitly select karo
    const user = await User.findOne({ email }).select('+password');
    if (!user) throw new AppError('Invalid email or password', 401);
    if (!user.isActive) throw new AppError('Account deactivated', 403);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new AppError('Invalid email or password', 401);

    if (!user.isEmailVerified) throw new AppError('Please verify your email first', 403);

    const payload = { userId: user._id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // DB mein refresh token save karo
    user.cleanExpiredTokens();
    user.refreshTokens.push({ token: refreshToken });
    await user.save({ validateBeforeSave: false });

    // Refresh token cookie mein
    setRefreshTokenCookie(res, refreshToken);

    return successResponse(res, HTTP_STATUS.OK, 'Login successful', {
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    next(err);
  }
};

// ── Refresh Access Token ──────────────────────────────────────
export const refreshAccessToken = async (req, res, next) => {
  try {
    const incomingToken = req.cookies?.refreshToken;
    if (!incomingToken) throw new AppError('Refresh token required', 401);

    const decoded = verifyRefreshToken(incomingToken);

    const user = await User.findOne({
      _id: decoded.userId,
      'refreshTokens.token': incomingToken,
    });
    if (!user) throw new AppError('Invalid refresh token', 401);

    // Token rotation - purana hatao naya do
    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== incomingToken);
    const newRefreshToken = generateRefreshToken({ userId: user._id, email: user.email, role: user.role });
    user.refreshTokens.push({ token: newRefreshToken });
    await user.save({ validateBeforeSave: false });

    const newAccessToken = generateAccessToken({ userId: user._id, email: user.email, role: user.role });
    setRefreshTokenCookie(res, newRefreshToken);

    return successResponse(res, HTTP_STATUS.OK, 'Token refreshed', { accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
};

// ── Logout ────────────────────────────────────────────────────
export const logout = async (req, res, next) => {
  try {
    const incomingToken = req.cookies?.refreshToken;
    const userId = req.headers['x-user-id'];

    if (incomingToken && userId) {
      await User.findByIdAndUpdate(userId, {
        $pull: { refreshTokens: { token: incomingToken } },
      });
    }

    res.clearCookie('refreshToken');
    return successResponse(res, HTTP_STATUS.OK, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

// ── Forgot Password ───────────────────────────────────────────
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (user) {
      const resetOtp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
      user.passwordResetToken = resetOtp;
      user.passwordResetExpiry = getTokenExpiry(10); // 10 min
      await user.save({ validateBeforeSave: false });
      
      console.log(`\n\n🔐 PASSWORD RESET OTP (Local Dev): ${resetOtp}\n\n`);
      
      // Send OTP via email
      sendPasswordResetEmail(email, user.name, resetOtp).catch(err => {
        console.error('Failed to send reset OTP email. OTP printed above.');
      });
    }

    return successResponse(res, HTTP_STATUS.OK, 'If this email exists, an OTP has been sent.');
  } catch (err) {
    next(err);
  }
};

// ── Reset Password ────────────────────────────────────────────
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body; // 'token' is now the OTP

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpiry: { $gt: Date.now() },
    });
    if (!user) throw new AppError('Invalid or expired OTP', 400);

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    user.refreshTokens = []; // Sab devices se logout
    await user.save();

    return successResponse(res, HTTP_STATUS.OK, 'Password reset successful. Please login again.');
  } catch (err) {
    next(err);
  }
};

// ── Get Me (current user) ─────────────────────────────────────
export const getMe = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    return successResponse(res, HTTP_STATUS.OK, 'User fetched', {
      id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar,
    });
  } catch (err) {
    next(err);
  }
};

// ── Contact Admin ─────────────────────────────────────────────
export const contactAdmin = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      throw new AppError('All fields are required', 400);
    }

    await sendContactAdminEmail(name, email, subject, message);

    return successResponse(res, HTTP_STATUS.OK, 'Message sent successfully');
  } catch (err) {
    next(err);
  }
};
