import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon = null,
  className = '',
  type = 'button',
  ...props
}) {
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-5 py-3 text-base rounded-2xl gap-2.5',
  };

  const variants = {
    primary:
      'bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-500 text-white shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:from-brand-700 hover:to-brand-600 hover:shadow-[0_6px_20px_rgba(79,70,229,0.4)] focus-visible:ring-brand-500',
    secondary:
      'bg-slate-100 text-slate-700 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 focus-visible:ring-slate-400',
    outline:
      'border border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800 focus-visible:ring-brand-500',
    ghost:
      'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white focus-visible:ring-slate-400',
    danger:
      'bg-rose-600 text-white shadow-sm hover:bg-rose-700 hover:shadow-md focus-visible:ring-rose-500',
    success:
      'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md focus-visible:ring-emerald-500',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${sizeStyles[size] || sizeStyles.md} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-current" />
      ) : Icon ? (
        <Icon className="h-4 w-4 shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
