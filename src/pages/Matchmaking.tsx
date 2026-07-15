import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Clock,
  X,
  Zap,
  Trophy,
  Loader2,
  Wallet,
  ShieldCheck,
  Coins,
  Swords,
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import {
  joinMatchmakingQueue,
  cancelMatchmaking,
  findMatch,
  subscribeMatchmakingQueue,
} from '../firebase/games';
import { walletService } from '../firebase/walletService';
import { calculateUsableBalance, formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

const ENTRY_FEES = [10, 20, 50, 100, 200, 500];

export const Matchmaking: React.FC = () => {
  const { firebaseUser, user, wallet } = useAuth();
  const navigate = useNavigate();

  const [selectedFee, setSelectedFee] = useState<number | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [waitTime, setWaitTime] = useState(0);
  const [onlinePlayers, setOnlinePlayers] = useState(0);

  const matchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProcessing = useRef(false);
  const selectedFeeRef = useRef<number | null>(null);

  const usableBalance = wallet ? calculateUsableBalance(wallet) : 0;

  const clearTimers = () => {
    if (matchIntervalRef.current) clearInterval(matchIntervalRef.current);
    if (waitTimerRef.current) clearInterval(waitTimerRef.current);
  };

  // Subscribe to online players count
  useEffect(() => {
    const q = query(collection(db, 'users'), where('isOnline', '==', true));
    const unsub = onSnapshot(q, (snap) => setOnlinePlayers(snap.size));
    return () => unsub();
  }, []);

  // Subscribe to queue status
  useEffect(() => {
    if (!queueId) return;

    const unsub = subscribeMatchmakingQueue(queueId, (entry) => {
      if (!entry) return;

      if (entry.status === 'MATCHED' && (entry as any).roomId) {
        clearTimers();
        toast.success('🎮 Match found! Entering game room...');
        setTimeout(() => {
          navigate(`/game-room/${(entry as any).roomId}`);
        }, 1500);
      }
    });

    return () => unsub();
  }, [queueId, navigate]);

  const startMatchPolling = useCallback((myQueueId: string, fee: number, uid: string) => {
    matchIntervalRef.current = setInterval(async () => {
      if (isProcessing.current) return;
      isProcessing.current = true;
      try {
        const roomId = await findMatch(uid, myQueueId, fee, 'CARD_GAME');
        if (roomId) {
          clearTimers();
        }
      } catch (_e) {
        // ignore
      } finally {
        isProcessing.current = false;
      }
    }, 3000);
  }, []);

  const findGame = async () => {
    if (!firebaseUser || !user || !selectedFee) return;

    if (usableBalance < selectedFee) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const id = await joinMatchmakingQueue(
        firebaseUser.uid,
        user.name,
        user.photoURL || '',
        selectedFee,
        'CARD_GAME'
      );

      await walletService.addfund(
        firebaseUser.uid,
        selectedFee,
        'ENTRY FEE',
        `Card Battle entry fee - ₹${selectedFee}`
      );

      selectedFeeRef.current = selectedFee;
      setQueueId(id);
      setSearching(true);
      setWaitTime(0);

      waitTimerRef.current = setInterval(() => {
        setWaitTime((p) => p + 1);
      }, 1000);

      startMatchPolling(id, selectedFee, firebaseUser.uid);
      toast.success('Looking for opponent...');
    } catch (err: any) {
      toast.error(err.message || 'Failed to join queue');
    } finally {
      setLoading(false);
    }
  };

  const cancelSearch = async () => {
    if (!queueId) return;
    clearTimers();

    try {
      await cancelMatchmaking(queueId);

      const fee = selectedFeeRef.current;
      if (fee && firebaseUser) {
        await walletService.addFund(
          firebaseUser.uid,
          fee,
          'depositBalance',
          'Card Battle - Matchmaking cancelled refund',
          'REFUND'
        );
      }

      setQueueId(null);
      setSearching(false);
      setWaitTime(0);
      selectedFeeRef.current = null;
      toast.success('Matchmaking cancelled. Entry fee refunded.');
    } catch (_e) {
      toast.error('Failed to cancel');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, []);

  const formatWaitTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080512] text-white">
      {/* Background glow */}
      <div className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-56 -left-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -right-24 h-72 w-72 rounded-full bg-yellow-500/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-5 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent p-4 shadow-2xl sm:p-6"
        >
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10">
                <Swords className="h-7 w-7 text-blue-400" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-white sm:text-3xl">
                  Card Battle
                </h2>
                <p className="mt-1 text-xs text-gray-400 sm:text-sm">
                  2-player card comparison game · Find a real opponent
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-gray-500">
                  Online
                </p>
                <p className="flex items-center justify-center gap-1 text-lg font-black text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {onlinePlayers}
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-gray-500">
                  Balance
                </p>
                <p className="text-lg font-black text-yellow-400">
                  {formatCurrency(usableBalance)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {!searching ? (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              className="mx-auto max-w-xl"
            >
              {/* Entry Fee Selection */}
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl sm:p-5">
                <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-indigo-500/10 blur-3xl" />

                <div className="relative space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10">
                      <Zap className="h-5 w-5 text-blue-400" />
                    </div>

                    <div>
                      <p className="font-black text-white">Select Entry Fee</p>
                      <p className="text-xs text-gray-500">
                        Choose your battle stake
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {ENTRY_FEES.map((fee) => {
                      const disabled = fee > usableBalance;
                      const active = selectedFee === fee;

                      return (
                        <motion.button
                          key={fee}
                          whileHover={!disabled ? { scale: 1.03, y: -2 } : undefined}
                          whileTap={!disabled ? { scale: 0.95 } : undefined}
                          onClick={() => setSelectedFee(fee)}
                          disabled={disabled}
                          className={`rounded-2xl border p-3 text-center transition-all ${
                            active
                              ? 'border-blue-400/60 bg-blue-500/20 shadow-lg shadow-blue-500/10'
                              : disabled
                                ? 'cursor-not-allowed border-white/5 bg-white/[0.02] opacity-40'
                                : 'border-white/10 bg-white/[0.04] hover:border-blue-500/30 hover:bg-white/[0.08]'
                          }`}
                        >
                          <div
                            className={`text-lg font-black ${
                              active ? 'text-blue-300' : 'text-white'
                            }`}
                          >
                            ₹{fee}
                          </div>

                          <div className="mt-1 text-[10px] font-medium text-gray-500">
                            Win ₹{(fee * 1.8).toFixed(0)}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs text-gray-500">Potential Win</span>
                    </div>
                    <p className="mt-1 text-base font-black text-emerald-400">
                      {selectedFee ? `₹${(selectedFee * 1.8).toFixed(0)}` : 'Select Fee'}
                    </p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={findGame}
                    disabled={!selectedFee || loading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-4 text-base font-black text-white transition-all hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5" />
                        Find Match
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="searching"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="mx-auto max-w-xl space-y-5"
            >
              <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent p-6 text-center shadow-2xl sm:p-10">
                <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-500/20 blur-3xl" />
                <div className="pointer-events-none absolute -left-16 -bottom-16 h-44 w-44 rounded-full bg-indigo-500/20 blur-3xl" />

                <div className="relative">
                  <div className="relative mx-auto mb-7 flex h-28 w-28 items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-400"
                    />

                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-4 rounded-full border-4 border-indigo-500/20 border-t-indigo-400"
                    />

                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-blue-500/25 bg-blue-500/10">
                      <Swords className="h-8 w-8 text-blue-400" />
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-white">
                    Finding Opponent...
                  </h3>

                  <p className="mt-2 text-sm text-gray-400">
                    Entry Fee:{' '}
                    <span className="font-bold text-yellow-400">
                      ₹{selectedFee}
                    </span>
                  </p>

                  <div className="mx-auto mt-5 flex w-fit items-center justify-center gap-2 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-yellow-400">
                    <Clock className="h-4 w-4" />
                    <span className="font-mono text-lg font-black">
                      {formatWaitTime(waitTime)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-400">
                    <Users className="h-4 w-4" />
                    <span>Searching among {onlinePlayers} online players</span>
                  </div>

                  <div className="mt-6 flex justify-center gap-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.45, 1, 0.45] }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          delay: i * 0.4,
                        }}
                        className="h-2 w-2 rounded-full bg-blue-400"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={cancelSearch}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 py-3 text-sm font-bold text-red-400 transition-all hover:bg-red-500/15"
              >
                <X className="h-4 w-4" />
                Cancel Matchmaking
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
