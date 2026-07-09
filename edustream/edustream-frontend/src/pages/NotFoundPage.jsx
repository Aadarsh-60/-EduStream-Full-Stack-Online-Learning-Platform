import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
      <div>
        <div style={{ fontSize: '6rem', fontFamily: 'var(--font-display)', fontWeight: 800, background: 'linear-gradient(135deg, var(--indigo-light), var(--gold))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1, marginBottom: 16 }}>
          404
        </div>
        <h2 style={{ marginBottom: 10 }}>Page not found</h2>
        <p style={{ marginBottom: 32, maxWidth: 360 }}>The page you're looking for doesn't exist or has been moved.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-primary"><Home size={16} /> Go Home</Link>
          <Link to="/courses" className="btn btn-outline"><Search size={16} /> Browse Courses</Link>
        </div>
      </div>
    </div>
  );
}
