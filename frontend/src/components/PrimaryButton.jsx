import React from 'react';

export default function PrimaryButton({
  children = '',
  onPress = () => {},
  extraStyles = {},
  disabled = false,
  showArrow = false,
  className = '',
  type = 'button',
}) {
  const classes = [
    'inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200',
    'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-card',
    disabled ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'hover:from-brand-700 hover:to-brand-600 active:scale-[0.98]',
    className,
  ].join(' ');

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onPress}
      disabled={disabled}
      className={classes}
      style={extraStyles}
    >
      <span className="flex w-full items-center justify-center gap-2">
        <span className="flex-1 text-center">{children}</span>
        {showArrow && <span aria-hidden="true">→</span>}
      </span>
    </button>
  );
}
