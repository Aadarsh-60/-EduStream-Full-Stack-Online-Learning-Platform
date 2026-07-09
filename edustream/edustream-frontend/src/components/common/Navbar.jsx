import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, ChevronDown, LogOut, User, BookOpen, LayoutDashboard, Menu, X, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
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

      <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 16, height: 68 }}>

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #6C63FF, #4F46E5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen size={16} color="#fff" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: '#fff' }}>
            Edu<span style={{ color: 'var(--indigo-light)' }}>Stream</span>
          </span>
        </Link>

        {/* Nav Links - desktop */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }} className="desktop-only">
          {[['/', 'Home'], ['/courses', 'Courses']].map(([path, label]) => (
            <Link key={path} to={path} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500,
              color: isActive(path) ? '#fff' : 'var(--muted)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          
          {/* Theme Toggle */}
          <button 
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className="btn btn-ghost btn-sm" 
            style={{ padding: 8 }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user ? (
            <>
              {/* Notifications */}
              <button className="btn btn-ghost btn-sm" style={{ padding: 8, position: 'relative' }}>
                <Bell size={18} />
                <span style={{
                  position: 'absolute', top: 4, right: 4, width: 8, height: 8,
                  background: 'var(--gold)', borderRadius: '50%',
                  border: '2px solid var(--navy)',
                }} />
              </button>

              {/* Dashboard */}
              <Link to="/dashboard" className="btn btn-outline btn-sm desktop-only">
                <LayoutDashboard size={15} /> Dashboard
              </Link>

              {/* User dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setDropOpen(!dropOpen)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', color: '#fff' }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--indigo), var(--indigo-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }} className="desktop-only">{user.name?.split(' ')[0]}</span>
                  <ChevronDown size={14} color="var(--muted)" />
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
              <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}

          {/* Mobile menu toggle */}
          <button className="btn btn-ghost mobile-only" onClick={() => setMenuOpen(!menuOpen)} style={{ padding: 8 }}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: 'var(--navy-800)', borderTop: '1px solid var(--border)', padding: '16px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link to="/" onClick={() => setMenuOpen(false)} style={{ padding: '10px 12px', color: 'var(--lavender)', fontSize: '0.9rem' }}>Home</Link>
            <Link to="/courses" onClick={() => setMenuOpen(false)} style={{ padding: '10px 12px', color: 'var(--lavender)', fontSize: '0.9rem' }}>Courses</Link>
            {user && <Link to="/dashboard" onClick={() => setMenuOpen(false)} style={{ padding: '10px 12px', color: 'var(--lavender)', fontSize: '0.9rem' }}>Dashboard</Link>}
            {!user && <Link to="/login" onClick={() => setMenuOpen(false)} className="btn btn-outline" style={{ marginTop: 8 }}>Login</Link>}
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
