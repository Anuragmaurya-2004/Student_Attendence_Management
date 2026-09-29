import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button, PasswordInput, Card } from '../../components/ui';
import { validateChangePasswordForm } from '../../validators';
import { ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [busy, setBusy] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const nextErrors = validateChangePasswordForm(form);
    setErrors(nextErrors);
    return !nextErrors.currentPassword && !nextErrors.newPassword && !nextErrors.confirmPassword;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setBusy(true);
    try {
      const endpoint = user.role === 'student' ? '/auth/student/change-password' : '/auth/faculty/change-password';
      await api.post(endpoint, {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });

      const updatedUser = { ...user, mustChangePassword: false };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Password changed successfully.');

      const targetDashboard = user.role === 'admin' ? '/admin' : user.role === 'student' ? '/student' : '/faculty';
      navigate(targetDashboard);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-indigo-700 via-brand-600 to-indigo-900 p-6 text-white shadow-soft sm:p-7 dark:border-indigo-500/30 dark:from-indigo-950 dark:via-brand-950 dark:to-slate-950">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md">
            <Lock className="h-5 w-5 text-indigo-200" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">
              Security Center
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Account Password
            </h1>
          </div>
        </div>
        <p className="mt-3 text-xs text-indigo-100/90 leading-relaxed sm:text-sm">
          {user?.mustChangePassword
            ? 'This is your initial login. For security compliance, please choose a strong new password before continuing.'
            : 'Update your account password with a strong combination of uppercase, lowercase, numbers, and symbols.'}
        </p>
      </div>

      <Card title="Update Password" subtitle="Enter your current and new credentials">
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            label="Current Password"
            name="currentPassword"
            value={form.currentPassword}
            error={errors.currentPassword}
            placeholder="Enter current password"
            onChange={handleChange}
          />

          <PasswordInput
            label="New Password"
            name="newPassword"
            value={form.newPassword}
            error={errors.newPassword}
            placeholder="Min 8 characters with letters, numbers, symbols"
            onChange={handleChange}
          />

          <PasswordInput
            label="Confirm New Password"
            name="confirmPassword"
            value={form.confirmPassword}
            error={errors.confirmPassword}
            placeholder="Re-enter your new password"
            onChange={handleChange}
          />

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
            <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Password Requirements:
            </p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Minimum 8 characters length</li>
              <li>At least one uppercase and one lowercase letter</li>
              <li>At least one numeric digit and one special character</li>
            </ul>
          </div>

          <Button
            type="submit"
            loading={busy}
            icon={CheckCircle2}
            className="w-full py-3 text-sm font-semibold shadow-card"
          >
            Update Password
          </Button>
        </form>
      </Card>
    </div>
  );
}
