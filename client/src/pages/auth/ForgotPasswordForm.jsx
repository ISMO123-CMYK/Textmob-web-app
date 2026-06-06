import { useState } from 'react';
import FormInput from '../../components/ui/FormInput';
import PasswordStrengthIndicator from '../../components/ui/PasswordStrengthIndicator';
import { apiFetch } from '../../config/api';
import { isStrongPassword } from '../../utils/validators';

export default function ForgotPasswordForm({ switchToLogin }) {
  const [identifier, setIdentifier] = useState('');
  const [phase, setPhase] = useState('request'); // request | verify | reset
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('noreply');

  async function requestCode() {
    if (!identifier) { window.showNotification({ title: 'Missing', message: 'Enter your identifier', type: 'error' }); return; }
    setLoading(true);
    try {
      const res = await apiFetch('/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.showNotification({ title: 'Code sent', message: data.message, type: 'success' });
      setMaskedEmail(data.email);
      setPhase('verify');
    } catch (e) {
      window.showNotification({ title: 'Failed', message: e.message, type: 'error' });
    } finally { setLoading(false); }
  }

  async function verifyCode() {
    if (!code) { window.showNotification({ title: 'Missing', message: 'Enter the code', type: 'error' }); return; }
    setLoading(true);
    try {
      const res = await apiFetch('/verify-reset-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.showNotification({ title: 'Verified', message: data.message, type: 'success' });
      setPhase('reset');
    } catch (e) {
      window.showNotification({ title: 'Invalid code', message: e.message, type: 'error' });
    } finally { setLoading(false); }
  }

  async function resetPassword() {
    if (!newPassword || !confirmPassword) { window.showNotification({ title: 'Missing', message: 'Fill both password fields', type: 'error' }); return; }
    if (newPassword !== confirmPassword) { window.showNotification({ title: 'Mismatch', message: "Passwords don't match", type: 'error' }); return; }
    if (!isStrongPassword(newPassword)) { window.showNotification({ title: 'Weak password', message: "Password doesn't meet requirements", type: 'error' }); return; }
    setLoading(true);
    try {
      const res = await apiFetch('/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.showNotification({ title: 'Password reset', message: data.message, type: 'success', afterClose: switchToLogin });
    } catch (e) {
      window.showNotification({ title: 'Failed', message: e.message, type: 'error' });
    } finally { setLoading(false); }
  }

  const titles = { request: 'Find your account', verify: 'Enter the code', reset: 'Set new password' };
  const subtitles = { request: "We'll send a verification code to your email", verify: 'Check your email for the 4-digit code', reset: 'Choose a strong new password' };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{titles[phase]}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{subtitles[phase]}</p>
      </div>

      {phase === 'request' && (
        <>
          <FormInput placeholder="Email, username, or phone" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          <button onClick={requestCode} disabled={loading} className="w-full h-11 rounded-full bg-blue-600 text-white text-sm font-bold active:scale-[0.98] disabled:opacity-50 transition-colors">
            {loading ? 'Sending…' : 'Send code'}
          </button>
        </>
      )}

      {phase === 'verify' && (
        <>
          <p>A 4 digit code has been sent to your inbox. ({maskedEmail})</p>
          <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="0000" maxLength={4}
            className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-center text-3xl font-black tracking-[0.5em] focus:outline-none focus:border-blue-400 transition-colors" />
          <button onClick={verifyCode} disabled={loading} className="w-full h-11 rounded-full bg-blue-600 text-white text-sm font-bold active:scale-[0.98] disabled:opacity-50 transition-colors">
            {loading ? 'Verifying…' : 'Verify code'}
          </button>
        </>
      )}

      {phase === 'reset' && (
        <>
          <div className="flex flex-col gap-3">
            <FormInput type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            {newPassword && <PasswordStrengthIndicator password={newPassword} />}
            <FormInput type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <button onClick={resetPassword} disabled={loading} className="w-full h-11 rounded-full bg-blue-600 text-white text-sm font-bold active:scale-[0.98] disabled:opacity-50 transition-colors">
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </>
      )}

      <button onClick={switchToLogin} className="text-xs text-gray-400 text-center active:opacity-70 transition-opacity">
        ← Back to sign in
      </button>
    </div>
  );
}
