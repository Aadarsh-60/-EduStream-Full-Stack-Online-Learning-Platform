import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, ChevronDown, ChevronLeft, ChevronRight, LogOut, User, BookOpen, LayoutDashboard, Menu, X, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { notificationAPI } from '../../services/api.js';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled]     = useState(false);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [dropOpen, setDropOpen]     = useState(false);
  const [searchVal, setSearchVal]   = useState('');
  const [theme, setTheme]           = useState(localStorage.getItem('theme') || 'dark');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      notificationAPI.getUnread().then(({ data }) => setUnreadCount(data.data?.count || 0)).catch(() => {});
    } else {
      setUnreadCount(0);
    }
  }, [user, location.pathname]); // Refresh on navigation

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchVal.trim()) navigate(`/courses?q=${encodeURIComponent(searchVal)}`);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: scrolled ? 'rgba(10,15,30,0.95)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(108,99,255,0.1)' : 'none',
      transition: 'all 0.3s ease',
    }}>
      {/* Top Gradient Liner */}
      <div style={{ height: '3px', width: '100%', background: 'linear-gradient(90deg, var(--indigo), var(--gold), var(--success))' }} />

      <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 10, height: 64 }}>

        {/* Navigation History */}
        <div style={{ display: 'flex', gap: 4, marginRight: 8 }} className="desktop-only">
          <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ padding: '6px', borderRadius: '50%' }}>
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => navigate(1)} className="btn btn-ghost btn-sm" style={{ padding: '6px', borderRadius: '50%' }}>
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #6C63FF, #4F46E5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen size={16} color="#fff" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
            Edu<span style={{ color: 'var(--indigo-light)' }}>Stream</span>
          </span>
        </Link>

        {/* Nav Links - desktop */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }} className="desktop-only">
          {[['/', 'Home'], ['/courses', 'Courses']].map(([path, label]) => (
            <Link key={path} to={path} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500,
              color: isActive(path) ? 'var(--text-main)' : 'var(--muted)',
              background: isActive(path) ? 'rgba(108,99,255,0.15)' : 'transparent',
              transition: 'all 0.2s',
            }}>{label}</Link>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 400 }} className="desktop-only">
          <div style={{ position: 'relative' }}>
            <Search size={15} color="var(--muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              placeholder="Search courses..."
              className="input"
              style={{ paddingLeft: 36, paddingTop: 8, paddingBottom: 8, fontSize: '0.85rem' }}
            />
          </div>
        </form>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          
          {/* Theme Toggle */}
          <button 
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className="btn btn-ghost btn-sm" 
            style={{ padding: '6px 8px' }}
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {user ? (
            <>
              {/* Notifications */}
              <Link to="/dashboard#notifications" onClick={() => window.dispatchEvent(new Event('open-notifications'))} className="btn btn-ghost btn-sm" style={{ padding: '6px 8px', position: 'relative' }}>
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4, width: 8, height: 8,
                    background: 'var(--gold)', borderRadius: '50%',
                    border: '2px solid var(--navy)',
                  }} />
                )}
              </Link>

              {/* Dashboard */}
              <Link to="/dashboard" className="btn btn-outline btn-sm desktop-only">
                <LayoutDashboard size={15} /> Dashboard
              </Link>

              {/* User dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setDropOpen(!dropOpen)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '5px 10px', cursor: 'pointer', color: 'var(--text-main)' }}
                >
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, var(--indigo), var(--indigo-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 600 }}>
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 500 }} className="desktop-only">{user.name?.split(' ')[0]}</span>
                  <ChevronDown size={13} color="var(--muted)" />
                </button>

                {dropOpen && (
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 200,
                    background: 'var(--navy-600)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', padding: 8, boxShadow: 'var(--shadow-card)',
                    zIndex: 100,
                  }}>
                    {[
                      { to: '/profile', icon: User, label: 'Profile' },
                      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                    ].map(({ to, icon: Icon, label }) => (
                      <Link key={to} to={to} onClick={() => setDropOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, color: 'var(--lavender)', fontSize: '0.875rem', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--glass)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <Icon size={15} color="var(--muted)" />{label}
                      </Link>
                    ))}
                    <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '6px 0' }} />
                    <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, color: '#EF4444', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm desktop-only">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm" style={{ padding: '6px 12px', fontSize: '0.82rem' }}>Get Started</Link>
            </>
          )}

          {/* Mobile menu toggle */}
          <button className="btn btn-ghost mobile-only" onClick={() => setMenuOpen(!menuOpen)} style={{ padding: '6px 8px' }} aria-label="Toggle navigation">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div style={{
          background: 'rgba(13, 20, 40, 0.98)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          padding: '16px',
          maxHeight: 'calc(100vh - 70px)',
          overflowY: 'auto'
        }}>
          {/* Mobile Search */}
          <form onSubmit={(e) => { handleSearch(e); setMenuOpen(false); }} style={{ marginBottom: 14 }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} color="var(--muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                placeholder="Search courses..."
                className="input"
                style={{ paddingLeft: 36, paddingTop: 10, paddingBottom: 10, fontSize: '0.9rem' }}
              />
            </div>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Link to="/" onClick={() => setMenuOpen(false)} style={{ padding: '10px 12px', borderRadius: 8, color: isActive('/') ? 'var(--indigo-light)' : 'var(--lavender)', background: isActive('/') ? 'rgba(108,99,255,0.1)' : 'transparent', fontSize: '0.92rem', fontWeight: 500 }}>
              Home
            </Link>
            <Link to="/courses" onClick={() => setMenuOpen(false)} style={{ padding: '10px 12px', borderRadius: 8, color: isActive('/courses') ? 'var(--indigo-light)' : 'var(--lavender)', background: isActive('/courses') ? 'rgba(108,99,255,0.1)' : 'transparent', fontSize: '0.92rem', fontWeight: 500 }}>
              Browse Courses
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)} style={{ padding: '10px 12px', borderRadius: 8, color: isActive('/dashboard') ? 'var(--indigo-light)' : 'var(--lavender)', background: isActive('/dashboard') ? 'rgba(108,99,255,0.1)' : 'transparent', fontSize: '0.92rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LayoutDashboard size={16} /> Dashboard
                </Link>
                <Link to="/profile" onClick={() => setMenuOpen(false)} style={{ padding: '10px 12px', borderRadius: 8, color: isActive('/profile') ? 'var(--indigo-light)' : 'var(--lavender)', background: isActive('/profile') ? 'rgba(108,99,255,0.1)' : 'transparent', fontSize: '0.92rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={16} /> Profile & Settings
                </Link>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />
                <button onClick={() => { setMenuOpen(false); handleLogout(); }} style={{ padding: '10px 12px', borderRadius: 8, color: '#EF4444', background: 'transparent', border: 'none', fontSize: '0.92rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', cursor: 'pointer' }}>
                  <LogOut size={16} /> Logout
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="btn btn-outline" style={{ width: '100%' }}>
                  Login
                </Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="btn btn-primary" style={{ width: '100%' }}>
                  Get Started Free
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) { .desktop-only { display: none !important; } }
        @media (min-width: 769px) { .mobile-only  { display: none !important; } }
      `}</style>
    </nav>
  );
}
