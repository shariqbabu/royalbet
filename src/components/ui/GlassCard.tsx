import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  gradient?: boolean;
  glow?: boolean; // premium border glow on hover
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children, className, hover = false, onClick, gradient = false, glow = false,
}) => {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.015, y: -2 } : undefined}
      onClick={onClick}
      className={cn(
        'relative rounded-2xl border border-white/10 backdrop-blur-sm',
        gradient
          ? 'bg-gradient-to-br from-white/10 to-white/5'
          : 'bg-white/5',
        hover && 'cursor-pointer transition-all duration-200',
        glow && 'glow-ring',
        className
      )}
    >
      {/* decorative corner glow — premium depth */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-purple-500/10 blur-2xl" />
      <div className="relative">{children}</div>
    </motion.div>
  );
};
