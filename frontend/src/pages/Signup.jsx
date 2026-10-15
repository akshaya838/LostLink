import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { errMsg } from '../api.js';
import { Alert } from '../components/ui.jsx';

export default function Signup() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', rollNumber: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form);
      const next = params.get('next');
      navigate(next && next.startsWith('/') ? next : '/');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form className="panel form auth-card" onSubmit={submit}>
        <div className="auth-head">
          <span className="tag tag-lg tag-found">
            <span className="tag-hole" aria-hidden="true" />
            <span className="tag-kind">Student</span>
            <span className="tag-ref">New account</span>
          </span>
          <h1>Create your account</h1>
          <p className="muted">The desk uses these details to contact you about your claims.</p>
        </div>

        <Alert onClose={() => setError('')}>{error}</Alert>

        <label>Full name<input required autoComplete="name" value={form.name} onChange={set('name')} /></label>
        <label>College email<input type="email" required autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@college.edu" /></label>
        <div className="two">
          <label>Roll number<input value={form.rollNumber} onChange={set('rollNumber')} placeholder="22CS101" /></label>
          <label><span className="label-row">Phone <span className="optional">optional</span></span><input autoComplete="tel" value={form.phone} onChange={set('phone')} /></label>
        </div>
        <label>
          Password
          <input type="password" required minLength={6} autoComplete="new-password" value={form.password} onChange={set('password')} />
          <span className="hint">At least 6 characters</span>
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account' : 'Create account'}</button>
        <p className="auth-foot">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
