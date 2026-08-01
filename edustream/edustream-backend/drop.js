import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI + '/edustream');
  try {
    await mongoose.connection.collection('courses').drop();
    console.log('Collection courses dropped!');
  } catch (err) {
    console.log(err.message);
  }
  await mongoose.disconnect();
};
run();
