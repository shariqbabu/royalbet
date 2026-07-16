import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gold' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
  glow?: boolean;
}

const variants = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500/30 shadow-blue-500/20',
  secondary: 'bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-none',
  danger: 'bg-red-600 hover:bg-red-500 text-white border-red-500/30 shadow-red-500/20',
  ghost: 'bg-transparent hover:bg-white/10 text-gray-300 border-transparent shadow-none',
  gold: 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold border-yellow-400/30 shadow-yellow-500/30',
  purple: 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold border-purple-400/30 shadow-purple-500/30',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  children, onClick, type = 'button', variant = 'primary',
  size = 'md', loading = false, disabled = false, className,
  fullWidth = false, glow = true,
}) => {
  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.02, y: -1 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'shine-sweep flex items-center justify-center gap-2 rounded-xl border font-medium transition-all duration-200',
        glow && 'shadow-lg',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </motion.button>
  );
};
