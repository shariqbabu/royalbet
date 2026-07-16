import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import {
  Loader2,
  CircleDot,
  CheckCircle2,
  XCircle,
  Clock3,
  Flame,
  Trophy,
  TrendingDown,
} from 'lucide-react';
import { getAuth } from "firebase/auth";

(async () => {
  const token = await getAuth().currentUser?.getIdToken(true);
  console.log(token);
})();

/* ─── Bet history record — matches the actual Firestore doc shape ───
   {
     action: "DEDUCT",
     amount: -80,
     createdAt: Timestamp,
     description: "Loss | Hand#54 | Rank: One Pair | Table: DEMO",
     game: "Poker",
     idempotencyKey: "...",
     status: "COMPLETED",      <- processing state, NOT win/loss
     type: "BET_LOSS",         <- THIS is what tells you win/loss/split
     uid: "...",
   }
------------------------------------------------------------------- */
interface BetHistoryItem {
  id: string;
  uid: string;
  amount: number;
  status: string;          // 'PENDING' | 'COMPLETED' | 'FAILED' (processing state)
  type: string;             // 'BET_WIN' | 'BET_LOSS' | 'SPLIT_POT' (outcome)
  action?: string;
  game?: string;
  description?: string;
  adminNote?: string;
  idempotencyKey?: string;
  createdAt: any;          // Firestore Timestamp or millis
}

/* ─── Outcome config — keyed by `type`, not `status` ────────────── */
const TYPE_CONFIG = {
  BET_WIN: {
    label: 'Won',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.25)',
    Icon: CheckCircle2,
  },
  BET_LOSS: {
    label: 'Lost',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.25)',
    Icon: XCircle,
  },
  SPLIT_POT: {
    label: 'Split',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.25)',
    Icon: CheckCircle2,
  },
} as const;

type TypeKey = keyof typeof TYPE_CONFIG;

const PENDING_CONFIG = {
  label: 'Pending',
  color: '#F59E0B',
  bg: 'rgba(245,158,11,0.12)',
  border: 'rgba(245,158,11,0.25)',
  Icon: Clock3,
};

/* `status` PENDING overrides the type-based look, since the outcome
   isn't settled yet regardless of what `type` says. */
function getDisplayConfig(bet: { status: string; type: string }) {
  if (bet.status?.toUpperCase() === 'PENDING') return PENDING_CONFIG;
  const key = bet.type?.toUpperCase() as TypeKey;
  return TYPE_CONFIG[key] ?? PENDING_CONFIG;
}

