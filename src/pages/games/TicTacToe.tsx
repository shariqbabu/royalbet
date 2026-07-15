// src/pages/games/TicTacToe.tsx — 2 Player Live Tic Tac Toe with Lobby
// UI Theme Updated Only

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  LogOut,
  Plus,
  Users,
  Trophy,
  Clock,
  Loader2,
  ArrowLeft,
  Wallet,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { tttApi } from '../../firebase/ticTacToe';
import { calculateUsableBalance, formatCurrency } from '../../utils/helpers';
import { db } from '../../firebase/config';
import { collection, query, where, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';

// ─── Game Constants (must match backend tictactoe.ts) ─────────────────────────
const WIN_MULTIPLIER = 0.90;
const DRAW_REFUND    = 0.95;

// ─── Types ────────────────────────────────────────────────────────────────────
interface TTTPlayer {
  uid:      string;
  userName: string;
  symbol:   'X' | 'O';
}

interface TTTTable {
  id:              string;
  tableNumber:     number;
  entryFee:        number;
  hostUid:         string;
  players:         TTTPlayer[];
  board:           ('X' | 'O' | null)[];
  currentTurn:     'X' | 'O' | null;
  status:          'WAITING' | 'PLAYING' | 'FINISHED';
  winner:          'X' | 'O' | 'DRAW' | null;
  winLine:         number[] | null;
  payoutAttempted: boolean;
  createdAt:       any;
  updatedAt:       any;
}

// ─── Firestore Subscriptions ──────────────────────────────────────────────────
function subscribeTable(tableId: string, cb: (t: TTTTable) => void) {
  return onSnapshot(doc(db, 'ticTacToeTables', tableId), snap => {
    if (snap.exists()) cb({ id: snap.id, ...snap.data() } as TTTTable);
  });
}

function subscribeOpenTables(cb: (tables: TTTTable[]) => void) {
  const q = query(
    collection(db, 'ticTacToeTables'),
    where('status', 'in', ['WAITING', 'PLAYING']),
    orderBy('createdAt', 'desc'),
    limit(20),
  );
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as TTTTable)))
  );
}

function subscribeFinishedTables(count: number, cb: (tables: TTTTable[]) => void) {
  const q = query(
    collection(db, 'ticTacToeTables'),
    where('status', '==', 'FINISHED'),
    orderBy('updatedAt', 'desc'),
    limit(count),
  );
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as TTTTable)))
  );
}

// ── Types / Views ─────────────────────────────────────────────────────────────
type View = 'LOBBY' | 'GAME';

// ── Helpers ───────────────────────────────────────────────────────────────────
const FEE_LABEL: Record<number, string> = {
  10: 'Starter',
  20: 'Basic',
  50: 'Classic',
  100: 'Pro',
  200: 'Elite',
  500: 'VIP',
};

const statusBadge = (table: TTTTable, uid?: string) => {
  if (table.status === 'WAITING') {
    if (table.hostUid === uid) {
      return {
        text: 'Waiting...',
        cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25',
      };
    }

    return {
      text: 'Join Game',
      cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
    };
  }

  if (table.status === 'PLAYING') {
    const inGame = table.players.some((p) => p.uid === uid);

    if (inGame) {
      return {
        text: 'Resume',
        cls: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
      };
    }

    return {
      text: 'Ongoing',
      cls: 'text-gray-400 bg-white/[0.04] border-white/10',
    };
  }

  return {
    text: 'Finished',
    cls: 'text-gray-500 bg-white/[0.04] border-white/10',
  };
};

