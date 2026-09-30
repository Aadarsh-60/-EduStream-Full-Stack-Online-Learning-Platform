import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

import User from './services/auth-service/src/models/User.js';
import UserProfile from './services/user-service/src/models/UserProfile.js';

const seedAdmin = async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}/edustream`);
    console.log('✅ Connected to MongoDB');

    let admin = await User.findOne({ email: 'admin@edustream.com' });
    if (!admin) {
      admin = new User({
        name: 'Super Admin',
        email: 'admin@edustream.com',
        password: 'AdminPassword123!',
        role: 'admin',
        isEmailVerified: true
      });
      await admin.save();
      console.log('✅ Admin User created');

      const profile = new UserProfile({
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        bio: 'I am the platform administrator.',
        socialLinks: {}
      });
      await profile.save();
      console.log('✅ Admin Profile created');
    } else {
      console.log('✅ Admin already exists. Email: admin@edustream.com, Password: AdminPassword123!');
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

seedAdmin();
