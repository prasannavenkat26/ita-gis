import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent';
  className?: string;
}

const variantClass = {
  default: 'bg-forest-100 text-forest-700 dark:bg-forest-800 dark:text-forest-200',
  success: 'bg-forest-100 text-forest-600 dark:bg-forest-800/60 dark:text-forest-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  error: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  info: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
  accent: 'bg-lime2-400/20 text-forest-700 dark:text-lime2-300',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`badge ${variantClass[variant]} ${className}`}>
      {children}
    </span>
  );
}
