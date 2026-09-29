import React, { useState } from 'react';
import Input from './Input';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function PasswordInput({
  label,
  value,
  defaultValue,
  onChangeText,
  onChange,
  placeholder = '••••••••',
  error = '',
  helperText = '',
  showPasswordToggle = true,
  leadingIcon = null,
  containerStyle = {},
  inputStyle = '',
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);

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
          type={showPassword ? 'text' : 'password'}
          value={value}
          defaultValue={defaultValue}
          onChangeText={onChangeText}
          onChange={onChange}
          placeholder={placeholder}
          error={error}
          className={`${leadingIcon ? '!pl-10' : ''} ${showPasswordToggle ? '!pr-11' : ''} ${inputStyle} ${className}`}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex={-1}
            className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 focus:outline-none dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
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
