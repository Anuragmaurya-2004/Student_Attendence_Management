import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme, setTheme } from '../theme';

const linksByRole = {
  admin: [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/setup', label: 'Academic Setup' },
    { to: '/admin/students', label: 'Students' },
    { to: '/admin/faculty', label: 'Faculty' },
    { to: '/admin/onduty', label: 'On-Duty & Visits' },
    { to: '/admin/holidays', label: 'Holidays' },
    { to: '/admin/defaulters', label: 'Defaulters' },
    { to: '/admin/rollover', label: 'Year Rollover' },
  ],
  faculty: [
    { to: '/faculty', label: 'My Sessions' },
    { to: '/faculty/onduty', label: 'On-Duty & Visits' },
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
  const darkMode = useTheme();

  const applyTheme = (isDark) => {
    setTheme(isDark);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col lg:flex-row">
        {user && (
          <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white text-slate-800 lg:flex lg:flex-col dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
            <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/80">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 ring-1 ring-brand-200 shadow-sm dark:bg-slate-800 dark:text-brand-100 dark:ring-slate-700">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                  <path d="M8 4.75A1.75 1.75 0 0 1 9.75 3h8.5A1.75 1.75 0 0 1 20 4.75v10.5A1.75 1.75 0 0 1 18.25 17h-8.5A1.75 1.75 0 0 1 8 15.25V4.75ZM4 7.5A2.5 2.5 0 0 1 6.5 5H7v10.5A3.5 3.5 0 0 0 10.5 19H18v.5A1.5 1.5 0 0 1 16.5 21h-8A2.5 2.5 0 0 1 6 18.5V7.5H4Zm5.5 2.75h5.5a.75.75 0 0 0 0-1.5h-5.5a.75.75 0 0 0 0 1.5Zm0 4.5h7a.75.75 0 0 0 0-1.5h-7a.75.75 0 0 0 0 1.5Z" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Campus portal</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Attendance</h2>
              </div>
            </div>

            <div className="px-4 pb-3 pt-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-500/20 dark:text-brand-100 dark:ring-brand-500/30">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
                    <p className="text-xs capitalize text-slate-500 dark:text-slate-300">{user.role}</p>
                  </div>
                </div>
              </div>
            </div>

            <nav className="flex-1 space-y-1 px-3 pb-4 pt-2">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end
                  className={({ isActive }) =>
                    `flex items-center rounded-2xl px-3 py-3 text-sm font-medium transition ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-100 dark:bg-slate-800 dark:text-brand-100 dark:ring-slate-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>

            <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/80">
              <button
                type="button"
                onClick={() => applyTheme(!darkMode)}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                {darkMode ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4"><path d="M12 2.75a1 1 0 0 1 1 1V5a1 1 0 1 1-2 0v-1.25a1 1 0 0 1 1-1Zm0 16.5a1 1 0 0 1 1 1V19a1 1 0 1 1-2 0v.25a1 1 0 0 1 1-1Zm7.25-7.25a1 1 0 0 1 0 2h-1.25a1 1 0 1 1 0-2h1.25Zm-16.5 0a1 1 0 0 1 0 2H1.5a1 1 0 1 1 0-2h1.25ZM17.3 5.7a1 1 0 0 1 1.41 0l.88.88a1 1 0 0 1-1.41 1.41l-.88-.88a1 1 0 0 1 0-1.41Zm-12.6 12.6a1 1 0 0 1 1.41 0l.88.88a1 1 0 1 1-1.41 1.41l-.88-.88a1 1 0 0 1 0-1.41ZM17.3 18.3a1 1 0 0 1 0-1.41l.88-.88a1 1 0 0 1 1.41 1.41l-.88.88a1 1 0 0 1-1.41 0Zm-12.6-12.6a1 1 0 0 1 0-1.41l.88-.88A1 1 0 0 1 6.99 5.7l-.88.88a1 1 0 0 1-1.41 0ZM12 7.25A4.75 4.75 0 1 1 7.25 12 4.75 4.75 0 0 1 12 7.25Z" fill="currentColor"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4"><path d="M20.2 15.18A8.5 8.5 0 0 1 8.82 3.8a8.5 8.5 0 1 0 11.38 11.38Z" fill="currentColor"/></svg>
                )}
                <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Logout
              </button>
            </div>
          </aside>
        )}

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-100">
            <div className="page-shell py-3 sm:py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700 ring-1 ring-brand-200 dark:bg-slate-800 dark:text-brand-100 dark:ring-slate-700">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                      <path d="M8 4.75A1.75 1.75 0 0 1 9.75 3h8.5A1.75 1.75 0 0 1 20 4.75v10.5A1.75 1.75 0 0 1 18.25 17h-8.5A1.75 1.75 0 0 1 8 15.25V4.75ZM4 7.5A2.5 2.5 0 0 1 6.5 5H7v10.5A3.5 3.5 0 0 0 10.5 19H18v.5A1.5 1.5 0 0 1 16.5 21h-8A2.5 2.5 0 0 1 6 18.5V7.5H4Zm5.5 2.75h5.5a.75.75 0 0 0 0-1.5h-5.5a.75.75 0 0 0 0 1.5Zm0 4.5h7a.75.75 0 0 0 0-1.5h-7a.75.75 0 0 0 0 1.5Z" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-300">Campus portal</p>
                    <h1 className="truncate text-base font-semibold sm:text-lg text-slate-900 dark:text-white">Attendance Management</h1>
                  </div>
                </div>

                {user && (
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => applyTheme(!darkMode)}
                      className="hidden rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:inline-flex sm:items-center sm:justify-center"
                      aria-label="Toggle dark mode"
                    >
                      {darkMode ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
                          <path d="M12 2.75a1 1 0 0 1 1 1V5a1 1 0 1 1-2 0v-1.25a1 1 0 0 1 1-1Zm0 16.5a1 1 0 0 1 1 1V19a1 1 0 1 1-2 0v.25a1 1 0 0 1 1-1Zm7.25-7.25a1 1 0 0 1 0 2h-1.25a1 1 0 1 1 0-2h1.25Zm-16.5 0a1 1 0 0 1 0 2H1.5a1 1 0 1 1 0-2h1.25ZM17.3 5.7a1 1 0 0 1 1.41 0l.88.88a1 1 0 0 1-1.41 1.41l-.88-.88a1 1 0 0 1 0-1.41Zm-12.6 12.6a1 1 0 0 1 1.41 0l.88.88a1 1 0 1 1-1.41 1.41l-.88-.88a1 1 0 0 1 0-1.41ZM17.3 18.3a1 1 0 0 1 0-1.41l.88-.88a1 1 0 0 1 1.41 1.41l-.88.88a1 1 0 0 1-1.41 0Zm-12.6-12.6a1 1 0 0 1 0-1.41l.88-.88A1 1 0 0 1 6.99 5.7l-.88.88a1 1 0 0 1-1.41 0ZM12 7.25A4.75 4.75 0 1 1 7.25 12 4.75 4.75 0 0 1 12 7.25Z" fill="currentColor"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
                          <path d="M20.2 15.18A8.5 8.5 0 0 1 8.82 3.8a8.5 8.5 0 1 0 11.38 11.38Z" fill="currentColor"/>
                        </svg>
                      )}
                    </button>
                    <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>
                        {user.name} <span className="opacity-80">({user.role})</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        navigate('/login');
                      }}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:text-sm"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            {user && (
              <div className="border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 lg:hidden">
                <nav className="page-shell flex gap-2 overflow-x-auto py-2 sm:py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {links.map((l) => (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      end
                      className={({ isActive }) =>
                        `rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap transition sm:text-sm ${
                          isActive
                            ? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-100 dark:bg-slate-800 dark:text-brand-100 dark:ring-slate-700'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white'
                        }`
                      }
                    >
                      {l.label}
                    </NavLink>
                  ))}
                </nav>
              </div>
            )}
          </header>

          <main className="page-shell flex-1 py-4 sm:py-6 lg:py-8">
            <Outlet />
          </main>

          <footer className="page-shell pb-5 pt-2 text-center text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
            Open Source Attendance Management System — MERN Stack
          </footer>
        </div>
      </div>
    </div>
  );
}
