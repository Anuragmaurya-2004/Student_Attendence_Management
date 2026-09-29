import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  Award,
  AlertTriangle,
  QrCode,
  BookOpen,
  KeyRound,
  Sun,
  Moon,
  LogOut,
  ArrowRight,
  Layers,
} from 'lucide-react';

export default function CommandPalette({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Generate role-specific navigation options
  const getActions = () => {
    if (!user) return [];

    const baseActions = [];

    if (user.role === 'admin') {
      baseActions.push(
        { id: 'admin-dashboard', title: 'Dashboard', group: 'Navigation', icon: LayoutDashboard, path: '/admin' },
        { id: 'admin-students', title: 'Manage Students', group: 'Navigation', icon: GraduationCap, path: '/admin/students' },
        { id: 'admin-faculty', title: 'Manage Faculty', group: 'Navigation', icon: Users, path: '/admin/faculty' },
        { id: 'admin-academic', title: 'Academic Setup & Batches', group: 'Navigation', icon: Layers, path: '/admin/academic' },
        { id: 'admin-holidays', title: 'Holiday Calendar', group: 'Navigation', icon: Calendar, path: '/admin/holidays' },
        { id: 'admin-onduty', title: 'On-Duty Management', group: 'Navigation', icon: Award, path: '/admin/onduty' },
        { id: 'admin-defaulters', title: 'Defaulters & Reports', group: 'Navigation', icon: AlertTriangle, path: '/admin/defaulters' },
        { id: 'admin-rollover', title: 'Academic Rollover', group: 'Navigation', icon: Layers, path: '/admin/rollover' }
      );
    } else if (user.role === 'faculty') {
      baseActions.push(
        { id: 'faculty-sessions', title: 'Sessions & Attendance', group: 'Navigation', icon: BookOpen, path: '/faculty' },
        { id: 'faculty-defaulters', title: 'Class Defaulters', group: 'Navigation', icon: AlertTriangle, path: '/faculty/defaulters' }
      );
    } else if (user.role === 'student') {
      baseActions.push(
        { id: 'student-attendance', title: 'My Attendance & OD', group: 'Navigation', icon: GraduationCap, path: '/student' },
        { id: 'student-scan', title: 'Scan Session QR', group: 'Navigation', icon: QrCode, path: '/student/scan' }
      );
    }

    // Common system actions
    baseActions.push(
      { id: 'change-password', title: 'Security: Change Password', group: 'Account', icon: KeyRound, path: '/change-password' },
      {
        id: 'toggle-theme',
        title: 'Toggle Theme (Light / Dark)',
        group: 'Preferences',
        icon: document.documentElement.classList.contains('dark') ? Sun : Moon,
        action: () => {
          document.documentElement.classList.toggle('dark');
          const isDark = document.documentElement.classList.contains('dark');
          localStorage.setItem('theme', isDark ? 'dark' : 'light');
        },
      },
      {
        id: 'logout',
        title: 'Sign Out / End Session',
        group: 'Account',
        icon: LogOut,
        action: () => {
          logout();
          navigate('/login');
        },
      }
    );

    return baseActions;
  };

  const allActions = getActions();
  const filteredActions = allActions.filter(action =>
    action.title.toLowerCase().includes(query.toLowerCase()) ||
    action.group.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation inside palette
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredActions.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % (filteredActions.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        executeAction(filteredActions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const executeAction = (action) => {
    onClose();
    if (action.action) {
      action.action();
    } else if (action.path) {
      navigate(action.path);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-slate-100 px-3.5 pb-2.5 pt-1.5 dark:border-slate-800">
          <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or jump to screen..."
            className="w-full bg-transparent px-3 text-sm text-slate-900 placeholder-slate-400 outline-none dark:text-slate-100 dark:placeholder-slate-500"
          />
          <kbd className="hidden sm:inline-block rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-1.5 scrollbar-thin">
          {filteredActions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
              No matching pages or commands found for "{query}"
            </div>
          ) : (
            filteredActions.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => executeAction(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-xs transition-colors ${
                    isSelected
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                        isSelected
                          ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/60 dark:text-brand-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="font-medium">{item.title}</span>
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {item.group}
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    className={`h-3.5 w-3.5 transition-transform ${
                      isSelected ? 'translate-x-0.5 text-brand-600 dark:text-brand-400 opacity-100' : 'opacity-0'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Keyboard navigation hints */}
        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
          <div className="flex items-center gap-2">
            <span>Navigation:</span>
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1 dark:border-slate-700 dark:bg-slate-800">↑</kbd>
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1 dark:border-slate-700 dark:bg-slate-800">↓</kbd>
            <span>to navigate</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 dark:border-slate-700 dark:bg-slate-800">↵</kbd>
            <span>to select</span>
          </div>
        </div>
      </div>
    </div>
  );
}
