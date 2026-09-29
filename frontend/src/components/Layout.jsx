import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme, setTheme } from '../theme';
import CommandPalette from './CommandPalette';
import NotificationCenter from './NotificationCenter';
import ErrorBoundary from './ErrorBoundary';
import {
  LayoutDashboard,
  Settings,
  Users,
  GraduationCap,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Award,
  QrCode,
  KeyRound,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  BookOpen,
  CheckCircle2,
  Search,
} from 'lucide-react';

const linksByRole = {
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/setup', label: 'Academic Setup', icon: Settings },
    { to: '/admin/students', label: 'Students', icon: GraduationCap },
    { to: '/admin/faculty', label: 'Faculty', icon: Users },
    { to: '/admin/class-matrix', label: 'Class Matrix', icon: BookOpen },
    { to: '/admin/onduty', label: 'On-Duty & Visits', icon: Award },
    { to: '/admin/holidays', label: 'Holidays', icon: Calendar },
    { to: '/admin/defaulters', label: 'Defaulters', icon: AlertTriangle },
    { to: '/admin/rollover', label: 'Year Rollover', icon: RefreshCw },
    { to: '/faculty/change-password', label: 'Change Password', icon: KeyRound },
  ],
  faculty: [
    { to: '/faculty', label: 'My Sessions', icon: BookOpen },
    { to: '/faculty/my-class', label: 'My Class Matrix', icon: GraduationCap },
    { to: '/faculty/onduty', label: 'On-Duty & Visits', icon: Award },
    { to: '/faculty/defaulters', label: 'Defaulters', icon: AlertTriangle },
    { to: '/faculty/change-password', label: 'Change Password', icon: KeyRound },
  ],
  student: [
    { to: '/student', label: 'My Attendance', icon: CheckCircle2 },
    { to: '/student/scan', label: 'Scan QR', icon: QrCode },
    { to: '/student/change-password', label: 'Change Password', icon: KeyRound },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user ? linksByRole[user.role] || [] : [];
  const darkMode = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const applyTheme = (isDark) => {
    setTheme(isDark);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 text-slate-900 transition-colors duration-250 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-[1920px] flex-col lg:flex-row">
        {user && (
          <aside className="hidden w-72 shrink-0 border-r border-slate-200/90 bg-white/95 text-slate-800 lg:flex lg:flex-col dark:border-slate-800/80 dark:bg-slate-900/90 dark:text-slate-100">
            {/* Campus Brand Header */}
            <div className="flex items-center gap-3 border-b border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                  Campus Portal
                </span>
                <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Attendance Pro
                </h2>
              </div>
            </div>

            {/* User Profile Card */}
            <div className="p-4">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 font-bold text-brand-700 shadow-inner dark:bg-brand-900/50 dark:text-brand-300">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {user.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                      <span className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                        {user.isHOD ? (
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            HOD {user.department?.code ? `(${user.department.code})` : ''}
                          </span>
                        ) : user.classTeacherOf?.length > 0 ? (
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            Class Teacher
                          </span>
                        ) : (
                          <span className="capitalize">{user.role}</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Navigation */}
            <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2">
              {links.map((l) => {
                const Icon = l.icon;
                return (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.to === '/admin' || l.to === '/faculty' || l.to === '/student'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-brand-500/10 font-semibold text-brand-600 shadow-sm ring-1 ring-brand-500/20 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/30'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{l.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Sidebar Footer Controls */}
            <div className="border-t border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-2">
              <button
                type="button"
                onClick={() => applyTheme(!darkMode)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80"
              >
                <span className="flex items-center gap-2">
                  {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
                  <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </span>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                  {darkMode ? 'Dark' : 'Light'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200/80 bg-rose-50/50 px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100/70 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/60"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </aside>
        )}

        {/* Main Content Shell */}
        <div className="flex min-h-screen flex-1 min-w-0 max-w-full flex-col overflow-x-hidden">
          {/* Top Header */}
          <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/85 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/85">
            <div className="page-shell py-3 sm:py-3.5">
              <div className="flex items-center justify-between gap-4">
                {/* Mobile Menu Button & Brand */}
                <div className="flex items-center gap-3 min-w-0">
                  {user && (
                    <button
                      type="button"
                      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 lg:hidden"
                      aria-label="Toggle navigation menu"
                    >
                      {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                  )}

                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-indigo-600 text-white shadow-sm lg:hidden">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="hidden text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 sm:block">
                        Student Attendance
                      </p>
                      <h1 className="truncate text-base font-bold text-slate-900 dark:text-white sm:text-lg">
                        Attendance Management
                      </h1>
                    </div>
                  </div>
                </div>

                {/* Right Header Controls */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Global Search / Command Palette Trigger */}
                  {user && (
                    <button
                      type="button"
                      onClick={() => setCmdOpen(true)}
                      className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/80 px-2.5 sm:px-3 py-1.5 text-xs text-slate-500 shadow-sm transition hover:border-brand-500/50 hover:bg-white hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:border-brand-500/50 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      title="Quick Search & Navigation (Ctrl+K)"
                    >
                      <Search className="h-3.5 w-3.5 text-slate-400" />
                      <span className="hidden sm:inline">Search...</span>
                      <kbd className="hidden sm:inline-block rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                        Ctrl K
                      </kbd>
                    </button>
                  )}

                  {/* Theme Switcher Button (Visible Everywhere, Mobile & Desktop) */}
                  <button
                    type="button"
                    onClick={() => applyTheme(!darkMode)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white/80 text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    aria-label="Toggle color theme"
                    title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  >
                    {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
                  </button>

                  {/* Notification Center Popover */}
                  {user && <NotificationCenter />}

                  {user && (
                    <>
                      <div className="hidden items-center gap-2 rounded-full border border-slate-200/90 bg-slate-50/80 px-3 py-1 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 md:flex">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                        <span className="font-semibold">{user.name}</span>
                        <span className="text-slate-400 capitalize">({user.role})</span>
                      </div>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80 dark:hover:text-rose-400"
                        title="Log out"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Logout</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Drawer / Expandable Menu */}
            {user && mobileMenuOpen && (
              <div className="border-t border-slate-200/80 bg-white/95 px-4 py-4 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 lg:hidden animate-in slide-in-from-top-2 duration-200">
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 font-bold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300 text-xs">
                      {user.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">{user.name}</p>
                      <p className="text-[10px] capitalize text-slate-500 dark:text-slate-400">{user.role}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                    Online
                  </span>
                </div>

                <nav className="grid grid-cols-2 gap-2">
                  {links.map((l) => {
                    const Icon = l.icon;
                    return (
                      <NavLink
                        key={l.to}
                        to={l.to}
                        onClick={() => setMobileMenuOpen(false)}
                        end={l.to === '/admin' || l.to === '/faculty' || l.to === '/student'}
                        className={({ isActive }) =>
                          `flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition ${
                            isActive
                              ? 'bg-brand-500/10 font-semibold text-brand-600 ring-1 ring-brand-500/20 dark:bg-brand-500/20 dark:text-brand-300'
                              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                          }`
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{l.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            )}
          </header>

          {/* Main Outlet */}
          <main className="page-shell flex-1 py-5 sm:py-7 lg:py-8 min-w-0 max-w-full">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>

          {/* Footer */}
          <footer className="page-shell border-t border-slate-200/60 py-5 text-center text-xs text-slate-500 dark:border-slate-800/60 dark:text-slate-400 min-w-0 max-w-full">
            Smart Campus Attendance Management System — Verified Enterprise Portal
          </footer>
        </div>
      </div>

      {/* Global Command Palette Modal */}
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
