import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // cookies ke liye (refresh token)
});

// Request interceptor — har request mein token lagao
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — 401 pe auto refresh
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        const newToken = data.data.accessToken;
        localStorage.setItem('accessToken', newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  register:       (data) => api.post('/auth/register', data),
  login:          (data) => api.post('/auth/login', data),
  logout:         ()     => api.post('/auth/logout'),
  getMe:          ()     => api.get('/auth/me'),
  verifyEmail:    (data) => api.post('/auth/verify-email', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword:  (data) => api.post('/auth/reset-password', data),
  contactAdmin:   (data) => api.post('/auth/contact', data),
};

// ── Courses ───────────────────────────────────────────────────
export const courseAPI = {
  getAll:           (params) => api.get('/courses', { params }),
  getOne:           (id)     => api.get(`/courses/${id}`),
  create:           (data)   => api.post('/courses', data),
  update:           (id, d)  => api.put(`/courses/${id}`, d),
  delete:           (id)     => api.delete(`/courses/${id}`),
  uploadThumbnail:  (id, fd) => api.post(`/courses/${id}/thumbnail`, fd),
  addSection:       (id, d)  => api.post(`/courses/${id}/sections`, d),
  addLecture:       (id, sid, d) => api.post(`/courses/${id}/sections/${sid}/lectures`, d),
  getMine:          ()       => api.get('/courses/mine'),
  checkEnrollment:  (id)     => api.get(`/courses/${id}/enrollment`),
  getStudents:      (id)     => api.get(`/courses/${id}/students`),
  getQA:            (courseId) => api.get(`/courses/${courseId}/qa`),
  askQuestion:      (courseId, question) => api.post(`/courses/${courseId}/qa`, { question }),
  replyToQuestion:  (courseId, qaId, text) => api.post(`/courses/${courseId}/qa/${qaId}/reply`, { text }),
};

// ── Users ─────────────────────────────────────────────────────
export const userAPI = {
  getMyProfile:    ()     => api.get('/users/me'),
  updateProfile:   (data) => api.put('/users/me', data),
  uploadAvatar:    (fd)   => api.post('/users/me/avatar', fd),
  deleteAvatar:    ()     => api.delete('/users/me/avatar'),
  getEnrolled:     ()     => api.get('/users/me/enrolled'),
  updateProgress:  (data) => api.put('/users/me/progress', data),
  getPublicProfile:(id)   => api.get(`/users/profile/${id}`),
  getAllUsers:      (p)    => api.get('/users/admin/all', { params: p }),
  toggleWishlist:  (id)   => api.post(`/users/me/wishlist/${id}`),
};

// ── Search ────────────────────────────────────────────────────
export const searchAPI = {
  search:       (params) => api.get('/search', { params }),
  categories:   ()       => api.get('/search/categories'),
  autocomplete: (q)      => api.get(`/search/autocomplete?q=${q}`),
  chat:         (msgs)   => api.post('/search/ai/chat', { messages: msgs }),
};

// ── Payments ──────────────────────────────────────────────────
export const paymentAPI = {
  createOrder:   (data) => api.post('/payments/create-order', data),
  verifyPayment: (data) => api.post('/payments/verify', data),
  getMyPayments: ()     => api.get('/payments/my-payments'),
};

// ── Reviews ───────────────────────────────────────────────────
export const reviewAPI = {
  getCourseReviews: (id)   => api.get(`/reviews/${id}`),
  addReview:        (data) => api.post('/reviews', data),
  updateReview:     (id,d) => api.put(`/reviews/${id}`, d),
  deleteReview:     (id)   => api.delete(`/reviews/${id}`),
};

// ── Notifications ─────────────────────────────────────────────
export const notificationAPI = {
  getAll:       () => api.get('/notifications'),
  getUnread:    () => api.get('/notifications/unread-count'),
  markRead:     (id) => api.put(`/notifications/${id}/read`),
  markAllRead:  () => api.put('/notifications/read-all'),
};

// ── Media ─────────────────────────────────────────────────────
export const mediaAPI = {
  uploadVideo: (fd, onProgress) => api.post('/media/video', fd, {
    onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / e.total)),
  }),
  uploadPDF:   (fd) => api.post('/media/pdf', fd),
  deleteMedia: (data) => api.delete('/media/delete', { data }),
};

export default api;
