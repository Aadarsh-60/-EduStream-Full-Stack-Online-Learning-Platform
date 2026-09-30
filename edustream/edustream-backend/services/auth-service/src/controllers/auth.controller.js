import User from '../models/User.js';
import UserProfile from '../../../user-service/src/models/UserProfile.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateMfaSessionToken,
  verifyMfaSessionToken,
  generateRandomToken,
  getTokenExpiry,
  setRefreshTokenCookie,
  consumeOAuthExchangeCode,
} from '../utils/token.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendContactAdminEmail,
  sendSecurityAlertEmail,
  sendSessionRevocationEmail,
} from '../utils/email.js';
import {
  generateTotpSecret,
  verifyTotpCode,
  buildOtpAuthUri,
  generateRecoveryCodes,
  verifyRecoveryCode,
} from '../utils/totp.js';
import { parseUserAgent, getClientIp } from '../utils/device.js';
import { AppError } from '../../../../shared/middlewares/errorHandler.js';
import { successResponse, HTTP_STATUS } from '../../../../shared/utils/apiResponse.js';
import { setCache, getCache, invalidateCache } from '../../../../shared/utils/cache.js';

// ── Register (Level 1 & 3) ──────────────────────────────────────
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      throw new AppError('Name, email, and password are required', 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      if (existing.isEmailVerified) {
        throw new AppError('Email already registered', 409);
      } else {
        // User exists but is not verified. Resend OTP and update details.
        const verifyOtp = Math.floor(100000 + Math.random() * 900000).toString();
        existing.name = name.trim();
        existing.password = password; // Pre-save hook will hash this
        existing.role = role || 'student';
        existing.emailVerifyToken = verifyOtp;
        existing.emailVerifyExpiry = Date.now() + 10 * 60 * 1000;
        await existing.save();

        await UserProfile.findOneAndUpdate(
          { userId: existing._id },
          { name: existing.name, role: existing.role },
          { upsert: true }
        );

        sendVerificationEmail(cleanEmail, existing.name, verifyOtp).catch(console.error);

        return successResponse(res, HTTP_STATUS.CREATED, 'Verification code resent. Please verify your email.', {
          userId: existing._id,
          email: existing.email,
        });
      }
    }

    // Generate 6-digit OTP
    const verifyOtp = Math.floor(100000 + Math.random() * 900000).toString();

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: role || 'student',
      emailVerifyToken: verifyOtp,
      emailVerifyExpiry: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Create corresponding user profile
    await UserProfile.create({
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    // Email send karo (async)
    sendVerificationEmail(cleanEmail, user.name, verifyOtp).catch(console.error);

    return successResponse(res, HTTP_STATUS.CREATED, 'Registration successful! Please verify your email.', {
      userId: user._id,
      email: user.email,
    });
  } catch (err) {
    next(err);
  }
};

// ── Verify Email (Level 3) ────────────────────────────────────
export const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) throw new AppError('Email and OTP required', 400);

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      emailVerifyToken: otp.trim(),
      emailVerifyExpiry: { $gt: Date.now() },
    });
    if (!user) throw new AppError('Invalid or expired OTP', 400);

    user.isEmailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpiry = undefined;
    await user.save();

    return successResponse(res, HTTP_STATUS.OK, 'Email verified successfully!');
  } catch (err) {
    next(err);
  }
};