// ─── Board Cell ───────────────────────────────────────────────────────────────
const Cell: React.FC<{
  value: 'X' | 'O' | null;
  onClick: () => void;
  highlight: boolean;
  disabled: boolean;
}> = ({ value, onClick, highlight, disabled }) => (
  <motion.button
    whileHover={!disabled && !value ? { scale: 1.04, y: -2 } : {}}
    whileTap={!disabled && !value ? { scale: 0.94 } : {}}
    onClick={onClick}
    disabled={disabled || !!value}
    className={`
      aspect-square rounded-3xl border flex items-center justify-center text-4xl sm:text-5xl font-black
      transition-all duration-200 select-none
      ${
        highlight
          ? 'border-yellow-400 bg-yellow-400/10 shadow-lg shadow-yellow-400/20'
          : value
            ? 'border-white/15 bg-white/[0.05]'
            : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-pink-500/30 cursor-pointer'
      }
      ${disabled && !value ? 'cursor-not-allowed opacity-60' : ''}
    `}
  >
    <AnimatePresence mode="wait">
      {value === 'X' && (
        <motion.span
          key="x"
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0 }}
          className="text-pink-400 drop-shadow-[0_0_14px_rgba(244,114,182,0.45)]"
        >
          X
        </motion.span>
      )}

      {value === 'O' && (
        <motion.span
          key="o"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          className="text-cyan-400 drop-shadow-[0_0_14px_rgba(34,211,238,0.45)]"
        >
          O
        </motion.span>
      )}
    </AnimatePresence>
  </motion.button>
);

