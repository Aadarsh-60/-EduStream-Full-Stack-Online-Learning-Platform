import jwt from 'jsonwebtoken';
import { errorResponse } from '../utils/apiResponse.js';
import { getCache } from '../utils/cache.js';

// Gateway JWT verify karta hai - individual services ko secret nahi chahiye
// Decoded user info headers mein downstream bhejta hai
export const verifyToken = async (req, res, next) => {
  try {
    // ── Service-to-Service Authentication (Modular Monolith / Microservices) ──
    // Allow internal services (like Webhooks) to bypass JWT checks using a private secret
    if (req.headers['x-internal-secret'] && req.headers['x-internal-secret'] === (process.env.INTERNAL_SERVICE_SECRET || 'edustream_internal_2024')) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'Access token required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Instant Session Revocation Check via Redis Blacklist
    if (decoded.sessionId) {
      const isBlacklisted = await getCache(`blacklist:session:${decoded.sessionId}`);
      if (isBlacklisted) return errorResponse(res, 401, 'Session has been revoked. Please log in again.');
    }

    // User info ko headers mein set karo - services x-user-* se padhenge
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-user-role'] = decoded.role;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-session-id'] = decoded.sessionId;
    
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return errorResponse(res, 401, 'Token expired');
    return errorResponse(res, 401, 'Invalid token');
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      let isBlacklisted = false;
      if (decoded.sessionId) {
        isBlacklisted = await getCache(`blacklist:session:${decoded.sessionId}`);
      }

      if (!isBlacklisted) {
        req.headers['x-user-id'] = decoded.userId;
        req.headers['x-user-role'] = decoded.role;
        req.headers['x-user-email'] = decoded.email;
      }
    }
  } catch (err) {
    // Ignore invalid/expired tokens for optional routes, just don't set headers
  }
  next();
};
