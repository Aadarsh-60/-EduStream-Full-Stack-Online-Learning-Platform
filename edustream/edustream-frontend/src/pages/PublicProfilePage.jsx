import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Mail, BookOpen, Star, Users, Award, Shield, User } from 'lucide-react';
import { userAPI, courseAPI } from '../services/api.js';
import CourseCard from '../components/course/CourseCard.jsx';
import toast from 'react-hot-toast';

export default function PublicProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    userAPI.getPublicProfile(id)
      .then(async ({ data }) => {
        setProfile(data.data);
        if (data.data.role === 'instructor' || data.data.role === 'admin') {
          try {
            const courseRes = await courseAPI.getAll({ instructorId: id, limit: 20 });
            setCourses(courseRes.data.data.courses || []);
          } catch(e) { console.error('Failed to fetch courses'); }
        }
      })
      .catch(() => toast.error('User not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ paddingTop: 100, minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
      <div className="skeleton" style={{ width: 800, height: 300, borderRadius: 16 }} />
    </div>
  );

  if (!profile) return (
    <div style={{ paddingTop: 100, minHeight: '100vh', textAlign: 'center', color: 'var(--muted)' }}>
      <User size={64} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
      <h2>User Not Found</h2>
      <Link to="/" className="btn btn-primary" style={{ marginTop: 24, display: 'inline-flex' }}>Go Home</Link>
    </div>
  );

  return (
    <div style={{ paddingTop: 68, minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(135deg, var(--navy-800), var(--navy-600))', padding: '60px 0 40px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          
          <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'linear-gradient(135deg, var(--indigo), var(--indigo-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 700, color: '#fff', border: '4px solid var(--navy-900)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', marginBottom: 20 }}>
            {profile.avatar?.url ? (
              <img src={profile.avatar.url} alt={profile.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : profile.name?.[0]?.toUpperCase()}
          </div>
          
          <h1 style={{ fontSize: '2rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            {profile.name}
            {(profile.role === 'instructor' || profile.role === 'admin') && <Shield size={24} color="var(--gold)" fill="rgba(251, 191, 36, 0.2)" />}
          </h1>
          
          <p style={{ color: 'var(--lavender)', fontSize: '1.1rem', marginBottom: 16, textTransform: 'capitalize' }}>
            {profile.headline || `${profile.role} at EduStream`}
          </p>

          <div style={{ display: 'flex', gap: 24, color: 'var(--muted)', fontSize: '0.9rem' }}>
            {profile.role === 'instructor' && (
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BookOpen size={16} /> {courses.length} Courses</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={16} /> Instructor</span>
              </>
            )}
            {profile.role === 'student' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Award size={16} /> Avid Learner</span>
            )}
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
        {profile.bio && (
          <div className="card" style={{ padding: 32, marginBottom: 40, maxWidth: 800, margin: '0 auto 40px' }}>
            <h3 style={{ marginBottom: 16 }}>About me</h3>
            <p style={{ color: 'var(--lavender)', lineHeight: 1.7 }}>{profile.bio}</p>
          </div>
        )}

        {(profile.role === 'instructor' || profile.role === 'admin') && courses.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: 24, textAlign: 'center' }}>Courses by {profile.name}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
              {courses.map(c => <CourseCard key={c._id} course={c} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
