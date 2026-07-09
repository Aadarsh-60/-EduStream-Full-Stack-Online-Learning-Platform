import { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { authAPI } from '../services/api.js';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      return toast.error('Please fill all fields');
    }

    setLoading(true);
    try {
      await authAPI.contactAdmin(form);
      toast.success('Your message has been sent successfully!');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: 100, paddingBottom: 80, minHeight: '100vh', position: 'relative' }}>
      
      {/* Background elements */}
      <div style={{ position: 'absolute', top: '10%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,99,255,0.1) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', left: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,166,35,0.05) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

      <div className="container" style={{ maxWidth: 1000, position: 'relative', zIndex: 1 }}>
        
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: 16 }}>Get in Touch</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--muted)', maxWidth: 600, margin: '0 auto' }}>
            Have a question, feedback, or need help with a course? Drop us a message and our team will get back to you within 24 hours.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 40 }}>
          
          {/* Contact Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: 8 }}>Contact Information</h2>
            
            <div className="card" style={{ padding: 24, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(108,99,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mail color="var(--indigo-light)" size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>Email Us</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 8 }}>For general queries and support</p>
                <a href="mailto:admin@edustream.com" style={{ color: 'var(--indigo-light)', fontWeight: 500, textDecoration: 'none' }}>admin@edustream.com</a>
              </div>
            </div>

            <div className="card" style={{ padding: 24, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245,166,35,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Phone color="var(--gold)" size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>Call Us</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 8 }}>Mon-Fri from 9am to 6pm (IST)</p>
                <a href="tel:+919876543210" style={{ color: 'var(--gold)', fontWeight: 500, textDecoration: 'none' }}>+91 98765 43210</a>
              </div>
            </div>

            <div className="card" style={{ padding: 24, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin color="var(--success)" size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>Office</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  123 Tech Park, Sector 4<br />
                  HSR Layout, Bengaluru<br />
                  Karnataka, India 560102
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="card" style={{ padding: 32 }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: 24 }}>Send us a Message</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label className="input-label">Your Name</label>
                  <input className="input" placeholder="John Doe" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div>
                  <label className="input-label">Your Email</label>
                  <input type="email" className="input" placeholder="john@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
                </div>
              </div>
              
              <div>
                <label className="input-label">Subject</label>
                <input className="input" placeholder="How can we help?" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required />
              </div>
              
              <div>
                <label className="input-label">Message</label>
                <textarea className="input" rows={6} placeholder="Write your message here..." value={form.message} onChange={e => setForm({...form, message: e.target.value})} required style={{ resize: 'vertical' }} />
              </div>

              <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
                {loading ? 'Sending...' : <><Send size={18} /> Send Message</>}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
