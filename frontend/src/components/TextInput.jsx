import React from 'react';
import Input from './Input';

export default function TextInput({
  label,
  value = '',
  onChangeText = () => {},
  onChange = () => {},
  placeholder = '',
  error = '',
  leadingIcon = null,
  trailingIcon = null,
  containerStyle = {},
  inputStyle = '',
  className = '',
  ...props
}) {
  return (
    <div style={containerStyle} className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div
        className={`flex items-center gap-2 rounded-lg border bg-white transition ${
          error ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-300 focus-within:ring-2 focus-within:ring-brand-500'
        }`}
      >
        {leadingIcon && <div className="flex items-center justify-center pl-3">{leadingIcon}</div>}
        <Input
          {...props}
          value={value}
          onChangeText={onChangeText}
          onChange={onChange}
          placeholder={placeholder}
          className={`border-0 focus:ring-0 rounded-none shadow-none bg-transparent ${inputStyle} ${className}`}
          error={error}
        />
        {trailingIcon && <div className="flex items-center justify-center pr-3">{trailingIcon}</div>}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