// ── Login (Level 1, 2, 3, 4) ──────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError('Email and password are required', 400);

    const cleanEmail = email.trim().toLowerCase();
    const clientIp = getClientIp(req);
    const device = parseUserAgent(req.headers['user-agent']);

    // password & 2FA secret explicitly select karo
    const user = await User.findOne({ email: cleanEmail }).select('+password +twoFactorSecret');
    if (!user) throw new AppError('Invalid email or password', 401);
    if (!user.isActive) throw new AppError('Account deactivated', 403);

    // Brute Force Check (Level 3)
    if (user.isLocked()) {
      const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      user.loginHistory.unshift({ ip: clientIp, device, status: 'failed_locked' });
      await user.save({ validateBeforeSave: false });

      throw new AppError(
        `Account temporarily locked due to 5 consecutive failed login attempts. Please try again after ${remainingMinutes} minute(s).`,
        429
      );
    }

    if (!user.password) {
      throw new AppError('This account was created with Google. Please use Google Login.', 401);
    }

    // Verify password (Level 1)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      const updatedUser = await User.findById(user._id);

      // If account just got locked on this attempt, send an alert email
      if (updatedUser.isLocked()) {
        sendSecurityAlertEmail(user.email, user.name, {
          title: 'Account Locked After Multiple Failed Logins',
          description:
            'Your EduStream account has been temporarily locked for 15 minutes due to 5 consecutive failed login attempts.',
          ip: clientIp,
          device,
        });
      }

      user.loginHistory.unshift({ ip: clientIp, device, status: 'failed_credentials' });
      if (user.loginHistory.length > 50) user.loginHistory.pop();
      await user.save({ validateBeforeSave: false });

      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isEmailVerified) throw new AppError('Please verify your email before logging in', 403);

    // Reset login attempts on successful credentials verification (Level 3)
    await user.resetLoginAttempts();

    // Check if Multi-Factor Authentication (2FA) is enabled (Level 4)
    if (user.twoFactorEnabled) {
      // Check for Trusted Device Cookie
      const trustedToken = req.cookies?.trustedDeviceToken;
      let isTrustedDevice = false;

      if (trustedToken && user.trustedDevices) {
        const tokenHash = crypto.createHash('sha256').update(trustedToken).digest('hex');
        const match = user.trustedDevices.find(td => td.tokenHash === tokenHash && td.expiresAt > Date.now());
        if (match) isTrustedDevice = true;
      }

      if (!isTrustedDevice) {
        user.loginHistory.unshift({ ip: clientIp, device, status: 'mfa_challenge' });
        if (user.loginHistory.length > 50) user.loginHistory.pop();
        await user.save({ validateBeforeSave: false });

        // Issue short-lived MFA challenge session token (5 minutes)
        const mfaSessionToken = generateMfaSessionToken({
          userId: user._id,
          email: user.email,
          role: user.role,
        });

        return successResponse(res, HTTP_STATUS.OK, 'MFA required', {
          mfaRequired: true,
          mfaSessionToken,
          email: user.email,
        });
      }
    }

    // First generate refresh token
    const basePayload = { userId: user._id, email: user.email, role: user.role };
    const refreshToken = generateRefreshToken(basePayload);

    // Device / Session Tracking (Level 2 & 4)
    user.cleanExpiredTokens();

    // Check if logging in from a completely new device/IP to alert the user
    const hasSeenDevice = user.refreshTokens.some((t) => t.device === device);
    if (!hasSeenDevice && user.refreshTokens.length > 0) {
      sendSecurityAlertEmail(user.email, user.name, {
        title: 'New Device Login Detected',
        description: 'Your EduStream account was just signed into from a new browser/device.',
        ip: clientIp,
        device,
      });
    }

    user.refreshTokens.push({
      token: refreshToken,
      device,
      ip: clientIp,
      lastActive: new Date(),
    });

    const session = user.refreshTokens[user.refreshTokens.length - 1];
    
    // Now generate access token WITH the sessionId so it can be blacklisted later
    const accessToken = generateAccessToken({ ...basePayload, sessionId: session._id.toString() });

    user.loginHistory.unshift({ ip: clientIp, device, status: 'success' });
    if (user.loginHistory.length > 50) user.loginHistory.pop();
    await user.save({ validateBeforeSave: false });

    // Safety check: Ensure UserProfile exists
    const profileExists = await UserProfile.findOne({ userId: user._id });
    if (!profileExists) {
      await UserProfile.create({
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: { url: user.avatar, publicId: null },
      });
    }

    setRefreshTokenCookie(res, refreshToken);

    return successResponse(res, HTTP_STATUS.OK, 'Login successful', {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── 2FA / MFA: Step 2 Verification for Login (Level 4) ────────
export const verify2FALogin = async (req, res, next) => {
  try {
    const { mfaSessionToken, code, isRecoveryCode, trustDevice } = req.body;
    if (!mfaSessionToken || !code) {
      throw new AppError('MFA session token and verification code required', 400);
    }

    let decoded;
    try {
      decoded = verifyMfaSessionToken(mfaSessionToken);
    } catch {
      throw new AppError('MFA session expired or invalid. Please login again.', 401);
    }

    const user = await User.findById(decoded.userId).select('+twoFactorSecret');
    if (!user || !user.twoFactorEnabled) throw new AppError('User not found or 2FA not enabled', 400);

    const clientIp = getClientIp(req);
    const device = parseUserAgent(req.headers['user-agent']);

    let isValid = false;

    if (isRecoveryCode) {
      // Emergency Backup Recovery Code verification
      const check = verifyRecoveryCode(code, user.twoFactorRecoveryCodes);
      if (check.valid) {
        isValid = true;
        user.twoFactorRecoveryCodes[check.index].used = true;
        user.twoFactorRecoveryCodes[check.index].usedAt = new Date();
      }
    } else {
      // Standard TOTP (Google Authenticator) 6-digit code
      isValid = verifyTotpCode(code.trim(), user.twoFactorSecret);
    }

    if (!isValid) {
      user.loginHistory.unshift({ ip: clientIp, device, status: 'failed_credentials' });
      await user.save({ validateBeforeSave: false });
      throw new AppError('Invalid 2FA verification code or recovery code', 400);
    }

    // Success: Handle Trusted Device
    if (trustDevice) {
      const trustToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(trustToken).digest('hex');
      
      if (!user.trustedDevices) user.trustedDevices = [];
      user.trustedDevices.push({
        tokenHash,
        device,
        ip: clientIp,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });
      
      res.cookie('trustedDeviceToken', trustToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    // Clean up expired trusted devices
    if (user.trustedDevices) {
      user.trustedDevices = user.trustedDevices.filter(td => td.expiresAt > Date.now());
    }

    // First generate refresh token
    const basePayload = { userId: user._id, email: user.email, role: user.role };
    const refreshToken = generateRefreshToken(basePayload);

    user.cleanExpiredTokens();
    user.refreshTokens.push({
      token: refreshToken,
      device,
      ip: clientIp,
      lastActive: new Date(),
    });

    const session = user.refreshTokens[user.refreshTokens.length - 1];
    
    // Now generate access token WITH the sessionId
    const accessToken = generateAccessToken({ ...basePayload, sessionId: session._id.toString() });

    user.loginHistory.unshift({ ip: clientIp, device, status: 'success' });
    if (user.loginHistory.length > 50) user.loginHistory.pop();
    await user.save({ validateBeforeSave: false });

    setRefreshTokenCookie(res, refreshToken);

    return successResponse(res, HTTP_STATUS.OK, '2FA verification successful', {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── 2FA / MFA: Setup (Level 4) ────────────────────────────────
export const setup2FA = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    // Generate fresh TOTP secret
    const secret = generateTotpSecret(20);
    const otpauthUri = buildOtpAuthUri(user.email, secret, 'EduStream');

    // Generate 8 emergency recovery codes
    const { plainCodes, hashedRecords } = generateRecoveryCodes(8);

    // Store temp secret and recovery codes
    user.twoFactorTempSecret = secret;
    user.twoFactorRecoveryCodes = hashedRecords;
    await user.save({ validateBeforeSave: false });

    // QR code image URL via reliable QR API (clean, instantaneous SVG/PNG)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUri)}`;

    return successResponse(res, HTTP_STATUS.OK, '2FA setup initiated', {
      secret,
      otpauthUri,
      qrCodeUrl,
      recoveryCodes: plainCodes,
    });
  } catch (err) {
    next(err);
  }
};

// ── 2FA / MFA: Confirm & Enable (Level 4) ──────────────────────
export const enable2FA = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const { code } = req.body;
    if (!code) throw new AppError('Verification code from Authenticator app required', 400);

    const user = await User.findById(userId).select('+twoFactorTempSecret');
    if (!user || !user.twoFactorTempSecret) {
      throw new AppError('2FA setup was not initiated. Please start setup again.', 400);
    }

    const isValid = verifyTotpCode(code.trim(), user.twoFactorTempSecret);
    if (!isValid) {
      throw new AppError('Invalid 6-digit code. Please verify the code in Google Authenticator.', 400);
    }

    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorTempSecret = undefined;
    user.twoFactorEnabled = true;
    await user.save({ validateBeforeSave: false });

    sendSecurityAlertEmail(user.email, user.name, {
      title: 'Two-Factor Authentication Enabled',
      description: 'Two-Factor Authentication (2FA) is now active on your EduStream account.',
      ip: getClientIp(req),
      device: parseUserAgent(req.headers['user-agent']),
    });

    return successResponse(res, HTTP_STATUS.OK, 'Two-Factor Authentication enabled successfully!', {
      twoFactorEnabled: true,
    });
  } catch (err) {
    next(err);
  }
};

// ── 2FA / MFA: Disable (Level 4) ──────────────────────────────
export const disable2FA = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const { password, code } = req.body;

    const user = await User.findById(userId).select('+password +twoFactorSecret');
    if (!user) throw new AppError('User not found', 404);
    if (!user.twoFactorEnabled) throw new AppError('2FA is not enabled', 400);

    let authorized = false;

    // Can authorize using either current password OR current TOTP code
    if (password && user.password) {
      authorized = await user.comparePassword(password);
    } else if (code) {
      authorized = verifyTotpCode(code.trim(), user.twoFactorSecret);
    }

    if (!authorized) {
      throw new AppError('Incorrect password or verification code to disable 2FA', 403);
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorTempSecret = undefined;
    user.twoFactorRecoveryCodes = [];
    await user.save({ validateBeforeSave: false });

    sendSecurityAlertEmail(user.email, user.name, {
      title: 'Two-Factor Authentication Disabled',
      description: 'Two-Factor Authentication has been removed from your account.',
      ip: getClientIp(req),
      device: parseUserAgent(req.headers['user-agent']),
    });

    return successResponse(res, HTTP_STATUS.OK, 'Two-Factor Authentication disabled successfully', {
      twoFactorEnabled: false,
    });
  } catch (err) {
    next(err);
  }
};

// ── Exchange OAuth One-Time Code (Level 4 - Secure OAuth) ──────
export const exchangeOAuthCode = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) throw new AppError('Authorization code required', 400);

    const entry = consumeOAuthExchangeCode(code);
    if (!entry) throw new AppError('Invalid or expired authorization code', 400);

    // If Google login required MFA
    if (entry.mfaRequired) {
      return successResponse(res, HTTP_STATUS.OK, 'MFA required', {
        mfaRequired: true,
        mfaSessionToken: entry.mfaSessionToken,
        email: entry.email,
      });
    }

    const { user, accessToken, refreshToken } = entry;
    setRefreshTokenCookie(res, refreshToken);

    return successResponse(res, HTTP_STATUS.OK, 'OAuth login successful', {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Active Sessions & Device Management (Level 2 & Level 4) ────
export const getActiveSessions = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const currentRefreshToken = req.cookies?.refreshToken;

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    user.cleanExpiredTokens();
    await user.save({ validateBeforeSave: false });

    const sessions = user.refreshTokens.map((t) => ({
      id: t._id,
      device: t.device || 'Web Browser',
      ip: t.ip || '127.0.0.1',
      createdAt: t.createdAt,
      lastActive: t.lastActive,
      isCurrent: t.token === currentRefreshToken,
    }));

    return successResponse(res, HTTP_STATUS.OK, 'Active sessions retrieved', {
      sessions,
      loginHistory: user.loginHistory.slice(0, 10),
    });
  } catch (err) {
    next(err);
  }
};

// ── Request OTP for Session Revocation ──────────────────────────
export const requestSessionRevocationOtp = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    // Generate a 6-digit numeric OTP for simplicity
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in cache for 5 minutes
    await setCache(`revocation_otp:${userId}`, otp, 5 * 60);

    // Send email via our new worker type
    sendSessionRevocationEmail(user.email, user.name, otp);

    return successResponse(res, HTTP_STATUS.OK, 'Verification code sent to your email.');
  } catch (err) {
    next(err);
  }
};

