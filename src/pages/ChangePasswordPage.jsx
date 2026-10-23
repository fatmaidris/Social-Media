import { useState } from 'react';
import { getUserErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ChangePasswordPage() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (newPassword !== confirmation) {
      setError('The new passwords do not match.');
      return;
    }
    if (password === newPassword) {
      setError('Choose a new password that differs from your current one.');
      return;
    }
    setPending(true);
    try {
      await updatePassword(password, newPassword);
      setNotice('Password changed successfully.');
      setPassword('');
      setNewPassword('');
      setConfirmation('');
    } catch (requestError) {
      setError(getUserErrorMessage(requestError, 'password-change'));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="page-content settings-page">
      <header className="page-heading"><div><p className="eyebrow">ACCOUNT SETTINGS</p><h1>Change password</h1><p className="page-subtitle">Keep your account protected with a password only you know.</p></div></header>
      <form className="settings-form" onSubmit={submit}>
        <label>Current password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <label>New password<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
        <label>Confirm new password<input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="success-notice" role="status">{notice}</p>}
        <button className="button-primary compact" type="submit" disabled={pending}>{pending ? 'Updating…' : 'Update password'}</button>
      </form>
    </div>
  );
}