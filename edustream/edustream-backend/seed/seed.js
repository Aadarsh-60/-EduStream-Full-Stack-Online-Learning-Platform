import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';

// ─── Colors for terminal output ──────────────────────────────
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan   = (s) => `\x1b[36m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;

// ─── Schemas ──────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name: String, email: String, password: String,
  role: String, isEmailVerified: Boolean, isActive: Boolean,
  refreshTokens: Array, googleId: String, avatar: String,
}, { timestamps: true });

const profileSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  name: String, email: String, role: String,
  avatar: { url: String, publicId: String },
  bio: String, headline: String,
  enrolledCourses: Array, createdCourses: Array, totalEarnings: Number,
  isActive: Boolean,
}, { timestamps: true });

const lectureSchema = new mongoose.Schema({
  title: String, description: String,
  videoUrl: String, duration: Number, isFree: Boolean, order: Number,
});

const sectionSchema = new mongoose.Schema({
  title: String, order: Number, lectures: [lectureSchema],
});

const courseSchema = new mongoose.Schema({
  title: String, description: String,
  instructor: { id: mongoose.Schema.Types.ObjectId, name: String },
  thumbnail: { url: String, publicId: String },
  price: Number, discountPrice: Number,
  category: String, level: String, language: String,
  tags: [String], requirements: [String], learningOutcomes: [String],
  sections: [sectionSchema],
  status: String,
  enrolledCount: Number, rating: Number, ratingCount: Number,
  totalDuration: Number, totalLectures: Number,
}, { timestamps: true });

const enrollmentSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  courseId: mongoose.Schema.Types.ObjectId,
  paymentId: String, amount: Number,
  progress: Number, completedLectures: Array,
  isCompleted: Boolean,
}, { timestamps: true });

const reviewSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  courseId: mongoose.Schema.Types.ObjectId,
  userName: String, rating: Number, comment: String,
}, { timestamps: true });

const notificationSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  type: String, message: String, data: Object, isRead: Boolean,
}, { timestamps: true });

// ─── Main Seed Function ───────────────────────────────────────
const seed = async () => {
  console.log(cyan('\n🌱 EduStream Seed Script Starting...\n'));

  // Auth DB
  const authConn = await mongoose.createConnection(`${MONGO_URI}/edustream_auth`).asPromise();
  const User = authConn.model('User', userSchema);

  // Users DB
  const usersConn = await mongoose.createConnection(`${MONGO_URI}/edustream_users`).asPromise();
  const UserProfile = usersConn.model('UserProfile', profileSchema);

  // Courses DB
  const coursesConn = await mongoose.createConnection(`${MONGO_URI}/edustream_courses`).asPromise();
  const Course = coursesConn.model('Course', courseSchema);
  const Enrollment = coursesConn.model('Enrollment', enrollmentSchema);

  // Reviews DB
  const reviewsConn = await mongoose.createConnection(`${MONGO_URI}/edustream_reviews`).asPromise();
  const Review = reviewsConn.model('Review', reviewSchema);

  // Notifications DB
  const notifConn = await mongoose.createConnection(`${MONGO_URI}/edustream_notifications`).asPromise();
  const Notification = notifConn.model('Notification', notificationSchema);

  console.log(green('✅ All databases connected'));

  // ── Clear existing data ──────────────────────────────────────
  await Promise.all([
    User.deleteMany({}),
    UserProfile.deleteMany({}),
    Course.deleteMany({}),
    Enrollment.deleteMany({}),
    Review.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  console.log(yellow('🗑️  Existing data cleared'));

  // ── Seed Users ───────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('Test@1234', 12);

  const users = await User.insertMany([
    {
      name: 'Admin User',
      email: 'admin@edustream.com',
      password: hashedPassword,
      role: 'admin',
      isEmailVerified: true,
      isActive: true,
      refreshTokens: [],
    },
    {
      name: 'Rahul Sharma',
      email: 'instructor@edustream.com',
      password: hashedPassword,
      role: 'instructor',
      isEmailVerified: true,
      isActive: true,
      refreshTokens: [],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rahul',
    },
    {
      name: 'Priya Singh',
      email: 'instructor2@edustream.com',
      password: hashedPassword,
      role: 'instructor',
      isEmailVerified: true,
      isActive: true,
      refreshTokens: [],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya',
    },
    {
      name: 'Amit Kumar',
      email: 'student@edustream.com',
      password: hashedPassword,
      role: 'student',
      isEmailVerified: true,
      isActive: true,
      refreshTokens: [],
    },
    {
      name: 'Neha Verma',
      email: 'student2@edustream.com',
      password: hashedPassword,
      role: 'student',
      isEmailVerified: true,
      isActive: true,
      refreshTokens: [],
    },
  
    {
      name: 'Karan Patel',
      email: 'instructor3@edustream.com',
      password: hashedPassword,
      role: 'instructor',
      isEmailVerified: true,
      isActive: true,
      refreshTokens: [],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=karan',
    },
    {
      name: 'Neha Gupta',
      email: 'instructor4@edustream.com',
      password: hashedPassword,
      role: 'instructor',
      isEmailVerified: true,
      isActive: true,
      refreshTokens: [],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=neha',
    },
  ]);

  const [admin, instructor1, instructor2, student1, student2, instructor3, instructor4] = users;
  console.log(green(`✅ ${users.length} users created`));

  // ── Seed User Profiles ───────────────────────────────────────
  await UserProfile.insertMany([
    {
      userId: admin._id, name: admin.name, email: admin.email, role: 'admin',
      avatar: { url: null, publicId: null }, bio: 'Platform administrator',
      enrolledCourses: [], createdCourses: [], totalEarnings: 0, isActive: true,
    },
    {
      userId: instructor1._id, name: instructor1.name, email: instructor1.email, role: 'instructor',
      avatar: { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rahul', publicId: null },
      bio: 'Full-stack developer with 8 years of experience. Teaching MERN stack and React.',
      headline: 'Senior Full-Stack Developer | MERN Expert',
      website: 'https://rahulsharma.dev', linkedin: 'linkedin.com/in/rahulsharma',
      enrolledCourses: [], createdCourses: [], totalEarnings: 45000, isActive: true,
    },
    {
      userId: instructor2._id, name: instructor2.name, email: instructor2.email, role: 'instructor',
      avatar: { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya', publicId: null },
      bio: 'Data Scientist and ML Engineer. 5 years in Python and ML.',
      headline: 'Data Scientist | Python & ML Expert',
      linkedin: 'linkedin.com/in/priyasingh',
      enrolledCourses: [], createdCourses: [], totalEarnings: 32000, isActive: true,
    },
    {
      userId: student1._id, name: student1.name, email: student1.email, role: 'student',
      avatar: { url: null, publicId: null },
      bio: 'Aspiring full-stack developer. Learning MERN stack.',
      enrolledCourses: [], createdCourses: [], totalEarnings: 0, isActive: true,
    },
    {
      userId: student2._id, name: student2.name, email: student2.email, role: 'student',
      avatar: { url: null, publicId: null },
      bio: 'CS Graduate interested in Data Science.',
      enrolledCourses: [], createdCourses: [], totalEarnings: 0, isActive: true,
    },
  
    {
      userId: instructor3._id, name: instructor3.name, email: instructor3.email, role: 'instructor',
      avatar: { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=karan', publicId: null },
      bio: 'Cloud Architect and DevOps Expert. Ex-AWS.',
      headline: 'Senior Cloud Architect | AWS Expert',
      enrolledCourses: [], createdCourses: [], totalEarnings: 85000, isActive: true,
    },
    {
      userId: instructor4._id, name: instructor4.name, email: instructor4.email, role: 'instructor',
      avatar: { url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=neha', publicId: null },
      bio: 'Lead UI/UX Designer. Designing beautiful experiences for 10 years.',
      headline: 'Lead Product Designer',
      enrolledCourses: [], createdCourses: [], totalEarnings: 62000, isActive: true,
    },
  ]);
  console.log(green(`✅ 7 user profiles created`));

  // ── Seed Courses ─────────────────────────────────────────────
  const courses = await Course.insertMany([
    {
      title: 'Complete MERN Stack Development 2024',
      description: 'Master MongoDB, Express.js, React, and Node.js with real-world projects. Build 5 full-stack applications from scratch including authentication, payments, and deployment.',
      instructor: { id: instructor1._id, name: instructor1.name },
      thumbnail: { url: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=800', publicId: null },
      price: 49900, // ₹499
      discountPrice: 29900,
      category: 'Web Development',
      level: 'intermediate',
      language: 'Hindi + English',
      tags: ['mern', 'mongodb', 'react', 'nodejs', 'express', 'fullstack'],
      requirements: ['Basic JavaScript knowledge', 'HTML & CSS basics', 'Any code editor'],
      learningOutcomes: [
        'Build full-stack web apps with MERN',
        'Implement JWT authentication',
        'Deploy apps to cloud platforms',
        'Work with REST APIs',
      ],
      sections: [
        {
          title: 'Getting Started',
          order: 1,
          lectures: [
            { title: 'Course Introduction & Setup', description: 'Overview and environment setup', videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', duration: 480, isFree: true, order: 1 },
            { title: 'MERN Stack Architecture', description: 'Understanding how all pieces fit together', videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_2mb.mp4', duration: 720, isFree: true, order: 2 },
          ],
        },
        {
          title: 'Node.js & Express Backend',
          order: 2,
          lectures: [
            { title: 'Node.js Fundamentals', description: 'Core Node.js concepts', videoUrl: null, duration: 1800, isFree: false, order: 1 },
            { title: 'Express.js Setup & Routing', description: 'Building REST APIs', videoUrl: null, duration: 2400, isFree: false, order: 2 },
            { title: 'Middleware in Express', description: 'Understanding middleware chain', videoUrl: null, duration: 1500, isFree: false, order: 3 },
          ],
        },
        {
          title: 'MongoDB & Mongoose',
          order: 3,
          lectures: [
            { title: 'MongoDB Introduction', description: 'NoSQL database concepts', videoUrl: null, duration: 1200, isFree: false, order: 1 },
            { title: 'Mongoose Schema & Models', description: 'Data modeling with Mongoose', videoUrl: null, duration: 1800, isFree: false, order: 2 },
          ],
        },
        {
          title: 'React Frontend',
          order: 4,
          lectures: [
            { title: 'React Setup with Vite', description: 'Modern React setup', videoUrl: null, duration: 900, isFree: false, order: 1 },
            { title: 'React Hooks Deep Dive', description: 'useState, useEffect, useContext', videoUrl: null, duration: 3600, isFree: false, order: 2 },
            { title: 'React Router v6', description: 'Client-side routing', videoUrl: null, duration: 1800, isFree: false, order: 3 },
          ],
        },
      ],
      status: 'published',
      enrolledCount: 1240,
      rating: 4.7,
      ratingCount: 312,
      totalDuration: 16200,
      totalLectures: 9,
    },
    {
      title: 'Python for Data Science & Machine Learning',
      description: 'Complete guide to Python programming, Data Analysis with Pandas, Machine Learning with Scikit-learn, and Deep Learning with TensorFlow. Includes 10+ real projects.',
      instructor: { id: instructor2._id, name: instructor2.name },
      thumbnail: { url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800', publicId: null },
      price: 59900, // ₹599
      discountPrice: 39900,
      category: 'Data Science',
      level: 'beginner',
      language: 'English',
      tags: ['python', 'machine learning', 'data science', 'tensorflow', 'pandas', 'numpy'],
      requirements: ['No prior programming experience needed', 'Basic math knowledge'],
      learningOutcomes: [
        'Python programming from scratch',
        'Data analysis with Pandas & NumPy',
        'Build ML models with Scikit-learn',
        'Deep Learning with TensorFlow & Keras',
      ],
      sections: [
        {
          title: 'Python Basics',
          order: 1,
          lectures: [
            { title: 'Python Installation & Setup', description: 'Getting started', videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', duration: 600, isFree: true, order: 1 },
            { title: 'Variables, Data Types & Operators', description: 'Python fundamentals', videoUrl: null, duration: 2400, isFree: false, order: 2 },
            { title: 'Control Flow & Loops', description: 'if/else, for, while', videoUrl: null, duration: 1800, isFree: false, order: 3 },
          ],
        },
        {
          title: 'NumPy & Pandas',
          order: 2,
          lectures: [
            { title: 'NumPy Arrays & Operations', description: 'Numerical computing', videoUrl: null, duration: 2700, isFree: false, order: 1 },
            { title: 'Pandas DataFrames', description: 'Data manipulation', videoUrl: null, duration: 3600, isFree: false, order: 2 },
          ],
        },
        {
          title: 'Machine Learning',
          order: 3,
          lectures: [
            { title: 'ML Concepts & Types', description: 'Supervised, Unsupervised, Reinforcement', videoUrl: null, duration: 1800, isFree: false, order: 1 },
            { title: 'Linear & Logistic Regression', description: 'Classical ML algorithms', videoUrl: null, duration: 3000, isFree: false, order: 2 },
          ],
        },
      ],
      status: 'published',
      enrolledCount: 890,
      rating: 4.5,
      ratingCount: 245,
      totalDuration: 15900,
      totalLectures: 8,
    },
    {
      title: 'React Native - Build iOS & Android Apps',
      description: 'Learn to build cross-platform mobile applications using React Native. Cover navigation, state management with Redux, API integration, and publish to app stores.',
      instructor: { id: instructor1._id, name: instructor1.name },
      thumbnail: { url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800', publicId: null },
      price: 44900,
      discountPrice: null,
      category: 'Mobile Development',
      level: 'intermediate',
      language: 'Hindi + English',
      tags: ['react native', 'mobile', 'ios', 'android', 'javascript'],
      requirements: ['React.js knowledge required', 'JavaScript ES6+'],
      learningOutcomes: [
        'Build cross-platform mobile apps',
        'React Native navigation',
        'State management with Redux Toolkit',
        'Publish to Play Store & App Store',
      ],
      sections: [
        {
          title: 'React Native Basics',
          order: 1,
          lectures: [
            { title: 'Expo Setup & First App', description: 'Getting started with React Native', videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', duration: 900, isFree: true, order: 1 },
            { title: 'Core Components', description: 'View, Text, Image, ScrollView', videoUrl: null, duration: 2400, isFree: false, order: 2 },
          ],
        },
      ],
      status: 'published',
      enrolledCount: 456,
      rating: 4.6,
      ratingCount: 128,
      totalDuration: 3300,
      totalLectures: 3,
    },
    {
      title: 'Docker & Kubernetes for Beginners',
      description: 'Master containerization with Docker and orchestration with Kubernetes. Learn to deploy scalable microservices applications in production environments.',
      instructor: { id: instructor1._id, name: instructor1.name },
      thumbnail: { url: 'https://images.unsplash.com/photo-1605745341112-85968b19335b?w=800', publicId: null },
      price: 39900,
      discountPrice: 24900,
      category: 'DevOps',
      level: 'beginner',
      language: 'English',
      tags: ['docker', 'kubernetes', 'devops', 'containers', 'microservices'],
      requirements: ['Basic Linux command line', 'Any programming language basics'],
      learningOutcomes: [
        'Create & manage Docker containers',
        'Write Dockerfiles & Docker Compose',
        'Deploy with Kubernetes',
        'CI/CD pipeline setup',
      ],
      sections: [
        {
          title: 'Docker Fundamentals',
          order: 1,
          lectures: [
            { title: 'What is Docker?', description: 'Containerization explained', videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', duration: 1200, isFree: true, order: 1 },
            { title: 'Docker Commands Cheatsheet', description: 'Most used Docker commands', videoUrl: null, duration: 1800, isFree: false, order: 2 },
            { title: 'Writing Dockerfiles', description: 'Build your own images', videoUrl: null, duration: 2400, isFree: false, order: 3 },
          ],
        },
      ],
      status: 'published',
      enrolledCount: 321,
      rating: 4.4,
      ratingCount: 89,
      totalDuration: 5400,
      totalLectures: 3,
    },
    {
      title: 'Advanced JavaScript - ES6 to ES2024',
      description: 'Deep dive into modern JavaScript features. Covers closures, prototypes, async/await, Promises, modules, generators, and all ES6+ features with practical examples.',
      instructor: { id: instructor2._id, name: instructor2.name },
      thumbnail: { url: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=800', publicId: null },
      price: 29900,
      discountPrice: 19900,
      category: 'Web Development',
      level: 'advanced',
      language: 'English',
      tags: ['javascript', 'es6', 'async', 'promises', 'advanced js'],
      requirements: ['Basic JavaScript knowledge required', 'Understanding of HTML/CSS'],
      learningOutcomes: [
        'Understand JavaScript internals',
        'Master async programming',
        'Write modern ES6+ code',
        'Understand closures & prototypes',
      ],
      sections: [
        {
          title: 'ES6 Fundamentals',
          order: 1,
          lectures: [
            { title: 'Let, Const & Arrow Functions', description: 'Modern variable declarations', videoUrl: null, duration: 1800, isFree: true, order: 1 },
            { title: 'Destructuring & Spread Operator', description: 'Modern JS patterns', videoUrl: null, duration: 2400, isFree: false, order: 2 },
          ],
        },
      ],
      status: 'published',
      enrolledCount: 678,
      rating: 4.8,
      ratingCount: 201,
      totalDuration: 4200,
      totalLectures: 2,
    },
    {
      // Draft course - not visible in search
      title: 'GraphQL Complete Guide (DRAFT)',
      description: 'Learn GraphQL with Node.js and React. Build a complete API with mutations, queries, subscriptions.',
      instructor: { id: instructor1._id, name: instructor1.name },
      thumbnail: { url: null, publicId: null },
      price: 44900,
      category: 'Web Development',
      level: 'intermediate',
      language: 'English',
      tags: ['graphql', 'apollo', 'nodejs'],
      requirements: [], learningOutcomes: [],
      sections: [],
      status: 'draft',
      enrolledCount: 0, rating: 0, ratingCount: 0,
      totalDuration: 0, totalLectures: 0,
    },
  
    {
      title: 'UI/UX Design Masterclass: Figma & Web Design',
      description: 'Learn to design beautiful, functional user interfaces and experiences using Figma. From wireframes to interactive prototypes.',
      instructor: { id: instructor4._id, name: instructor4.name },
      thumbnail: { url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800', publicId: null },
      price: 34900, discountPrice: 19900, category: 'Design', level: 'beginner', language: 'English',
      tags: ['ui', 'ux', 'figma', 'design'], requirements: ['No design experience needed'],
      learningOutcomes: ['Master Figma', 'Design Systems', 'Prototyping'],
      sections: [{ title: 'Figma Basics', order: 1, lectures: [{ title: 'Intro to UI/UX', description: 'What is UI/UX?', videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', duration: 1200, isFree: true, order: 1 }] }],
      status: 'published', enrolledCount: 2150, rating: 4.9, ratingCount: 450, totalDuration: 18000, totalLectures: 45,
    },
    {
      title: 'Complete System Design for Interviews',
      description: 'Ace your technical interviews. Learn how to design highly scalable, distributed systems like Netflix, Uber, and Twitter.',
      instructor: { id: instructor3._id, name: instructor3.name },
      thumbnail: { url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800', publicId: null },
      price: 59900, discountPrice: 44900, category: 'DevOps', level: 'advanced', language: 'English',
      tags: ['system design', 'interviews', 'architecture', 'scalability'], requirements: ['Basic backend knowledge', 'Understanding of databases'],
      learningOutcomes: ['Design scalable systems', 'Crack MAANG interviews', 'Microservices architecture'],
      sections: [{ title: 'System Design Basics', order: 1, lectures: [{ title: 'Load Balancing', description: 'How load balancers work', videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', duration: 1800, isFree: true, order: 1 }] }],
      status: 'published', enrolledCount: 3500, rating: 4.8, ratingCount: 890, totalDuration: 21000, totalLectures: 60,
    },
    {
      title: 'AWS Certified Solutions Architect',
      description: 'Pass the AWS Certified Solutions Architect Associate exam. Comprehensive coverage of all AWS services with hands-on labs.',
      instructor: { id: instructor3._id, name: instructor3.name },
      thumbnail: { url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800', publicId: null },
      price: 69900, discountPrice: 39900, category: 'DevOps', level: 'intermediate', language: 'Hindi + English',
      tags: ['aws', 'cloud', 'devops', 'certification'], requirements: ['Basic IT knowledge'],
      learningOutcomes: ['Pass AWS Exam', 'Architect Cloud Solutions', 'Deploy on AWS'],
      sections: [{ title: 'Cloud Concepts', order: 1, lectures: [{ title: 'What is Cloud Computing?', description: 'Cloud basics', videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', duration: 1500, isFree: true, order: 1 }] }],
      status: 'published', enrolledCount: 4200, rating: 4.7, ratingCount: 1100, totalDuration: 25000, totalLectures: 80,
    },
  ]);

  console.log(green(`✅ ${courses.length} courses created`));
  const [course1, course2, course3, course4, course5, course6, course7, course8, course9] = courses;

  // ── Seed Enrollments ─────────────────────────────────────────
  const enrollments = await Enrollment.insertMany([
    {
      userId: student1._id, courseId: course1._id,
      paymentId: 'pay_test_001', amount: 29900,
      progress: 65, completedLectures: [
        course1.sections[0].lectures[0]._id,
        course1.sections[0].lectures[1]._id,
      ],
      isCompleted: false,
    },
    {
      userId: student1._id, courseId: course2._id,
      paymentId: 'pay_test_002', amount: 39900,
      progress: 30, completedLectures: [],
      isCompleted: false,
    },
    {
      userId: student2._id, courseId: course2._id,
      paymentId: 'pay_test_003', amount: 39900,
      progress: 100, completedLectures: [],
      isCompleted: true,
    },
    {
      userId: student2._id, courseId: course5._id,
      paymentId: 'pay_test_004', amount: 19900,
      progress: 50, completedLectures: [],
      isCompleted: false,
    },
  
    {
      userId: student1._id, courseId: course6._id,
      paymentId: 'pay_test_005', amount: 19900,
      progress: 15, completedLectures: [],
      isCompleted: false,
    },
    {
      userId: student1._id, courseId: course8._id,
      paymentId: 'pay_test_006', amount: 39900,
      progress: 80, completedLectures: [],
      isCompleted: false,
    },
  ]);
  console.log(green(`✅ ${enrollments.length} enrollments created`));

  // Update student profiles with enrolled courses
  await UserProfile.findOneAndUpdate(
    { userId: student1._id },
    { enrolledCourses: [
      { courseId: course1._id, progress: 65 },
      { courseId: course2._id, progress: 30 },
    ]},
  );
  await UserProfile.findOneAndUpdate(
    { userId: student2._id },
    { enrolledCourses: [
      { courseId: course2._id, progress: 100 },
      { courseId: course5._id, progress: 50 },
    ]},
  );

  // ── Seed Reviews ─────────────────────────────────────────────
  await Review.insertMany([
    { userId: student1._id, courseId: course1._id, userName: student1.name, rating: 5, comment: 'Excellent course! Rahul sir explains everything so clearly. Best MERN course on the platform.' },
    { userId: student2._id, courseId: course1._id, userName: student2.name, rating: 4, comment: 'Very good content. Could use more advanced topics but overall great for beginners.' },
    { userId: student1._id, courseId: course2._id, userName: student1.name, rating: 5, comment: 'Best Python ML course. Priya maam covers everything step by step.' },
    { userId: student2._id, courseId: course2._id, userName: student2.name, rating: 4, comment: 'Great content! The ML section was particularly helpful.' },
    { userId: student2._id, courseId: course5._id, userName: student2.name, rating: 5, comment: 'Finally understood closures! Life-changing course for JS developers.' },
  ]);
  console.log(green(`✅ 5 reviews created`));

  // ── Seed Notifications ────────────────────────────────────────
  await Notification.insertMany([
    { userId: student1._id, type: 'payment_success', message: 'Payment successful! You are enrolled in Complete MERN Stack Development 2024.', data: { courseId: course1._id, amount: 29900 }, isRead: true },
    { userId: student1._id, type: 'payment_success', message: 'Payment successful! You are enrolled in Python for Data Science & Machine Learning.', data: { courseId: course2._id, amount: 39900 }, isRead: false },
    { userId: student1._id, type: 'new_lecture', message: 'New lecture added: "Middleware in Express" in MERN Stack course!', data: { courseId: course1._id }, isRead: false },
    { userId: student2._id, type: 'payment_success', message: 'Payment successful! You are enrolled in Python for Data Science & Machine Learning.', data: { courseId: course2._id, amount: 39900 }, isRead: true },
    { userId: student2._id, type: 'enrollment', message: 'Congratulations! You completed Python for Data Science!', data: { courseId: course2._id }, isRead: false },
    { userId: instructor1._id, type: 'review_received', message: 'New 5-star review on your MERN Stack course!', data: { courseId: course1._id, rating: 5 }, isRead: false },
  ]);
  console.log(green(`✅ 6 notifications created`));

  // ── Print Summary ─────────────────────────────────────────────
  console.log(cyan('\n════════════════════════════════════════'));
  console.log(cyan('          SEED COMPLETE! 🎉'));
  console.log(cyan('════════════════════════════════════════'));
  console.log(yellow('\n📧 Test Credentials (password: Test@1234)'));
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│  Role        │  Email                       │');
  console.log('├─────────────────────────────────────────────┤');
  console.log('│  Admin       │  admin@edustream.com         │');
  console.log('│  Instructor  │  instructor@edustream.com    │');
  console.log('│  Instructor  │  instructor2@edustream.com   │');
  console.log('│  Student     │  student@edustream.com       │');
  console.log('│  Student     │  student2@edustream.com      │');
  console.log('└─────────────────────────────────────────────┘');
  console.log(yellow('\n📚 Created:'));
  console.log(`  • 7 Users (1 admin, 4 instructors, 2 students)`);
  console.log(`  • 8 Published Courses + 1 Draft`);
  console.log(`  • 4 Enrollments`);
  console.log(`  • 5 Reviews`);
  console.log(`  • 6 Notifications`);
  console.log(yellow('\n🚀 Run services and test:'));
  console.log('  POST http://localhost:5000/api/auth/login');
  console.log('  GET  http://localhost:5000/api/courses');
  console.log('  GET  http://localhost:5000/api/search?q=mern\n');

  // Close all connections
  await Promise.all([
    authConn.close(), usersConn.close(), coursesConn.close(),
    reviewsConn.close(), notifConn.close(),
  ]);

  process.exit(0);
};

seed().catch((err) => {
  console.error(red(`\n❌ Seed failed: ${err.message}`));
  process.exit(1);
});
