import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(`${process.env.MONGO_URI}/edustream_auth`);
    console.log(`✅ Auth DB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Auth DB connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
