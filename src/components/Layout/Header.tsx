import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Bell, Wallet, ChevronDown, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useAppStore } from '../../store/useStore';
import { formatCurrency, calculateTotalBalance } from '../../utils/helpers';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/wallet': 'Wallet',
  '/add-money': 'Add Money',
  '/withdrawal': 'WITHDRAW',
  '/withdrawal-history': 'Bet History',
  '/transactions': 'Transaction History',
  '/referral': 'Referral',
  '/profile': 'Profile',
  '/notifications': 'Notifications',

  // Games
  '/games-list': 'All Games',
  '/Games-List': 'All Games',
  '/games/tictactoe': 'Tic Tac Toe',
  '/games/TicTacToe': 'Tic Tac Toe',
  '/matchmaking': 'Card Battle',
  '/games/card-battle': 'Card Battle',
  '/games/poker': 'Poker',
  '/games/ludo': 'Ludo',
  '/games/9-card': 'Nine Card',
  '/games/joker-pair': '3 Pair Card',
  '/games/3-pair-card': '3 Pair Card',
};

const getPageTitle = (pathname: string) => {
  return (
    pageTitles[pathname] ||
    pageTitles[pathname.toLowerCase()] ||
    'BetAdda Casino'
  );
};

export const Header: React.FC = () => {
  const location = useLocation();
  const { user, wallet } = useAuth();
  const { setSidebarOpen, unreadCount } = useAppStore();

  const title = getPageTitle(location.pathname);

  const avatarLetter =
    user?.name?.trim()?.charAt(0)?.toUpperCase() ||
    user?.email?.trim()?.charAt(0)?.toUpperCase() ||
    'U';

  const totalBalance = wallet ? calculateTotalBalance(wallet) : 0;

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080512]/90 backdrop-blur-2xl">
      {/* Premium glow line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />
      <div className="pointer-events-none absolute -top-16 right-10 h-28 w-28 rounded-full bg-yellow-500/10 blur-3xl" />

      <div className="relative flex h-16 items-center justify-between px-3 sm:px-4 lg:h-[68px] lg:px-6">
        {/* Left side */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {/* Mobile menu */}
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-gray-300 transition-all hover:bg-white/10 hover:text-white lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Desktop small brand icon */}
          <div className="hidden h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/20 lg:flex">
            <Trophy className="h-5 w-5 text-white" />
          </div>

          {/* Title */}
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-white sm:text-lg lg:text-xl">
              {title}
            </h1>
            <p className="hidden text-[11px] font-medium tracking-wide text-gray-500 sm:block">
              BetAdda Casino
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="ml-2 flex flex-shrink-0 items-center gap-2 sm:gap-3">
          {/* Mobile wallet icon only */}
          {wallet && (
            <Link to="/wallet" className="sm:hidden">
              <motion.div
                whileTap={{ scale: 0.94 }}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
              >
                <Wallet className="h-5 w-5" />
              </motion.div>
            </Link>
          )}

          {/* Desktop / tablet balance chip */}
          {wallet && (
           <Link to="/wallet" className="hidden sm:block">
              <motion.div
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 rounded-2xl border border-yellow-500/25 bg-gradient-to-r from-yellow-500/15 to-orange-500/10 px-3 py-2 shadow-lg shadow-yellow-500/5 transition-all hover:border-yellow-500/40"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-yellow-500/15">
                  <Wallet className="h-4 w-4 text-yellow-400" />
                </div>
                <div className="leading-none">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                    Balance
                  </p>
                  <span className="text-sm font-bold text-yellow-400">
                    {formatCurrency(totalBalance)}
                  </span>
                </div>
              </motion.div>
            </Link>
          )}

          {/* Notifications */}
          <Link
            to="/notifications"
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-gray-400 transition-all hover:bg-white/10 hover:text-white"
          >
            <Bell className="h-5 w-5" />

            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-lg shadow-red-500/40">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* User profile */}
          <Link
            to="/profile"
            className="group flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1 pr-1 transition-all hover:bg-white/10 sm:pr-3"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 text-sm font-bold text-white shadow-lg shadow-yellow-500/20">
              {avatarLetter}
            </div>

            <div className="hidden min-w-0 md:block">
              <p className="max-w-[120px] truncate text-xs font-semibold text-white">
                {user?.name || 'Player'}
              </p>
              <p className="text-[10px] text-gray-500">Profile</p>
            </div>

            <ChevronDown className="hidden h-4 w-4 text-gray-500 transition-transform group-hover:rotate-180 md:block" />
          </Link>
        </div>
      </div>
    </header>
  );
};
