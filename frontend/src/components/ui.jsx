import React from 'react';

export function Card({ title, children, actions }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-5">
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-lg font-semibold text-gray-800">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    outline: 'border border-brand-600 text-brand-600 hover:bg-brand-50',
  };
  return (
    <button
      className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(props) {
  return (
    <input
      {...props}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
        props.className || ''
      }`}
    />
  );
}

export function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
        props.className || ''
      }`}
    >
      {children}
    </select>
  );
}

export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-800',
    blue: 'bg-blue-100 text-blue-700',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>{children}</span>;
}

export function Table({ columns, data, emptyText = 'No data found' }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            {columns.map((col) => (
              <th key={col.key} className="py-2 pr-4 font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-6 text-center text-gray-400">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={row._id || idx} className="border-b border-gray-100 hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col.key} className="py-2 pr-4">
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
