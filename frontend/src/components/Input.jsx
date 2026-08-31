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

  const baseClasses = 'w-full rounded-lg px-3 py-2 text-sm transition focus:outline-none bg-white';
  const stateClasses = error ? 'border border-red-400 focus:ring-2 focus:ring-red-200' : 'border border-gray-300 focus:ring-2 focus:ring-brand-500';

  return (
    <input
      {...props}
      value={value}
      onChange={handleChange}
      className={`${baseClasses} ${stateClasses} ${className}`}
    />
  );
}
