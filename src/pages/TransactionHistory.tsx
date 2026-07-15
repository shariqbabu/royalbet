import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { subscribeTransactions } from '../firebase/wallet';
import { Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Badge } from '../components/ui/Badge';
import {
  History,
  TrendingUp,
  TrendingDown,
  Trophy,
  Users,
  Gift,
  Loader2,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

// ─── Transaction icon config ──────────────────────────────────────────────────
const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'DEPOSIT':
      return {
        icon: TrendingUp,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
      };
    case 'WITHDRAWAL':
      return {
        icon: TrendingDown,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
      };
    case 'GAME_WIN':
      return {
        icon: Trophy,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/20',
      };
    case 'GAME_LOSS':
      return {
        icon: TrendingDown,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/20',
      };
    case 'BONUS':
      return {
        icon: Gift,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
      };
    case 'REFERRAL':
      return {
        icon: Users,
        color: 'text-pink-400',
        bg: 'bg-pink-500/10',
        border: 'border-pink-500/20',
      };
    case 'DEDUCTION_DEPOSIT':
    case 'DEDUCTION_WIN':
      return {
        icon: TrendingDown,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
      };
    case 'REFUND':
    case 'CASH_OUT':
    case 'RETURN_WIN':
    case 'RETURN_DEPOSIT':
      return {
        icon: TrendingUp,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
      };
    default:
      return {
        icon: Wallet,
        color: 'text-gray-400',
        bg: 'bg-white/[0.06]',
        border: 'border-white/10',
      };
  }
};

// ─── Animation variants ───────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariant = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const TransactionHistory: React.FC = () => {
  const { firebaseUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;

    const unsub = subscribeTransactions(firebaseUser.uid, (txs) => {
      setTransactions(txs);
      setLoading(false);
    });

    return () => unsub();
  }, [firebaseUser]);

  const totalIn = transactions
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);

  const totalOut = transactions
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080512] text-white">
      {/* Background glows */}
      <div className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-56 -left-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -right-24 h-72 w-72 rounded-full bg-yellow-500/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-3xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-5"
        >
          {/* ── Hero Header ── */}
          <motion.div
            variants={itemVariant}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent p-4 shadow-2xl sm:p-6"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl" />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10">
                  <History className="h-7 w-7 text-cyan-400" />
                </div>

                <div>
                  <h1 className="text-2xl font-black text-white sm:text-3xl">
                    Transactions
                  </h1>
                  <p className="mt-1 text-xs text-gray-400 sm:text-sm">
                    All credits, debits and game activity
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-gray-500">
                  Total Entries
                </p>
                <p className="text-xl font-black text-white">
                  {transactions.length}
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── Summary ── */}
          <motion.div
            variants={itemVariant}
            className="grid grid-cols-2 gap-3"
          >
            <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 shadow-xl">
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/20 blur-2xl" />

              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/15">
                    <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-400">
                    Total In
                  </span>
                </div>
                <p className="text-xl font-black text-emerald-400 sm:text-2xl">
                  +{formatCurrency(totalIn)}
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-red-500/10 p-4 shadow-xl">
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-red-500/20 blur-2xl" />

              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/15">
                    <ArrowUpRight className="h-4 w-4 text-red-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-400">
                    Total Out
                  </span>
                </div>
                <p className="text-xl font-black text-red-400 sm:text-2xl">
                  -{formatCurrency(totalOut)}
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── Loading ── */}
          {loading && (
            <motion.div
              variants={itemVariant}
              className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] py-16 shadow-xl"
            >
              <Loader2 className="mb-3 h-9 w-9 animate-spin text-cyan-400" />
              <p className="text-sm text-gray-400">Loading transactions...</p>
            </motion.div>
          )}

          {/* ── Empty State ── */}
          {!loading && transactions.length === 0 && (
            <motion.div
              variants={itemVariant}
              className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] py-16 text-center shadow-xl"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.06]">
                <History className="h-8 w-8 text-gray-600" />
              </div>
              <p className="text-base font-semibold text-gray-300 sm:text-lg">
                No transactions yet
              </p>
              <p className="mt-1 text-xs text-gray-600">
                Your transactions will appear here
              </p>
            </motion.div>
          )}

          {/* ── Transaction List ── */}
          {!loading && transactions.length > 0 && (
            <motion.div variants={itemVariant} className="space-y-3">
              {transactions.map((tx, i) => {
                const { icon: Icon, color, bg, border } =
                  getTransactionIcon(tx.type);
                const isPositive = tx.amount > 0;

                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-3 shadow-lg transition-all hover:-translate-y-0.5 hover:border-white/20 hover:shadow-xl sm:p-4"
                  >
                    <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                      style={{
                        background: `radial-gradient(circle, ${
                          isPositive
                            ? 'rgba(52,211,153,0.08)'
                            : 'rgba(248,113,113,0.08)'
                        }, transparent 70%)`,
                      }}
                    />

                    <div className="relative flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        {/* Icon */}
                        <div
                          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border ${border} ${bg}`}
                        >
                          <Icon className={`h-5 w-5 ${color}`} />
                        </div>

                        {/* Info */}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white capitalize">
                            {tx.type.replace(/_/g, ' ')}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-gray-400">
                            {tx.description}
                          </p>
                          <p className="mt-0.5 text-[10px] text-gray-600">
                            {formatDate(tx.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Amount + badge */}
                      <div className="flex-shrink-0 text-right">
                        <p
                          className={`text-base font-black sm:text-lg ${
                            isPositive ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {formatCurrency(Math.abs(tx.amount))}
                        </p>
                        <div className="mt-1">
                          <Badge status={tx.status} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
