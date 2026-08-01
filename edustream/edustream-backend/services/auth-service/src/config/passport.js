import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken } from '../utils/token.js';

// Node 20+ / 24+ me old oauth library Google APIs ke sath TLS reset mar sakti hai.
// Isliye hum userProfile fetch ko modern 'fetch' se override kar dete hain.
GoogleStrategy.prototype.userProfile = async function(accessToken, done) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'edustream-backend'
      }
    });
    if (!response.ok) throw new Error('Failed to fetch user profile');
    const data = await response.json();
    
    const profile = {
      provider: 'google',
      id: data.sub,
      displayName: data.name,
      emails: [{ value: data.email }],
      photos: [{ value: data.picture }],
      _raw: JSON.stringify(data),
      _json: data
    };
    done(null, profile);
  } catch (error) {
    done(error);
  }
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
      customHeaders: {
        'User-Agent': 'edustream-backend'
      }
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const avatar = profile.photos[0]?.value;

        let user = await User.findOne({ email });

        if (user) {
          // Existing user - googleId update karo agar nahi hai
          if (!user.googleId) {
            user.googleId = profile.id;
            user.avatar = avatar;
            user.isEmailVerified = true;
            await user.save({ validateBeforeSave: false });
          }
        } else {
          // Naya user create karo
          user = await User.create({
            name: profile.displayName,
            email,
            googleId: profile.id,
            avatar,
            isEmailVerified: true,
            role: 'student',
          });
        }

        const payload = { userId: user._id, email: user.email, role: user.role };
        const jwtAccessToken = generateAccessToken(payload);
        const jwtRefreshToken = generateRefreshToken(payload);

        user.cleanExpiredTokens();
        user.refreshTokens.push({ token: jwtRefreshToken });
        await user.save({ validateBeforeSave: false });

        return done(null, { user, accessToken: jwtAccessToken, refreshToken: jwtRefreshToken });
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;
