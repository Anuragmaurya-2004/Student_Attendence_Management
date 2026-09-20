import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, TextInput, PasswordInput } from '../components/ui';
import toast from 'react-hot-toast';
import { validateLoginForm } from '../validators';
import { useTheme, setTheme } from '../theme';

const highlights = [
  'Track class attendance in real time',
  'Monitor defaulters and on-duty requests',
  'Simplify academic setup and year rollover',
];

export default function Login() {
  const [role, setRole] = useState('faculty');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [busy, setBusy] = useState(false);
  const darkMode = useTheme();
  const { loginFaculty, loginStudent } = useAuth();
  const navigate = useNavigate();

  const applyTheme = (isDark) => {
    setTheme(isDark);
  };

  const validateForm = () => {
    const validations = validateLoginForm({ email, password });
    const nextEmailError = validations.email;
    const nextPasswordError = validations.password;

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);

    return !nextEmailError && !nextPasswordError;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    console.log('[Login] Attempting login', {
      role,
      email,
      passwordLength: password.length,
    });

    setBusy(true);
    try {
      const user = role === 'student' ? await loginStudent(email, password) : await loginFaculty(email, password);
      console.log('[Login] Success response', user);
      toast.success(`Welcome, ${user.name}`);

      if (role === 'student' && user.mustChangePassword) {
        navigate('/student/change-password');
        return;
      }

      navigate(`/${user.role}`);
    } catch (err) {
      console.error('[Login] Failed request', {
        role,
        email,
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 bg-mesh px-4 py-8 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => applyTheme(!darkMode)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4"><path d="M12 2.75a1 1 0 0 1 1 1V5a1 1 0 1 1-2 0v-1.25a1 1 0 0 1 1-1Zm0 16.5a1 1 0 0 1 1 1V19a1 1 0 1 1-2 0v.25a1 1 0 0 1 1-1Zm7.25-7.25a1 1 0 0 1 0 2h-1.25a1 1 0 1 1 0-2h1.25Zm-16.5 0a1 1 0 0 1 0 2H1.5a1 1 0 1 1 0-2h1.25ZM17.3 5.7a1 1 0 0 1 1.41 0l.88.88a1 1 0 0 1-1.41 1.41l-.88-.88a1 1 0 0 1 0-1.41Zm-12.6 12.6a1 1 0 0 1 1.41 0l.88.88a1 1 0 1 1-1.41 1.41l-.88-.88a1 1 0 0 1 0-1.41ZM17.3 18.3a1 1 0 0 1 0-1.41l.88-.88a1 1 0 0 1 1.41 1.41l-.88.88a1 1 0 0 1-1.41 0Zm-12.6-12.6a1 1 0 0 1 0-1.41l.88-.88A1 1 0 0 1 6.99 5.7l-.88.88a1 1 0 0 1-1.41 0ZM12 7.25A4.75 4.75 0 1 1 7.25 12 4.75 4.75 0 0 1 12 7.25Z" fill="currentColor"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4"><path d="M20.2 15.18A8.5 8.5 0 0 1 8.82 3.8a8.5 8.5 0 1 0 11.38 11.38Z" fill="currentColor"/></svg>
            )}
            <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft lg:grid-cols-[1.1fr_0.9fr] dark:border-slate-700 dark:bg-slate-900">
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.20),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.14),transparent_28%)]" />
          <div className="relative z-10">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-brand-50">
              Smart campus
            </div>
            <h1 className="max-w-sm text-4xl font-bold leading-tight">Attendance that feels effortless.</h1>
            <p className="mt-4 max-w-md text-base text-brand-50/90">
              Manage attendance, student records, and faculty operations from one modern campus dashboard.
            </p>
          </div>

          <div className="relative z-10 space-y-4">
            {highlights.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 text-white">
                    <path d="M9.55 15.9 5.8 12.15a1 1 0 0 0-1.4 1.4l4.45 4.45a1 1 0 0 0 1.42 0l9.37-9.36a1 1 0 1 0-1.41-1.42l-8.68 8.68Z" fill="currentColor"/>
                  </svg>
                </span>
                <span className="text-sm text-brand-50/90">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center p-5 sm:p-8 lg:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center lg:text-left">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-brand-600">Welcome back</p>
              <h2 className="text-3xl font-bold text-slate-900">Sign in</h2>
            </div>

            <div className="mb-6 flex rounded-2xl bg-slate-100 p-1.5 shadow-inner ring-1 ring-slate-200">
              {['faculty', 'student'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold capitalize transition ${
                    role === r ? 'bg-white text-brand-700 shadow-sm ring-1 ring-brand-100' : 'text-slate-500'
                  }`}
                >
                  {r === 'faculty' ? 'Faculty / Admin' : 'Student'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <TextInput
                label="Email"
                type="email"
                value={email}
                error={emailError}
                placeholder="you@college.edu"
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
              />

              <PasswordInput
                label="Password"
                value={password}
                error={passwordError}
                placeholder="••••••••"
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
              />

              <Button type="submit" className="mt-2 w-full rounded-xl py-3 text-base font-semibold shadow-card" disabled={busy}>
                {busy ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
