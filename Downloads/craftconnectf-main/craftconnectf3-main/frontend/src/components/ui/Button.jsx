import React from 'react';

const base = 'rounded-xl font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#ec6d13] disabled:opacity-60 disabled:cursor-not-allowed';
const sizes = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-12 px-5 text-base',
  lg: 'h-14 px-6 text-lg'
};
const variants = {
  primary: 'bg-[#ec6d13] text-white hover:bg-[#d65a0b] hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-[#ec6d13]/20',
  secondary: 'border-2 border-[#ec6d13] text-[#ec6d13] hover:bg-[#ec6d13]/10',
  muted: 'bg-slate-200 text-slate-700 hover:bg-slate-300',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  danger: 'bg-rose-600 text-white hover:bg-rose-700'
};

export default function Button({
  as: Comp = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) {
  return (
    <Comp className={[base, sizes[size], variants[variant], className].join(' ')} {...props}>
      {children}
    </Comp>
  );
}
