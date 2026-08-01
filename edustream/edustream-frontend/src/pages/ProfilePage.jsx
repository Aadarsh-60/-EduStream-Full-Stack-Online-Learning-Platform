import { useState, useEffect, useRef } from 'react';
import { Camera, Save, Trash2, User, Link as LinkIcon, Linkedin, Twitter } from 'lucide-react';
import { userAPI } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const fileRef = useRef();
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [uploading,setUploading]= useState(false);
  const [form, setForm] = useState({ name: '', bio: '', headline: '', website: '', linkedin: '', twitter: '' });

  useEffect(() => {
    userAPI.getMyProfile()
      .then(({ data }) => {
        setProfile(data.data);
        const d = data.data;
        setForm({ name: d.name || '', bio: d.bio || '', headline: d.headline || '', website: d.website || '', linkedin: d.linkedin || '', twitter: d.twitter || '' });
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await userAPI.updateProfile(form);
      setProfile(data.data);
      setUser(u => ({ ...u, name: form.name }));
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB allowed'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const { data } = await userAPI.uploadAvatar(fd);
      setProfile(p => ({ ...p, avatar: { url: data.data.avatarUrl } }));
      toast.success('Avatar updated!');
    } catch { toast.error('Avatar upload failed'); }
    finally { setUploading(false); }
  };

  const handleDeleteAvatar = async () => {
    try {
      await userAPI.deleteAvatar();
      setProfile(p => ({ ...p, avatar: { url: null } }));
      toast.success('Avatar removed');
    } catch { toast.error('Failed to remove avatar'); }
  };

  if (loading) return (
    <div style={{ paddingTop: 88, minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: 700, paddingTop: 32 }}>
        {[120, 50, 50, 80].map((h, i) => <div key={i} className="skeleton" style={{ height: h, borderRadius: 12, marginBottom: 16 }} />)}
      </div>
    </div>
  );

  return (
    <div style={{ paddingTop: 88, minHeight: '100vh', paddingBottom: 60 }}>
      <div className="container" style={{ maxWidth: 700 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: 6 }}>My Profile</h1>
          <p>Manage your personal information</p>
        </div>

        {/* Avatar section */}
        <div className="card" style={{ padding: 28, marginBottom: 20 }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Profile Photo</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {/* Avatar display */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--border)', background: 'linear-gradient(135deg, var(--indigo), var(--indigo-dark))' }}>
                {profile?.avatar?.url
                  ? <img src={profile.avatar.url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, color: '#fff' }}>
                      {user?.name?.[0]?.toUpperCase()}
                    </div>
                }
              </div>
              {uploading && (
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 20, height: 20, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: '0.82rem' }}>JPG, PNG or WebP • Max 5MB • Cropped to 300×300</p>
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
          <span className={`badge ${profile?.role === 'instructor' ? 'badge-gold' : profile?.role === 'admin' ? 'badge-indigo' : 'badge-green'}`} style={{ textTransform: 'capitalize' }}>
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
                <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name" />
              </div>
              <div>
                <label className="input-label">Headline</label>
                <input className="input" value={form.headline} onChange={e => setForm(p => ({ ...p, headline: e.target.value }))} placeholder="e.g. Full-Stack Developer" />
              </div>
            </div>

            <div>
              <label className="input-label">Bio</label>
              <textarea className="input" rows={4} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                placeholder="Tell students about yourself..." style={{ resize: 'vertical', lineHeight: 1.6 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label className="input-label"><LinkIcon size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Website</label>
                <input className="input" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://yoursite.com" />
              </div>
              <div>
                <label className="input-label"><Linkedin size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />LinkedIn</label>
                <input className="input" value={form.linkedin} onChange={e => setForm(p => ({ ...p, linkedin: e.target.value }))} placeholder="linkedin.com/in/you" />
              </div>
              <div>
                <label className="input-label"><Twitter size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />Twitter</label>
                <input className="input" value={form.twitter} onChange={e => setForm(p => ({ ...p, twitter: e.target.value }))} placeholder="@yourhandle" />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Stats */}
        {profile && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 20 }}>
            {[
              { label: 'Courses Enrolled', value: profile.enrolledCourses?.length || 0 },
              { label: 'Courses Created', value: profile.createdCourses?.length || 0 },
              { label: 'Member Since',     value: new Date(profile.createdAt).getFullYear() },
            ].map(({ label, value }) => (
              <div key={label} className="card" style={{ padding: '16px 18px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>{value}</div>
                <p style={{ fontSize: '0.75rem' }}>{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
