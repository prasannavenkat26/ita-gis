import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantClass = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  accent: 'btn-accent',
  danger:
    'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500 text-white font-medium shadow-sm transition-all hover:bg-red-600 hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
};

const sizeClass = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm',
  lg: 'text-base px-5 py-3',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${variantClass[variant]} ${sizeClass[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
