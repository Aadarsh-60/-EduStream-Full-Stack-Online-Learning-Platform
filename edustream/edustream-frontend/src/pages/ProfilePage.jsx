import { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Save,
  Trash2,
  User,
  Link as LinkIcon,
  Linkedin,
  Twitter,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Laptop,
  KeyRound,
  LogOut,
  Copy,
  Check,
  Download,
  AlertTriangle,
  History,
} from 'lucide-react';
import { userAPI, authAPI } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const fileRef = useRef();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security'
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', headline: '', website: '', linkedin: '', twitter: '' });

  // Security & 2FA State
  const [setupModal, setSetupModal] = useState(false);
  const [setupData, setSetupData] = useState(null); // { secret, otpauthUri, qrCodeUrl, recoveryCodes }
  const [verifyCode, setVerifyCode] = useState('');
  const [setupStep, setSetupStep] = useState(1); // 1: QR scan & code verify, 2: Recovery codes saved
  const [disableModal, setDisableModal] = useState(false);
  const [disableCred, setDisableCred] = useState({ password: '', code: '' });
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokeModal, setRevokeModal] = useState({ open: false, target: null, otp: '', loading: false });

  useEffect(() => {
    userAPI
      .getMyProfile()
      .then(({ data }) => {
        setProfile(data.data);
        const d = data.data;
        setForm({
          name: d.name || '',
          bio: d.bio || '',
          headline: d.headline || '',
          website: d.website || '',
          linkedin: d.linkedin || '',
          twitter: d.twitter || '',
        });
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const { data } = await authAPI.getSessions();
      setSessions(data.data.sessions || []);
      setLoginHistory(data.data.loginHistory || []);
    } catch {
      toast.error('Failed to load active sessions');
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'security') {
      fetchSessions();
    }
  }, [activeTab]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await userAPI.updateProfile(form);
      setProfile(data.data);
      setUser((u) => ({ ...u, name: form.name }));
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max 5MB allowed');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const { data } = await userAPI.uploadAvatar(fd);
      setProfile((p) => ({ ...p, avatar: { url: data.data.avatarUrl } }));
      toast.success('Avatar updated!');
    } catch {
      toast.error('Avatar upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      await userAPI.deleteAvatar();
      setProfile((p) => ({ ...p, avatar: { url: null } }));
      toast.success('Avatar removed');
    } catch {
      toast.error('Failed to remove avatar');
    }
  };

  // ── 2FA Handlers ──────────────────────────────────────────────
  const handleStart2FASetup = async () => {
    try {
      const { data } = await authAPI.setup2FA();
      setSetupData(data.data);
      setSetupStep(1);
      setVerifyCode('');
      setSetupModal(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate 2FA setup');
    }
  };

  const handleVerifyAndEnable2FA = async (e) => {
    e.preventDefault();
    if (!verifyCode || verifyCode.trim().length !== 6) {
      return toast.error('Enter 6-digit code from Google Authenticator');
    }
    try {
      await authAPI.enable2FA({ code: verifyCode.trim() });
      setUser((u) => ({ ...u, twoFactorEnabled: true }));
      setSetupStep(2); // Show recovery codes
      toast.success('Two-Factor Authentication is now enabled!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid verification code');
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    if (!disableCred.password && !disableCred.code) {
      return toast.error('Enter password or 6-digit code');
    }
    try {
      await authAPI.disable2FA(disableCred);
      setUser((u) => ({ ...u, twoFactorEnabled: false }));
      setDisableModal(false);
      setDisableCred({ password: '', code: '' });
      toast.success('2FA has been disabled');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disable 2FA');
    }
  };

  const initiateRevoke = async (target) => {
    try {
      setRevokeModal({ open: true, target, otp: '', loading: true });
      await authAPI.requestSessionRevokeOtp();
      toast.success('Verification code sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request OTP');
      setRevokeModal({ open: false, target: null, otp: '', loading: false });
    } finally {
      setRevokeModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleRevokeSession = (sessionId) => {
    initiateRevoke(sessionId);
  };

  const handleRevokeAllOtherSessions = () => {
    initiateRevoke('all-others');
  };

  const confirmRevoke = async () => {
    if (!revokeModal.otp || revokeModal.otp.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setRevokeModal(prev => ({ ...prev, loading: true }));
    try {
      if (revokeModal.target === 'all-others') {
        await authAPI.revokeAllOtherSessions(revokeModal.otp);
        setSessions((prev) => prev.filter((s) => s.isCurrent));
        toast.success('All other sessions terminated');
      } else {
        await authAPI.revokeSession(revokeModal.target, revokeModal.otp);
        setSessions((prev) => prev.filter((s) => s.id !== revokeModal.target));
        toast.success('Session revoked');
      }
      setRevokeModal({ open: false, target: null, otp: '', loading: false });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code');
      setRevokeModal(prev => ({ ...prev, loading: false }));
    }
  };

  const copyRecoveryCodes = () => {
    if (!setupData?.recoveryCodes) return;
    navigator.clipboard.writeText(setupData.recoveryCodes.join('\n'));
    setCopiedRecovery(true);
    toast.success('Recovery codes copied to clipboard');
    setTimeout(() => setCopiedRecovery(false), 2500);
  };

  const downloadRecoveryCodes = () => {
    if (!setupData?.recoveryCodes) return;
    const element = document.createElement('a');
    const file = new Blob([setupData.recoveryCodes.join('\n')], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `edustream-recovery-codes-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Recovery codes downloaded');
  };

  if (loading)
    return (
      <div style={{ paddingTop: 88, minHeight: '100vh' }}>
        <div className="container" style={{ maxWidth: 740, paddingTop: 32 }}>
          {[120, 50, 50, 80].map((h, i) => (
            <div key={i} className="skeleton" style={{ height: h, borderRadius: 12, marginBottom: 16 }} />
          ))}
        </div>
      </div>
    );

  return (
    <div style={{ paddingTop: 88, minHeight: '100vh', paddingBottom: 60 }}>
      <div className="container" style={{ maxWidth: 740 }}>
        {/* Page Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: 6 }}>Account Settings</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            Manage your personal profile, credentials, and enterprise security.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 24,
            borderBottom: '1px solid var(--border)',
            paddingBottom: 12,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: activeTab === 'profile' ? 'var(--indigo)' : 'transparent',
              color: activeTab === 'profile' ? '#fff' : 'var(--muted)',
              transition: 'all 0.2s',
            }}
          >
            <User size={16} /> Personal Profile
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: activeTab === 'security' ? 'var(--indigo)' : 'transparent',
              color: activeTab === 'security' ? '#fff' : 'var(--muted)',
              transition: 'all 0.2s',
            }}
          >
            <ShieldCheck size={16} /> Security & 2FA
            {user?.twoFactorEnabled ? (
              <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '2px 6px', borderRadius: 4 }}>
                ON
              </span>
            ) : (
              <span style={{ fontSize: '0.65rem', background: 'rgba(239,68,68,0.2)', color: '#ef4444', padding: '2px 6px', borderRadius: 4 }}>
                OFF
              </span>
            )}
          </button>
        </div>

        {/* ── TAB 1: PROFILE ── */}
        {activeTab === 'profile' && (
          <>
            {/* Avatar section */}
            <div className="card" style={{ padding: 28, marginBottom: 20 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Profile Photo</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '3px solid var(--border)',
                      background: 'linear-gradient(135deg, var(--indigo), var(--indigo-dark))',
                    }}
                  >
                    {profile?.avatar?.url ? (
                      <img src={profile.avatar.url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, color: '#fff' }}>
                        {user?.name?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  {uploading && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 20, height: 20, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>JPG, PNG or WebP • Max 5MB • Cropped to 300×300</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                    <button className="btn btn-primary btn-sm" onClick={() => fileRef.current.click()} disabled={uploading}>
                      <Camera size={14} /> {uploading ? 'Uploading...' : 'Upload Photo'}
                    </button>
                    {profile?.avatar?.url && (
                      <button className="btn btn-outline btn-sm" onClick={handleDeleteAvatar} style={{ color: 'var(--error)' }}>
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Role badge */}
            <div className="card" style={{ padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <User size={16} color="var(--indigo-light)" />
              <span style={{ fontSize: '0.875rem', color: 'var(--lavender)' }}>Account type:</span>
              <span
                className={`badge ${profile?.role === 'instructor' ? 'badge-gold' : profile?.role === 'admin' ? 'badge-indigo' : 'badge-green'}`}
                style={{ textTransform: 'capitalize' }}
              >
                {profile?.role}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginLeft: 'auto' }}>{profile?.email}</span>
            </div>

            {/* Edit form */}
            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Personal Information</h3>
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="input-label">Full Name</label>
                    <input className="input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Your name" />
                  </div>
                  <div>
                    <label className="input-label">Headline</label>
                    <input className="input" value={form.headline} onChange={(e) => setForm((p) => ({ ...p, headline: e.target.value }))} placeholder="e.g. Full-Stack Developer" />
                  </div>
                </div>

                <div>
                  <label className="input-label">Bio</label>
                  <textarea
                    className="input"
                    rows={4}
                    value={form.bio}
                    onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                    placeholder="Tell students about yourself..."
                    style={{ resize: 'vertical', lineHeight: 1.6 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="input-label">
                      <LinkIcon size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      Website
                    </label>
                    <input className="input" value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} placeholder="https://yoursite.com" />
                  </div>
                  <div>
                    <label className="input-label">
                      <Linkedin size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      LinkedIn
                    </label>
                    <input className="input" value={form.linkedin} onChange={(e) => setForm((p) => ({ ...p, linkedin: e.target.value }))} placeholder="linkedin.com/in/you" />
                  </div>
                  <div>
                    <label className="input-label">
                      <Twitter size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                      Twitter
                    </label>
                    <input className="input" value={form.twitter} onChange={(e) => setForm((p) => ({ ...p, twitter: e.target.value }))} placeholder="@yourhandle" />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* ── TAB 2: SECURITY & 2FA ── */}
        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* 2FA Card */}
            <div className="card" style={{ padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <ShieldCheck size={22} color={user?.twoFactorEnabled ? '#10b981' : 'var(--indigo-light)'} />
                    <h3 style={{ fontSize: '1.15rem' }}>Multi-Factor Authentication (2FA)</h3>
                  </div>
                  <p style={{ color: 'var(--muted)', fontSize: '0.875rem', maxWidth: 480, lineHeight: 1.5 }}>
                    Protect your account with Time-based One-Time Passwords (TOTP). Compatible with Google Authenticator,
                    Microsoft Authenticator, and Authy.
                  </p>
                </div>

                <div>
                  {user?.twoFactorEnabled ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span
                        style={{
                          background: 'rgba(16,185,129,0.15)',
                          color: '#10b981',
                          padding: '6px 14px',
                          borderRadius: 20,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          border: '1px solid rgba(16,185,129,0.3)',
                        }}
                      >
                        ✓ 2FA Active
                      </span>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setDisableModal(true)}
                        style={{ color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }}
                      >
                        Disable
                      </button>
                    </div>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={handleStart2FASetup}>
                      Enable 2FA
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Active Sessions & Device Tracking */}
            <div className="card" style={{ padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', marginBottom: 4 }}>Active Devices & Sessions</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                    Devices currently signed into your EduStream account.
                  </p>
                </div>
                {sessions.length > 1 && (
                  <button className="btn btn-outline btn-sm" onClick={handleRevokeAllOtherSessions} style={{ color: 'var(--error)' }}>
                    <LogOut size={14} /> Log out all other devices
                  </button>
                )}
              </div>

              {loadingSessions ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Loading sessions...</div>
              ) : sessions.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No active sessions recorded.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: 10,
                        background: 'var(--glass)',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            background: 'rgba(108,99,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--indigo-light)',
                          }}
                        >
                          {/phone|mobile|ios|android/i.test(s.device) ? <Smartphone size={18} /> : <Laptop size={18} />}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--lavender)' }}>
                              {s.device}
                            </span>
                            {s.isCurrent && (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  background: 'rgba(16,185,129,0.15)',
                                  color: '#10b981',
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  fontWeight: 600,
                                }}
                              >
                                Current Session
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>
                            IP: {s.ip} • Last active: {new Date(s.lastActive || s.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {!s.isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(s.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--error)',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            fontWeight: 500,
                          }}
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Login History Audit */}
            {loginHistory.length > 0 && (
              <div className="card" style={{ padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <History size={18} color="var(--indigo-light)" />
                  <h3 style={{ fontSize: '1.05rem' }}>Recent Security Audit Log</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {loginHistory.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.02)',
                        fontSize: '0.82rem',
                        borderLeft: `3px solid ${
                          item.status === 'success'
                            ? '#10b981'
                            : item.status === 'failed_locked'
                            ? '#ef4444'
                            : 'var(--indigo-light)'
                        }`,
                      }}
                    >
                      <div>
                        <strong style={{ color: 'var(--lavender)' }}>{item.device}</strong>
                        <span style={{ color: 'var(--muted)', marginLeft: 8 }}>({item.ip})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ textTransform: 'capitalize', color: item.status === 'success' ? '#10b981' : '#f59e0b' }}>
                          {item.status.replace('_', ' ')}
                        </span>
                        <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 2FA SETUP MODAL ── */}
        {setupModal && setupData && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 20,
            }}
          >
            <div
              className="card"
              style={{
                width: '100%',
                maxWidth: 480,
                padding: 28,
                background: 'var(--bg-card)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              }}
            >
              {setupStep === 1 ? (
                <>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: 8, textAlign: 'center' }}>Setup Two-Factor Authentication</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', marginBottom: 20 }}>
                    Scan this QR code in Google Authenticator, Microsoft Authenticator, or Authy.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                    <div style={{ background: '#fff', padding: 12, borderRadius: 12 }}>
                      <img src={setupData.qrCodeUrl} alt="2FA QR Code" style={{ width: 180, height: 180, display: 'block' }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4, textAlign: 'center' }}>
                      Can't scan? Enter this secret manually:
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        background: 'rgba(108,99,255,0.1)',
                        borderRadius: 8,
                        fontSize: '0.85rem',
                        fontFamily: 'monospace',
                        color: 'var(--indigo-light)',
                        wordBreak: 'break-all',
                      }}
                    >
                      <span>{setupData.secret}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(setupData.secret);
                          setCopiedSecret(true);
                          setTimeout(() => setCopiedSecret(false), 2000);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--indigo-light)', cursor: 'pointer' }}
                      >
                        {copiedSecret ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleVerifyAndEnable2FA}>
                    <label className="input-label" style={{ textAlign: 'center' }}>
                      Enter the 6-digit code shown in your app
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="123456"
                      autoFocus
                      maxLength={6}
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      style={{
                        textAlign: 'center',
                        fontSize: '1.4rem',
                        letterSpacing: '8px',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        height: 48,
                        marginBottom: 16,
                      }}
                    />

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ flex: 1 }}
                        onClick={() => setSetupModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        disabled={verifyCode.length !== 6}
                      >
                        Verify & Enable
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        background: 'rgba(16,185,129,0.15)',
                        color: '#10b981',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <ShieldCheck size={30} />
                    </div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: 6 }}>Save Your Emergency Recovery Codes</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                      If you ever lose access to your phone or authenticator app, these one-time codes are the{' '}
                      <strong>only</strong> way to sign in. Save them now!
                    </p>
                  </div>

                  <div
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      padding: 14,
                      borderRadius: 10,
                      border: '1px solid var(--glass-border)',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 8,
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                      textAlign: 'center',
                      marginBottom: 16,
                    }}
                  >
                    {setupData.recoveryCodes?.map((code, idx) => (
                      <div key={idx} style={{ padding: '6px 0', background: 'var(--glass)', borderRadius: 6 }}>
                        {code}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    <button type="button" className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={copyRecoveryCodes}>
                      {copiedRecovery ? <Check size={14} /> : <Copy size={14} />} Copy All
                    </button>
                    <button type="button" className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={downloadRecoveryCodes}>
                      <Download size={14} /> Download .txt
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%', height: 44 }}
                    onClick={() => {
                      setSetupModal(false);
                      setSetupData(null);
                    }}
                  >
                    I Have Saved My Recovery Codes
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── 2FA DISABLE CONFIRMATION MODAL ── */}
        {disableModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 20,
            }}
          >
            <div className="card" style={{ width: '100%', maxWidth: 420, padding: 26, background: 'var(--bg-card)' }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'rgba(239,68,68,0.15)',
                    color: 'var(--error)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  }}
                >
                  <AlertTriangle size={24} />
                </div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: 6 }}>Disable Two-Factor Authentication?</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                  This will significantly lower your account security. Confirm your identity to proceed.
                </p>
              </div>

              <form onSubmit={handleDisable2FA} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="input-label">Account Password</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Enter your password"
                    value={disableCred.password}
                    onChange={(e) => setDisableCred((p) => ({ ...p, password: e.target.value }))}
                  />
                </div>

                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted)' }}>— OR —</div>

                <div>
                  <label className="input-label">6-digit Authenticator Code</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="123456"
                    maxLength={6}
                    value={disableCred.code}
                    onChange={(e) => setDisableCred((p) => ({ ...p, code: e.target.value.replace(/[^0-9]/g, '') }))}
                    style={{ textAlign: 'center', letterSpacing: '4px', fontFamily: 'monospace' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDisableModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'var(--error)' }}>
                    Confirm Disable
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Revoke Session OTP Modal */}
      {revokeModal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 400, padding: '24px 32px' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, background: 'rgba(var(--primary-rgb), 0.15)', borderRadius: '50%', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <KeyRound size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: 6 }}>Verify Revocation</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                We've sent a 6-digit verification code to your email. Enter it below to revoke the session{revokeModal.target === 'all-others' ? 's' : ''}.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <input
                  type="text"
                  className="input"
                  placeholder="123456"
                  maxLength={6}
                  value={revokeModal.otp}
                  onChange={(e) => setRevokeModal(p => ({ ...p, otp: e.target.value.replace(/[^0-9]/g, '') }))}
                  style={{ textAlign: 'center', letterSpacing: '4px', fontFamily: 'monospace', fontSize: '1.2rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setRevokeModal({ open: false, target: null, otp: '', loading: false })} disabled={revokeModal.loading}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={confirmRevoke} disabled={revokeModal.loading || revokeModal.otp.length !== 6}>
                  {revokeModal.loading ? 'Verifying...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
