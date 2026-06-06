// TODO: Extract full SignupForm from bundle (lines ~14831-15036)
import { useState, useEffect } from 'react';
import FormInput from '../../components/ui/FormInput';
import PasswordStrengthIndicator from '../../components/ui/PasswordStrengthIndicator';
import { apiFetch } from '../../config/api';
import { isValidName, isValidEmail, isValidPhone, isStrongPassword, isValidUsername } from '../../utils/validators';

export default function SignupForm({ switchToLogin }) {
  const steps = [
    {
      title: 'Your identity',
      subtitle: 'Start with what to call you',
      fields: [
        { name: 'fullName', label: 'Full name', type: 'text', required: true, validate: isValidName },
        { name: 'username', label: 'Username', type: 'text', required: true, validate: isValidUsername },
      ],
    },
    {
      title: 'Stay connected',
      subtitle: 'How should we reach you?',
      fields: [
        { name: 'email', label: 'Email address', type: 'email', required: true, validate: isValidEmail },
        { name: 'phone', label: 'Phone number', type: 'tel', required: false, validate: isValidPhone },
        { name: 'profile_type', label: 'Profile type', type: 'select', required: true, options: ['Individual', 'Organisation'] },
      ],
    },
    {
      title: 'Lock it down',
      subtitle: 'Choose a strong password',
      fields: [
        { name: 'password', label: 'Password', type: 'password', required: true, validate: isStrongPassword },
        { name: 'confirmPassword', label: 'Confirm password', type: 'password', required: true },
      ],
    },
  ];

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [manualUsername, setManualUsername] = useState(false);
  const [form, setForm] = useState({
    fullName: '', username: '', phone: '', email: '', password: '', confirmPassword: '', profile_type: '',
  });

  useEffect(() => {
    if (form.fullName && !manualUsername && step === 0) {
      const auto = form.fullName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '').substring(0, 20);
      setForm((prev) => ({ ...prev, username: auto }));
    }
  }, [form.fullName, manualUsername, step]);

  function updateField(name, value) {
    if (name === 'username') { value = value.toLowerCase().replace(/[^a-z0-9]/g, ''); setManualUsername(true); }
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validate() {
    for (const field of steps[step].fields) {
      if (field.required && !form[field.name]) {
        window.showNotification({ title: 'Required', message: `${field.label} is required`, type: 'error' });
        return false;
      }
      if (field.validate && form[field.name] && !field.validate(form[field.name])) {
        window.showNotification({ title: 'Invalid', message: `Check your ${field.label.toLowerCase()}`, type: 'error' });
        return false;
      }
    }
    if (step === 2 && form.password !== form.confirmPassword) {
      window.showNotification({ title: 'Mismatch', message: "Passwords don't match", type: 'error' });
      return false;
    }
    return true;
  }

  async function submit() {
    if (!validate()) return;
    setLoading(true);
    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== null && v !== '') body.append(k, v); });
    try {
      const res = await apiFetch('/signup', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('currentUser', form.username);
      setSuccess(true);
    } catch (e) {
      window.showNotification({ title: 'Signup Failed', message: e.message || 'Please try again', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function loginAfterSignup() {
    try {
      const res = await apiFetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: form.username, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (window.Lexum) window.Lexum.navigate('/');
      else window.location.href = '/';
    } catch (e) {
      window.showNotification({ title: 'Login Failed', message: e.message, type: 'error' });
    }
  }

  const { title, subtitle, fields } = steps[step];

  return (
    <div className="flex flex-col gap-5">
      {/* Step indicator */}
      <div className="flex items-center gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i < step ? 'w-6 bg-blue-300' : i === step ? 'w-8 bg-blue-600' : 'w-4 bg-gray-200'}`} />
        ))}
        <span className="ml-auto text-[11px] text-gray-400 font-medium">{step + 1} / {steps.length}</span>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex flex-col gap-3">
        {fields.map((field) => (
          <div key={field.name}>
            {field.type === 'select' ? (
              <div className="relative">
                <select
                  value={form[field.name]}
                  onChange={(e) => updateField(field.name, e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors appearance-none"
                >
                  <option value="">Select {field.label}</option>
                  {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <svg viewBox="0 0 24 24" className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            ) : (
              <FormInput type={field.type} placeholder={field.label} value={form[field.name]} onChange={(e) => updateField(field.name, e.target.value)} required={field.required} />
            )}
            {field.name === 'password' && form.password && <PasswordStrengthIndicator password={form.password} />}
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        {step > 0 && (
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} className="h-11 px-5 rounded-full border border-gray-200 text-sm font-semibold text-gray-600 active:scale-[0.98] hover:bg-gray-50 transition-colors">
            Back
          </button>
        )}
        {step < steps.length - 1 ? (
          <button onClick={() => validate() && setStep((s) => s + 1)} className="flex-1 h-11 rounded-full bg-blue-600 text-white text-sm font-bold active:scale-[0.98] transition-colors">
            Continue →
          </button>
        ) : (
          <button onClick={submit} disabled={loading} className="flex-1 h-11 rounded-full bg-blue-600 text-white text-sm font-bold active:scale-[0.98] disabled:opacity-50 transition-colors">
            {loading ? 'Creating account…' : 'Join Textmob'}
          </button>
        )}
      </div>

      <p className="text-center text-xs text-gray-400">
        Already have an account?{' '}
        <button onClick={switchToLogin} className="font-bold text-blue-600 active:opacity-70 transition-opacity">Sign in</button>
      </p>

      {/* Success modal */}
      {success && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-900 mb-1">You're in!</h2>
            <p className="text-xs text-gray-400 mb-5">Your Textmob account is ready</p>
            <div className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-5 text-left space-y-3">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Name</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{form.fullName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Username</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">@{form.username}</p>
              </div>
            </div>
            <button onClick={loginAfterSignup} className="w-full h-11 rounded-full bg-blue-600 text-white text-sm font-bold active:scale-[0.98] transition-colors">
              Go to Textmob →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