// ── Revoke Specific Session (Level 2) ─────────────────────────
export const revokeSession = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const currentSessionId = req.headers['x-session-id'];
    const { sessionId } = req.params;

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const { otp } = req.body;
    if (!otp) throw new AppError('Verification code from email is required to revoke a session', 400);

    const storedOtp = await getCache(`revocation_otp:${userId}`);
    if (!storedOtp || storedOtp !== otp) {
      throw new AppError('Invalid or expired verification code', 400);
    }
    await invalidateCache(`revocation_otp:${userId}`);

    const initialLength = user.refreshTokens.length;
    user.refreshTokens = user.refreshTokens.filter((t) => t._id.toString() !== sessionId);

    if (user.refreshTokens.length === initialLength) {
      throw new AppError('Session not found', 404);
    }

    await user.save({ validateBeforeSave: false });
    
    // Add sessionId to Redis Blacklist to instantly reject the access token in verifyToken middleware.
    await setCache(`blacklist:session:${sessionId}`, 'revoked', 15 * 60);

    return successResponse(res, HTTP_STATUS.OK, 'Session revoked successfully');
  } catch (err) {
    next(err);
  }
};

// ── Revoke All Other Sessions (Level 2) ────────────────────────
export const revokeAllOtherSessions = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const currentRefreshToken = req.cookies?.refreshToken;

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const { otp } = req.body;
    if (!otp) throw new AppError('Verification code from email is required to revoke sessions', 400);

    const storedOtp = await getCache(`revocation_otp:${userId}`);
    if (!storedOtp || storedOtp !== otp) {
      throw new AppError('Invalid or expired verification code', 400);
    }
    await invalidateCache(`revocation_otp:${userId}`);

    // Blacklist all other sessions in Redis so their access tokens are immediately invalidated
    const otherTokens = user.refreshTokens.filter((t) => t.token !== currentRefreshToken);
    for (const token of otherTokens) {
      await setCache(`blacklist:session:${token._id.toString()}`, 'revoked', 15 * 60);
    }

    // Keep only the current session
    user.refreshTokens = user.refreshTokens.filter((t) => t.token === currentRefreshToken);
    await user.save({ validateBeforeSave: false });

    return successResponse(res, HTTP_STATUS.OK, 'All other sessions have been logged out');
  } catch (err) {
    next(err);
  }
};

