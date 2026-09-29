import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, TextInput, PasswordInput } from '../components/ui';
import toast from 'react-hot-toast';
import { validateLoginForm } from '../validators';
import { useTheme, setTheme } from '../theme';
import {
  GraduationCap,
  Sun,
  Moon,
  CheckCircle2,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Building2,
  Users,
} from 'lucide-react';

const highlights = [
  { title: 'Real-Time QR Attendance', desc: 'Rotating dynamic QR codes with geofence verification', icon: CheckCircle2 },
  { title: 'On-Duty & Multi-Day Visits', desc: 'Seamless exemptions for hackathons, sports, and industrial tours', icon: ShieldCheck },
  { title: 'Automated Defaulter Alerts', desc: 'Threshold tracking with scheduled parent and student notifications', icon: Users },
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

    setBusy(true);
    try {
      const user = role === 'student' ? await loginStudent(email, password) : await loginFaculty(email, password);
      toast.success(`Welcome back, ${user.name}!`);

      if (role === 'student' && user.mustChangePassword) {
        navigate('/student/change-password');
        return;
      }

      navigate(`/${user.role}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials or login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-250 dark:bg-slate-950 dark:text-slate-100 flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
      {/* Top right theme toggle */}
      <div className="mx-auto w-full max-w-6xl mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => applyTheme(!darkMode)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
          <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>

      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-slate-200/90 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.06)] dark:border-slate-800/90 dark:bg-slate-900 dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] lg:grid-cols-2">
        {/* Left Hero Brand Panel */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-700 via-brand-700 to-indigo-900 p-10 text-white lg:flex lg:flex-col lg:justify-between dark:from-indigo-950 dark:via-brand-950 dark:to-slate-950">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md">
              <GraduationCap className="h-4 w-4" /> Smart Campus
            </div>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight leading-tight">
              Attendance that feels effortless.
            </h1>
            <p className="mt-4 text-base text-indigo-100/90 leading-relaxed">
              Verify attendance, manage student cohorts, and automate academic records with geofenced rotation.
            </p>
          </div>

          <div className="relative z-10 space-y-4 my-8">
            {highlights.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-indigo-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <p className="mt-0.5 text-xs text-indigo-200/80">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative z-10 border-t border-white/10 pt-4 text-xs text-indigo-200/70">
            Enterprise Campus Attendance Suite — MERN Architecture
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 text-white shadow-md lg:hidden mb-4">
                <GraduationCap className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                Welcome to Campus Portal
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Sign in to your account
              </h2>
            </div>

            {/* Role Switcher */}
            <div className="mb-6 flex rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1.5 dark:border-slate-800 dark:bg-slate-800/60">
              <button
                type="button"
                onClick={() => setRole('faculty')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                  role === 'faculty'
                    ? 'bg-white text-brand-600 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-700 dark:text-white dark:ring-white/10'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Building2 className="h-4 w-4" />
                <span>Faculty / Admin</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                  role === 'student'
                    ? 'bg-white text-brand-600 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-700 dark:text-white dark:ring-white/10'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Student</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <TextInput
                label="Campus Email Address"
                type="email"
                value={email}
                error={emailError}
                placeholder={role === 'student' ? 'student@college.edu' : 'faculty@college.edu'}
                leadingIcon={<Mail className="h-4 w-4" />}
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
                leadingIcon={<Lock className="h-4 w-4" />}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
              />

              <Button
                type="submit"
                loading={busy}
                icon={ArrowRight}
                className="mt-2 w-full py-3.5 text-sm font-bold shadow-card"
              >
                {busy ? 'Authenticating...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-8 border-t border-slate-100 pt-5 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Need access or forgot password? Contact your department administrator.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
