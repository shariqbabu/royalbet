import React from 'react';
import { cn } from '../../utils/cn';
import { getStatusBg } from '../../utils/helpers';

interface BadgeProps {
  status: string;
  className?: string;
  pulse?: boolean; // live/active status ke liye
}

export const Badge: React.FC<BadgeProps> = ({ status, className, pulse = false }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm',
        getStatusBg(status),
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {status}
    </span>
  );
};
