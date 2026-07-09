import express from 'express';
import passport from 'passport';
import {
  register, verifyEmail, login, refreshAccessToken,
  logout, forgotPassword, resetPassword, getMe, contactAdmin
} from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', getMe);
router.post('/contact', contactAdmin);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, data) => {
      if (err || !data) {
        console.error('OAuth Error:', err);
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=oauth_failed`);
      }
      const { accessToken } = data;
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/oauth-success?token=${accessToken}`);
    })(req, res, next);
  }
);

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'auth-service' }));

export default router;
