import React from 'react';

export default function Select({ children, className = '', error, ...props }) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition focus:outline-none dark:bg-slate-900 dark:text-slate-100 ${
        error ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:border-red-500/60 dark:focus:ring-red-900/40' : 'border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:focus:border-brand-400 dark:focus:ring-brand-500/20'
      } ${className}`}
    >
      {children}
    </select>
  );
}
