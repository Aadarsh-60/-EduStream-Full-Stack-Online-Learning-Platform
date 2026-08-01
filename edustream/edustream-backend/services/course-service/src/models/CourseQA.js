import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  user: {
    _id:  { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['student', 'instructor', 'admin'], default: 'student' }
  },
  text: { type: String, required: true, trim: true }
}, { timestamps: true });

const courseQASchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  user: {
    _id:  { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    role: { type: String, default: 'student' }
  },
  question: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  replies: [replySchema]
}, { timestamps: true });

export default mongoose.model('CourseQA', courseQASchema);
