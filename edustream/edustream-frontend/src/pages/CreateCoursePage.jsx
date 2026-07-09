import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, BookOpen, Tag, DollarSign, Globe } from 'lucide-react';
import { courseAPI } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const CATEGORIES = ['Web Development', 'Data Science', 'Mobile Development', 'DevOps', 'Design', 'Business', 'Cloud Computing', 'Cybersecurity'];
const LEVELS     = ['beginner', 'intermediate', 'advanced'];
const LANGUAGES  = ['Hindi + English', 'English', 'Hindi'];

export default function CreateCoursePage() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', price: '', discountPrice: '',
    category: '', level: 'beginner', language: 'Hindi + English',
    tags: [], requirements: [], learningOutcomes: [],
  });
  const [tagInput, setTagInput]  = useState('');
  const [reqInput, setReqInput]  = useState('');
  const [outcInput, setOutcInput] = useState('');

  if (user?.role === 'student') {
    navigate('/dashboard');
    return null;
  }

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const addItem = (key, val, setter) => {
    if (!val.trim()) return;
    setForm(p => ({ ...p, [key]: [...p[key], val.trim()] }));
    setter('');
  };

  const removeItem = (key, idx) =>
    setForm(p => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.price || !form.category) {
      return toast.error('Fill all required fields');
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        price:         Number(form.price) * 100,   // rupees → paise
        discountPrice: form.discountPrice ? Number(form.discountPrice) * 100 : null,
      };
      const { data } = await courseAPI.create(payload);
      toast.success('Course created! Add sections and lectures next.');
      navigate(`/manage-course/${data.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create course');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ paddingTop: 88, minHeight: '100vh', paddingBottom: 60 }}>
      <div className="container" style={{ maxWidth: 760 }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: 6 }}>Create New Course</h1>
          <p>Fill in the details to publish your course on EduStream</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Basic Info */}
          <Section title="Basic Information" icon={BookOpen}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="input-label">Course Title *</label>
                <input className="input" placeholder="e.g. Complete MERN Stack Development 2024"
                  value={form.title} onChange={e => set('title', e.target.value)} />
              </div>
              <div>
                <label className="input-label">Description *</label>
                <textarea className="input" rows={5}
                  placeholder="Describe what students will learn in this course..."
                  value={form.description} onChange={e => set('description', e.target.value)}
                  style={{ resize: 'vertical', lineHeight: 1.6 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="input-label">Category *</label>
                  <select className="input" value={form.category} onChange={e => set('category', e.target.value)}
                    style={{ cursor: 'pointer' }}>
                    <option value="" style={{ background: 'var(--navy-700)' }}>Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c} style={{ background: 'var(--navy-700)' }}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Level</label>
                  <select className="input" value={form.level} onChange={e => set('level', e.target.value)}
                    style={{ cursor: 'pointer', textTransform: 'capitalize' }}>
                    {LEVELS.map(l => <option key={l} value={l} style={{ background: 'var(--navy-700)', textTransform: 'capitalize' }}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="input-label">Language</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {LANGUAGES.map(lang => (
                    <label key={lang} style={{
                      padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.875rem',
                      background: form.language === lang ? 'rgba(108,99,255,0.2)' : 'var(--glass)',
                      border: `1px solid ${form.language === lang ? 'var(--indigo)' : 'var(--glass-border)'}`,
                      color: form.language === lang ? 'var(--indigo-light)' : 'var(--lavender)',
                      transition: 'all 0.2s',
                    }}>
                      <input type="radio" name="lang" value={lang} checked={form.language === lang}
                        onChange={e => set('language', e.target.value)} style={{ display: 'none' }} />
                      <Globe size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />
                      {lang}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* Pricing */}
          <Section title="Pricing" icon={DollarSign}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="input-label">Price (₹) *</label>
                <input className="input" type="number" min="0" placeholder="499"
                  value={form.price} onChange={e => set('price', e.target.value)} />
                <p style={{ fontSize: '0.75rem', marginTop: 5 }}>Enter 0 for free course</p>
              </div>
              <div>
                <label className="input-label">Discount Price (₹)</label>
                <input className="input" type="number" min="0" placeholder="299 (optional)"
                  value={form.discountPrice} onChange={e => set('discountPrice', e.target.value)} />
                <p style={{ fontSize: '0.75rem', marginTop: 5 }}>Leave blank if no discount</p>
              </div>
            </div>
          </Section>

          {/* Tags */}
          <Section title="Tags" icon={Tag}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              {form.tags.map((tag, i) => (
                <span key={i} className="badge badge-indigo" style={{ gap: 6 }}>
                  {tag}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => removeItem('tags', i)} />
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="Add tag e.g. nodejs, react..."
                value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('tags', tagInput, setTagInput))} />
              <button type="button" className="btn btn-outline btn-sm"
                onClick={() => addItem('tags', tagInput, setTagInput)}>
                <Plus size={15} /> Add
              </button>
            </div>
          </Section>

          {/* Requirements */}
          <Section title="Requirements" icon={null}>
            <p style={{ fontSize: '0.82rem', marginBottom: 12 }}>What should students know before taking this course?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {form.requirements.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--glass)', borderRadius: 8 }}>
                  <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--lavender)' }}>{r}</span>
                  <X size={14} style={{ cursor: 'pointer', color: 'var(--muted)' }} onClick={() => removeItem('requirements', i)} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="e.g. Basic JavaScript knowledge"
                value={reqInput} onChange={e => setReqInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('requirements', reqInput, setReqInput))} />
              <button type="button" className="btn btn-outline btn-sm"
                onClick={() => addItem('requirements', reqInput, setReqInput)}>
                <Plus size={15} /> Add
              </button>
            </div>
          </Section>

          {/* Learning Outcomes */}
          <Section title="What Students Will Learn" icon={null}>
            <p style={{ fontSize: '0.82rem', marginBottom: 12 }}>List the key skills and knowledge students will gain</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {form.learningOutcomes.map((o, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8 }}>
                  <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--lavender)' }}>{o}</span>
                  <X size={14} style={{ cursor: 'pointer', color: 'var(--muted)' }} onClick={() => removeItem('learningOutcomes', i)} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="e.g. Build full-stack apps with MERN"
                value={outcInput} onChange={e => setOutcInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('learningOutcomes', outcInput, setOutcInput))} />
              <button type="button" className="btn btn-outline btn-sm"
                onClick={() => addItem('learningOutcomes', outcInput, setOutcInput)}>
                <Plus size={15} /> Add
              </button>
            </div>
          </Section>

          {/* Submit */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Creating...' : '🚀 Create Course'}
            </button>
            <button type="button" className="btn btn-outline btn-lg" onClick={() => navigate('/dashboard')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        {Icon && <Icon size={18} color="var(--indigo-light)" />}
        <h3 style={{ fontSize: '1rem' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}
