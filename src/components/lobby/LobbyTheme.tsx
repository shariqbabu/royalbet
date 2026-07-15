import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Users } from 'lucide-react';

export type LobbyAccent =
  | 'yellow'
  | 'emerald'
  | 'violet'
  | 'purple'
  | 'blue'
  | 'pink'
  | 'orange'
  | 'red';

export const lobbyAnim = {
  container: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  },
  item: {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0 },
  },
};

const ACCENT: Record<
  LobbyAccent,
  {
    text: string;
    bg: string;
    border: string;
    hero: string;
    hoverBorder: string;
    button: string;
  }
> = {
  yellow: {
    text: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/25',
    hero: 'from-yellow-500/25 via-orange-500/10 to-transparent',
    hoverBorder: 'hover:border-yellow-500/40',
    button:
      'bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:from-yellow-400 hover:to-orange-400',
  },
  emerald: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
    hero: 'from-emerald-500/25 via-green-500/10 to-transparent',
    hoverBorder: 'hover:border-emerald-500/40',
    button:
      'bg-gradient-to-r from-emerald-600 to-green-500 text-white hover:from-emerald-500 hover:to-green-400',
  },
  violet: {
    text: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/25',
    hero: 'from-violet-500/25 via-purple-500/10 to-transparent',
    hoverBorder: 'hover:border-violet-500/40',
    button:
      'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500',
  },
  purple: {
    text: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/25',
    hero: 'from-purple-500/25 via-indigo-500/10 to-transparent',
    hoverBorder: 'hover:border-purple-500/40',
    button:
      'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500',
  },
  blue: {
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/25',
    hero: 'from-blue-500/25 via-cyan-500/10 to-transparent',
    hoverBorder: 'hover:border-blue-500/40',
    button:
      'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500',
  },
  pink: {
    text: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/25',
    hero: 'from-pink-500/25 via-purple-500/10 to-transparent',
    hoverBorder: 'hover:border-pink-500/40',
    button:
      'bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:from-pink-500 hover:to-purple-500',
  },
  orange: {
    text: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/25',
    hero: 'from-orange-500/25 via-red-500/10 to-transparent',
    hoverBorder: 'hover:border-orange-500/40',
    button:
      'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-500 hover:to-red-500',
  },
  red: {
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/25',
    hero: 'from-red-500/25 via-orange-500/10 to-transparent',
    hoverBorder: 'hover:border-red-500/40',
    button:
      'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-500 hover:to-orange-500',
  },
};

export const getAccent = (accent: LobbyAccent = 'yellow') => ACCENT[accent];

export const PremiumLobbyPage: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div
      className={`relative min-h-screen overflow-hidden bg-[#080512] text-white ${className}`}
    >
      <div className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-yellow-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-48 -left-24 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -right-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
        {children}
      </div>
    </div>
  );
};

export const LoadingScreen: React.FC<{
  label?: string;
  accent?: LobbyAccent;
}> = ({ label = 'Loading...', accent = 'yellow' }) => {
  const a = getAccent(accent);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080512] px-4 text-white">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl">
        <Loader2 className={`mx-auto mb-3 h-9 w-9 animate-spin ${a.text}`} />
        <p className="text-sm text-gray-400">{label}</p>
      </div>
    </div>
  );
};

