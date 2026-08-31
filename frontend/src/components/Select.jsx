import React from 'react';

export default function Select({ children, className = '', error, ...props }) {
  return (
    <select
      {...props}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
        error ? 'border-red-400 focus:ring-red-500' : ''
      } ${className}`}
    >
      {children}
    </select>
  );
}
