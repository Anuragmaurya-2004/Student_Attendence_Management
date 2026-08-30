import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const linksByRole = {
  admin: [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/setup', label: 'Academic Setup' },
    { to: '/admin/students', label: 'Students' },
    { to: '/admin/faculty', label: 'Faculty' },
    { to: '/admin/holidays', label: 'Holidays' },
    { to: '/admin/defaulters', label: 'Defaulters' },
    { to: '/admin/rollover', label: 'Year Rollover' },
  ],
  faculty: [
    { to: '/faculty', label: 'My Sessions' },
    { to: '/faculty/defaulters', label: 'Defaulters' },
  ],
  student: [
    { to: '/student', label: 'My Attendance' },
    { to: '/student/scan', label: 'Scan QR' },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user ? linksByRole[user.role] || [] : [];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-700 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-semibold text-lg">📋 Attendance Management System</div>
          {user && (
            <div className="flex items-center gap-4 text-sm">
              <span className="hidden sm:inline">
                {user.name} <span className="opacity-70">({user.role})</span>
              </span>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="bg-brand-600 hover:bg-brand-500 px-3 py-1.5 rounded-md"
              >
                Logout
              </button>
            </div>
          )}
        </div>
        {user && (
          <nav className="bg-brand-600 max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end
                className={({ isActive }) =>
                  `px-3 py-2 text-sm whitespace-nowrap ${
                    isActive ? 'bg-white text-brand-700 rounded-t-md font-medium' : 'text-white/90 hover:text-white'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto p-4">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-gray-400 py-4">
        Open Source Attendance Management System — MERN Stack
      </footer>
    </div>
  );
}
