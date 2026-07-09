import jwt from 'jsonwebtoken';
import { errorResponse } from '../../../shared/utils/apiResponse.js';

// Gateway JWT verify karta hai - individual services ko secret nahi chahiye
// Decoded user info headers mein downstream bhejta hai
export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'Access token required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // User info ko headers mein set karo - services x-user-* se padhenge
    req.headers['x-user-id']    = decoded.userId;
    req.headers['x-user-role']  = decoded.role;
    req.headers['x-user-email'] = decoded.email;

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return errorResponse(res, 401, 'Token expired');
    return errorResponse(res, 401, 'Invalid token');
  }
};

export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      
      req.headers['x-user-id']    = decoded.userId;
      req.headers['x-user-role']  = decoded.role;
      req.headers['x-user-email'] = decoded.email;
    }
  } catch (err) {
    // Ignore invalid/expired tokens for optional routes, just don't set headers
  }
  next();
};
