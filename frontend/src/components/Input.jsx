import React from 'react';

export default function Input({
  value = '',
  onChangeText = () => {},
  onChange = () => {},
  className = '',
  error = '',
  ...props
}) {
  const handleChange = (event) => {
    if (onChangeText) onChangeText(event.target.value);
    if (onChange) onChange(event);
  };

  const baseClasses = 'w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 bg-white shadow-sm transition placeholder:text-slate-400 focus:outline-none dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500';
  const stateClasses = error ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:border-red-500/60 dark:focus:ring-red-900/40' : 'border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:focus:border-brand-400 dark:focus:ring-brand-500/20';

  return (
    <input
      {...props}
      value={value}
      onChange={handleChange}
      className={`${baseClasses} ${stateClasses} ${className}`}
    />
  );
}
