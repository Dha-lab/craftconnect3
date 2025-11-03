import React from 'react';
import Button from '../ui/Button';

export default function Alert({ type = 'error', children }) {
  const styles = type === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : type === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-sky-200 bg-sky-50 text-sky-700';
  return (
    <div className={`rounded-lg border p-3 flex items-center gap-2 ${styles}`} role="alert">
      <span className="material-symbols-outlined" aria-hidden>info</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
