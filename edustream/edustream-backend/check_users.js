import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(`${process.env.MONGO_URI}/edustream`)
  .then(async () => {
    const users = await mongoose.connection.db.collection('users').find().toArray();
    console.log("Users in DB:", users.map(u => ({ id: u._id, email: u.email, role: u.role, googleId: u.googleId })));
    process.exit(0);
  });
