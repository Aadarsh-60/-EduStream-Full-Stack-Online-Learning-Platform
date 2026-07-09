import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, BookOpen, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { authAPI } from '../services/api.js';
import toast from 'react-hot-toast';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function AuthInput({ icon: Icon, label, ...props }) {
  const [show, setShow] = useState(false);
  const isPass = props.type === 'password';
  return (
    <div>
      <label className="input-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <Icon size={16} color="var(--muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input {...props} type={isPass && show ? 'text' : props.type} className="input" style={{ paddingLeft: 42, paddingRight: isPass ? 42 : 14 }} />
        {isPass && (
          <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Fill all fields');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(user.role === 'instructor' || user.role === 'admin' ? '/dashboard' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Login to continue learning">
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <AuthInput icon={Mail} label="Email address" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
        <AuthInput icon={Lock} label="Password" type="password" placeholder="Your password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
        <div style={{ textAlign: 'right' }}>
          <Link to="/forgot-password" style={{ fontSize: '0.82rem', color: 'var(--indigo-light)' }}>Forgot password?</Link>
        </div>
        <button type="submit" className="btn btn-primary" style={{ height: 48, marginTop: 4 }} disabled={loading}>
          {loading ? 'Logging in...' : <><span>Login</span> <ArrowRight size={16} /></>}
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
        </div>

        <a href="/api/auth/google" className="btn" style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, 
          background: '#fff', color: '#333', height: 48, width: '100%', borderRadius: 'var(--radius-sm)', transition: 'background 0.2s'
        }} onMouseEnter={e => e.currentTarget.style.background = '#f1f1f1'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
          <GoogleIcon />
          <span style={{ fontWeight: 600 }}>Continue with Google</span>
        </a>

        <p style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: 8 }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--indigo-light)', fontWeight: 500 }}>Sign up free</Link>
        </p>

        {/* Quick fill for testing */}
        <div style={{ marginTop: 8, padding: 12, background: 'rgba(108,99,255,0.06)', borderRadius: 10, border: '1px solid rgba(108,99,255,0.15)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>🧪 Test accounts</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {[['student@edustream.com','Student'],['instructor@edustream.com','Instructor'],['admin@edustream.com','Admin']].map(([email, label]) => (
              <button key={email} type="button"
                onClick={() => setForm({ email, password: 'Test@1234' })}
                style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--lavender)', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--glass)'}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ name: '', email: '', password: '', role: 'student' });
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('Fill all fields');
    if (form.password.length < 6) return toast.error('Password must be 6+ characters');
    setLoading(true);
    try {
      await authAPI.register(form);
      toast.success('Account created! Please verify your email.');
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout title="Create account" subtitle="Start your learning journey today">
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <AuthInput icon={User} label="Full name" type="text" placeholder="Rahul Sharma" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        <AuthInput icon={Mail} label="Email address" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
        <AuthInput icon={Lock} label="Password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />

        <div>
          <label className="input-label">I want to</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['student','🎓 Learn'],['instructor','🎤 Instructor']].map(([val, label]) => (
              <label key={val} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px', borderRadius: 10, cursor: 'pointer',
                background: form.role === val ? 'rgba(108,99,255,0.15)' : 'var(--glass)',
                border: `1px solid ${form.role === val ? 'var(--indigo)' : 'var(--glass-border)'}`,
                color: form.role === val ? 'var(--indigo-light)' : 'var(--lavender)',
                fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.2s',
              }}>
                <input type="radio" name="role" value={val} checked={form.role === val} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={{ display: 'none' }} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ height: 48, marginTop: 4 }} disabled={loading}>
          {loading ? 'Creating account...' : <><span>Create Account</span> <ArrowRight size={16} /></>}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
        </div>

        <a href="/api/auth/google" className="btn" style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, 
          background: '#fff', color: '#333', height: 48, width: '100%', borderRadius: 'var(--radius-sm)', transition: 'background 0.2s'
        }} onMouseEnter={e => e.currentTarget.style.background = '#f1f1f1'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
          <GoogleIcon />
          <span style={{ fontWeight: 600 }}>Continue with Google</span>
        </a>

        <p style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: 8 }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--indigo-light)', fontWeight: 500 }}>Login</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

