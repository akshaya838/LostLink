import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { errMsg } from '../api.js';
import { Alert } from '../components/ui.jsx';

// One login page with two doors: students, and the lost and found admin desk.
export default function Login({ forceAdmin = false }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login, logout } = useAuth();
  const [as, setAs] = useState(forceAdmin || params.get('as') === 'admin' ? 'admin' : 'student');
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const admin = as === 'admin';
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await login(form.email, form.password);
      if (admin && user.role !== 'admin') {
        logout();
        setError('This is a student account. Use the Student tab to log in.');
        return;
      }
      if (!admin && user.role === 'admin') {
        logout();
        setError('This is an admin desk account. Use the Admin desk tab to log in.');
        return;
      }
      const next = params.get('next');
      navigate(next && next.startsWith('/') ? next : user.role === 'admin' ? '/claims' : '/');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-tabs" role="tablist" aria-label="Who is logging in">
        <button role="tab" aria-selected={!admin} onClick={() => { setAs('student'); setError(''); }}>Student</button>
        <button role="tab" aria-selected={admin} onClick={() => { setAs('admin'); setError(''); }}>Admin desk</button>
      </div>

      <form className={`panel form auth-card ${admin ? 'auth-admin' : ''}`} onSubmit={submit}>
        <div className="auth-head">
          <span className={`tag tag-lg ${admin ? 'tag-desk' : 'tag-found'}`}>
            <span className="tag-hole" aria-hidden="true" />
            <span className="tag-kind">{admin ? 'Desk' : 'Student'}</span>
            <span className="tag-ref">{admin ? 'Staff only' : 'LostLink'}</span>
          </span>
          <h1>{admin ? 'Admin desk login' : 'Log in'}</h1>
          <p className="muted">
            {admin
              ? 'Review claims, ask students questions, and approve handovers.'
              : 'Log in to report items, claim what’s yours and answer questions from the desk.'}
          </p>
        </div>

        <Alert onClose={() => setError('')}>{error}</Alert>

        <label>Email<input type="email" required autoComplete="email" value={form.email} onChange={set('email')} /></label>
        <label>Password<input type="password" required autoComplete="current-password" value={form.password} onChange={set('password')} /></label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Logging in' : 'Log in'}</button>

        {!admin && (
          <p className="auth-foot">
            New here? <Link to={`/signup${params.get('next') ? `?next=${encodeURIComponent(params.get('next'))}` : ''}`}>Create a student account</Link>
          </p>
        )}
        {admin && <p className="auth-foot muted small">Desk accounts are set up by the college, not through sign-up.</p>}
      </form>
    </div>
  );
}
