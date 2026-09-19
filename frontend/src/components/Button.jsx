import React from 'react';

export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-card hover:from-brand-700 hover:to-brand-600',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 shadow-sm dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-sm',
    outline: 'border border-brand-200 bg-white text-brand-700 hover:bg-brand-50 shadow-sm dark:border-brand-500/40 dark:bg-slate-900 dark:text-brand-100 dark:hover:bg-slate-800',
    ghost: 'bg-transparent border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800',
  };

  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
