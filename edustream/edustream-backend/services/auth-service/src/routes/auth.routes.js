import express from 'express';
import passport from 'passport';
import '../config/passport.js';
import {
  register,
  verifyEmail,
  login,
  verify2FALogin,
  setup2FA,
  enable2FA,
  disable2FA,
  exchangeOAuthCode,
  getActiveSessions,
  revokeSession,
  revokeAllOtherSessions,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  contactAdmin,
  requestSessionRevocationOtp,
} from '../controllers/auth.controller.js';
import { generateMfaSessionToken, storeOAuthExchangeCode } from '../utils/token.js';
import { verifyToken } from '../../../../shared/middlewares/auth.js';

const router = express.Router();

// ── Core Auth (Level 1, 2, 3) ──────────────────────────────────
router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/refresh', refreshAccessToken);
router.post('/logout', verifyToken, logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', verifyToken, getMe);
router.post('/contact', contactAdmin);

// ── Two-Factor Authentication (Level 4) ───────────────────────
router.post('/2fa/verify', verify2FALogin); // Login challenge (Step 2)
router.post('/2fa/setup', verifyToken, setup2FA); // Generate secret & QR code
router.post('/2fa/enable', verifyToken, enable2FA); // Verify code & activate
router.post('/2fa/disable', verifyToken, disable2FA); // Turn off 2FA

// ── Session & Device Management (Level 2 & Level 4) ───────────
router.get('/sessions', verifyToken, getActiveSessions);
router.post('/sessions/revoke-otp', verifyToken, requestSessionRevocationOtp);
router.delete('/sessions/all-others', verifyToken, revokeAllOtherSessions);
router.delete('/sessions/:sessionId', verifyToken, revokeSession);

// ── Secure OAuth 2.0 with One-Time Code Exchange (Level 4) ─────
router.post('/google/exchange', exchangeOAuthCode);

router.get('/google', (req, res, next) => {
  const role = req.query.role || 'student';
  passport.authenticate('google', { scope: ['profile', 'email'], state: role })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, data, info) => {
    if (err || !data) {
      console.error('OAuth Error:', err || info);
      const errorMsg = info?.message ? encodeURIComponent(info.message) : 'oauth_failed';
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=${errorMsg}`);
    }

    const { user, accessToken, refreshToken, twoFactorEnabled } = data;

    let exchangeCode;
    if (twoFactorEnabled) {
      // 2FA required for this Google account: issue short-lived MFA challenge token
      const mfaSessionToken = generateMfaSessionToken({
        userId: user._id,
        email: user.email,
        role: user.role,
      });
      exchangeCode = storeOAuthExchangeCode({
        mfaRequired: true,
        mfaSessionToken,
        email: user.email,
      });
    } else {
      // Direct session: store tokens in one-time exchange store
      exchangeCode = storeOAuthExchangeCode({
        user,
        accessToken,
        refreshToken,
      });
    }

    // Redirect with single-use authorization code ONLY (No JWT token in URL)
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/oauth-success?code=${exchangeCode}`);
  })(req, res, next);
});

router.get('/health', (req, res) => res.json({ status: 'ok', service: 'auth-service' }));

export default router;
