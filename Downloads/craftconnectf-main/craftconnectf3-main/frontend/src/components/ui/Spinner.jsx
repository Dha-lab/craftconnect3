import React from 'react';

export default function Spinner({ size = 20, className = '' }) {
  const px = typeof size === 'number' ? `${size}px` : size;
  return (
    <div
      className={['animate-spin rounded-full border-2 border-[#ec6d13] border-t-transparent', className].join(' ')}
      style={{ width: px, height: px }}
      aria-label="Loading"
      role="status"
    />
  );
}
