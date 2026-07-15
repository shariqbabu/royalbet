// src/pages/games/TambolaGame.tsx — Tambola (Housie) game screen
//
// - Public game state: onSnapshot on tambolaGames/{tableId}
// - Mera ticket: onSnapshot on tambolaGames/{tableId}/private/{uid}
// - Ticket AUTO-MARK hota hai (calledNumbers se render) — user tap nahi karta
// - Number calling: nextCallAt pe anchored setTimeout → tambolaApi.call()
//   (sab clients arm karte hain, server idempotent — realludo/joker pattern)
// - Claim: pattern complete hone pe button glow, user dabaye → server validate

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Users,
  Coins,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../context/AuthContext';
import { tambolaApi } from '../../lib/apiClient';
import { db } from '../../firebase/config';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PrizeState {
  claimedBy: string | null;
  name: string | null;
  amount: number;
}

interface TambolaGameDoc {
  tableId: string;
  status: 'playing' | 'finished';
  players: string[];
  playerNames: Record<string, string>;
  calledNumbers: number[];
  currentNumber: number | null;
  nextCallAt: number;
  callIntervalSecs: number;
  prizes: {
    earlyFive: PrizeState;
    topLine: PrizeState;
    middleLine: PrizeState;
    bottomLine: PrizeState;
    fullHouse: PrizeState;
  };
  prizePool: number;
  entryFee: number;
}

interface TambolaTableDoc {
  players: string[];
  playerNames: Record<string, string>;
  status: 'waiting' | 'playing';
  entryFee: number;
  prizePool: number;
  maxPlayers: number;
}

type PrizeKey = 'earlyFive' | 'topLine' | 'middleLine' | 'bottomLine' | 'fullHouse';

const PRIZE_LABELS: Record<PrizeKey, string> = {
  earlyFive:  'Early 5',
  topLine:    'Top Line',
  middleLine: 'Middle Line',
  bottomLine: 'Bottom Line',
  fullHouse:  'Full House',
};

const PRIZE_ORDER: PrizeKey[] = ['earlyFive', 'topLine', 'middleLine', 'bottomLine', 'fullHouse'];

const MIN_PLAYERS = 2;

// Client-side pattern check — sirf Claim button enable/glow karne ke liye.
// Asli validation server pe hoti hai.
function isPatternComplete(grid: number[][], key: PrizeKey, called: Set<number>): boolean {
  const rowDone = (r: number) => grid[r].filter((n) => n > 0).every((n) => called.has(n));
  const nums = grid.flat().filter((n) => n > 0);
  switch (key) {
    case 'earlyFive':  return nums.filter((n) => called.has(n)).length >= 5;
    case 'topLine':    return rowDone(0);
    case 'middleLine': return rowDone(1);
    case 'bottomLine': return rowDone(2);
    case 'fullHouse':  return nums.every((n) => called.has(n));
  }
}

