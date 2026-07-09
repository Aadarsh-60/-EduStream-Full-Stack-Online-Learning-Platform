import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import Navbar from './components/common/Navbar.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import CertificateModal from './components/common/CertificateModal.jsx';
import EduBot from './components/common/EduBot.jsx';

import HomePage         from './pages/HomePage.jsx';
import CoursesPage      from './pages/CoursesPage.jsx';
import CourseDetailPage from './pages/CourseDetailPage.jsx';
import { LoginPage, RegisterPage, VerifyEmailPage, ForgotPasswordPage, OAuthSuccessPage } from './pages/AuthPages.jsx';
import DashboardPage    from './pages/DashboardPage.jsx';
import ProfilePage      from './pages/ProfilePage.jsx';
import CreateCoursePage from './pages/CreateCoursePage.jsx';
import ManageCoursePage from './pages/ManageCoursePage.jsx';
import ContactPage      from './pages/ContactPage.jsx';
import NotFoundPage     from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <CertificateModal />
      <EduBot />
      <Routes>
        {/* Public */}
        <Route path="/"           element={<HomePage />} />
        <Route path="/courses"    element={<CoursesPage />} />
        <Route path="/courses/:id" element={<CourseDetailPage />} />
        <Route path="/login"      element={<LoginPage />} />
        <Route path="/register"   element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/oauth-success" element={<OAuthSuccessPage />} />
        <Route path="/contact"    element={<ContactPage />} />

        {/* Protected - any logged in user */}
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />

        {/* Protected - instructor + admin only */}
        <Route path="/create-course" element={
          <ProtectedRoute roles={['instructor', 'admin']}><CreateCoursePage /></ProtectedRoute>
        } />
        <Route path="/manage-course/:id" element={
          <ProtectedRoute roles={['instructor', 'admin']}><ManageCoursePage /></ProtectedRoute>
        } />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