/* ─── Pill badge ─────────────────────────────────────────── */
function StatusPill({ bet }: { bet: { status: string; type: string } }) {
  const cfg = getDisplayConfig(bet);
  const { Icon } = cfg;
  return (
    <span
      style={{
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
    >
      <Icon size={10} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

/* ─── Win / Loss summary card ────────────────────────────── */
function SummaryCard({
  type,
  count,
  amount,
}: {
  type: 'BET_WIN' | 'BET_LOSS';
  count: number;
  amount: number;
}) {
  const isWin = type === 'BET_WIN';
  const color = isWin ? '#10B981' : '#EF4444';
  const bg = isWin ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)';
  const border = isWin ? 'rgba(16,185,129,0.28)' : 'rgba(239,68,68,0.28)';
  const Icon = isWin ? Trophy : TrendingDown;
  const label = isWin ? 'Total Won' : 'Total Lost';
  const sublabel = isWin ? `${count} winning bets` : `${count} losing bets`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: isWin ? 0.05 : 0.1, ease: [0.22, 1, 0.36, 1] }}
      style={{ background: bg, border: `1px solid ${border}` }}
      className="relative overflow-hidden rounded-2xl p-4 flex-1"
    >
      {/* glow blob */}
      <div
        style={{ background: `radial-gradient(circle at 90% 10%, ${color}22, transparent 60%)` }}
        className="pointer-events-none absolute inset-0"
      />
      <div className="relative flex items-center gap-3">
        <div
          style={{ background: `${color}18`, border: `1px solid ${color}35` }}
          className="flex h-9 w-9 items-center justify-center rounded-xl"
        >
          <Icon size={18} style={{ color }} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500">{label}</p>
          <p style={{ color }} className="text-lg font-black tabular-nums leading-tight">
            {formatCurrency(amount)}
          </p>
          <p className="text-[10px] text-gray-600">{sublabel}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Single bet card ────────────────────────────────────── */
function BetCard({ bet, index }: { bet: BetHistoryItem; index: number }) {
  const cfg = getDisplayConfig(bet);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.045, ease: [0.22, 1, 0.36, 1] }}
      style={{ borderColor: cfg.border }}
      className="group relative overflow-hidden rounded-2xl border bg-[#0E0A1A] p-4"
    >
      {/* Side accent */}
      <span
        style={{ background: cfg.color }}
        className="absolute left-0 top-4 h-8 w-[3px] rounded-r-full"
      />

      {/* Hover shimmer */}
      <div
        style={{
          background: `radial-gradient(circle at 80% 20%, ${cfg.color}18, transparent 60%)`,
        }}
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <div className="relative flex items-start justify-between gap-3">
        {/* Left */}
        <div className="flex min-w-0 flex-col gap-1">
          {/* Game name */}
          <p className="text-sm font-bold leading-tight text-white">
            {bet.game?.trim() || 'Bet'}
          </p>

          {/* Description (hand / table detail) */}
          {bet.description && (
            <p className="text-[11px] text-gray-400 leading-snug">{bet.description}</p>
          )}

          {/* Date */}
          <p className="text-[11px] text-gray-500">{formatDate(bet.createdAt)}</p>

          {/* Admin note */}
          {bet.adminNote && (
            <p
              style={{
                color: cfg.color,
                borderColor: cfg.border,
                background: cfg.bg,
              }}
              className="mt-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] leading-snug"
            >
              {bet.adminNote}
            </p>
          )}
        </div>

        {/* Right */}
        <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
          <p
            style={{ color: bet.amount < 0 ? '#EF4444' : '#FFFFFF' }}
            className="text-base font-black tabular-nums"
          >
            {bet.amount < 0 ? '-' : ''}
            {formatCurrency(Math.abs(bet.amount))}
          </p>
          <StatusPill bet={bet} />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main page ──────────────────────────────────────────── */
const BetHistoryPage: React.FC = () => {
  const { firebaseUser } = useAuth();
  const [bets, setBets] = useState<BetHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | TypeKey | 'PENDING'>('ALL');

  useEffect(() => {
    if (!firebaseUser) return;

    const q = query(
      collection(db, 'bethistory'),
      where('uid', '==', firebaseUser.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      setBets(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BetHistoryItem)));
      setLoading(false);
    });

    return () => unsub();
  }, [firebaseUser]);

  /* ── Stats — driven by `type`, with `status === PENDING` carved out first ── */
  const pendingBets = bets.filter((b) => b.status?.toUpperCase() === 'PENDING');
  const wins = bets.filter(
    (b) =>
      b.status?.toUpperCase() !== 'PENDING' &&
      (b.type === 'BET_WIN' || b.type === 'SPLIT_POT')
  );
  const losses = bets.filter(
    (b) => b.status?.toUpperCase() !== 'PENDING' && b.type === 'BET_LOSS'
  );

  const totalWinAmount = wins.reduce((s, b) => s + Math.abs(b.amount || 0), 0);
  const totalLossAmount = losses.reduce((s, b) => s + Math.abs(b.amount || 0), 0);
  const winRate = bets.length ? Math.round((wins.length / bets.length) * 100) : 0;

  /* ── Filters ── */
  const FILTERS: Array<{ key: 'ALL' | TypeKey | 'PENDING'; label: string }> = [
    { key: 'ALL', label: 'All' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'BET_WIN', label: 'Won' },
    { key: 'BET_LOSS', label: 'Lost' },
    { key: 'SPLIT_POT', label: 'Split' },
  ];

  const visible =
    filter === 'ALL'
      ? bets
      : filter === 'PENDING'
        ? pendingBets
        : bets.filter(
            (b) => b.status?.toUpperCase() !== 'PENDING' && b.type === filter
          );

  return (
    <div className="min-h-screen bg-[#07040F] text-white">
      {/* Top glow */}
      <div className="pointer-events-none fixed left-1/2 top-0 h-64 w-96 -translate-x-1/2 rounded-full bg-violet-600/20 blur-[80px]" />

      <div className="relative mx-auto max-w-lg px-4 pb-10 pt-6">
        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-black">Bet History</h1>
          <p className="text-xs text-gray-500">
            {bets.length} bets · {winRate}% win rate
          </p>
        </motion.div>

        {/* ── Summary cards ── */}
        <div className="mt-4 flex gap-3">
          <SummaryCard type="BET_WIN" count={wins.length} amount={totalWinAmount} />
          <SummaryCard type="BET_LOSS" count={losses.length} amount={totalLossAmount} />
        </div>

        {/* ── Filter tabs ── */}
        <div className="mt-5 flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                filter === f.key
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── List ── */}
        <div className="mt-4 flex flex-col gap-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-violet-500" size={28} />
            </div>
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">No bets found.</p>
          ) : (
            <AnimatePresence>
              {visible.map((bet, i) => (
                <BetCard key={bet.id} bet={bet} index={i} />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};

export default BetHistoryPage;
