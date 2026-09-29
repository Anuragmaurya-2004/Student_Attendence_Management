import React from 'react';

export default function Input({
  value,
  defaultValue,
  onChangeText,
  onChange,
  className = '',
  error = '',
  ...props
}) {
  const handleChange = (event) => {
    if (onChangeText) onChangeText(event.target.value);
    if (onChange) onChange(event);
  };

  const inputProps = { ...props };
  if (value !== undefined) {
    inputProps.value = value;
  } else if (defaultValue !== undefined) {
    inputProps.defaultValue = defaultValue;
  }

  const baseClasses =
    'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500';
  const stateClasses = error
    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500/60 dark:focus:ring-rose-500/20'
    : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-slate-700 dark:focus:border-brand-400 dark:focus:ring-brand-500/20';

  return (
    <input
      {...inputProps}
      onChange={handleChange}
      className={`${baseClasses} ${stateClasses} ${className}`}
    />
  );
}