const TambolaGame: React.FC = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const myUid = user?.uid || '';

  const [game, setGame]     = useState<TambolaGameDoc | null>(null);
  const [table, setTable]   = useState<TambolaTableDoc | null>(null);
  const [ticket, setTicket] = useState<number[][] | null>(null);
  const [claiming, setClaiming] = useState<PrizeKey | null>(null);
  const [countdown, setCountdown] = useState(0);

  const callTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startFiredRef = useRef(false);

  // ── Table doc (waiting state + auto-start trigger) ─────────────────────────
  useEffect(() => {
    if (!tableId) return;
    const unsub = onSnapshot(doc(db, 'tambolaTables', tableId), (snap) => {
      setTable(snap.exists() ? (snap.data() as TambolaTableDoc) : null);
    });
    return () => unsub();
  }, [tableId]);

  // ── Game doc ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tableId) return;
    const unsub = onSnapshot(doc(db, 'tambolaGames', tableId), (snap) => {
      setGame(snap.exists() ? (snap.data() as TambolaGameDoc) : null);
    });
    return () => unsub();
  }, [tableId]);

  // ── Mera private ticket ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!tableId || !myUid) return;
    const unsub = onSnapshot(
      doc(db, 'tambolaGames', tableId, 'private', myUid),
      (snap) => {
        if (snap.exists()) setTicket(snap.data().grid as number[][]);
      }
    );
    return () => unsub();
  }, [tableId, myUid]);

  // ── Auto-start: 2+ players pe koi bhi client start fire kare ───────────────
  useEffect(() => {
    if (!tableId || !table || startFiredRef.current) return;
    if (table.status !== 'waiting') return;
    if ((table.players?.length || 0) < MIN_PLAYERS) return;
    if (!table.players?.includes(myUid)) return;

    startFiredRef.current = true;
    tambolaApi.start(tableId).catch(() => {
      startFiredRef.current = false; // retry allowed on next snapshot
    });
  }, [table, tableId, myUid]);

  // ── Number-call trigger: nextCallAt pe anchored (server verify karta hai) ──
  useEffect(() => {
    if (callTimerRef.current) { clearTimeout(callTimerRef.current); callTimerRef.current = null; }
    if (!tableId || !game || game.status !== 'playing') return;
    if (!game.players?.includes(myUid)) return;

    const delay = Math.max(0, (game.nextCallAt || 0) - Date.now());
    callTimerRef.current = setTimeout(() => {
      tambolaApi.call(tableId).catch(() => { /* koi aur client kar dega */ });
    }, delay + 150); // thoda jitter — sab clients ek saath na maare

    return () => {
      if (callTimerRef.current) clearTimeout(callTimerRef.current);
    };
  }, [game?.nextCallAt, game?.status, tableId, myUid]);

  // ── Visual countdown (1s tick) ──────────────────────────────────────────────
  useEffect(() => {
    if (!game || game.status !== 'playing') return;
    const iv = setInterval(() => {
      setCountdown(Math.max(0, Math.ceil(((game.nextCallAt || 0) - Date.now()) / 1000)));
    }, 250);
    return () => clearInterval(iv);
  }, [game?.nextCallAt, game?.status]);

  const called = useMemo(
    () => new Set<number>(game?.calledNumbers || []),
    [game?.calledNumbers]
  );

  const handleClaim = async (key: PrizeKey) => {
    if (!tableId || claiming) return;
    setClaiming(key);
    try {
      const r = await tambolaApi.claim(tableId, key);
      toast.success(`${PRIZE_LABELS[key]} claimed! ₹${r.amount} won 🎉`);
    } catch (e: any) {
      toast.error(e.message || 'Claim failed');
    } finally {
      setClaiming(null);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (!table && !game) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080512] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  // ── Waiting room ────────────────────────────────────────────────────────────
  if (!game && table) {
    const players = table.players || [];
    return (
      <div className="min-h-screen bg-[#080512] px-4 py-6 text-white">
        <div className="mx-auto max-w-md">
          <button
            onClick={() => navigate('/games/tambola')}
            className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Lobby
          </button>

          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10">
              <Users className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-black">Waiting for players…</h2>
            <p className="mt-1 text-sm text-gray-400">
              Game auto-starts at {MIN_PLAYERS}+ players
            </p>
            <p className="mt-3 text-2xl font-black text-emerald-400">
              {players.length}/{table.maxPlayers || 10}
            </p>

            <div className="mt-4 space-y-2">
              {players.map((p) => (
                <div
                  key={p}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold"
                >
                  {table.playerNames?.[p] || 'Player'}
                  {p === myUid && <span className="ml-2 text-xs text-emerald-400">(You)</span>}
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
              <Coins className="h-3.5 w-3.5 text-yellow-400" />
              Prize pool: ₹{table.prizePool || 0}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!game) return null;

  const finished = game.status === 'finished';
  const last5 = (game.calledNumbers || []).slice(-6, -1).reverse();

  // ── Main game screen ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080512] px-3 py-4 text-white">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/games/tambola')}
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Lobby
          </button>
          <div className="flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-400">
            <Trophy className="h-3.5 w-3.5" /> Pool ₹{game.prizePool}
          </div>
        </div>

        {/* Current number */}
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            {finished ? 'Game Over' : `Next number in ${countdown}s`}
          </p>

          <AnimatePresence mode="popLayout">
            <motion.div
              key={game.currentNumber ?? 'none'}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className="mx-auto my-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-400 bg-gradient-to-br from-emerald-500 to-green-600 text-4xl font-black shadow-lg shadow-emerald-500/30"
            >
              {game.currentNumber ?? '—'}
            </motion.div>
          </AnimatePresence>

          {/* Last called strip */}
          <div className="flex items-center justify-center gap-2">
            {last5.map((n) => (
              <div
                key={n}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-xs font-bold text-gray-300"
              >
                {n}
              </div>
            ))}
            {last5.length === 0 && (
              <span className="text-xs text-gray-600">Numbers will appear here</span>
            )}
          </div>

          <p className="mt-2 text-[10px] text-gray-500">
            {game.calledNumbers?.length || 0}/90 called
          </p>
        </div>

        {/* My ticket — AUTO-MARKED */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-xs font-black uppercase tracking-wide text-gray-400">
              My Ticket
            </p>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
              <Sparkles className="h-3 w-3" /> Auto-marked
            </span>
          </div>

          {ticket ? (
            <div className="space-y-1">
              {ticket.map((row, r) => (
                <div key={r} className="grid grid-cols-9 gap-1">
                  {row.map((n, c) => {
                    const marked = n > 0 && called.has(n);
                    return (
                      <div
                        key={c}
                        className={`flex aspect-square items-center justify-center rounded-lg text-xs font-black transition-all sm:text-sm ${
                          n === 0
                            ? 'bg-white/[0.02]'
                            : marked
                              ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow shadow-emerald-500/30'
                              : 'border border-white/10 bg-black/25 text-gray-200'
                        }`}
                      >
                        {n > 0 ? n : ''}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            </div>
          )}
        </div>

        {/* Claims */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-3">
          <p className="mb-2 px-1 text-xs font-black uppercase tracking-wide text-gray-400">
            Prizes — tap to claim
          </p>
          <div className="space-y-2">
            {PRIZE_ORDER.map((key) => {
              const prize = game.prizes?.[key];
              if (!prize) return null;
              const claimedByMe = prize.claimedBy === myUid;
              const claimed = !!prize.claimedBy;
              const ready =
                !claimed && !finished && ticket
                  ? isPatternComplete(ticket, key, called)
                  : false;

              return (
                <button
                  key={key}
                  disabled={!ready || claiming !== null}
                  onClick={() => handleClaim(key)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition-all ${
                    claimed
                      ? 'border-white/10 bg-white/[0.03] opacity-70'
                      : ready
                        ? 'animate-pulse border-yellow-500/50 bg-yellow-500/15 hover:bg-yellow-500/25'
                        : 'border-white/10 bg-black/20'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-black ${ready ? 'text-yellow-400' : 'text-white'}`}>
                      {PRIZE_LABELS[key]}
                    </p>
                    {claimed && (
                      <p className="text-[11px] text-gray-500">
                        Won by {claimedByMe ? 'You 🎉' : prize.name || 'Player'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-emerald-400">₹{prize.amount}</span>
                    {claimed ? (
                      <CheckCircle2 className={`h-5 w-5 ${claimedByMe ? 'text-emerald-400' : 'text-gray-600'}`} />
                    ) : claiming === key ? (
                      <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
                    ) : ready ? (
                      <span className="rounded-full bg-yellow-500 px-2.5 py-1 text-[10px] font-black text-black">
                        CLAIM
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Number board 1-90 */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-3">
          <p className="mb-2 px-1 text-xs font-black uppercase tracking-wide text-gray-400">
            Board
          </p>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 90 }, (_, i) => i + 1).map((n) => (
              <div
                key={n}
                className={`flex aspect-square items-center justify-center rounded-md text-[10px] font-bold transition-all ${
                  n === game.currentNumber
                    ? 'bg-yellow-500 text-black'
                    : called.has(n)
                      ? 'bg-emerald-600/70 text-white'
                      : 'bg-white/[0.04] text-gray-600'
                }`}
              >
                {n}
              </div>
            ))}
          </div>
        </div>

        {/* Finished overlay */}
        {finished && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-yellow-500/25 bg-yellow-500/10 p-5 text-center"
          >
            <Trophy className="mx-auto mb-2 h-8 w-8 text-yellow-400" />
            <h3 className="text-lg font-black">Game Over!</h3>
            <p className="mt-1 text-sm text-gray-400">
              Winnings are credited to wallets automatically
            </p>
            <button
              onClick={() => navigate('/games/tambola')}
              className="mt-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-3 text-sm font-black text-black"
            >
              Back to Lobby
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TambolaGame;
