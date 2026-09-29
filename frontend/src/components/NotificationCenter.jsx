import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Award,
  BookOpen,
  Check,
  Trash2,
  Sparkles,
} from 'lucide-react';

const INITIAL_NOTIFICATIONS = {
  admin: [
    {
      id: 'adm-1',
      title: 'Defaulter Alert',
      message: '4 students are currently below 60% critical attendance threshold.',
      type: 'warning',
      timestamp: '15m ago',
      read: false,
      link: '/admin/defaulters',
    },
    {
      id: 'adm-2',
      title: 'On-Duty Application Submitted',
      message: 'New multi-day On-Duty permission requested for CSE Smart India Hackathon.',
      type: 'info',
      timestamp: '1h ago',
      read: false,
      link: '/admin/onduty',
    },
    {
      id: 'adm-3',
      title: 'System Telemetry Synced',
      message: 'Daily attendance logs verified across 3 departments.',
      type: 'success',
      timestamp: '3h ago',
      read: true,
      link: '/admin',
    },
  ],
  faculty: [
    {
      id: 'fac-1',
      title: 'Upcoming Lecture Session',
      message: 'Operating Systems (Lab Batch B) starts at 10:00 AM.',
      type: 'reminder',
      timestamp: '25m ago',
      read: false,
      link: '/faculty',
    },
    {
      id: 'fac-2',
      title: 'On-Duty Exemption Credited',
      message: 'Aarav Sharma was granted OD exemption for Inter-College Sports.',
      type: 'info',
      timestamp: '2h ago',
      read: false,
      link: '/faculty/onduty',
    },
    {
      id: 'fac-3',
      title: 'Class Defaulter Roster Updated',
      message: 'Attendance percentages recalculated for current semester week.',
      type: 'warning',
      timestamp: '5h ago',
      read: true,
      link: '/faculty/defaulters',
    },
  ],
  student: [
    {
      id: 'stu-1',
      title: 'Attendance Recorded',
      message: 'Verified check-in recorded for Data Structures Lecture.',
      type: 'success',
      timestamp: '10m ago',
      read: false,
      link: '/student',
    },
    {
      id: 'stu-2',
      title: 'On-Duty Grant Approved',
      message: 'Your official attendance exemption for Hackathon 2026 has been credited.',
      type: 'info',
      timestamp: '1h ago',
      read: false,
      link: '/student',
    },
    {
      id: 'stu-3',
      title: 'Safe-Skip Buffer Updated',
      message: 'You have 3 safe skips remaining while keeping above 75%.',
      type: 'reminder',
      timestamp: '1d ago',
      read: true,
      link: '/student',
    },
  ],
};

function NotificationIcon({ type }) {
  switch (type) {
    case 'warning':
      return <AlertTriangle className="h-4 w-4" />;
    case 'success':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'info':
      return <Award className="h-4 w-4" />;
    case 'reminder':
      return <BookOpen className="h-4 w-4" />;
    default:
      return <Sparkles className="h-4 w-4" />;
  }
}

export default function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState('all'); // 'all' or 'unread'

  const [notifications, setNotifications] = useState(() => {
    try {
      const storageKey = `notifications_${user?.id || user?.role || 'guest'}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item) => ({
            id: item.id || String(Math.random()),
            title: item.title || 'Notification',
            message: item.message || '',
            type: item.type || 'info',
            timestamp: item.timestamp || 'Just now',
            read: Boolean(item.read),
            link: item.link || '',
          }));
        }
      }
    } catch (e) {
      console.warn('Could not restore notifications from storage', e);
    }
    return INITIAL_NOTIFICATIONS[user?.role] || [];
  });

  const popoverRef = useRef(null);

  // Sync to localStorage safely (only string primitives)
  useEffect(() => {
    if (user?.id || user?.role) {
      const storageKey = `notifications_${user?.id || user?.role || 'guest'}`;
      try {
        const safeData = notifications.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          timestamp: n.timestamp,
          read: n.read,
          link: n.link,
        }));
        localStorage.setItem(storageKey, JSON.stringify(safeData));
      } catch (e) {
        console.warn('Could not save notifications to storage', e);
      }
    }
  }, [notifications, user?.id, user?.role]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const deleteNotification = (id, e) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleNotificationClick = (item) => {
    markAsRead(item.id);
    setIsOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  const filteredList =
    tab === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white/80 text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        aria-label="View notifications"
        title="Campus Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-3xl border border-slate-200/90 bg-white/95 p-3 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-2 pb-2.5 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="rounded-lg p-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  title="Mark all as read"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-lg p-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                  title="Clear all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 pt-2 px-1">
            <button
              type="button"
              onClick={() => setTab('all')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                tab === 'all'
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('unread')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                tab === 'unread'
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div className="mt-2 max-h-80 overflow-y-auto space-y-1.5 p-1 scrollbar-thin">
            {filteredList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                {tab === 'unread' ? 'All caught up! No unread notifications.' : 'No notifications found.'}
              </div>
            ) : (
              filteredList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`group relative flex cursor-pointer items-start gap-3 rounded-2xl p-2.5 text-xs transition ${
                    item.read
                      ? 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/40'
                      : 'bg-brand-50/50 text-slate-900 hover:bg-brand-50 dark:bg-brand-950/20 dark:text-slate-100 dark:hover:bg-brand-950/40'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      item.type === 'warning'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        : item.type === 'success'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    }`}
                  >
                    <NotificationIcon type={item.type} />
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold truncate text-slate-900 dark:text-white">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                        {item.timestamp}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                      {item.message}
                    </p>
                  </div>

                  {!item.read && (
                    <span className="absolute right-2.5 top-3.5 h-1.5 w-1.5 rounded-full bg-brand-600 dark:bg-brand-400" />
                  )}

                  <button
                    type="button"
                    onClick={(e) => deleteNotification(item.id, e)}
                    className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition"
                    title="Dismiss"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
