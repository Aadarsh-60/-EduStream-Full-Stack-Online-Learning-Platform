# 🎓 EduStream — Full-Stack Online Learning Platform

A comprehensive, production-grade microservices-based e-learning platform (Udemy Clone). This repository contains both the **React + Vite Frontend** and the **Node.js/Express Microservices Backend**, providing a complete solution with file uploads, secure payments, real-time notifications, and full-text search.

---

## 🚀 Key Features

- **Authentication & Security:** JWT Access & Refresh Token rotation, Google OAuth integration, Role-based Access Control (Admin, Instructor, Student).

- **Course & Curriculum Management:** Comprehensive dashboard for instructors to build and manage courses, sections, and markdown-supported lectures.

- **Media Handling:** Secure video and PDF uploads using Cloudinary, with real-time progress tracking via Socket.io.

- **Secure Payments:** End-to-end payment flow using Razorpay with Webhook verifications and idempotency.

- **Real-Time Notifications:** Instant activity updates and email alerts powered by Socket.io and Nodemailer.

- **Search & Discovery:** Robust full-text search, autocomplete, and advanced filtering by categories and difficulty levels.

- **Ratings & Reviews:** Integrated student feedback and rating system for courses.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| API Gateway | Express + http-proxy-middleware |
| Backend | Node.js + Express (8 microservices) |
| Database | MongoDB (1 DB per service) |
| Auth | JWT Access + Refresh Token Rotation + Google OAuth |
| File Upload | Cloudinary + Multer + Sharp (image compression) |
| Payments | Razorpay + Webhook + Idempotency |
| Real-time | Socket.io (upload progress + notifications) |
| Email | Nodemailer |
| Security | Helmet + Rate Limiting + CORS |

---

## 🏗️ Architecture

```text
Client (React + Vite)
        ↓
API Gateway :5000 (JWT Verify, Rate Limit, Route)
        ↓
┌──────────────────────────────────────────────────┐
│  Auth    :5001  │  User    :5002  │ Course :5003  │
│  Media   :5004  │  Payment :5005  │ Notify :5006  │
│  Review  :5007  │  Search  :5008  │               │
└──────────────────────────────────────────────────┘
        ↓
  MongoDB (separate DB per service)
```

---

## 📁 Project Structure

```text
edustream/
├── edustream-frontend/          # React + Vite Client Application
├── gateway/                     # API Gateway (Port 5000)
├── services/                    # 8 Node.js Microservices
│   ├── auth-service/    :5001
│   ├── user-service/    :5002
│   ├── course-service/  :5003
│   ├── media-service/   :5004
│   ├── payment-service/ :5005
│   ├── notification-service/:5006
│   ├── review-service/  :5007
│   └── search-service/  :5008
├── shared/                      # Shared code (constants, middlewares, utils)
├── seed/                        # Database seeding scripts
├── docker-compose.yml           # Local multi-container orchestration
└── README.md
```

---

## 💻 Local Development Setup

### 1. Clone & Environment Configuration

```bash
git clone https://github.com/yourusername/edustream.git
cd edustream

# Configure Backend Environments
cp .env.example .env
# Fill in your .env with your MongoDB URI, Cloudinary credentials, Razorpay keys, Google OAuth IDs, etc.

# Configure Frontend Environments
cd edustream-frontend
cp .env.example .env # Or create a .env file
# Ensure you set: VITE_API_URL=http://localhost:5000
```

### 2. Install Dependencies

**Backend Services:**
```bash
# You need to run npm install in the gateway and EVERY service directory
cd gateway && npm install && cd ..

cd services/auth-service && npm install && cd ../..

cd services/user-service && npm install && cd ../..

cd services/course-service && npm install && cd ../..

cd services/media-service && npm install && cd ../..

cd services/payment-service && npm install && cd ../..

cd services/notification-service && npm install && cd ../..

cd services/review-service && npm install && cd ../..

cd services/search-service && npm install && cd ../..

cd seed && npm install && cd ..
```

**Frontend:**
```bash
cd edustream-frontend
npm install
```

### 3. Start the Platform

**Option A: Using Docker (Recommended for Backend)**
```bash
# In the root directory (spins up the Gateway and all 8 Microservices)
docker-compose up --build

# In a new terminal, start the Frontend
cd edustream-frontend
npm run dev
```

**Option B: Manual Start (Without Docker)**

**10 terminals kholo** (ya terminal multiplexer use karo):

```bash
# Terminal 1 - Gateway
cd gateway && npm run dev

# Terminal 2 - Auth
cd services/auth-service && npm run dev

# Terminal 3 - User
cd services/user-service && npm run dev

# Terminal 4 - Course
cd services/course-service && npm run dev

# Terminal 5 - Media
cd services/media-service && npm run dev

# Terminal 6 - Payment
cd services/payment-service && npm run dev

# Terminal 7 - Notification
cd services/notification-service && npm run dev

# Terminal 8 - Review
cd services/review-service && npm run dev

# Terminal 9 - Search
cd services/search-service && npm run dev

# Terminal 10 - Frontend
cd edustream-frontend && npm run dev
```

### 4. Seed Database (Optional but Recommended)

```bash
cd seed
node seed.js
```

---

## 🚀 Deployment Guide (Production)

To deploy the EduStream platform to production, you will deploy the frontend and the backend ecosystem separately.

