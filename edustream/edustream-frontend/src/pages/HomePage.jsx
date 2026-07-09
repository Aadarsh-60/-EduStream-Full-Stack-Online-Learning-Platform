import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Zap, Award, Users, TrendingUp, ArrowRight, Play, Star, CheckCircle } from 'lucide-react';
import { courseAPI, searchAPI } from '../services/api.js';
import CourseCard from '../components/course/CourseCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const STATS = [
  { icon: Users, value: '50K+', label: 'Students' },
  { icon: Play, value: '500+', label: 'Courses' },
  { icon: Award, value: '4.8★', label: 'Avg Rating' },
  { icon: Zap, value: '24/7', label: 'Access' },
];

const CATEGORIES = ['Web Development', 'Data Science', 'Mobile Development', 'DevOps', 'Design', 'Business'];

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState('');
  const [activecat, setActiveCat] = useState('');

  useEffect(() => {
    courseAPI.getAll({ limit: 8 })
      .then(({ data }) => setCourses(data.data.courses || []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const filterByCategory = (cat) => {
    setActiveCat(cat === activecat ? '' : cat);
    navigate(`/courses${cat ? `?category=${encodeURIComponent(cat)}` : ''}`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchVal.trim()) navigate(`/courses?q=${encodeURIComponent(searchVal)}`);
  };

  return (
    <div style={{ overflowX: 'hidden' }}>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: 80 }}>

        {/* Background blobs */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '15%', left: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'rotateBlob 20s linear infinite', transformOrigin: 'center' }} />
          <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'rotateBlob 25s linear infinite reverse', transformOrigin: 'center' }} />
          {/* Grid pattern */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(108,99,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(108,99,255,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div className="container" style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '40px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 500px', maxWidth: 720, animation: 'fadeUp 0.7s ease' }}>

            <a href="/courses" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '6px 16px 6px 6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '28px', textDecoration: 'none', transition: 'all 0.3s ease', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(108,99,255,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <span style={{ background: 'linear-gradient(135deg, var(--indigo), var(--indigo-dark))', color: '#fff', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>NEW</span>
              <span style={{ fontWeight: 500 }}>System Design Cohort 3.0 is now live</span>
              <ArrowRight size={14} color="var(--muted)" style={{ marginLeft: 4 }} />
            </a>

            <h1 style={{ marginBottom: 24, letterSpacing: '-0.02em', fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1 }}>
              Master skills that{' '}
              <span className="gradient-text">actually matter</span>{' '}
              in tech
            </h1>

            <p style={{ fontSize: '1.15rem', lineHeight: 1.7, marginBottom: 40, color: 'var(--muted)', maxWidth: 540 }}>
              Learn MERN stack, Data Science, DevOps and System Design with project-based courses taught by industry experts.
            </p>

            {/* Search bar */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, marginBottom: 16, maxWidth: 540 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={18} color="var(--muted)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  value={searchVal}
                  onChange={e => setSearchVal(e.target.value)}
                  placeholder="Search e.g. Docker, React, Python..."
                  className="input"
                  style={{ paddingLeft: 44, height: 56, fontSize: '1rem', borderRadius: 14 }}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ height: 56, paddingInline: 32, borderRadius: 14, flexShrink: 0, fontSize: '1rem' }}>
                Search
              </button>
            </form>

            {/* Popular Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 40, alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Popular:</span>
              {['MERN Stack', 'Python', 'DevOps', 'System Design'].map(t => (
                <button key={t} onClick={() => navigate(`/courses?q=${t}`)}
                  style={{ padding: '4px 12px', borderRadius: 20, background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--lavender)', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.target.style.background = 'rgba(108,99,255,0.1)'; }}
                  onMouseLeave={e => { e.target.style.background = 'var(--glass)'; }}
                >{t}</button>
              ))}
            </div>

            {/* Trust / Stats Box */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', padding: '20px 24px', background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', maxWidth: 540, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>

              {/* Avatars */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex' }}>
                  {['https://api.dicebear.com/7.x/avataaars/svg?seed=rahul', 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya', 'https://api.dicebear.com/7.x/avataaars/svg?seed=neha'].map((src, i) => (
                    <img key={i} src={src} alt="Instructor" style={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid var(--navy)', marginLeft: i > 0 ? -12 : 0, background: 'var(--navy-600)' }} />
                  ))}
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>50+ Experts</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Top Instructors</div>
                </div>
              </div>

              <div style={{ width: 1, height: 32, background: 'var(--border)' }} className="desktop-only" />

              {/* Rating */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: 'rgba(245, 166, 35, 0.1)', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                  <Star fill="var(--gold)" color="var(--gold)" size={20} />
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>4.8/5.0 Avg</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>from 10k+ reviews</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Side Illustration / Mockup ── */}
          <div className="desktop-only" style={{ flex: '1 1 400px', maxWidth: 500, animation: 'fadeUp 0.9s ease', position: 'relative' }}>
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(108, 99, 255, 0.2)',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(108, 99, 255, 0.15)',
              backdropFilter: 'blur(20px)',
              position: 'relative'
            }}>
              {/* Mac OS Window Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }} />
              </div>

              {/* Code Content */}
              <div style={{ fontFamily: '"Fira Code", monospace', fontSize: '0.85rem', color: '#e2e8f0', lineHeight: '1.7' }}>
                <div style={{ color: '#c678dd' }}>import <span style={{ color: '#e5c07b' }}>{'{'} useState, useEffect {'}'}</span> from <span style={{ color: '#98c379' }}>'react'</span>;</div>
                <div style={{ color: '#c678dd' }}>import <span style={{ color: '#e5c07b' }}>{'{'} motion {'}'}</span> from <span style={{ color: '#98c379' }}>'framer-motion'</span>;</div>
                <br />
                <div style={{ color: '#61afef' }}>function <span style={{ color: '#e5c07b' }}>MasterClass</span>() {'{'}</div>
                <div style={{ paddingLeft: '24px' }}>
                  <div style={{ color: '#c678dd' }}>const <span style={{ color: '#e06c75' }}>[skills, setSkills]</span> = <span style={{ color: '#56b6c2' }}>useState</span>([</div>
                  <div style={{ paddingLeft: '24px', color: '#98c379' }}>'React', 'Node.js', 'System Design'</div>
                  <div>]);</div>
                  <br />
                  <div style={{ color: '#c678dd' }}>return (</div>
                  <div style={{ paddingLeft: '24px' }}>
                    <div style={{ color: '#e06c75' }}>&lt;<span style={{ color: '#e5c07b' }}>motion.div</span> <span style={{ color: '#d19a66' }}>whileHover</span>=<span style={{ color: '#56b6c2' }}>{'{'}</span>scale: <span style={{ color: '#d19a66' }}>1.05</span><span style={{ color: '#56b6c2' }}>{'}'}</span>&gt;</div>
                    <div style={{ paddingLeft: '24px' }}>
                      <div style={{ color: '#abb2bf' }}>Build scalable architectures</div>
                    </div>
                    <div style={{ color: '#e06c75' }}>&lt;/<span style={{ color: '#e5c07b' }}>motion.div</span>&gt;</div>
                  </div>
                  <div>);</div>
                </div>
                <div>{'}'}</div>
              </div>

              {/* Top Left Floating Element */}
              <div style={{
                position: 'absolute',
                top: '-20px',
                left: '-30px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)',
                padding: '10px 16px',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                animation: 'float 5s ease-in-out infinite reverse'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }} />
                <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 500 }}>Live: System Design</span>
              </div>

              {/* Floating Element */}
              <div style={{
                position: 'absolute',
                bottom: '-24px',
                right: '-24px',
                background: 'linear-gradient(135deg, var(--indigo), var(--indigo-dark))',
                padding: '16px 20px',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(108,99,255,0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                animation: 'float 4s ease-in-out infinite'
              }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                  <CheckCircle size={20} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>Course Completed</div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#fff' }}>+100 XP Gained</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trusted By ─────────────────────────────────────────── */}
      <section style={{ padding: '30px 0', borderTop: '1px solid var(--border)', background: 'linear-gradient(to right, rgba(10, 15, 30, 0), rgba(108, 99, 255, 0.05), rgba(10, 15, 30, 0))' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 20, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>Trusted by experts from top tech companies</p>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'clamp(30px, 6vw, 60px)', flexWrap: 'wrap', opacity: 0.6 }}>
            {['Google', 'Microsoft', 'Amazon', 'Meta', 'Netflix'].map(company => (
              <span key={company} style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--lavender)', letterSpacing: '-0.02em' }}>{company}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--glass)' }}>
        <div className="container" style={{ padding: '40px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <Icon size={22} color="var(--indigo-light)" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>{value}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ─────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2>Browse by Category</h2>
              <p style={{ marginTop: 6 }}>Find the right course for your goals</p>
            </div>
            <Link to="/courses" className="btn btn-outline btn-sm">View All <ArrowRight size={14} /></Link>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => filterByCategory(cat)}
                style={{
                  padding: '10px 20px', borderRadius: 12, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
                  background: activecat === cat ? 'linear-gradient(135deg, var(--indigo), var(--indigo-dark))' : 'var(--glass)',
                  border: activecat === cat ? 'none' : '1px solid var(--glass-border)',
                  color: activecat === cat ? '#fff' : 'var(--lavender)',
                  transition: 'all 0.2s', boxShadow: activecat === cat ? '0 4px 15px rgba(108,99,255,0.3)' : 'none',
                }}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Courses ───────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2>Featured Courses</h2>
              <p style={{ marginTop: 6 }}>Handpicked courses to kickstart your journey</p>
            </div>
            <Link to="/courses" className="btn btn-outline btn-sm">All Courses <ArrowRight size={14} /></Link>
          </div>

          {loading ? (
            <div className="grid-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div className="skeleton" style={{ aspectRatio: '16/9' }} />
                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="skeleton" style={{ height: 14, width: '60%' }} />
                    <div className="skeleton" style={{ height: 18, width: '90%' }} />
                    <div className="skeleton" style={{ height: 18, width: '80%' }} />
                    <div className="skeleton" style={{ height: 14, width: '40%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid-4">
              {courses.map(c => <CourseCard key={c._id} course={c} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── Why EduStream ──────────────────────────────────────── */}
      <section id="about" className="section" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.05), rgba(245,166,35,0.03))' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2>Why thousands choose EduStream</h2>
            <p style={{ marginTop: 10 }}>Built for serious learners who want real results</p>
          </div>
          <div className="grid-3">
            {[
              { icon: '🎯', title: 'Project-Based Learning', desc: 'Every course includes real projects you can add to your portfolio. No theoretical fluff.' },
              { icon: '🇮🇳', title: 'Hindi + English Medium', desc: 'Learn in the language you think in. Most courses explained in Hinglish for better understanding.' },
              { icon: '⚡', title: 'Industry Expert Instructors', desc: 'Learn from working professionals with real-world experience, not just academics.' },
              { icon: '📱', title: 'Learn Anywhere', desc: 'Access courses on any device. Download for offline learning. Learn at your own pace.' },
              { icon: '🏆', title: 'Certificates', desc: 'Get verifiable certificates upon completion to showcase on LinkedIn and resumes.' },
              { icon: '💬', title: 'Community Support', desc: 'Ask questions, get answers. Active student community with instructor support.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="card" style={{ padding: 28 }}>
                <div style={{ fontSize: '2rem', marginBottom: 14 }}>{icon}</div>
                <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────── */}
      {!user && (
        <section className="section">
          <div className="container">
            <div style={{
              background: 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(79,70,229,0.1))',
              border: '1px solid rgba(108,99,255,0.2)',
              borderRadius: 'var(--radius-xl)', padding: '60px 48px', textAlign: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,99,255,0.2), transparent)', filter: 'blur(30px)' }} />
              <h2 style={{ marginBottom: 14 }}>Ready to start your journey?</h2>
              <p style={{ fontSize: '1rem', maxWidth: 480, margin: '0 auto 32px' }}>
                Join 50,000+ students already learning on EduStream. First course free, no credit card required.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/register" className="btn btn-primary btn-lg">Create Free Account <ArrowRight size={18} /></Link>
                <Link to="/courses" className="btn btn-outline btn-lg">Browse Courses</Link>
              </div>
              <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
                {['No credit card required', 'Cancel anytime', '30-day money back'].map(f => (
                  <span key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.95rem', color: 'var(--muted)' }}>
                    <CheckCircle size={16} color="var(--success)" /> {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '40px 0', marginTop: 40 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6C63FF, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 700 }}>E</span>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: '#fff' }}>EduStream</span>
          </div>
          <p style={{ fontSize: '0.95rem' }}>© 2024 EduStream. Built with MERN Microservices.</p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <Link to="/courses" style={{ fontSize: '0.95rem', color: 'var(--muted)', textDecoration: 'none' }}>Courses</Link>
            <a href="#about" style={{ fontSize: '0.95rem', color: 'var(--muted)', textDecoration: 'none' }}>About Us</a>
            <Link to="/contact" style={{ fontSize: '0.95rem', color: 'var(--muted)', textDecoration: 'none' }}>Contact Admin</Link>
            <Link to="/register" style={{ fontSize: '0.95rem', color: 'var(--muted)', textDecoration: 'none' }}>Become an Instructor</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
