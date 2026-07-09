import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, TrendingUp, Bell, Star, Plus, Users, DollarSign, Play, Clock, Shield, X, Mail, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { userAPI, courseAPI, notificationAPI, authAPI } from '../services/api.js';
import toast from 'react-hot-toast';
import { UsersRoleChart, CoursesCategoryChart, InstructorEnrollmentChart } from '../components/dashboard/AnalyticsCharts.jsx';

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isInstructor = user?.role === 'instructor';

  return (
    <div style={{ paddingTop: 88, minHeight: '100vh' }}>
      <div className="container" style={{ paddingBottom: 60 }}>
        {isAdmin ? <AdminDashboard user={user} /> : isInstructor ? <InstructorDashboard user={user} /> : <StudentDashboard user={user} />}
      </div>
    </div>
  );
}

// ── Student Dashboard ─────────────────────────────────────────
function StudentDashboard({ user }) {
  const [enrolled,       setEnrolled]       = useState([]);
  const [notifications,  setNotifications]  = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [filterProgress, setFilterProgress] = useState('all'); // all, in-progress, completed, notifications

  useEffect(() => {
    Promise.all([
      userAPI.getEnrolled(),
      notificationAPI.getAll(),
    ]).then(([e, n]) => {
      setEnrolled(e.data.data || []);
      setNotifications(n.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: 6 }}>
          Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p>Continue where you left off</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 36 }}>
        {[
          { id: 'all', icon: BookOpen, label: 'Enrolled',     value: enrolled.length, color: 'var(--indigo)' },
          { id: 'in-progress', icon: TrendingUp, label: 'In Progress', value: enrolled.filter(e => e.progress < 100 && e.progress > 0).length, color: 'var(--gold)' },
          { id: 'completed', icon: Star,      label: 'Completed',   value: enrolled.filter(e => e.progress === 100).length, color: 'var(--success)' },
          { id: 'notifications', icon: Bell,      label: 'Notifications', value: notifications.filter(n => !n.isRead).length, color: '#EC4899' },
        ].map(({ id, icon: Icon, label, value, color }) => (
          <div key={label} className="card hoverable"
            onClick={() => setFilterProgress(id)}
            style={{ padding: 20, cursor: 'pointer', border: filterProgress === id ? `1px solid ${color}` : '1px solid var(--glass-border)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 500 }}>{label}</p>
              <Icon size={18} color={color} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Enrolled Courses */}
      {filterProgress !== 'notifications' && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.2rem' }}>My Courses</h2>
            <Link to="/courses" className="btn btn-outline btn-sm"><Plus size={14} /> Browse More</Link>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)}
            </div>
          ) : enrolled.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <BookOpen size={40} color="var(--indigo)" style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>No courses yet</h3>
              <p style={{ fontSize: '0.875rem', marginBottom: 20 }}>Start your learning journey today</p>
              <Link to="/courses" className="btn btn-primary btn-sm">Browse Courses</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ marginBottom: 8, fontSize: '0.9rem', color: 'var(--muted)' }}>
                Showing {filterProgress === 'all' ? 'All Enrolled Courses' : filterProgress === 'in-progress' ? 'In Progress Courses' : 'Completed Courses'}
              </div>
              {enrolled
                .filter(e => filterProgress === 'all' || (filterProgress === 'in-progress' ? e.progress < 100 && e.progress > 0 : e.progress === 100))
                .map(enrollment => (
                <EnrolledCourseRow key={enrollment.courseId} enrollment={enrollment} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notifications */}
      {(filterProgress === 'all' || filterProgress === 'notifications') && (
        <div id="notifications-section" style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.2rem' }}>{filterProgress === 'notifications' ? 'All Notifications' : 'Recent Notifications'}</h2>
            {notifications.some(n => !n.isRead) && (
              <button 
                onClick={() => {
                  notificationAPI.markAllAsRead().then(() => {
                    setNotifications(notifications.map(n => ({...n, isRead: true})));
                  }).catch(()=>{});
                }}
                className="btn btn-outline btn-sm"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          {notifications.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              <Bell size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p>You have no notifications right now.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notifications.slice(0, filterProgress === 'notifications' ? undefined : 5).map(n => (
                <div key={n._id} className="card" 
                  onClick={() => {
                    if (!n.isRead) {
                      notificationAPI.markAsRead(n._id).then(() => {
                        setNotifications(notifications.map(item => item._id === n._id ? {...item, isRead: true} : item));
                      }).catch(()=>{});
                    }
                  }}
                  style={{ padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'flex-start', opacity: n.isRead ? 0.6 : 1, cursor: n.isRead ? 'default' : 'pointer', borderLeft: n.isRead ? 'none' : '3px solid var(--indigo)' }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.isRead ? 'var(--muted)' : 'var(--indigo)', marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.875rem', color: '#fff', marginBottom: 3 }}>{n.message}</p>
                    <p style={{ fontSize: '0.75rem' }}>{new Date(n.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function EnrolledCourseRow({ enrollment }) {
  const [course, setCourse] = useState(null);

  useEffect(() => {
    courseAPI.getOne(enrollment.courseId).then(res => setCourse(res.data.data)).catch(()=>{});
  }, [enrollment.courseId]);

  return (
    <Link to={`/courses/${enrollment.courseId}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
      >
        {course?.thumbnail?.url ? (
          <img src={course.thumbnail.url} alt="Course" style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 60, height: 60, borderRadius: 12, background: 'linear-gradient(135deg, var(--indigo), var(--indigo-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Play size={24} color="#fff" />
          </div>
        )}
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '1rem', color: '#fff', fontWeight: 600, marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {course ? course.title : `Course ID: ${enrollment.courseId}`}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="progress-bar" style={{ flex: 1, height: 8 }}>
              <div className="progress-fill" style={{ width: `${enrollment.progress || 0}%`, background: enrollment.progress === 100 ? 'var(--success)' : 'linear-gradient(90deg, var(--indigo), #a78bfa)' }} />
            </div>
            <span style={{ fontSize: '0.8rem', color: enrollment.progress === 100 ? 'var(--success)' : 'var(--muted)', flexShrink: 0, fontWeight: 600 }}>{enrollment.progress || 0}%</span>
          </div>
        </div>
        {enrollment.progress === 100 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 8 }}>
            <span className="badge badge-green">Completed</span>
            <button 
              onClick={(e) => {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('open-certificate', { detail: course }));
              }}
              className="btn btn-outline btn-sm"
              style={{ color: 'var(--success)', borderColor: 'var(--success)' }}
            >
              <Award size={14} /> Certificate
            </button>
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Instructor Dashboard ──────────────────────────────────────
function InstructorDashboard({ user }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSort, setActiveSort] = useState('all'); // 'all', 'students', 'rating'

  useEffect(() => {
    courseAPI.getMine()
      .then(({ data }) => setCourses(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalEnrolled = courses.reduce((a, c) => a + (c.enrolledCount || 0), 0);
  const totalEarnings = courses.reduce((a, c) => a + (c.price / 100) * (c.enrolledCount || 0), 0);
  const avgRating     = courses.length ? (courses.reduce((a, c) => a + (c.rating || 0), 0) / courses.length).toFixed(1) : 0;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: 6 }}>
            Instructor Hub, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p>Manage your courses and track performance</p>
        </div>
        <Link to="/create-course" className="btn btn-primary"><Plus size={16} /> New Course</Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 36 }}>
        {[
          { id: 'all', icon: BookOpen,   label: 'Total Courses',  value: courses.length, color: 'var(--indigo)' },
          { id: 'students', icon: Users,      label: 'Total Students', value: totalEnrolled.toLocaleString(), color: 'var(--gold)' },
          { id: 'rating', icon: Star,       label: 'Avg Rating',     value: avgRating, color: '#EC4899' },
          { id: 'earnings', icon: DollarSign, label: 'Est. Earnings',  value: `₹${Math.round(totalEarnings).toLocaleString('en-IN')}`, color: 'var(--success)' },
        ].map(({ id, icon: Icon, label, value, color }) => (
          <div key={label} className={`card ${id !== 'earnings' ? 'hoverable' : ''}`}
            onClick={() => id !== 'earnings' && setActiveSort(id)}
            style={{ padding: 20, cursor: id !== 'earnings' ? 'pointer' : 'default', border: activeSort === id ? `1px solid ${color}` : '1px solid var(--glass-border)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 500 }}>{label}</p>
              <Icon size={18} color={color} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Analytics Chart */}
      <div style={{ marginBottom: 36 }}>
        <InstructorEnrollmentChart courses={courses} />
      </div>

      {/* My Courses */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.2rem' }}>My Courses</h2>
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <Plus size={40} color="var(--indigo)" style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>No courses yet</h3>
            <Link to="/create-course" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Create First Course</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ marginBottom: 4, fontSize: '0.9rem', color: 'var(--muted)' }}>
              Showing {activeSort === 'all' ? 'All Courses' : activeSort === 'students' ? 'Courses Sorted by Students' : 'Courses Sorted by Rating'}
            </div>
            {[...courses]
              .sort((a, b) => {
                if (activeSort === 'students') return (b.enrolledCount || 0) - (a.enrolledCount || 0);
                if (activeSort === 'rating') return (b.rating || 0) - (a.rating || 0);
                return 0; // Default order
              })
              .map(course => (
              <div key={course._id} className="card" style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', transition: 'transform 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--navy-500)', overflow: 'hidden', flexShrink: 0 }}>
                  {course.thumbnail?.url
                    ? <img src={course.thumbnail.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={18} color="var(--muted)" /></div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{course.title}</p>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}><Users size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {course.enrolledCount} students</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}><Star size={11} style={{ display: 'inline', verticalAlign: 'middle', color: 'var(--gold)' }} /> {course.rating || 0}</span>
                  </div>
                </div>
                <span className={`badge ${course.status === 'published' ? 'badge-green' : 'badge-muted'}`} style={{ textTransform: 'capitalize' }}>
                  {course.status}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link to={`/manage-course/${course._id}`} className="btn btn-primary btn-sm">Manage</Link>
                  <Link to={`/courses/${course._id}`} className="btn btn-outline btn-sm">View</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────
function AdminDashboard({ user }) {
  const [usersList, setUsersList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'courses'
  const [filterRole, setFilterRole] = useState('all'); // 'all', 'student', 'instructor'
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null); // For manage modal
  
  // Add user form state
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'instructor' });
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = () => {
    setLoading(true);
    Promise.all([
      userAPI.getAllUsers({ limit: 100 }), // Using the existing userAPI route
      courseAPI.getAll({ limit: 100 })
    ]).then(([uRes, cRes]) => {
      setUsersList(uRes.data.data.users || []);
      setCoursesList(cRes.data.data.courses || []);
    }).catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      setAddingUser(true);
      await authAPI.register(newUser);
      toast.success('User created successfully!');
      setShowAddUser(false);
      setNewUser({ name: '', email: '', password: '', role: 'instructor' });
      fetchAdminData(); // Refresh the list
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setAddingUser(false);
    }
  };

  const totalStudents = usersList.filter(u => u.role === 'student').length;
  const totalInstructors = usersList.filter(u => u.role === 'instructor').length;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: 6 }}>
            Admin Control Panel <Shield size={24} style={{ display: 'inline', color: 'var(--indigo)' }} />
          </h1>
          <p>Manage platform users and overview courses</p>
        </div>
        <button onClick={() => setShowAddUser(true)} className="btn btn-primary"><Plus size={16} /> Add User</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 36 }}>
        {[
          { id: 'all', icon: Users,      label: 'Total Users',     value: usersList.length, color: 'var(--indigo)', type: 'users' },
          { id: 'student', icon: BookOpen,   label: 'Total Students',  value: totalStudents, color: 'var(--success)', type: 'users' },
          { id: 'instructor', icon: Star,       label: 'Instructors',     value: totalInstructors, color: 'var(--gold)', type: 'users' },
          { id: 'courses', icon: TrendingUp, label: 'Published Courses',value: coursesList.length, color: '#EC4899', type: 'courses' },
        ].map(({ id, icon: Icon, label, value, color, type }) => (
          <div key={label} className="card hoverable" 
            onClick={() => {
              setActiveTab(type);
              if (type === 'users') setFilterRole(id);
            }}
            style={{ padding: 20, cursor: 'pointer', border: (activeTab === 'users' && filterRole === id) || (activeTab === 'courses' && id === 'courses') ? `1px solid ${color}` : '1px solid var(--glass-border)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 500 }}>{label}</p>
              <Icon size={18} color={color} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>{loading ? '-' : value}</div>
          </div>
        ))}
      </div>

      {/* Analytics Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 36 }}>
        <UsersRoleChart users={usersList} />
        <CoursesCategoryChart courses={coursesList} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button onClick={() => { setActiveTab('users'); setFilterRole('all'); }} className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-outline'}`}>User Management</button>
        <button onClick={() => setActiveTab('courses')} className={`btn ${activeTab === 'courses' ? 'btn-primary' : 'btn-outline'}`}>Course Overview</button>
      </div>

      {/* Tab Content */}
      <div className="card" style={{ padding: 24, minHeight: 400 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading admin data...</div>
        ) : activeTab === 'users' ? (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ marginBottom: 16, fontSize: '0.9rem', color: 'var(--muted)' }}>
              Showing {filterRole === 'all' ? 'All Users' : filterRole === 'student' ? 'Students Only' : 'Instructors Only'}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--muted)', fontWeight: 500 }}>User</th>
                  <th style={{ padding: '12px 16px', color: 'var(--muted)', fontWeight: 500 }}>Role</th>
                  <th style={{ padding: '12px 16px', color: 'var(--muted)', fontWeight: 500 }}>Joined</th>
                  <th style={{ padding: '12px 16px', color: 'var(--muted)', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.filter(u => filterRole === 'all' || u.role === filterRole).map(u => (
                  <tr key={u._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--navy-600)', overflow: 'hidden' }}>
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt="" style={{ width: '100%', height: '100%' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span className={`badge ${u.role === 'admin' ? 'badge-gold' : u.role === 'instructor' ? 'badge-indigo' : 'badge-green'}`} style={{ textTransform: 'capitalize' }}>{u.role}</span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.9rem' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setSelectedUser(u)}>Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--muted)', fontWeight: 500 }}>Course</th>
                  <th style={{ padding: '12px 16px', color: 'var(--muted)', fontWeight: 500 }}>Category</th>
                  <th style={{ padding: '12px 16px', color: 'var(--muted)', fontWeight: 500 }}>Stats</th>
                  <th style={{ padding: '12px 16px', color: 'var(--muted)', fontWeight: 500, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coursesList.map(c => (
                  <tr key={c._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 48, height: 36, borderRadius: 6, background: 'var(--navy-600)', overflow: 'hidden' }}>
                          {c.thumbnail?.url && <img src={c.thumbnail.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        <div style={{ fontWeight: 600, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.9rem' }}>{c.category}</td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}><Users size={12} /> {c.enrolledCount}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--gold)' }}><Star size={12} /> {c.rating}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <Link to={`/courses/${c._id}`} className="btn btn-outline btn-sm">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: 450, padding: 32, animation: 'fadeUp 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: '1.4rem' }}>Add New User</h2>
              <button onClick={() => setShowAddUser(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X /></button>
            </div>
            
            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: 8 }}>Role</label>
                <select className="input" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={{ width: '100%' }}>
                  <option value="instructor">Instructor</option>
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: 8 }}>Full Name</label>
                <input className="input" required value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="John Doe" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: 8 }}>Email</label>
                <input type="email" className="input" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="john@example.com" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: 8 }}>Password</label>
                <input type="password" className="input" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="••••••••" style={{ width: '100%' }} />
              </div>
              
              <button type="submit" disabled={addingUser} className="btn btn-primary" style={{ marginTop: 8, height: 48 }}>
                {addingUser ? 'Creating...' : 'Create User'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manage User Modal */}
      {selectedUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: 450, padding: 32, animation: 'fadeUp 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: '1.4rem' }}>Manage User</h2>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--navy-600)', overflow: 'hidden' }}>
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.name}`} alt="" style={{ width: '100%', height: '100%' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: 4 }}>{selectedUser.name}</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{selectedUser.email}</p>
                  <span className={`badge ${selectedUser.role === 'admin' ? 'badge-gold' : selectedUser.role === 'instructor' ? 'badge-indigo' : 'badge-green'}`} style={{ textTransform: 'capitalize', marginTop: 8, display: 'inline-block' }}>
                    {selectedUser.role}
                  </span>
                </div>
              </div>

              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 12 }}>User ID: <span style={{ fontFamily: 'monospace', color: '#fff' }}>{selectedUser.userId || selectedUser._id}</span></p>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Joined: <span style={{ color: '#fff' }}>{new Date(selectedUser.createdAt).toLocaleDateString()}</span></p>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => {
                  toast.success('Role updated successfully! (Demo)');
                  setSelectedUser(null);
                }}>Change Role</button>
                <button className="btn btn-primary" style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }} onClick={() => {
                  toast.success('User deleted successfully! (Demo)');
                  setSelectedUser(null);
                }}>Delete User</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
