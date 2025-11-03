import React from 'react';
import Button from './ui/Button';

export default function PageHeader({ title, subtitle, onBack, actions = [] }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-[#FFF8F0]/80 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="muted" size="sm" onClick={onBack} aria-label="Go back" className="!h-10 !w-10 p-0 rounded-full">
              <span className="material-symbols-outlined">arrow_back</span>
            </Button>
          )}
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="text-sm text-slate-600 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">{actions.map((a, i) => React.cloneElement(a, { key: i }))}</div>
      </div>
    </header>
  );
}
