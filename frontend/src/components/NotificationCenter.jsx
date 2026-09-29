import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Award,
  BookOpen,
  Check,
  Trash2,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

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

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return 'Just now';
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diffMs)) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Just now';
  }
};

export default function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState('all'); // 'all' or 'unread'
  const [notifications, setNotifications] = useState([]);
  const popoverRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications');
      if (Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error('Failed to load notifications from server', err);
    }
  }, [user]);

  // Initial fetch and periodic background sync (every 45s)
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Refetch whenever the notification popover is opened or global action triggers
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  useEffect(() => {
    const handleRefresh = () => fetchNotifications();
    window.addEventListener('refresh-notifications', handleRefresh);
    return () => window.removeEventListener('refresh-notifications', handleRefresh);
  }, [fetchNotifications]);

  // Click outside listener to close dropdown
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

  const markAllAsRead = async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.put('/notifications/mark-all-read');
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
      fetchNotifications();
    }
  };

  const markAsRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await api.put(`/notifications/${id}/read`);
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.delete(`/notifications/${id}`);
    } catch (err) {
      console.error('Failed to dismiss notification', err);
      fetchNotifications();
    }
  };

  const handleNotificationClick = async (item) => {
    if (!item.read) {
      await markAsRead(item.id);
    }
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
              <button
                type="button"
                onClick={fetchNotifications}
                className="rounded-lg p-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                title="Refresh notifications"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
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
                {tab === 'unread' ? "All caught up! No unread notifications." : 'No notifications found.'}
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
                        {formatTimeAgo(item.createdAt)}
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