// ── Refresh Access Token (Level 2) ────────────────────────────
export const refreshAccessToken = async (req, res, next) => {
  try {
    const incomingToken = req.cookies?.refreshToken;
    if (!incomingToken) throw new AppError('Refresh token required', 401);

    const decoded = verifyRefreshToken(incomingToken);

    const user = await User.findOne({
      _id: decoded.userId,
      'refreshTokens.token': incomingToken,
    });
    if (!user) throw new AppError('Invalid or expired refresh token', 401);

    // Token rotation - purana hatao naya do
    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== incomingToken);

    const clientIp = getClientIp(req);
    const device = parseUserAgent(req.headers['user-agent']);

    const basePayload = { userId: user._id, email: user.email, role: user.role };
    const newRefreshToken = generateRefreshToken(basePayload);
    
    user.refreshTokens.push({
      token: newRefreshToken,
      device,
      ip: clientIp,
      lastActive: new Date(),
    });

    const session = user.refreshTokens[user.refreshTokens.length - 1];
    await user.save({ validateBeforeSave: false });

    // Generate Access Token WITH the sessionId
    const newAccessToken = generateAccessToken({ ...basePayload, sessionId: session._id.toString() });
    setRefreshTokenCookie(res, newRefreshToken);

    return successResponse(res, HTTP_STATUS.OK, 'Token refreshed', { accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
};

// ── Logout (Level 2) ──────────────────────────────────────────
export const logout = async (req, res, next) => {
  try {
    const incomingToken = req.cookies?.refreshToken;
    const userId = req.headers['x-user-id'];

    if (incomingToken && userId) {
      await User.findByIdAndUpdate(userId, {
        $pull: { refreshTokens: { token: incomingToken } },
      });
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return successResponse(res, HTTP_STATUS.OK, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

// ── Forgot Password (Level 3) ─────────────────────────────────
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new AppError('Email is required', 400);

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (user) {
      const resetOtp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
      user.passwordResetToken = resetOtp;
      user.passwordResetExpiry = getTokenExpiry(10); // 10 min
      await user.save({ validateBeforeSave: false });

      console.log(`\n\n🔐 PASSWORD RESET OTP (Local Dev): ${resetOtp}\n\n`);

      sendPasswordResetEmail(user.email, user.name, resetOtp).catch((err) => {
        console.error('Failed to send reset OTP email:', err.message);
      });
    }

    return successResponse(res, HTTP_STATUS.OK, 'If this email exists, an OTP has been sent.');
  } catch (err) {
    next(err);
  }
};

// ── Reset Password (Level 3) ──────────────────────────────────
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body; // 'token' is the 6-digit OTP
    if (!token || !newPassword) throw new AppError('OTP and new password are required', 400);

    const user = await User.findOne({
      passwordResetToken: token.trim(),
      passwordResetExpiry: { $gt: Date.now() },
    });
    if (!user) throw new AppError('Invalid or expired OTP', 400);

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    user.refreshTokens = []; // Sab devices se logout on password reset (Security best practice)
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    sendSecurityAlertEmail(user.email, user.name, {
      title: 'Password Changed Successfully',
      description: 'Your EduStream account password was successfully updated and all active sessions were terminated.',
      ip: getClientIp(req),
      device: parseUserAgent(req.headers['user-agent']),
    });

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
    if (!user) throw new AppError(`User not found for id: ${userId}`, 404);

    return successResponse(res, HTTP_STATUS.OK, 'User fetched', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      twoFactorEnabled: user.twoFactorEnabled,
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('Invalid email format', 400);
    }

    await sendContactAdminEmail(name, email, subject, message);

    return successResponse(res, HTTP_STATUS.OK, 'Message sent successfully');
  } catch (err) {
    next(err);
  }
};
