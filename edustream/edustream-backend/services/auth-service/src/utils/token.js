import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Short lived - 15 minutes
export const generateAccessToken = (payload) =>
  jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  });

// Long lived - 7 days
export const generateRefreshToken = (payload) =>
  jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: '7d',
  });

export const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

// Email verify / password reset ke liye random token
export const generateRandomToken = () => crypto.randomBytes(32).toString('hex');

// X minutes baad expire hone wali date
export const getTokenExpiry = (minutes) =>
  new Date(Date.now() + minutes * 60 * 1000);

// Refresh token ko HttpOnly cookie mein set karo
export const setRefreshTokenCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });
};
