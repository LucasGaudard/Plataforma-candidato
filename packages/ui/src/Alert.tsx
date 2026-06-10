import type { ReactNode } from 'react';

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  children: ReactNode;
  className?: string;
}

const variants = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  error: 'bg-red-50 border-red-200 text-red-800',
};

export function Alert({ variant = 'info', children, className = '' }: AlertProps) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
}
