import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminApi } from '../api/client';

export function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await adminApi.login(username, password);
      localStorage.setItem('bizby_admin_token', res.access_token);
      navigate('/admin');
    } catch {
      setError('Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg0)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 24,
    }}>
      {/* Background grid */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(245,158,11,0.06) 1px, transparent 0)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: 420, position: 'relative' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
              <path d="M12 2a8 8 0 0 0-8 8c0 5.2 8 13 8 13s8-7.8 8-13a8 8 0 0 0-8-8z" /><circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', fontFamily: 'Syne, sans-serif' }}>Bizby Admin</div>
          <div style={{ fontSize: 13, color: 'var(--text4)', marginTop: 4 }}>Sign in to access the admin panel</div>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--border-accent)', borderRadius: 18, padding: 32, boxShadow: '0 8px 48px rgba(0,0,0,0.5)' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Username</label>
              <input
                type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="admin" autoComplete="username" required
                className="input" style={{ fontSize: 15 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password" required
                className="input" style={{ fontSize: 15 }} />
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#ef4444' }}>
                {error}
              </motion.div>
            )}

            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              style={{
                padding: '13px', background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 15,
                border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: loading ? 0.75 : 1, transition: 'all 0.15s', marginTop: 4,
              }}>
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%' }} className="spin" />
                  Signing in...
                </>
              ) : '🔐 Sign In'}
            </motion.button>
          </form>

          <div style={{ marginTop: 20, padding: '12px', background: 'var(--bg3)', borderRadius: 8, fontSize: 12, color: 'var(--text4)', textAlign: 'center', border: '1px solid var(--border)' }}>
            Default: <code style={{ color: 'var(--accent)' }}>admin</code> / <code style={{ color: 'var(--accent)' }}>admin123</code>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/" style={{ fontSize: 12, color: 'var(--text4)', textDecoration: 'none' }}>← Back to Dashboard</a>
        </div>
      </motion.div>
    </div>
  );
}
