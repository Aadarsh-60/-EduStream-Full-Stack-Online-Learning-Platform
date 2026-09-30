import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Short lived - 15 minutes
export const generateAccessToken = (payload) =>
  jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  });

// Long lived - 7 days (or 30 days)
export const generateRefreshToken = (payload) =>
  jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: '7d',
  });

export const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

// Short-lived MFA session token (5 minutes) - used between password verification and 2FA challenge
export const generateMfaSessionToken = (payload) =>
  jwt.sign({ ...payload, isMfaSession: true }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '5m',
  });

export const verifyMfaSessionToken = (token) => {
  const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  if (!decoded.isMfaSession) {
    throw new Error('Invalid MFA session token');
  }
  return decoded;
};

// Email verify / password reset ke liye random token
export const generateRandomToken = () => crypto.randomBytes(32).toString('hex');

// X minutes baad expire hone wali date
export const getTokenExpiry = (minutes) =>
  new Date(Date.now() + minutes * 60 * 1000);

// Refresh token ko HttpOnly cookie mein set karo
export const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });
};

// Single-use OAuth authorization code exchange store (60 second TTL)
const oauthCodes = new Map();

export const storeOAuthExchangeCode = (data) => {
  const code = crypto.randomBytes(24).toString('hex');
  oauthCodes.set(code, {
    ...data,
    expiresAt: Date.now() + 60 * 1000, // 1 minute expiry
  });
  return code;
};

export const consumeOAuthExchangeCode = (code) => {
  if (!code || !oauthCodes.has(code)) return null;
  const entry = oauthCodes.get(code);
  oauthCodes.delete(code);

  if (Date.now() > entry.expiresAt) return null;
  return entry;
};
