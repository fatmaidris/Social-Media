import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUserErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const emptySignup = {
  name: '',
  username: '',
  email: '',
  dateOfBirth: '',
  gender: '',
  password: '',
  rePassword: '',
};

const signupPasswordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[#?!@$%^&*-]).{8,}$/;
const signupPasswordMessage = 'Use at least 8 characters with an uppercase letter, lowercase letter, number, and special character (#?!@$%^&*-).';

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptySignup);
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (isSignup && form.password !== form.rePassword) {
      setError('The passwords do not match.');
      return;
    }
    if (isSignup && !signupPasswordPattern.test(form.password)) {
      setError(signupPasswordMessage);
      return;
    }
    if (isSignup && !form.name.trim()) {
      setError('Enter your full name.');
      return;
    }
    if (isSignup && !form.username.trim()) {
      setError('Enter a username.');
      return;
    }
    if (isSignup && !form.email.trim()) {
      setError('Enter your email address.');
      return;
    }

    setPending(true);
    try {
      if (isSignup) {
        const { rePassword, ...payload } = form;
        await register({
          ...payload,
          name: form.name.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          rePassword,
        });
      } else {
        await login(loginValue.trim(), password);
      }
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(getUserErrorMessage(requestError, isSignup ? 'signup' : 'login'));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story" aria-label="Commonplace community">
        <Link className="wordmark" to="/login" aria-label="Commonplace home">
          <span className="brand-mark">C</span> commonplace
        </Link>
        <div className="story-copy">
          <p className="eyebrow">ROUTE COMMUNITY</p>
          <h1>Good ideas travel better together.</h1>
          <p>A thoughtful space for the things you’re making, learning, and noticing.</p>
          <div className="story-note"><span aria-hidden="true">✳</span> Make room for good things.</div>
        </div>
        <p className="story-footer">A little more human, one post at a time.</p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-brand"><span className="brand-mark">C</span><span>commonplace</span></div>
          <p className="eyebrow">{isSignup ? 'YOUR NEXT CHAPTER' : 'WELCOME BACK'}</p>
          <h2>{isSignup ? 'Make yourself at home.' : 'Welcome back.'}</h2>
          <p className="page-subtitle">
            {isSignup ? 'Join a community that’s learning out loud.' : 'Pick up where your curiosity left off.'}
          </p>

          <form className="form-stack" onSubmit={handleSubmit}>
            {isSignup ? (
              <div className="signup-fields">
                <label>Full name<input autoComplete="name" name="name" value={form.name} onChange={updateField} required /></label>
                <label>Username<input autoComplete="username" name="username" value={form.username} onChange={updateField} required /></label>
                <label>Email<input autoComplete="email" type="email" name="email" value={form.email} onChange={updateField} required /></label>
                <label>Date of birth<input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={updateField} required /></label>
                <label>Gender<select name="gender" value={form.gender} onChange={updateField} required><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option></select></label>
                <label>Password<input autoComplete="new-password" type="password" name="password" value={form.password} onChange={updateField} required /></label>
                <label>Confirm password<input autoComplete="new-password" type="password" name="rePassword" value={form.rePassword} onChange={updateField} required /></label>
              </div>
            ) : (
              <>
                <label>Email or username<input autoComplete="username" value={loginValue} onChange={(event) => setLoginValue(event.target.value)} placeholder="you@example.com" required /></label>
                <label>Password<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" required /></label>
              </>
            )}

            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button-primary" type="submit" disabled={pending}>
              {pending ? 'Connecting…' : isSignup ? 'Create account' : 'Sign in'}
              {!pending && <span aria-hidden="true">↗</span>}
            </button>
          </form>

          <p className="auth-switch">
            {isSignup ? 'Already have an account?' : 'New around here?'}{' '}
            <Link to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Sign in' : 'Create an account'}</Link>
          </p>
        </div>
        <p className="auth-footer">Built for the Route Academy community</p>
      </section>
    </main>
  );
}