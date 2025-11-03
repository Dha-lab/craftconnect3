import React from 'react';

export default function Card({ className = '', children, ...props }) {
  return (
    <div className={['rounded-xl border border-slate-200 bg-white shadow-sm sm:p-6 p-5', className].join(' ')} {...props}>
      {children}
    </div>
  );
}
