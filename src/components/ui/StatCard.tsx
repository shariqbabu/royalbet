import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  change?: string;
  changeType?: 'up' | 'down';
  accentGlow?: string; // e.g. '251,191,36' for gold glow
}

export const StatCard: React.FC<StatCardProps> = ({
  title, value, icon: Icon, color, bgColor, change, changeType, accentGlow = '168,85,247',
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -3 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl"
        style={{ background: `rgba(${accentGlow}, 0.15)` }}
      />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <p className="mb-1 text-sm text-gray-400">{title}</p>
          <p className="count-up truncate text-2xl font-bold text-white">{value}</p>
          {change && (
            <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${changeType === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
              {changeType === 'up' ? '↑' : '↓'} {change}
            </p>
          )}
        </div>
        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${bgColor} shadow-lg`}
          style={{ boxShadow: `0 4px 16px rgba(${accentGlow}, 0.3)` }}
        >
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </motion.div>
  );
};