export const LobbyHero: React.FC<{
  title: string;
  subtitle?: React.ReactNode;
  icon: React.ElementType;
  accent?: LobbyAccent;
  right?: React.ReactNode;
}> = ({ title, subtitle, icon: Icon, accent = 'yellow', right }) => {
  const a = getAccent(accent);

  return (
    <motion.div
      variants={lobbyAnim.item}
      className={`relative mb-4 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${a.hero} p-4 shadow-2xl sm:mb-5 sm:p-5`}
    >
      <div className={`absolute -right-12 -top-12 h-36 w-36 rounded-full ${a.bg} blur-3xl`} />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border ${a.border} ${a.bg} sm:h-14 sm:w-14`}
          >
            <Icon className={`h-6 w-6 sm:h-7 sm:w-7 ${a.text}`} />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-xl font-black text-white sm:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-xs leading-relaxed text-gray-400 sm:text-sm">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {right && <div className="flex-shrink-0">{right}</div>}
      </div>
    </motion.div>
  );
};

export const LobbyStats: React.FC<{
  stats: {
    label: string;
    value: React.ReactNode;
    icon?: React.ElementType;
    accent?: LobbyAccent;
  }[];
}> = ({ stats }) => {
  return (
    <motion.div
      variants={lobbyAnim.item}
      className="mb-4 grid grid-cols-3 gap-2 sm:mb-5 sm:gap-3"
    >
      {stats.map((s) => {
        const a = getAccent(s.accent || 'yellow');
        const Icon = s.icon;

        return (
          <div
            key={s.label}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center shadow-lg"
          >
            {Icon && (
              <div className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${a.bg}`}>
                <Icon className={`h-4 w-4 ${a.text}`} />
              </div>
            )}
            <p className={`text-base font-black sm:text-xl ${a.text}`}>
              {s.value}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-500 sm:text-xs">
              {s.label}
            </p>
          </div>
        );
      })}
    </motion.div>
  );
};

export const LobbyCard: React.FC<{
  children: React.ReactNode;
  accent?: LobbyAccent;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}> = ({ children, accent = 'yellow', active, disabled, className = '' }) => {
  const a = getAccent(accent);

  return (
    <motion.div
      variants={lobbyAnim.item}
      whileHover={!disabled ? { y: -3 } : undefined}
      className={`relative overflow-hidden rounded-3xl border bg-white/[0.04] p-3 shadow-xl transition-all sm:p-4
        ${
          disabled
            ? 'border-white/10 opacity-60'
            : active
              ? `${a.border} ${a.bg}`
              : `border-white/10 ${a.hoverBorder}`
        }
        ${className}`}
    >
      <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full ${a.bg} blur-3xl`} />
      <div className="relative">{children}</div>
    </motion.div>
  );
};

export const EmptyLobby: React.FC<{
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
}> = ({ title, subtitle, icon: Icon = Users }) => {
  return (
    <motion.div
      variants={lobbyAnim.item}
      className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center sm:p-10"
    >
      <Icon className="mx-auto mb-3 h-11 w-11 text-gray-600" />
      <p className="text-base font-semibold text-gray-300 sm:text-lg">{title}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-600">{subtitle}</p>}
    </motion.div>
  );
};

export const InfoChip: React.FC<{
  children: React.ReactNode;
  icon?: React.ElementType;
  accent?: LobbyAccent;
  className?: string;
}> = ({ children, icon: Icon, accent = 'yellow', className = '' }) => {
  const a = getAccent(accent);

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold ${a.border} ${a.bg} ${a.text} ${className}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </div>
  );
};

type ButtonVariant =
  | LobbyAccent
  | 'ghost'
  | 'disabled'
  | 'watch'
  | 'dark';

export const ActionButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    full?: boolean;
  }
> = ({ children, variant = 'yellow', full = true, className = '', disabled, ...props }) => {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60';

  const variantClass =
    disabled
      ? 'bg-gray-800 text-gray-500'
      : variant === 'ghost'
        ? 'border border-white/10 bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]'
        : variant === 'watch'
          ? 'border border-blue-500/25 bg-blue-500/10 text-blue-300 hover:bg-blue-500/15'
          : variant === 'dark'
            ? 'border border-white/10 bg-black/30 text-gray-300 hover:bg-black/40'
            : getAccent(variant as LobbyAccent).button;

  return (
    <motion.button
      whileHover={!disabled ? { y: -1 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      disabled={disabled}
      className={`${base} ${full ? 'w-full' : ''} ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
};
