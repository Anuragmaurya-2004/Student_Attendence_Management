import React from 'react';
import { Inbox } from 'lucide-react';

export function Card({ title, subtitle, children, actions, className = '' }) {
  return (
    <div
      className={`rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/5 backdrop-blur-md transition-all duration-200 dark:border-slate-800/80 dark:bg-slate-900/90 dark:ring-white/5 dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:p-6 ${className}`}
    >
      {(title || subtitle || actions) && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800/80">
          <div>
            {title && (
              <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white sm:text-lg">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
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

export function Badge({ children, color = 'gray', className = '', dot = false }) {
  const colors = {
    gray: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
    red: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60',
    yellow: 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
    blue: 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60',
  };

  const dotColors = {
    gray: 'bg-slate-400 dark:bg-slate-500',
    green: 'bg-emerald-500',
    red: 'bg-rose-500',
    yellow: 'bg-amber-500',
    blue: 'bg-sky-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide shadow-sm transition-colors ${
        colors[color] || colors.gray
      } ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[color] || dotColors.gray}`} />}
      {children}
    </span>
  );
}

export function Table({ columns, data = [], emptyText = 'No records found', className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-2xl border border-slate-200/90 bg-white/70 shadow-sm dark:border-slate-800 dark:bg-slate-950/40 ${className}`}>
      <table className="min-w-full text-left text-sm">
        <thead className="sticky top-0 z-10 backdrop-blur-md">
          <tr className="border-b border-slate-200/90 bg-slate-50/95 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-300">
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                className={`py-3.5 pr-4 text-xs uppercase tracking-wider ${
                  idx === 0 ? 'pl-4 sm:pl-6' : 'pl-2'
                } ${idx === columns.length - 1 ? 'pr-4 sm:pr-6' : ''} ${col.headerClassName || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-slate-500 dark:text-slate-400">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Inbox className="h-8 w-8 text-slate-400 dark:text-slate-600" />
                  <p className="text-sm font-medium">{emptyText}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={row._id || rowIdx}
                className="group transition-colors hover:bg-slate-50/90 dark:hover:bg-slate-800/50"
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key || colIdx}
                    className={`py-3 pr-4 text-slate-700 dark:text-slate-200 align-middle ${
                      colIdx === 0 ? 'pl-4 sm:pl-6 font-medium text-slate-900 dark:text-white' : 'pl-2'
                    } ${colIdx === columns.length - 1 ? 'pr-4 sm:pr-6' : ''} ${col.cellClassName || ''}`}
                  >
                    {col.render ? col.render(row, rowIdx) : row[col.key]}
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

export function CircularProgressRing({
  value = 0,
  size = 64,
  strokeWidth = 6,
  className = '',
  showLabel = true,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedValue = Math.min(100, Math.max(0, value));
  const offset = circumference - (clampedValue / 100) * circumference;

  let colorClass = 'text-emerald-500';
  if (clampedValue < 65) {
    colorClass = 'text-rose-500';
  } else if (clampedValue < 75) {
    colorClass = 'text-amber-500';
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90 transform">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-slate-200/80 dark:text-slate-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`transition-all duration-700 ease-out ${colorClass}`}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-xs font-black text-slate-800 dark:text-slate-100 tnum">
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
}
