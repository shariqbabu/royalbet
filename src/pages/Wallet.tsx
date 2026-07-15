import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wallet as WalletIcon,
  Trophy,
  TrendingUp,
  Star,
  Users,
  PlusCircle,
  ArrowUpCircle,
  Info,
  ChevronRight,
  ShieldCheck,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import {
  formatCurrency,
  calculateTotalBalance,
  calculateUsableBalance,
} from '../utils/helpers';

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

export const Wallet: React.FC = () => {
  const { wallet } = useAuth();

  const usableBalance = wallet ? calculateUsableBalance(wallet) : 0;
  const totalBalance = wallet ? calculateTotalBalance(wallet) : 0;

  const balanceItems = [
    {
      label: 'Winning Balance',
      value: wallet?.winningBalance || 0,
      icon: Trophy,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      glow: 'bg-yellow-500/20',
      desc: 'Earned from game wins. Fully usable & withdrawable.',
      usable: true,
    },
    {
      label: 'Deposit Balance',
      value: wallet?.depositBalance || 0,
      icon: TrendingUp,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      glow: 'bg-blue-500/20',
      desc: 'Money you deposited. Used FIRST during gameplay.',
      usable: true,
    },
    {
      label: 'Bonus Balance',
      value: wallet?.bonusBalance || 0,
      icon: Star,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      glow: 'bg-purple-500/20',
      desc: 'Signup/admin bonus. Only 10% usable per bet.',
      usable: true,
      note: '10% per bet',
    },
    {
      label: 'Referral Balance',
      value: wallet?.referralBalance || 0,
      icon: Users,
      color: 'text-pink-400',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
      glow: 'bg-pink-500/20',
      desc: 'Earned from referrals. Fully usable in games.',
      usable: true,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080512] text-white">
      {/* Background glows */}
      <div className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-yellow-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-56 -left-24 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -right-24 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-5"
        >
          {/* ── Hero: Total Balance ── */}
          <motion.div
            variants={item}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-yellow-500/20 via-orange-500/10 to-transparent p-5 shadow-2xl sm:p-6"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-yellow-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 -bottom-16 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl" />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-yellow-500/25 bg-yellow-500/10">
                  <WalletIcon className="h-7 w-7 text-yellow-400" />
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Total Balance
                  </p>
                  <p className="text-3xl font-black text-white sm:text-4xl">
                    {formatCurrency(totalBalance)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-center sm:text-left">
                <p className="text-[10px] uppercase tracking-wide text-gray-500">
                  Usable Balance
                </p>
                <p className="text-lg font-black text-emerald-400 sm:text-xl">
                  {formatCurrency(usableBalance)}
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── Action Buttons ── */}
          <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:gap-4">
            <Link to="/add-money">
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="group relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 shadow-xl transition-all hover:border-emerald-500/40 sm:p-5"
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/20 blur-2xl transition-opacity group-hover:opacity-100" />

                <div className="relative flex items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/15">
                    <PlusCircle className="h-6 w-6 text-emerald-400" />
                  </div>

                  <div className="min-w-0">
                    <p className="font-black text-white sm:text-base">
                      Add Money
                    </p>
                    <p className="text-xs text-gray-400">Deposit funds</p>
                  </div>

                  <ChevronRight className="ml-auto h-5 w-5 text-emerald-400 transition-transform group-hover:translate-x-0.5" />
                </div>
              </motion.div>
            </Link>

            <Link to="/withdrawal">
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="group relative overflow-hidden rounded-3xl border border-orange-500/20 bg-orange-500/10 p-4 shadow-xl transition-all hover:border-orange-500/40 sm:p-5"
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-orange-500/20 blur-2xl transition-opacity group-hover:opacity-100" />

                <div className="relative flex items-center gap-2 sm:gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-orange-500/25 bg-orange-500/15 sm:h-12 sm:w-12">
                    <ArrowUpCircle className="h-5 w-5 text-orange-400 sm:h-6 sm:w-6" />
                  </div>

                  <div className="min-w-0">
                    <p className="font-black text-white sm:text-base">
                      Withdraw
                    </p>
                    <p className="text-xs text-gray-400">To your UPI</p>
                  </div>

                  <ChevronRight className="ml-auto h-5 w-5 flex-shrink-0 text-orange-400 transition-transform group-hover:translate-x-0.5" />
                </div>
              </motion.div>
            </Link>
          </motion.div>

          {/* ── Balance Breakdown ── */}
          <motion.div variants={item}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <Coins className="h-5 w-5 text-yellow-400" />
              </div>
              <h3 className="text-lg font-black text-white">Balance Breakdown</h3>
            </div>

            <div className="space-y-3">
              {balanceItems.map(({ label, value, icon: Icon, color, bg, border, glow, desc, usable, note }, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 + index * 0.06 }}
                  whileHover={{ x: 3 }}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-lg transition-all hover:border-white/20 sm:p-5"
                >
                  <div
                    className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full ${glow} blur-3xl opacity-0 transition-opacity group-hover:opacity-100`}
                  />

                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border ${border} ${bg}`}
                      >
                        <Icon className={`h-5 w-5 ${color}`} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-black text-white sm:text-base">
                            {label}
                          </p>
                          {note && (
                            <span className="flex-shrink-0 rounded-full border border-purple-500/25 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-400">
                              {note}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-400 sm:text-sm">
                          {desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <p className={`text-lg font-black ${color} sm:text-xl`}>
                        {formatCurrency(value)}
                      </p>
                      <p
                        className={`mt-0.5 text-[10px] font-medium ${
                          usable ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {usable ? '✓ Usable' : '✗ Not for games'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── Info Box ── */}
          <motion.div variants={item}>
            <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-blue-500/10 p-4 shadow-xl sm:p-5">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/20 blur-3xl" />

              <div className="relative flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-500/15">
                  <Info className="h-5 w-5 text-blue-400" />
                </div>

                <div className="min-w-0">
                  <p className="mb-2 text-sm font-black text-blue-300">
                    Balance Rules
                  </p>
                  <ul className="space-y-1.5 text-xs text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                      <span>
                        Deposit balance is used{' '}
                        <span className="font-semibold text-white">FIRST</span> in
                        games
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                      <span>
                        Winning balance is used after deposit balance finishes
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                      <span>
                        Winning balance is fully withdrawable (min ₹100)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                      <span>Only 10% of bonus balance usable per bet</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Security Note ── */}
          <motion.div
            variants={item}
            className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-center"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">
              Secure transactions · Instant updates · 100% transparent
            </span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