function AuthLayout({ title, subtitle, children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', paddingTop: 88, position: 'relative' }}>
      <div style={{ position: 'absolute', top: '20%', left: '10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,99,255,0.1), transparent)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #6C63FF, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={22} color="#fff" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem', color: '#fff' }}>EduStream</span>
          </Link>
          <h2 style={{ marginBottom: 8, fontSize: '1.8rem' }}>{title}</h2>
          <p style={{ fontSize: '1rem' }}>{subtitle}</p>
        </div>
        <div style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xl)', padding: '40px', backdropFilter: 'blur(20px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const email = searchParams.get('email') || '';
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    if (!email || !otp) return toast.error('Email and OTP are required');
    if (otp.length !== 6) return toast.error('OTP must be 6 digits');
    
    setLoading(true);
    try {
      await authAPI.verifyEmail({ email, otp });
      toast.success('Email verified successfully! You can now login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Verify Email" subtitle="Enter the 6-digit code sent to your email">
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            We sent a verification code to <strong style={{ color: 'var(--text)' }}>{email}</strong>
          </p>
        </div>
        
        <AuthInput 
          icon={Lock} 
          label="Verification Code (OTP)" 
          type="text" 
          placeholder="123456" 
          value={otp} 
          onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
          maxLength={6}
          style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem', fontWeight: 600 }}
        />
        
        <button type="submit" className="btn btn-primary" style={{ height: 48, marginTop: 4 }} disabled={loading || otp.length !== 6}>
          {loading ? 'Verifying...' : <><span>Verify Account</span> <ArrowRight size={16} /></>}
        </button>
      </form>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = Enter Email, 2 = Enter OTP & New Password

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Email is required');
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setStep(2);
      toast.success('6-digit OTP sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp) return toast.error('OTP is required');
    if (otp.length !== 6) return toast.error('OTP must be 6 digits');
    if (!newPassword || newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    
    setLoading(true);
    try {
      await authAPI.resetPassword({ token: otp, newPassword });
      toast.success('Password reset successfully! You can now login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset Password" subtitle={step === 1 ? "Enter your email to receive an OTP" : "Enter the OTP and your new password"}>
      {step === 1 ? (
        <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AuthInput icon={Mail} label="Email address" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          <button type="submit" className="btn btn-primary" style={{ height: 48, marginTop: 4 }} disabled={loading}>
            {loading ? 'Sending OTP...' : <><span>Send OTP</span> <ArrowRight size={16} /></>}
          </button>
          <p style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: 8 }}>
            Remembered your password? <Link to="/login" style={{ color: 'var(--indigo-light)', fontWeight: 500 }}>Login</Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              OTP sent to <strong style={{ color: 'var(--text)' }}>{email}</strong>
            </p>
          </div>
          <AuthInput 
            icon={Lock} 
            label="6-Digit OTP" 
            type="text" 
            placeholder="123456" 
            value={otp} 
            onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} 
            maxLength={6}
            style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem', fontWeight: 600 }}
          />
          <AuthInput icon={Lock} label="New Password" type="password" placeholder="At least 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <button type="submit" className="btn btn-primary" style={{ height: 48, marginTop: 4 }} disabled={loading || otp.length !== 6 || newPassword.length < 6}>
            {loading ? 'Resetting...' : <><span>Update Password</span> <ArrowRight size={16} /></>}
          </button>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.85rem' }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}

export function OAuthSuccessPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token');

    if (token) {
      localStorage.setItem('accessToken', token);
      window.location.href = '/dashboard';
    } else {
      toast.error('Google login failed');
      navigate('/login');
    }
  }, [navigate]);

  return (
    <AuthLayout title="Logging you in" subtitle="Please wait while we connect your account...">
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--indigo)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        <p style={{ marginTop: 16, color: 'var(--muted)' }}>Securing your session...</p>
      </div>
    </AuthLayout>
  );
}
