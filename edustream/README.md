<div align="center">
  <h1>🎓 EduStream — Full-Stack Online Learning Platform</h1>
  <p><strong>A production-grade Modular Monolith MERN Application for E-Learning</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Node.js-v18+-green?style=for-the-badge&logo=node.js" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express.js-v4-gray?style=for-the-badge&logo=express" alt="Express" />
    <img src="https://img.shields.io/badge/MongoDB-Atlas-green?style=for-the-badge&logo=mongodb" alt="MongoDB" />
    <img src="https://img.shields.io/badge/React-v18-61DAFB?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Vite-v5-646CFF?style=for-the-badge&logo=vite" alt="Vite" />
  </p>

  <p>A comprehensive, fully responsive e-learning system with video streaming, PDF certificate generation, Razorpay payments, real-time notifications, AI Chatbot (EduBot), and role-based access control.</p>

  <p>
    <a href="#">Live Demo</a> ·
    <a href="https://github.com/Aadarsh-60/-EduStream-Full-Stack-Online-Learning-Platform/issues">Report Bug</a> ·
    <a href="https://github.com/Aadarsh-60/-EduStream-Full-Stack-Online-Learning-Platform/issues">Request Feature</a>
  </p>
</div>

<hr />

## 📑 Table of Contents
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Database Seeding](#-database-seeding)
- [Demo Credentials](#-demo-credentials)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Role-Based Access Control](#-role-based-access-control)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)
- [Author](#-author)

---

## ✨ Features

### 🔒 Authentication & Security
- **JWT Authentication** with secure token rotation (Access & Refresh tokens)
- **Google OAuth 2.0** — Quick register and login
- **Role-Based Access Control (RBAC)** — Admin, Instructor, and Student roles
- **Helmet.js & Rate Limiting** for robust backend security

### 🎓 Student Module
- **Interactive Video Player** with progress tracking
- **Automated PDF Certificates** generated via `jsPDF` upon 100% completion
- **Course Wishlist** to save favorite courses
- **Ratings & Reviews** for enrolled courses
- **Q&A Forum** to ask instructors questions

### 👨‍🏫 Instructor Module
- **Course Builder Dashboard** to create sections and markdown-supported lectures
- **Media Uploads** (Video & PDF) managed seamlessly via Cloudinary
- **Student Analytics** and enrollment tracking

### 💳 Payments & Notifications
- **Razorpay Integration** for end-to-end secure course purchases
- **Real-time Notifications** for enrollments and platform updates

### 🤖 AI Chatbot (EduBot)
- Powered by **Google Gemini API** to answer course and platform-related queries instantly.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI library with functional components & hooks |
| **Vite 5** | Lightning-fast build tool & dev server |
| **React Router v6** | Client-side routing & navigation |
| **Axios** | HTTP client for API communication |
| **html2canvas + jsPDF** | Client-side PDF Certificate generation |
| **Lucide React** | Modern icon library |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js 18+** | JavaScript runtime |
| **Express.js 4** | Web application framework (Modular Monolith) |
| **MongoDB + Mongoose** | NoSQL database & ODM |
| **JWT** | Stateless authentication |
| **Razorpay SDK** | Payment gateway integration |
| **Cloudinary** | Cloud storage for video and image assets |

---

## 🏛️ Architecture

```text
         CLIENT (React + Vite)
       ┌───────────────────────────┐
       │ Pages      │ Components   │
       │ Context    │ Services     │
       └──────┬────────────┬───────┘
              │ Axios HTTP │
       ┌──────┴────────────┴───────┐
       │ SERVER (Express.js)       │
       │                           │
       │ ┌───────────────────────┐ │
       │ │ Shared (Middlewares)  │ │
       │ └──────────┬────────────┘ │
       │ ┌──────────┴────────────┐ │
       │ │ Domains (Services)    │ │
       │ │ - Auth, User, Course  │ │
       │ │ - Payment, Media      │ │
       │ └──────────┬────────────┘ │
       └────────────┼──────────────┘
                    │ Mongoose
             ┌──────┴──────┐
             │   MongoDB   │
             └─────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18 or higher
- **MongoDB** running locally or MongoDB Atlas URI
- API Keys for **Cloudinary**, **Razorpay**, and **Google Gemini** (Optional for AI)

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/edustream.git
cd edustream
```

### 2. Install dependencies
```bash
# Install backend dependencies
cd edustream-backend
npm install

# Install frontend dependencies
cd ../edustream-frontend
npm install
```

### 3. Start the application
Open two separate terminals:

**Backend (Terminal 1):**
```bash
cd edustream-backend
npm run dev
```

**Frontend (Terminal 2):**
```bash
cd edustream-frontend
npm run dev
```

---

## 🔐 Environment Variables

### Backend (`edustream-backend/.env`)
```env
# --- Server ---
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# --- MongoDB ---
MONGO_URI=mongodb://localhost:27017/edustream_db

# --- JWT Auth ---
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=1d
REFRESH_TOKEN_SECRET=your_refresh_secret
REFRESH_TOKEN_EXPIRE=7d

# --- Google OAuth ---
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# --- Razorpay Payments ---
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# --- Cloudinary ---
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# --- Gemini AI ---
GEMINI_API_KEY=your_gemini_api_key
```

### Frontend (`edustream-frontend/.env`)
```env
VITE_API_URL=http://localhost:5000
```

---

## 📦 Database Seeding

To quickly test the application, you can seed the database with realistic mock data (courses, users, instructors, reviews).

```bash
cd edustream-backend
node seed/seed.js
```
*⚠️ Warning: This will drop the existing database before seeding.*

---

## 🔑 Demo Credentials

After seeding the database, you can log in using the following test accounts:

**Password for all accounts:** `password123`

| Role | Email |
|---|---|
| **Admin** | admin@edustream.com |
| **Instructor** | instructor@edustream.com |
| **Student** | student@edustream.com |

---

## 📡 API Documentation

**Base URL:** `/api`

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register a new user |
| `POST` | `/auth/login` | Public | Login with email & password |
| `POST` | `/auth/refresh` | Public | Refresh JWT access token |
| `POST` | `/auth/logout` | Public | Logout and clear cookies |
| `GET`  | `/auth/me` | Protected | Get current logged-in user |
| `POST` | `/auth/google` | Public | Google OAuth login |

### Users (`/api/users`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/users/me` | Protected | Get complete user profile |
| `PUT` | `/users/me` | Protected | Update profile details |
| `GET` | `/users/me/enrolled` | Protected | Get enrolled courses |
| `PUT` | `/users/me/progress` | Protected | Update course progress |
| `POST`| `/users/me/wishlist/:id` | Protected | Toggle course in wishlist |
| `GET` | `/users/profile/:id` | Public | Get public instructor profile |

### Courses (`/api/courses`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/courses` | Public | Get all courses (with filters) |
| `GET` | `/courses/:id` | Public | Get specific course details |
| `POST`| `/courses` | Instructor | Create a new course |
| `POST`| `/courses/:id/sections` | Instructor | Add a curriculum section |

### Payments & Orders (`/api/payments`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/payments/create-order` | Protected | Initiate Razorpay checkout |
| `POST` | `/payments/verify` | Protected | Verify payment signature |
| `GET`  | `/payments/my-payments` | Protected | View transaction history |

### AI & Search (`/api/search`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/search` | Public | Full-text search for courses |
| `POST`| `/search/ai/chat` | Public | Interact with EduBot AI |

---

## 📁 Project Structure

```text
edustream-backend/               # Express.js Modular Monolith Backend
├── shared/
│   ├── config/
│   │   └── env.js               # Environment variables & constants
│   ├── middlewares/
│   │   ├── auth.js              # JWT verification & RBAC middleware
│   │   └── errorHandler.js      # Global error handling
│   └── utils/
│       ├── apiResponse.js       # Standardized JSON response formatting
│       └── logger.js            # Winston logger setup
├── seed/
│   └── seed.js                  # Script to seed database with mock data
├── services/                    # Domain-Driven Modules
│   ├── auth-service/
│   │   └── src/
│   │       ├── config/passport.js       # Google OAuth strategy
│   │       ├── controllers/auth.controller.js # Login, Register, Tokens
│   │       ├── models/User.js           # Core user schema & passwords
│   │       ├── routes/auth.routes.js    # Auth endpoints
│   │       └── utils/
│   │           ├── email.js             # Nodemailer setup
│   │           └── token.js             # JWT generation
│   ├── course-service/
│   │   └── src/
│   │       ├── controllers/
│   │       │   ├── course.controller.js # Course CRUD & enrollment
│   │       │   └── qa.controller.js     # Q&A forum logic
│   │       ├── models/
│   │       │   ├── Course.js            # Course, Section & Lecture schemas
│   │       │   ├── CourseQA.js          # Q&A thread schema
│   │       │   └── Enrollment.js        # Student enrollment tracking
│   │       └── routes/course.routes.js  # Course & Q&A endpoints
│   ├── media-service/
│   │   └── src/
│   │       ├── controllers/media.controller.js # Cloudinary uploads
│   │       └── routes/media.routes.js   # Upload signatures & handling
│   ├── notification-service/
│   │   └── src/
│   │       ├── controllers/notification.controller.js # Real-time alerts
│   │       ├── models/Notification.js   # Notification schema
│   │       └── routes/notification.routes.js 
│   ├── payment-service/
│   │   └── src/
│   │       ├── controllers/payment.controller.js # Razorpay integration
│   │       ├── models/Payment.js        # Transaction records
│   │       └── routes/payment.routes.js # Orders, verify, webhooks
│   ├── review-service/
│   │   └── src/
│   │       ├── models/Review.js         # Ratings & Feedback schema
│   │       └── routes/review.routes.js  # Review endpoints
│   ├── search-service/
│   │   └── src/
│   │       └── routes/search.routes.js  # Full-text search & AI Chatbot
│   └── user-service/
│       └── src/
│           ├── controllers/user.controller.js # Profiles, progress, wishlist
│           ├── middlewares/upload.js    # Multer & Sharp avatar handling
│           ├── models/UserProfile.js    # Extended user details
│           └── routes/user.routes.js    # User endpoints
├── check_health.js              # Server health monitoring script
├── drop.js                      # Utility to wipe database
└── server.js                    # Express application entry point

edustream-frontend/              # React + Vite Frontend
├── index.html                   # HTML template
├── vite.config.js               # Vite build configuration
└── src/
    ├── App.jsx                  # Main router & layout configuration
    ├── main.jsx                 # React DOM initialization
    ├── index.css                # Global styles & CSS variables
    ├── components/
    │   ├── common/
    │   │   ├── CertificateModal.jsx # jsPDF certificate generator
    │   │   ├── EduBot.jsx       # Floating AI Chatbot interface
    │   │   ├── Navbar.jsx       # Top navigation & user dropdown
    │   │   └── ProtectedRoute.jsx # Route guards
    │   ├── course/
    │   │   ├── CourseCard.jsx   # Reusable course grid item
    │   │   └── CourseQA.jsx     # Q&A thread component
    │   └── dashboard/
    │       └── AnalyticsCharts.jsx # Recharts visualizations
    ├── context/
    │   └── AuthContext.jsx      # Global state for user & tokens
    ├── pages/
    │   ├── AuthPages.jsx        # Login, Register, OTP views
    │   ├── CourseDetailPage.jsx # Video player & curriculum view
    │   ├── CoursesPage.jsx      # Browse & filter courses
    │   ├── CreateCoursePage.jsx # Instructor course builder
    │   ├── DashboardPage.jsx    # Student/Instructor/Admin portal
    │   ├── ManageCoursePage.jsx # Instructor course editor
    │   ├── ProfilePage.jsx      # User settings & avatar upload
    │   ├── PublicProfilePage.jsx# Public instructor/student view
    │   └── HomePage.jsx         # Landing page
    └── services/
        └── api.js               # Axios instance & interceptors
```

---

## 🛡️ Role-Based Access Control

The platform uses a strict RBAC middleware in the backend to ensure secure access to specific routes.

| Role | Access Level | Description |
|---|---|---|
| **Admin** | Full Platform Access | Can view analytics, manage all users, and delete any content. |
| **Instructor** | Content Creator | Can create, edit, and delete their own courses, view their revenue, and answer Q&As on their courses. |
| **Student** | Consumer | Can purchase courses, track video progress, generate certificates, and leave reviews. |

---

## 🚀 Deployment

### Backend (Render, Railway, or EC2)
1. **Provision a MongoDB Atlas Database** and whitelist the IP address of your deployment server.
2. **Set Environment Variables**: Copy your `.env` values to the hosting provider's dashboard.
3. Set the build command to `npm install` and the start command to `node server.js`.

### Frontend (Vercel, Netlify, or Cloudflare Pages)
1. Import the repository and set the root directory to `edustream-frontend`.
2. Framework Preset: **Vite**.
3. Set `VITE_API_URL` in the environment variables to your deployed backend URL.
4. Deploy!

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👨‍💻 Author

**Aadarsh**

- GitHub: [@Aadarsh-60](https://github.com/Aadarsh-60)

---

<div align="center">
  <p>⭐ Star this repo if you found it useful!</p>
</div>