// ─── Game View ────────────────────────────────────────────────────────────────
const GameView: React.FC<{
  tableId: string;
  uid: string;
  userName: string;
  onBack: () => void;
}> = ({ tableId, uid, onBack }) => {
  const [table, setTable] = useState<TTTTable | null>(null);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    const unsub = subscribeTable(tableId, setTable);
    return () => unsub();
  }, [tableId]);

  const myPlayer = table?.players.find((p) => p.uid === uid);
  const opponent = table?.players.find((p) => p.uid !== uid);
  const mySymbol = myPlayer?.symbol ?? null;

  const isMyTurn = table?.currentTurn === mySymbol && table?.status === 'PLAYING';
  const isFinished = table?.status === 'FINISHED';
  const iWon = isFinished && table?.winner === mySymbol;
  const isDraw = isFinished && table?.winner === 'DRAW';
  const iLost = isFinished && table?.winner !== mySymbol && !isDraw;

  const handleMove = useCallback(
    async (index: number) => {
      if (!table || moving) return;

      setMoving(true);

      try {
        await tttApi.move(tableId, index);
      } catch (err: any) {
        toast.error(err.message || 'Move failed');
      } finally {
        setMoving(false);
      }
    },
    [table, moving, uid, tableId]
  );

  if (!table) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl">
          <Loader2 className="mx-auto mb-3 h-9 w-9 animate-spin text-pink-400" />
          <p className="text-sm text-gray-400">Loading game table...</p>
        </div>
      </div>
    );
  }

  const winAmount = Math.floor(table.entryFee * 2 * WIN_MULTIPLIER);
  const drawAmount = Math.floor(table.entryFee * DRAW_REFUND);

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-pink-500/20 via-purple-500/10 to-transparent p-4 shadow-2xl sm:p-5"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-pink-500/20 blur-3xl" />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={onBack}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </motion.button>

            <div className="min-w-0">
              <h2 className="truncate text-xl font-black text-white sm:text-2xl">
                Table #{table.tableNumber}
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                Entry: ₹{table.entryFee} · Prize: ₹{winAmount}
              </p>
            </div>
          </div>

          <div className="hidden rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-center sm:block">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">
              Prize
            </p>
            <p className="text-base font-black text-yellow-400">₹{winAmount}</p>
          </div>
        </div>
      </motion.div>

      {/* Waiting for opponent */}
      {table.status === 'WAITING' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center shadow-xl sm:p-8"
        >
          <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-yellow-500/10 blur-3xl" />

          <div className="relative">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-yellow-500/25 bg-yellow-500/10">
              <Users className="h-8 w-8 text-yellow-400" />
            </div>

            <p className="text-lg font-bold text-white">
              Opponent ka wait kar rahe hain
            </p>

            <p className="mt-2 text-sm text-gray-400">
              Table link share karo ya lobby se opponent aane do
            </p>

            <div className="mt-5 flex items-center justify-center gap-1.5">
              <div className="h-2 w-2 animate-bounce rounded-full bg-yellow-400" style={{ animationDelay: '0ms' }} />
              <div className="h-2 w-2 animate-bounce rounded-full bg-yellow-400" style={{ animationDelay: '150ms' }} />
              <div className="h-2 w-2 animate-bounce rounded-full bg-yellow-400" style={{ animationDelay: '300ms' }} />
            </div>

            {table.hostUid === uid && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={async () => {
                  try {
                    await tttApi.leave(tableId);
                    toast.success(`₹${table.entryFee} refund ho gaya!`);
                    onBack();
                  } catch (e: any) {
                    toast.error(e.message || 'Leave failed');
                  }
                }}
                className="mx-auto mt-6 flex items-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-5 py-2.5 text-sm font-bold text-red-400 transition-colors hover:bg-red-500/15"
              >
                <LogOut className="h-4 w-4" />
                Leave & Refund ₹{table.entryFee}
              </motion.button>
            )}
          </div>
        </motion.div>
      )}

      {/* Players row */}
      {table.status !== 'WAITING' && (
        <div className="grid grid-cols-2 gap-3">
          {(['X', 'O'] as const).map((sym) => {
            const player = table.players.find((p) => p.symbol === sym);
            const isMe = player?.uid === uid;
            const isTurn = table.currentTurn === sym && table.status === 'PLAYING';

            return (
              <motion.div
                key={sym}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative overflow-hidden rounded-3xl border p-4 text-center transition-all ${
                  isTurn
                    ? sym === 'X'
                      ? 'border-pink-500/50 bg-pink-500/10 shadow-lg shadow-pink-500/10'
                      : 'border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                    : 'border-white/10 bg-white/[0.04]'
                }`}
              >
                <div className={`mb-1 text-4xl font-black ${sym === 'X' ? 'text-pink-400' : 'text-cyan-400'}`}>
                  {sym}
                </div>

                <p className="truncate text-xs font-bold text-white">
                  {player ? (isMe ? 'You' : player.userName) : 'Waiting'}
                </p>

                {isTurn && (
                  <p className="mt-1 text-xs font-bold text-yellow-400">
                    Turn
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Board */}
      {table.status !== 'WAITING' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-white/10 bg-white/[0.04] p-3 shadow-2xl sm:p-4"
        >
          <div className="grid grid-cols-3 gap-3">
            {table.board.map((cell, i) => (
              <Cell
                key={i}
                value={cell}
                onClick={() => handleMove(i)}
                highlight={(table.winLine ?? []).includes(i)}
                disabled={!isMyTurn || moving || isFinished}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Status / Result */}
      <AnimatePresence>
        {isFinished && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className={`rounded-3xl border p-6 text-center shadow-xl ${
              iWon
                ? 'border-emerald-500/25 bg-emerald-500/10'
                : isDraw
                  ? 'border-yellow-500/25 bg-yellow-500/10'
                  : 'border-red-500/25 bg-red-500/10'
            }`}
          >
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border ${
                iWon
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
                  : isDraw
                    ? 'border-yellow-500/25 bg-yellow-500/10 text-yellow-400'
                    : 'border-red-500/25 bg-red-500/10 text-red-400'
              }`}
            >
              {iWon ? (
                <Trophy className="h-8 w-8" />
              ) : isDraw ? (
                <span className="text-xl font-black">=</span>
              ) : (
                <span className="text-xl font-black">X</span>
              )}
            </div>

            <p
              className={`text-xl font-black ${
                iWon
                  ? 'text-emerald-400'
                  : isDraw
                    ? 'text-yellow-400'
                    : 'text-red-400'
              }`}
            >
              {iWon ? 'Jeet Gaye!' : isDraw ? 'Draw!' : 'Haar Gaye'}
            </p>

            <p className="mt-2 text-sm text-gray-300">
              {iWon
                ? `+₹${winAmount} winning balance mein!`
                : isDraw
                  ? `₹${drawAmount} refund 95% mil gaya`
                  : `₹${table.entryFee} ka bet gaya`}
            </p>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="mx-auto mt-5 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/[0.1]"
            >
              <ArrowLeft className="h-4 w-4" />
              Lobby pe Wapas
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Turn indicator */}
      {table.status === 'PLAYING' && !isFinished && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center text-sm text-gray-400">
          {isMyTurn ? (
            <span className="font-bold text-yellow-400">
              Aapki baari hai — move karo!
            </span>
          ) : (
            <span>{opponent?.userName ?? 'Opponent'} ka wait kar rahe hain...</span>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Lobby View ───────────────────────────────────────────────────────────────
const LobbyView: React.FC<{
  uid: string;
  userName: string;
  usableBalance: number;
  onEnterGame: (tableId: string) => void;
}> = ({ uid, userName, usableBalance, onEnterGame }) => {
  const [tables, setTables] = useState<TTTTable[]>([]);
  const [recentGames, setRecentGames] = useState<TTTTable[]>([]);
  const [selectedFee, setSelectedFee] = useState<number>(50);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    const u1 = subscribeOpenTables(setTables);
    const u2 = subscribeFinishedTables(8, setRecentGames);

    return () => {
      u1();
      u2();
    };
  }, []);

  const myActiveTable = tables.find(
    (t) => t.players.some((p) => p.uid === uid) && t.status !== 'FINISHED'
  );

  const handleCreate = async () => {
    if (usableBalance < selectedFee) {
      toast.error(`Insufficient balance — ₹${selectedFee} chahiye`);
      return;
    }

    if (myActiveTable) {
      toast.error('Pehle apna active game complete karo');
      return;
    }

    setCreating(true);

    try {
      const id = await tttApi.create(selectedFee);
      toast.success(`Table create ho gaya! ₹${selectedFee} deduct`);
      onEnterGame(result.tableId);
    } catch (e: any) {
      toast.error(e.message || 'Table create nahi hua');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (table: TTTTable) => {
    if (table.players.some((p) => p.uid === uid)) {
      onEnterGame(table.id);
      return;
    }

    if (usableBalance < table.entryFee) {
      toast.error(`Insufficient balance — ₹${table.entryFee} chahiye`);
      return;
    }

    setJoiningId(table.id);

    try {
      await tttApi.join(table.id);
      toast.success(`Game join kiya! ₹${table.entryFee} deduct`);
      onEnterGame(table.id);
    } catch (e: any) {
      toast.error(e.message || 'Join nahi hua');
    } finally {
      setJoiningId(null);
    }
  };

  const openTables = tables.filter((t) => t.status === 'WAITING');
  const playingTables = tables.filter((t) => t.status === 'PLAYING');

  return (
    <div className="space-y-5 pb-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-pink-500/20 via-purple-500/10 to-transparent p-4 shadow-2xl sm:p-6"
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-pink-500/25 bg-pink-500/10">
              <span className="text-lg font-black text-pink-400">XO</span>
            </div>

            <div>
              <h2 className="text-2xl font-black text-white sm:text-3xl">
                Tic Tac Toe
              </h2>
              <p className="mt-1 text-xs text-gray-400 sm:text-sm">
                2 player live battle · Create or join a table
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-center">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">
              Usable Balance
            </p>
            <p className="text-lg font-black text-yellow-400">
              {formatCurrency(usableBalance)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center shadow-lg">
          <p className="text-lg font-black text-emerald-400 sm:text-xl">
            {openTables.length}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-500">
            Open
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center shadow-lg">
          <p className="text-lg font-black text-blue-400 sm:text-xl">
            {playingTables.length}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-500">
            Live
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center shadow-lg">
          <p className="text-lg font-black text-yellow-400 sm:text-xl">
            {recentGames.length}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-500">
            Results
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Active game quick-resume */}
          {myActiveTable && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-3xl border border-blue-500/25 bg-blue-500/10 p-4 shadow-xl"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-500/20 blur-3xl" />

              <div className="relative flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-blue-400">
                    Active Game Hai
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Table #{myActiveTable.tableNumber} · ₹{myActiveTable.entryFee}
                  </p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onEnterGame(myActiveTable.id)}
                  className="rounded-2xl border border-blue-500/30 bg-blue-500/15 px-4 py-2 text-sm font-bold text-blue-300 transition-colors hover:bg-blue-500/20"
                >
                  Resume
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Create Table */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl sm:p-5">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-yellow-500/10 blur-3xl" />

            <div className="relative space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-yellow-500/20 bg-yellow-500/10">
                  <Plus className="h-5 w-5 text-yellow-400" />
                </div>

                <div>
                  <p className="font-black text-white">Naya Table Banao</p>
                  <p className="text-xs text-gray-500">
                    Entry fee choose karke table create karo
                  </p>
                </div>
              </div>

              {/* Fee selection */}
              <div>
                <p className="mb-2 text-xs text-gray-400">Entry Fee</p>

                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(FEE_LABEL).map(Number)).map((fee) => {
                    const canAfford = usableBalance >= fee;

                    return (
                      <motion.button
                        key={fee}
                        whileTap={{ scale: 0.93 }}
                        onClick={() => canAfford && setSelectedFee(fee)}
                        className={`rounded-2xl border py-3 text-sm font-bold transition-all ${
                          selectedFee === fee
                            ? 'border-yellow-500/50 bg-yellow-500/15 text-yellow-400 shadow-lg shadow-yellow-500/10'
                            : canAfford
                              ? 'border-white/10 bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] hover:border-yellow-500/25'
                              : 'cursor-not-allowed border-white/5 bg-white/[0.02] text-gray-600'
                        }`}
                      >
                        <div>₹{fee}</div>
                        <div className="mt-0.5 text-[10px] font-normal opacity-70">
                          {FEE_LABEL[fee]}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
                {/* Prize info */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-1 py-3">
                  <div className="font-black text-emerald-400">
                    ₹{Math.floor(selectedFee * 2 * WIN_MULTIPLIER)}
                  </div>
                  <div className="mt-0.5 text-gray-500">Win</div>
                </div>

                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-1 py-3">
                  <div className="font-black text-yellow-400">
                    ₹{Math.floor(selectedFee * DRAW_REFUND)}
                  </div>
                  <div className="mt-0.5 text-gray-500">Draw</div>
                </div>

                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-1 py-3">
                  <div className="font-black text-red-400">₹0</div>
                  <div className="mt-0.5 text-gray-500">Lose</div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreate}
                disabled={creating || usableBalance < selectedFee || !!myActiveTable}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 py-3 text-sm font-black text-black transition-all hover:from-yellow-400 hover:to-orange-400 disabled:opacity-40"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? 'Bana rahe hain...' : `₹${selectedFee} Entry — Table Banao`}
              </motion.button>

              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-500">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Fair 2-player match with instant result settlement.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Open Tables */}
          {openTables.length > 0 && (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-bold text-white">
                <Users className="h-4 w-4 text-emerald-400" />
                Join Tables ({openTables.length})
              </p>

              {openTables.map((table) => {
                const isMe = table.players.some((p) => p.uid === uid);
                const badge = statusBadge(table, uid);
                const canAfford = usableBalance >= table.entryFee;
                const isJoining = joiningId === table.id;

                return (
                  <motion.div
                    key={table.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl transition-all hover:border-emerald-500/30"
                  >
                    <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-emerald-500/10 blur-3xl" />

                    <div className="relative flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-black text-white">
                            Table #{table.tableNumber}
                          </p>

                          {isMe && (
                            <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                              You
                            </span>
                          )}
                        </div>

                        <p className="mt-1 truncate text-xs text-gray-400">
                          {table.players[0]?.userName} · ₹{table.entryFee} entry
                        </p>

                        <p className="mt-1 text-xs font-bold text-emerald-400">
                          Win ₹{Math.floor(table.entryFee * 2 * WIN_MULTIPLIER)}
                        </p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={() => handleJoin(table)}
                        disabled={(!isMe && (!canAfford || !!myActiveTable)) || isJoining}
                        className={`flex items-center gap-1.5 rounded-2xl border px-4 py-2 text-xs font-bold transition-all disabled:opacity-40 ${badge.cls}`}
                      >
                        {isJoining && <Loader2 className="h-3 w-3 animate-spin" />}
                        {badge.text}
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Ongoing games */}
          {playingTables.length > 0 && (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-bold text-gray-400">
                <Clock className="h-4 w-4" />
                Live Games ({playingTables.length})
              </p>

              {playingTables.map((table) => {
                const isMe = table.players.some((p) => p.uid === uid);
                const badge = statusBadge(table, uid);

                return (
                  <div
                    key={table.id}
                    className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 opacity-80"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">
                          Table #{table.tableNumber}
                          {isMe && (
                            <span className="ml-2 text-xs text-blue-400">
                              You are in this
                            </span>
                          )}
                        </p>

                        <p className="mt-1 truncate text-xs text-gray-500">
                          {table.players.map((p) => p.userName).join(' vs ')} · ₹{table.entryFee}
                        </p>
                      </div>

                      {isMe ? (
                        <motion.button
                          whileTap={{ scale: 0.93 }}
                          onClick={() => onEnterGame(table.id)}
                          className={`rounded-2xl border px-4 py-2 text-xs font-bold ${badge.cls}`}
                        >
                          {badge.text}
                        </motion.button>
                      ) : (
                        <span className={`rounded-2xl border px-3 py-1.5 text-xs ${badge.cls}`}>
                          {badge.text}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {tables.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-pink-500/20 bg-pink-500/10">
                <span className="font-black text-pink-400">XO</span>
              </div>
              <p className="text-sm font-semibold text-gray-300">
                Koi table nahi hai
              </p>
              <p className="mt-1 text-xs text-gray-600">
                Pehla table banao aur battle start karo.
              </p>
            </div>
          )}
          {/* Recent Results */}
          {recentGames.length > 0 && (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-bold text-gray-400">
                <Trophy className="h-4 w-4 text-yellow-400" />
                Recent Results
              </p>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl">
                {recentGames.map((g) => {
                  const winnerPlayer = g.players.find((p) => p.symbol === g.winner);

                  return (
                    <div
                      key={g.id}
                      className="flex items-center justify-between gap-3 border-b border-white/5 py-2 text-xs last:border-0"
                    >
                      <span className="text-gray-400">
                        Table #{g.tableNumber} · ₹{g.entryFee}
                      </span>

                      <span
                        className={
                          g.winner === 'DRAW'
                            ? 'font-bold text-yellow-400'
                            : 'font-bold text-emerald-400'
                        }
                      >
                        {g.winner === 'DRAW'
                          ? 'Draw'
                          : `${winnerPlayer?.userName ?? g.winner} won`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Root Component ───────────────────────────────────────────────────────────
  const TicTacToe: React.FC = () => {
  const { firebaseUser, user, wallet } = useAuth();
  const [view, setView] = useState<View>('LOBBY');
  const [activeTableId, setActiveTableId] = useState<string | null>(null);

  const usableBalance = wallet ? calculateUsableBalance(wallet) : 0;

  const handleEnterGame = (tableId: string) => {
    setActiveTableId(tableId);
    setView('GAME');
  };

  const handleBackToLobby = () => {
    setActiveTableId(null);
    setView('LOBBY');
  };

  if (!firebaseUser) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080512] px-4 text-white">
        <div className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-pink-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl">
          <Wallet className="mx-auto mb-3 h-10 w-10 text-yellow-400" />
          <p className="font-bold text-white">Login required</p>
          <p className="mt-1 text-sm text-gray-400">Login karo pehle!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080512] text-white">
      <div className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-pink-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-56 -left-24 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -right-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="relative mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
        <AnimatePresence mode="wait">
          {view === 'LOBBY' ? (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <LobbyView
                uid={firebaseUser.uid}
                userName={user?.name || 'Player'}
                usableBalance={usableBalance}
                onEnterGame={handleEnterGame}
              />
            </motion.div>
          ) : (
            <motion.div
              key="game"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {activeTableId && (
                <GameView
                  tableId={activeTableId}
                  uid={firebaseUser.uid}
                  userName={user?.name || 'Player'}
                  onBack={handleBackToLobby}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    );
};
export default TicTacToe;
