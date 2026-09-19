import React from 'react';

export function Card({ title, children, actions, className = '' }) {
  return (
    <div className={`mb-5 rounded-[28px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_16px_38px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(15,23,42,0.09)] dark:border-slate-700 dark:bg-slate-900/80 dark:ring-slate-800 sm:p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export { default as Button } from './Button';
export { default as PrimaryButton } from './PrimaryButton';
export { default as Input } from './Input';
export { default as TextInput } from './TextInput';
export { default as PasswordInput } from './PasswordInput';
export { default as Select } from './Select';

export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    yellow: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    purple: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${colors[color] || colors.gray}`}>{children}</span>;
}

export function Table({ columns, data, emptyText = 'No data found' }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-slate-50/40 dark:border-slate-700 dark:bg-slate-950/40">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/90 text-left text-slate-600 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
            {columns.map((col) => (
              <th key={col.key} className="py-3 pr-4 font-semibold tracking-wide">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-6 text-center text-slate-500 dark:text-slate-400">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={row._id || idx} className="border-b border-slate-100 bg-white/75 last:border-0 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/30 dark:hover:bg-slate-800/50">
                {columns.map((col) => (
                  <td key={col.key} className="py-2.5 pr-4 align-top text-slate-700 dark:text-slate-200">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
