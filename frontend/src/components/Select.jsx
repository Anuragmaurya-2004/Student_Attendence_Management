import React from 'react';

export default function Select({ children, className = '', error, ...props }) {
  const baseClasses =
    'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100';
  const stateClasses = error
    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500/60 dark:focus:ring-rose-500/20'
    : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-slate-700 dark:focus:border-brand-400 dark:focus:ring-brand-500/20';

  return (
    <select
      {...props}
      className={`${baseClasses} ${stateClasses} ${className}`}
    >
      {children}
    </select>
  );
}
