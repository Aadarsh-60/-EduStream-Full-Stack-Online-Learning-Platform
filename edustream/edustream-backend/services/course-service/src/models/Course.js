import mongoose from 'mongoose';

// Individual lecture schema
const lectureSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  videoUrl:    { type: String, default: null },  // Cloudinary/S3 URL
  duration:    { type: Number, default: 0 },     // seconds mein
  isFree:      { type: Boolean, default: false }, // Preview lecture
  order:       { type: Number, required: true },
});

// Section (chapter) schema
const sectionSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  order:    { type: Number, required: true },
  lectures: [lectureSchema],
});

// Main Course schema
const courseSchema = new mongoose.Schema(
  {
    title:       { type: String, required: [true, 'Title is required'], trim: true },
    description: { type: String, required: [true, 'Description is required'] },
    instructor: {
      id:   { type: mongoose.Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
    },

    thumbnail: {
      url:      { type: String, default: null },
      publicId: { type: String, default: null },
    },

    price:            { type: Number, required: true, min: 0 },
    discountPrice:    { type: Number, default: null },
    category:         { type: String, required: true },
    level:            { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    language:         { type: String, default: 'English' },
    tags:             [{ type: String }],
    requirements:     [{ type: String }], // What students need before joining
    learningOutcomes: [{ type: String }], // What students will learn

    sections: [sectionSchema],

    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },

    enrolledCount: { type: Number, default: 0 },
    rating:        { type: Number, default: 0, min: 0, max: 5 },
    ratingCount:   { type: Number, default: 0 },

    totalDuration: { type: Number, default: 0 }, // seconds
    totalLectures: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Full-text search ke liye index
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });
courseSchema.index({ category: 1 });
courseSchema.index({ status: 1 });
courseSchema.index({ 'instructor.id': 1 });

const Course = mongoose.model('Course', courseSchema);
export default Course;
