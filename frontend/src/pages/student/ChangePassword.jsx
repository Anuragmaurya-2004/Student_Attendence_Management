import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button, PasswordInput } from '../../components/ui';
import { validateChangePasswordForm } from '../../validators';

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
      await api.post('/auth/student/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });

      const updatedUser = { ...user, mustChangePassword: false };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Password changed successfully.');
      navigate('/student');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Set Your New Password</h1>
      <p className="text-sm text-gray-500 mb-6">
        This is your first login, so please choose a new password before continuing.
      </p>

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
          placeholder="Enter new password"
          onChange={handleChange}
        />

        <PasswordInput
          label="Confirm New Password"
          name="confirmPassword"
          value={form.confirmPassword}
          error={errors.confirmPassword}
          placeholder="Re-enter new password"
          onChange={handleChange}
        />

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Updating...' : 'Update Password'}
        </Button>
      </form>
    </div>
  );
}
