import React from 'react';
import Input from './Input';
import { AlertCircle } from 'lucide-react';

export default function TextInput({
  label,
  value,
  defaultValue,
  onChangeText,
  onChange,
  placeholder = '',
  error = '',
  helperText = '',
  leadingIcon = null,
  trailingIcon = null,
  containerStyle = {},
  inputStyle = '',
  className = '',
  ...props
}) {
  return (
    <div style={containerStyle} className="w-full">
      {label && (
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leadingIcon && (
          <div className="pointer-events-none absolute left-3 flex items-center justify-center text-slate-400 dark:text-slate-500">
            {leadingIcon}
          </div>
        )}
        <Input
          {...props}
          value={value}
          defaultValue={defaultValue}
          onChangeText={onChangeText}
          onChange={onChange}
          placeholder={placeholder}
          error={error}
          className={`${leadingIcon ? '!pl-10' : ''} ${trailingIcon ? '!pr-10' : ''} ${inputStyle} ${className}`}
        />
        {trailingIcon && (
          <div className="absolute right-3 flex items-center justify-center text-slate-400 dark:text-slate-500">
            {trailingIcon}
          </div>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-500 dark:text-rose-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
}
