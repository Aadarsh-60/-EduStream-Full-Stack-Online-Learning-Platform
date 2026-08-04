import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--navy-500)', borderTopColor: 'var(--indigo)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: '0.875rem' }}>Loading...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // If user is already logged in, redirect them to dashboard
  if (user) return <Navigate to="/dashboard" replace />;

  return children;
}