### Phase 1: Deploying the Backend Ecosystem

**Using VPS (EC2, DigitalOcean) or Platforms like Render/Railway:**

1. **Database Preparation:** Set up a production MongoDB cluster (e.g., MongoDB Atlas). Ensure your database user IP access allows connections from your deployment servers.

2. **Environment Secrets:** Populate your production environment variables (MongoDB URI, JWT Secrets, Razorpay Keys, Cloudinary config) in your server or hosting provider dashboard.

3. **Containerized Deployment (Recommended):**
   - Push your code to GitHub.
   - Connect your server or PaaS (like Railway or Render) to your repository.
   - Use the provided `docker-compose.yml` to orchestrate the services. 
   - **Crucial:** Only expose the **API Gateway (Port 5000)** to the public internet. The microservices (Ports 5001-5008) should only communicate internally within the Docker network.
   - Set up a reverse proxy (like **Nginx**) or an Application Load Balancer to route external HTTP/HTTPS traffic to the API Gateway.

### Phase 2: Deploying the Frontend (React + Vite)

**Using Vercel, Netlify, or Cloudflare Pages:**

1. Navigate to your hosting dashboard (e.g., Vercel) and import the repository.

2. Set the Root Directory to `edustream-frontend`.

3. **Build Settings:**
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Environment Variables:**
   - Add `VITE_API_URL` and point it to your production API Gateway domain (e.g., `https://api.yourdomain.com`).

5. **Deploy:** Click deploy to get your live frontend URL.

### Phase 3: Post-Deployment Checklist

- [ ] **CORS Update:** Update the allowed origins in your Gateway configuration to accept requests from your new production Frontend URL.

- [ ] **OAuth Callbacks:** Go to Google Cloud Console and add your production Frontend URL to authorized origins, and update the Redirect URIs.

- [ ] **Razorpay Webhooks:** Go to the Razorpay Dashboard and update the Webhook URL to point to your live server (e.g., `https://api.yourdomain.com/api/payments/webhook`).

---

## 📡 Core API Endpoints

All external API requests must go through the **Gateway** at `http://localhost:5000` (or your production API domain).

### Auth (Public — no token needed)
```
POST  /api/auth/register          # Register
POST  /api/auth/login             # Login → returns accessToken
POST  /api/auth/refresh           # Refresh access token (uses cookie)
POST  /api/auth/logout            # Logout
GET   /api/auth/me                # Get current user
GET   /api/auth/google            # Google OAuth
POST  /api/auth/forgot-password   # Forgot password
POST  /api/auth/reset-password    # Reset password
```

### Users (Protected — Bearer token required)
```
GET   /api/users/me               # Get my profile
PUT   /api/users/me               # Update profile
POST  /api/users/me/avatar        # Upload avatar (multipart/form-data)
DELETE /api/users/me/avatar       # Delete avatar
GET   /api/users/me/enrolled      # Get enrolled courses
PUT   /api/users/me/progress      # Update course progress
GET   /api/users/profile/:userId  # Public profile
GET   /api/users/admin/all        # All users (admin only)
```

### Courses (GET is public, POST/PUT/DELETE needs token)
```
GET   /api/courses                # All courses (with filters)
GET   /api/courses/:id            # Single course
POST  /api/courses                # Create course (instructor)
PUT   /api/courses/:id            # Update course
DELETE /api/courses/:id           # Delete course
POST  /api/courses/:id/thumbnail  # Upload thumbnail
POST  /api/courses/:id/sections   # Add section
POST  /api/courses/:id/sections/:sectionId/lectures   # Add lecture
GET   /api/courses/mine           # Instructor's courses
GET   /api/courses/:id/enrollment # Check if enrolled
GET   /api/courses/:id/students   # Course students (instructor)
```

### Media (Protected)
```
POST  /api/media/video            # Upload video (multipart/form-data)
POST  /api/media/pdf              # Upload PDF
DELETE /api/media/delete          # Delete media
GET   /api/media/signature        # Get Cloudinary upload signature
```

### Payments (Protected)
```
POST  /api/payments/create-order  # Create Razorpay order
POST  /api/payments/verify        # Verify payment signature
GET   /api/payments/my-payments   # Payment history
POST  /api/payments/webhook       # Razorpay webhook (no auth)
```

### Notifications (Protected)
```
GET   /api/notifications          # My notifications
GET   /api/notifications/unread-count  # Unread count
PUT   /api/notifications/read-all # Mark all as read
PUT   /api/notifications/:id/read # Mark one as read
```

### Reviews (Public GET, Protected POST/PUT/DELETE)
```
GET   /api/reviews/:courseId      # Course reviews
POST  /api/reviews                # Add review (enrolled students only)
PUT   /api/reviews/:reviewId      # Update review
DELETE /api/reviews/:reviewId     # Delete review
```

### Search (Public)
```
GET   /api/search?q=mern&category=Web Development&level=beginner
GET   /api/search/categories      # All categories
GET   /api/search/autocomplete?q=py  # Autocomplete suggestions
```

---

## 🔑 Test Credentials (If Seeded)

**Password for all seeded accounts:** `Test@1234`

| Role | Email |
|---|---|
| Admin | admin@edustream.com |
| Instructor | instructor@edustream.com |
| Student | student@edustream.com |

---
*Built with ❤️ for online learning.*
