import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [role, setRole] = useState('faculty'); // 'faculty' covers admin+faculty login endpoint
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const { loginFaculty, loginStudent } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const user = role === 'student' ? await loginStudent(email, password) : await loginFaculty(email, password);
      toast.success(`Welcome, ${user.name}`);
      navigate(`/${user.role}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-700 to-brand-500 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center text-brand-700 mb-1">Attendance Management System</h1>
        <p className="text-center text-gray-500 text-sm mb-6">Sign in to continue</p>

        <div className="flex mb-5 bg-gray-100 rounded-lg p-1">
          {['faculty', 'student'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 py-2 rounded-md text-sm font-medium capitalize ${
                role === r ? 'bg-white shadow text-brand-700' : 'text-gray-500'
              }`}
            >
              {r === 'faculty' ? 'Faculty / Admin' : 'Student'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="you@college.edu"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-60"
          >
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-xs text-gray-400 border-t pt-4">
          <p className="font-medium mb-1">Demo credentials (after seeding):</p>
          <p>Admin: admin@college.edu / Admin@123</p>
          <p>Faculty: priya.sharma@college.edu / Faculty@123</p>
          <p>Student: student1@college.edu / Student@123</p>
        </div>
      </div>
    </div>
  );
}
