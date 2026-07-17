import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import CardDisplay from '../../components/games/CardDisplay';
import { WinCelebration } from '../../components/games/WinCelebration';
import { haptic } from '../../utils/haptics';
import {
  startGame,
  pickFromDrawPile,
  pickFromDiscardPile,
  discardCard,
  updatePlayerGroups,
  declareWin,
  autoDiscard,
  cleanupTable,
  leaveTable,
  validateDeclare,
  isValidPair,
  subscribeMyHand,
  FULL_DECK,
} from '../../firebase/JokerPair';

import type {
  JokerPairGameState,
  GameCard,
  PlayerGroup,
  MyPrivateState,
} from '../../firebase/JokerPair';
import {
  Crown,
  Clock,
  Zap,
  Trophy,
  Check,
  X,
  Loader2,
  LogOut,
  Lock,
  Unlock,
  Trash2,
  GripVertical,
  Sparkles,
  ArrowDown,
  Wallet,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CardObj {
  id: string;
  rank: string;
  suit: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUIT_FULL: Record<string, string> = {
  h: 'hearts',
  d: 'diamonds',
  c: 'clubs',
  s: 'spades',
};

function parseCardId(id: string): CardObj {
  if (!id || id.length < 2) return { id: '', rank: '', suit: 'spades' };
  const suitChar = id[id.length - 1];
  const rank = id.slice(0, -1);
  return { id, rank, suit: SUIT_FULL[suitChar] || 'spades' };
}

function cardToDisplayStr(id: string): string {
  if (!id || id.length < 2) return '';
  return id;
}

// ─── Timer Bar ────────────────────────────────────────────────────────────────

const TimerBar = ({
  turnStartedAt,
  duration,
  isMyTurn,
}: {
  turnStartedAt: number;
  duration: number;
  isMyTurn: boolean;
}) => {
  const [pct, setPct] = useState(100);
  const [secs, setSecs] = useState(duration);

  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - turnStartedAt) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      setPct((remaining / duration) * 100);
      setSecs(Math.ceil(remaining));
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [turnStartedAt, duration]);

  const color =
    pct > 50
      ? 'from-emerald-400 to-green-500'
      : pct > 25
      ? 'from-amber-400 to-yellow-500'
      : 'from-red-400 to-rose-500';

  const secsColor = pct > 50 ? 'text-emerald-400' : pct > 25 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 flex-1 bg-white/5 rounded-full overflow-hidden backdrop-blur-sm">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3, ease: 'linear' }}
        />
        {pct < 25 && isMyTurn && (
          <motion.div
            className="absolute inset-0 bg-red-500/20 rounded-full"
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </div>
      <span className={`text-[11px] font-black tabular-nums w-8 text-right ${secsColor} ${
        pct < 25 && isMyTurn ? 'animate-pulse' : ''
      }`}>
        {secs}s
      </span>
    </div>
  );
};

// ─── Draggable Card ───────────────────────────────────────────────────────────

const DraggableCard = ({
  cardId,
  isSelected,
  isInGroup,
  isJoker,
  isMyTurn,
  onSelect,
  onDragStart,
}: {
  cardId: string;
  isSelected: boolean;
  isInGroup: boolean;
  isJoker: boolean;
  isMyTurn: boolean;
  onSelect: () => void;
  onDragStart: (cardId: string) => void;
}) => {
  // Arrange karna (select/drag) hamesha allowed — sirf discard turn pe hota hai.
  // Mobile pe drag nahi chalta, isliye tap-select → slot-tap primary flow hai.
  const interactive = !isInGroup;
  return (
    <motion.div
      layout
      draggable={interactive}
      onDragStart={(e) => {
        if (!interactive) return;
        const ev = e as any;
        ev.dataTransfer?.setData?.('text/plain', cardId);
        onDragStart(cardId);
      }}
      onClick={onSelect}
      whileHover={interactive ? { y: -4, scale: 1.05 } : {}}
      whileTap={interactive ? { scale: 0.95 } : {}}
      className={`relative cursor-pointer transition-all duration-200 select-none ${
        isSelected
          ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-[#080810] rounded-lg -translate-y-3 scale-105 z-10'
          : ''
      } ${isInGroup ? 'opacity-30 pointer-events-none grayscale' : ''}`}
    >
      <CardDisplay card={cardToDisplayStr(cardId)} size="md" isJoker={isJoker} />
      {isJoker && (
        <motion.div
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Sparkles size={8} className="text-white" />
        </motion.div>
      )}
    </motion.div>
  );
};

// ─── Pair Slot with Drop Zone ─────────────────────────────────────────────────

const PairSlot = ({
  index,
  cards,
  locked,
  onDrop,
  onRemove,
  onToggleLock,
  jokerRank,
  allCards,
  isDragOver,
  onDragEnter,
  onDragLeave,
  onDragDropHandler,
  canTapPlace,
  onTapPlace,
}: {
  index: number;
  cards: string[];
  locked: boolean;
  onDrop: (slotIndex: number, cardId: string) => void;
  onRemove: (slotIndex: number, cardId: string) => void;
  onToggleLock: (slotIndex: number) => void;
  jokerRank: string | null;
  allCards: GameCard[];
  isDragOver: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDragDropHandler: (e: React.DragEvent) => void;
  canTapPlace: boolean;
  onTapPlace: () => void;
}) => {
  const isComplete = cards.length === 2;
  const isValid =
    isComplete && isValidPair(cards[0], cards[1], jokerRank, allCards);
  // Mobile flow: card select karke slot tap karo — drag optional hai
  const tapReady = canTapPlace && !locked && cards.length < 2;

  return (
    <motion.div
      onClick={() => { if (tapReady) onTapPlace(); }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!locked && cards.length < 2) onDragEnter();
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!locked && cards.length < 2) onDragEnter();
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        if (!locked) onDragDropHandler(e as any);
      }}
      layout
      className={`relative rounded-2xl border-2 transition-all duration-300 p-3 ${
        tapReady ? 'cursor-pointer' : ''
      } ${
        locked
          ? isValid
            ? 'border-emerald-500/60 bg-emerald-500/8 shadow-lg shadow-emerald-500/10'
            : 'border-red-500/40 bg-red-500/5'
          : isDragOver || tapReady
          ? 'border-violet-400/70 bg-violet-500/15 scale-[1.02] shadow-lg shadow-violet-500/20'
          : isComplete
          ? isValid
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-orange-500/30 bg-orange-500/5'
          : 'border-dashed border-white/15 bg-white/[0.02]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/25">
            Pair {index + 1}
          </span>
          {isComplete && isValid && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-0.5 text-[9px] text-emerald-400 font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded-full"
            >
              <Check size={8} /> Valid
            </motion.span>
          )}
          {isComplete && !isValid && (
            <span className="flex items-center gap-0.5 text-[9px] text-orange-400 font-bold bg-orange-500/15 px-1.5 py-0.5 rounded-full">
              <X size={8} /> Invalid
            </span>
          )}
        </div>

        {isComplete && (
          <button
            onClick={() => onToggleLock(index)}
            className={`p-1 rounded-lg transition-all ${
              locked
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50'
            }`}
          >
            {locked ? <Lock size={12} /> : <Unlock size={12} />}
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="flex gap-2 min-h-[56px] items-center justify-center">
        {cards.map((cid) => (
          <motion.div
            key={cid}
            layout
            initial={{ scale: 0.5, opacity: 0, rotateY: 180 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="relative group"
          >
            <CardDisplay card={cardToDisplayStr(cid)} size="sm" />
            {!locked && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(index, cid); }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500/90 text-white flex items-center justify-center shadow-lg z-10 active:scale-90 transition-transform"
              >
                <X size={10} />
              </button>
            )}
          </motion.div>
        ))}

        {/* Empty slots */}
        {Array.from({ length: 2 - cards.length }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className={`w-10 h-14 rounded-xl border-2 border-dashed flex items-center justify-center transition-all ${
              isDragOver || tapReady
                ? 'border-violet-400/50 bg-violet-500/10'
                : 'border-white/10 bg-white/[0.02]'
            }`}
          >
            {isDragOver || tapReady ? (
              <motion.div
                animate={{ y: [0, 3, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <ArrowDown size={12} className="text-violet-400" />
              </motion.div>
            ) : (
              <span className="text-white/15 text-xs">+</span>
            )}
          </div>
        ))}
      </div>

      {/* Lock overlay */}
      {locked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 rounded-2xl bg-gradient-to-b from-transparent to-emerald-500/5 pointer-events-none"
        />
      )}
    </motion.div>
  );
};

// ─── Opponent Strip ───────────────────────────────────────────────────────────

const OpponentStrip = ({
  name,
  avatar,
  cardCount,
  isCurrentTurn,
  isHost,
}: {
  name: string;
  avatar: string;
  cardCount: number;
  isCurrentTurn: boolean;
  isHost: boolean;
}) => (
  <motion.div
    layout
    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border transition-all duration-300 ${
      isCurrentTurn
        ? 'border-violet-500/40 bg-gradient-to-r from-violet-500/10 to-purple-500/10 shadow-md shadow-violet-500/10'
        : 'border-white/5 bg-white/[0.02]'
    }`}
  >
    <div className="relative shrink-0">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold overflow-hidden ${
          isCurrentTurn
            ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30'
            : 'bg-gradient-to-br from-slate-700 to-slate-800'
        }`}
      >
        {avatar ? (
          <img src={avatar} alt={name} className="w-full h-full object-cover" />
        ) : (
          name[0]?.toUpperCase()
        )}
      </div>
      {isCurrentTurn && (
        <motion.span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-violet-500 rounded-full border-2 border-[#080810]"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      {isHost && (
        <span className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center border border-[#080810]">
          <Crown size={8} className="text-black" />
        </span>
      )}
    </div>

    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-white truncate">{name}</p>
      <p className="text-[10px] text-white/30 font-medium">{cardCount} cards</p>
    </div>

    <div className="flex gap-0.5 shrink-0">
      {Array.from({ length: Math.min(cardCount, 5) }, (_, i) => (
        <motion.div
          key={i}
          initial={{ rotateY: 180 }}
          animate={{ rotateY: 0 }}
          transition={{ delay: i * 0.05 }}
          className="w-3.5 h-5 bg-gradient-to-b from-indigo-600 to-indigo-800 rounded-sm border border-white/10"
        />
      ))}
      {cardCount > 5 && (
        <span className="text-[8px] text-white/25 self-center ml-0.5 font-bold">
          +{cardCount - 5}
        </span>
      )}
    </div>
  </motion.div>
);

// ─── Result Overlay ───────────────────────────────────────────────────────────

const ResultOverlay = ({
  game,
  myUid,
  onReturn,
}: {
  game: JokerPairGameState;
  myUid: string;
  onReturn: () => void;
}) => {
  const isWinner = game.winnerId === myUid;
  const winnerData = game.winnerId ? game.playerData[game.winnerId] : null;
  const commission = Math.floor(game.prizePool * 0.1);
  const winnerAmount = Math.floor(game.prizePool * 0.9);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-full max-w-sm bg-gradient-to-b from-[#12121f] to-[#0a0a15] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        <div className="relative px-5 pt-8 pb-6 text-center overflow-hidden">
          <div
            className={`absolute inset-0 ${
              isWinner
                ? 'bg-gradient-to-b from-yellow-500/20 via-amber-500/10 to-transparent'
                : 'bg-gradient-to-b from-red-500/10 to-transparent'
            }`}
          />
          {isWinner && (
            <>
              <motion.div
                className="absolute top-4 left-8 text-yellow-300/30 text-lg"
                animate={{ y: [-5, 5, -5], rotate: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                ✨
              </motion.div>
              <motion.div
                className="absolute top-6 right-10 text-yellow-300/30 text-sm"
                animate={{ y: [5, -5, 5], rotate: [0, -10, 0] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                ⭐
              </motion.div>
            </>
          )}
          <motion.div
            className="relative text-5xl mb-3"
            animate={
              isWinner ? { scale: [1, 1.1, 1], rotateZ: [0, 5, -5, 0] } : {}
            }
            transition={{ duration: 2, repeat: Infinity }}
          >
            {isWinner ? '🏆' : '😔'}
          </motion.div>
          <h2
            className={`relative text-2xl font-black ${
              isWinner ? 'text-yellow-400' : 'text-white/50'
            }`}
          >
            {isWinner ? 'Victory!' : 'Defeated'}
          </h2>
          {!isWinner && (
            <p className="relative text-sm text-white/30 mt-1">
              Better luck next time
            </p>
          )}
        </div>

        {winnerData && (
          <div className="px-5 pb-6 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-2xl border border-white/5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black overflow-hidden ${
                  isWinner
                    ? 'bg-gradient-to-br from-yellow-400 to-amber-600'
                    : 'bg-gradient-to-br from-slate-600 to-slate-700'
                }`}
              >
                {winnerData.avatar ? (
                  <img
                    src={winnerData.avatar}
                    alt={winnerData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  winnerData.name[0]?.toUpperCase()
                )}
              </div>
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">
                  Winner
                </p>
                <p className="text-sm font-bold text-white">
                  {winnerData.name}
                </p>
              </div>
              <Trophy size={18} className="ml-auto text-yellow-400" />
            </div>

            {game.winnerGroups && game.winnerGroups.length > 0 && (
              <div>
                <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2 font-medium">
                  Winning Pairs
                </p>
                <div className="space-y-2">
                  {game.winnerGroups.map((grp, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-xl"
                    >
                      <span className="text-[10px] text-white/20 w-12 font-medium">
                        Pair {i + 1}
                      </span>
                      <div className="flex gap-1.5">
                        {grp.cards.map((cid) => (
                          <CardDisplay
                            key={cid}
                            card={cardToDisplayStr(cid)}
                            size="xs"
                            isWinner
                          />
                        ))}
                      </div>
                      {game.jokerRank &&
                        grp.cards.some(
                          (c) => parseCardId(c).rank === game.jokerRank
                        ) && (
                          <span className="text-[8px] text-red-400 font-bold bg-red-500/10 px-1.5 py-0.5 rounded-full ml-auto">
                            JOKER
                          </span>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white/[0.02] rounded-2xl border border-white/5 p-3 space-y-2.5">
              {[
                {
                  label: 'Prize Pool',
                  value: `₹${game.prizePool}`,
                  cls: 'text-white font-bold',
                },
                {
                  label: 'Commission (10%)',
                  value: `-₹${commission}`,
                  cls: 'text-red-400',
                },
                {
                  label: 'Winner Gets',
                  value: `₹${winnerAmount}`,
                  cls: 'text-emerald-400 text-lg font-black',
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-xs text-white/35">{row.label}</span>
                  <span className={`text-sm ${row.cls}`}>{row.value}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 px-3 py-2.5 bg-violet-500/5 border border-violet-500/15 rounded-xl">
              <Loader2 size={12} className="text-violet-400 animate-spin" />
              <p className="text-[11px] text-violet-300/60">
                Returning to lobby…
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ─── Leave Confirm Modal ──────────────────────────────────────────────────────

const LeaveConfirmModal = ({
  onConfirm,
  onCancel,
  busy,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) => (
  <motion.div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <motion.div
      className="w-full max-w-xs bg-gradient-to-b from-[#14142a] to-[#0a0a15] border border-white/10 rounded-3xl p-6 shadow-2xl"
      initial={{ scale: 0.85, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.85, opacity: 0, y: 20 }}
      transition={{ type: 'spring', damping: 22 }}
    >
      <div className="text-center mb-5">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <LogOut size={24} className="text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">Leave Table?</h3>
        <p className="text-xs text-white/35 leading-relaxed">
          Your entry fee will be refunded. The game will end for all players.
        </p>
      </div>
      <div className="flex gap-2.5">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-2xl border border-white/10 text-white/50 text-sm font-semibold hover:bg-white/5 transition-all active:scale-95"
        >
          Stay
        </button>
        <button
          onClick={onConfirm}
          disabled={busy}
          className="flex-1 py-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/25 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
        >
          {busy ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>
              <LogOut size={13} /> Leave
            </>
          )}
        </button>
      </div>
    </motion.div>
  </motion.div>
);

// ─── Main Game Component ──────────────────────────────────────────────────────

const JokerPairGame: React.FC = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [gameRaw, setGameRaw] = useState<JokerPairGameState | null>(null);
  const [tableInfo, setTableInfo] = useState<{ status: string; players: string[] } | null>(null);
  const [myPriv, setMyPriv] = useState<MyPrivateState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const [myGroups, setMyGroups] = useState<PlayerGroup[]>([
    { cards: [] as unknown as [string, string] },
    { cards: [] as unknown as [string, string] },
    { cards: [] as unknown as [string, string] },
  ]);

  const [lockedSlots, setLockedSlots] = useState<boolean[]>([
    false,
    false,
    false,
  ]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [draggingCard, setDraggingCard] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const myUid = user?.uid || '';

  // ── Firestore listener ───────────────────────────────────────────────────

  useEffect(() => {
    if (!tableId) return;
    const ref = doc(db, 'jokerPairGames', tableId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setGameRaw(snap.data() as JokerPairGameState);
      } else {
        // BUG FIX: purana game doc delete hone pe (cleanup) stale state clear
        // karo — pehle single player naye round mein aata to purane game ka
        // timer/screen dikh jata tha
        setGameRaw(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [tableId]);

  // ── Apna private hand (opponents ke hands ab server-side hidden hain) ────

  useEffect(() => {
    if (!tableId || !myUid) return;
    const unsub = subscribeMyHand(tableId, myUid, setMyPriv);
    return () => unsub();
  }, [tableId, myUid]);

  // ── Auto-start ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!tableId || !user) return;
    const tableRef = doc(db, 'jokerPairTables', tableId);
    const unsub = onSnapshot(tableRef, async (snap) => {
      if (!snap.exists()) { setTableInfo(null); return; }
      const t = snap.data();
      setTableInfo({ status: t.status || 'waiting', players: t.players || [] });
      if (t.status === 'waiting' && t.players?.length >= 2) {
        try {
          await startGame(tableId);
        } catch {}
      }
    });
    return () => unsub();
  }, [tableId, user]);

  // BUG FIX: game screen/timer sirf tab jab TABLE bhi playing ho aur game doc
  // valid ho. Pehle sirf game doc dekha jata tha — single player naye round
  // mein purane (stale) game doc ka timer dekh leta tha.
  const game = useMemo(() => {
    if (!gameRaw) return null;
    if (tableInfo && tableInfo.status === 'waiting') return null; // naya round — stale doc ignore
    if ((gameRaw.players?.length || 0) < 2) return null;          // single player pe game nahi
    return gameRaw;
  }, [gameRaw, tableInfo]);

  // ── Haptic on my turn ────────────────────────────────────────────────────
  // NOTE: yeh hook early-returns (loading / !game) se PEHLE hona zaroori hai,
  // warna hooks ki count render ke beech badal jaati hai → React error #310.
  const isMyTurn = !!game && game.currentTurnUid === myUid;
  useEffect(() => { if (isMyTurn) haptic('medium'); }, [isMyTurn]);

  // ── Auto-discard timer ───────────────────────────────────────────────────

  useEffect(() => {
    if (!game || game.status !== 'playing') return;
    if (game.currentTurnUid !== myUid) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    const elapsed = (Date.now() - game.turnStartedAt) / 1000;
    const duration = game.turnDuration || 60;
    const remaining = Math.max(0, duration - elapsed) * 1000;

    timerRef.current = setTimeout(async () => {
      try {
        await autoDiscard(tableId!);
      } catch {}
    }, remaining);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [game?.turnStartedAt, game?.currentTurnUid, myUid, tableId]);

  // ── Result + cleanup ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!game || game.status !== 'finished') return;
    setShowResult(true);

    const isWinner = game.winnerId === myUid;
    if (isWinner) {
      const pool = game.prizePool;
      const win = Math.floor(pool * 0.9);
      toast.success(`🏆 You won ₹${win}!`);
      haptic('win');
    } else {
      toast.error('Match lost. Better luck next time!');
    }

    const cleanup = setTimeout(async () => {
      try {
        await cleanupTable(tableId!);
      } catch {}
      navigate('/games/joker-pair');
    }, 5000);

    return () => clearTimeout(cleanup);
  }, [game?.status, game?.winnerId]);

  // ── Leave table ──────────────────────────────────────────────────────────

  const handleLeave = async () => {
    if (!tableId || leaveBusy) return;
    setLeaveBusy(true);
    try {
      await cleanupTable(tableId);
      toast.success('Entry fee refunded');
      navigate('/games/joker-pair');
    } catch (e: any) {
      toast.error(e.message || 'Failed to leave');
    } finally {
      setLeaveBusy(false);
      setShowLeaveModal(false);
    }
  };

  // ── Sync groups to Firestore ─────────────────────────────────────────────

  const syncGroups = useCallback(
    async (groups: PlayerGroup[]) => {
      if (!tableId || !myUid) return;
      try {
        await updatePlayerGroups(tableId, groups);
      } catch {}
    },
    [tableId, myUid]
  );

  // ── Add card to slot ─────────────────────────────────────────────────────

  const addCardToSlot = (slotIndex: number, cardId: string) => {
    if (lockedSlots[slotIndex]) return;
    setMyGroups((prev) => {
      const next = prev.map((g, i) => {
        if (i !== slotIndex) return g;
        if (g.cards.length >= 2) return g;
        if (g.cards.includes(cardId)) return g;
        const inOtherSlot = prev.some(
          (og, oi) => oi !== slotIndex && og.cards.includes(cardId)
        );
        if (inOtherSlot) return g;
        return { cards: [...g.cards, cardId] as [string, string] };
      });
      syncGroups(next);
      return next;
    });
    setSelectedCard(null);
    setDraggingCard(null);
    setDragOverSlot(null);
  };

  // ── Remove card from slot ────────────────────────────────────────────────

  const removeCardFromSlot = (slotIndex: number, cardId: string) => {
    if (lockedSlots[slotIndex]) return;
    setMyGroups((prev) => {
      const next = prev.map((g, i) => {
        if (i !== slotIndex) return g;
        return {
          cards: g.cards.filter((c) => c !== cardId) as unknown as [
            string,
            string,
          ],
        };
      });
      setLockedSlots((ls) => {
        const nls = [...ls];
        nls[slotIndex] = false;
        return nls;
      });
      syncGroups(next);
      return next;
    });
  };

  // ── Toggle lock ──────────────────────────────────────────────────────────

  const toggleLock = (slotIndex: number) => {
    setLockedSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = !next[slotIndex];
      return next;
    });
  };

  // ── Actions ──────────────────────────────────────────────────────────────

  const doPickDraw = async () => {
    if (!tableId || actionBusy) return;
    setActionBusy(true);
    try {
      await pickFromDrawPile(tableId);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionBusy(false);
    }
  };

  const doPickDiscard = async () => {
    if (!tableId || actionBusy) return;
    setActionBusy(true);
    try {
      await pickFromDiscardPile(tableId);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionBusy(false);
    }
  };

  const doDiscard = async () => {
    if (!tableId || actionBusy || !selectedCard) return;
    setActionBusy(true);
    try {
      await discardCard(tableId, selectedCard);
      setMyGroups((prev) =>
        prev.map((g, i) =>
          lockedSlots[i] ? g : { cards: [] as unknown as [string, string] }
        )
      );
      setSelectedCard(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionBusy(false);
    }
  };

  const doDeclare = async () => {
    if (!tableId || actionBusy) return;
    setActionBusy(true);
    try {
      const result = await declareWin(tableId);
      if (!result.valid) toast.error(result.reason || 'Invalid declare');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActionBusy(false);
    }
  };

  // ── Loading / no game ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center gap-4">
        <motion.div
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 size={24} className="text-white" />
        </motion.div>
        <p className="text-white/30 text-sm">Loading game…</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center gap-4 text-white">
        <motion.div
          className="text-5xl"
          animate={{ rotateY: [0, 360] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          🃏
        </motion.div>
        <p className="text-white/40 font-medium">Waiting for game to start…</p>
        <p className="text-white/20 text-xs">
          {tableInfo
            ? `${tableInfo.players.length}/2 players joined — starts at 2`
            : 'Players needed'}
        </p>

        {/* Leave & Refund */}
        <motion.button
          onClick={() => setShowLeaveModal(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/25 text-red-400 text-sm font-semibold hover:from-red-500/18 hover:to-orange-500/18 transition-all shadow-md shadow-red-500/5"
        >
          <Wallet size={15} />
          Leave & Refund
        </motion.button>

        {/* Modal is branch mein bhi mount hona zaroori hai — pehle button
            state set karta tha lekin modal render hi nahi hota tha */}
        <AnimatePresence>
          {showLeaveModal && (
            <LeaveConfirmModal
              onConfirm={handleLeave}
              onCancel={() => setShowLeaveModal(false)}
              busy={leaveBusy}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  // (isMyTurn upar hooks section mein hai — early returns se pehle)
  // Hand ab private subcollection se aata hai — main doc mein sirf counts
  const myHand = (myPriv?.hand || []).filter(
    (cid) => cid && cid.trim().length >= 2
  );
  const hasPicked = myHand.length === 6;
  const cardsInGroups = new Set(myGroups.flatMap((g) => g.cards));

  const groupsAreValid =
    myGroups.length === 3 &&
    myGroups.every((g) => g.cards.length === 2) &&
    validateDeclare(myHand, myGroups, game.jokerRank, FULL_DECK).valid;

  const canDeclare = isMyTurn && hasPicked && groupsAreValid;
  const opponents = game.players.filter((uid) => uid !== myUid);

  const validPairCount = myGroups.filter(
    (g) =>
      g.cards.length === 2 &&
      isValidPair(g.cards[0], g.cards[1], game.jokerRank, FULL_DECK)
  ).length;

  const topCard =
    game.discardPile.length > 0
      ? game.discardPile[game.discardPile.length - 1]
      : null;

  const turnDuration = game.turnDuration || 60;

  const selectedCardInGroup = selectedCard
    ? myGroups.some((g) => g.cards.includes(selectedCard))
    : false;

  const canDiscard =
    selectedCard && isMyTurn && hasPicked && !selectedCardInGroup;

  return (
    <>
      <div className="fixed inset-0 bg-[#080810] text-white flex flex-col overflow-hidden">
        {/* Ambient backgrounds */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#150a25_0%,_transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#0a1525_0%,_transparent_50%)]" />
        </div>

        <div className="relative flex flex-col flex-1 max-w-lg mx-auto w-full overflow-y-auto scrollbar-hide">
          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="sticky top-0 z-20 bg-[#080810]/90 backdrop-blur-xl border-b border-white/5 px-3 pt-3 pb-2">
            <div className="flex items-center gap-2 mb-2">
              {/* Leave */}
              <button
                onClick={() => setShowLeaveModal(true)}
                className="p-2 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400 hover:bg-red-500/15 active:scale-95 transition-all"
              >
                <LogOut size={14} />
              </button>

              {/* Joker display */}
              <div className="flex items-center gap-2 bg-white/[0.03] border border-white/8 rounded-xl px-3 py-1.5">
                <span className="text-[9px] text-white/25 uppercase tracking-wider font-medium">
                  Joker
                </span>
                {game.jokerCard ? (
                  <CardDisplay
                    card={cardToDisplayStr(game.jokerCard.id)}
                    size="xs"
                    isJoker
                  />
                ) : (
                  <div className="w-5 h-7 bg-white/5 rounded border border-white/10" />
                )}
                {game.jokerRank && (
                  <span className="text-xs font-black text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-md">
                    {game.jokerRank}
                  </span>
                )}
              </div>

              {/* Prize */}
              <div className="flex items-center gap-1.5 bg-yellow-500/8 border border-yellow-500/20 rounded-xl px-3 py-1.5">
                <Trophy size={12} className="text-yellow-400" />
                <span className="text-sm font-black text-yellow-400">
                  ₹{game.prizePool}
                </span>
              </div>

              <div className="flex-1" />

              {/* Turn badge */}
              <div
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 border text-xs font-bold ${
                  isMyTurn
                    ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                    : 'bg-white/[0.03] border-white/8 text-white/30'
                }`}
              >
                {isMyTurn ? (
                  <>
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    >
                      <Zap size={12} />
                    </motion.div>
                    Your Turn
                  </>
                ) : (
                  <>
                    <Clock size={12} />
                    <span className="truncate max-w-[60px]">
                      {
                        game.playerData[game.currentTurnUid]?.name?.split(
                          ' '
                        )[0]
                      }
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Timer */}
            <TimerBar
              turnStartedAt={game.turnStartedAt}
              duration={turnDuration}
              isMyTurn={isMyTurn}
            />
          </div>

          <div className="px-3 pt-3 pb-4 space-y-3">
            {/* ── Opponents ──────────────────────────────────────────── */}
            <div
              className={`grid gap-2 ${
                opponents.length === 1
                  ? 'grid-cols-1'
                  : opponents.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-3'
              }`}
            >
              {opponents.map((uid) => {
                const p = game.playerData[uid];
                if (!p) return null;
                return (
                  <OpponentStrip
                    key={uid}
                    name={p.name}
                    avatar={p.avatar}
                    cardCount={p.handCount ?? 0}
                    isCurrentTurn={game.currentTurnUid === uid}
                    isHost={uid === (game as any).hostId}
                  />
                );
              })}
            </div>

            {/* ── Draw & Discard Piles ────────────────────────────────── */}
            <div className="flex items-center justify-center gap-6 py-2">
              {/* Draw pile */}
              <div className="flex flex-col items-center gap-2">
                <motion.button
                  onClick={doPickDraw}
                  disabled={!isMyTurn || hasPicked || actionBusy}
                  whileHover={isMyTurn && !hasPicked ? { scale: 1.05 } : {}}
                  whileTap={isMyTurn && !hasPicked ? { scale: 0.95 } : {}}
                  className={`relative rounded-2xl transition-all ${
                    isMyTurn && !hasPicked
                      ? 'bg-gradient-to-b from-indigo-600 to-indigo-800 border-2 border-indigo-400/50 shadow-xl shadow-indigo-500/30 cursor-pointer'
                      : 'bg-gradient-to-b from-indigo-900/30 to-indigo-950/30 border-2 border-white/5 cursor-not-allowed opacity-40'
                  }`}
                  style={{ width: 56, height: 76 }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-3xl opacity-60">🂠</div>
                  </div>
                  <span className="absolute bottom-1.5 right-2 text-[10px] text-white/60 font-bold">
                    {game.drawCount ?? 0}
                  </span>
                  {isMyTurn && !hasPicked && (
                    <motion.div
                      className="absolute -inset-1 rounded-2xl border-2 border-indigo-400/30"
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                </motion.button>
                <span className="text-[10px] text-white/25 uppercase tracking-wider font-medium">
                  Draw
                </span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-white/10 font-bold text-xs">OR</span>
              </div>

              {/* Discard pile */}
              <div className="flex flex-col items-center gap-2">
                <motion.button
                  onClick={doPickDiscard}
                  disabled={!isMyTurn || hasPicked || !topCard || actionBusy}
                  whileHover={
                    isMyTurn && !hasPicked && topCard ? { scale: 1.05 } : {}
                  }
                  whileTap={
                    isMyTurn && !hasPicked && topCard ? { scale: 0.95 } : {}
                  }
                  className={`rounded-2xl transition-all flex items-center justify-center ${
                    isMyTurn && !hasPicked && topCard
                      ? 'ring-2 ring-amber-400/50 shadow-xl shadow-amber-500/20 cursor-pointer hover:ring-amber-400/70'
                      : 'cursor-not-allowed opacity-40'
                  }`}
                  style={{ width: 56, height: 76 }}
                >
                  {topCard ? (
                    <CardDisplay card={cardToDisplayStr(topCard)} size="md" />
                  ) : (
                    <div className="w-full h-full rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center text-white/15 text-[10px] font-medium">
                      Empty
                    </div>
                  )}
                </motion.button>
                <span className="text-[10px] text-white/25 uppercase tracking-wider font-medium">
                  Discard
                </span>
              </div>
            </div>

            {/* ── Pair Arrangement — hamesha visible, arrange kabhi bhi ── */}
            {myHand.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 20 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-white/25 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <GripVertical size={10} className="text-violet-400" />
                    {selectedCard && !selectedCardInGroup
                      ? 'Tap a slot to place card'
                      : 'Make 3 pairs — tap card, then slot'}
                  </p>
                  <div className="flex items-center gap-1">
                    {lockedSlots.filter(Boolean).length > 0 && (
                      <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
                        {lockedSlots.filter(Boolean).length} locked
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {myGroups.map((grp, i) => (
                    <PairSlot
                      key={i}
                      index={i}
                      cards={grp.cards as unknown as string[]}
                      locked={lockedSlots[i]}
                      onDrop={addCardToSlot}
                      onRemove={removeCardFromSlot}
                      onToggleLock={toggleLock}
                      jokerRank={game.jokerRank}
                      allCards={FULL_DECK}
                      isDragOver={dragOverSlot === i}
                      onDragEnter={() => setDragOverSlot(i)}
                      onDragLeave={() =>
                        setDragOverSlot((prev) => (prev === i ? null : prev))
                      }
                      onDragDropHandler={(e: React.DragEvent) => {
                        const cardId =
                          draggingCard ||
                          e.dataTransfer?.getData('text/plain');
                        if (cardId) addCardToSlot(i, cardId);
                        setDragOverSlot(null);
                      }}
                      canTapPlace={!!selectedCard && !selectedCardInGroup}
                      onTapPlace={() => {
                        if (selectedCard) addCardToSlot(i, selectedCard);
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── My Hand ──────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-white/25 uppercase tracking-wider font-bold">
                  Your Hand · {myHand.length} cards
                </p>
                <div className="flex items-center gap-2">
                  {/* Pair progress */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    validPairCount === 3
                      ? 'text-emerald-400 bg-emerald-500/15'
                      : 'text-white/30 bg-white/[0.04]'
                  }`}>
                    {validPairCount}/3 pairs
                  </span>
                  {isMyTurn && !hasPicked && (
                    <motion.span
                      className="text-[10px] text-amber-400 font-bold"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      Pick a card first ↑
                    </motion.span>
                  )}
                  {hasPicked && isMyTurn && !selectedCard && (
                    <motion.p
                      className="text-[10px] text-violet-400/70"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      Tap a card to discard or pair
                    </motion.p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {myHand.map((cid) => {
                  const isInGroup = cardsInGroups.has(cid);
                  const isSelected = selectedCard === cid;
                  const cardObj = parseCardId(cid);
                  const isJokerCard = cardObj.rank === game.jokerRank;

                  return (
                    <DraggableCard
                      key={cid}
                      cardId={cid}
                      isSelected={isSelected}
                      isInGroup={isInGroup}
                      isJoker={isJokerCard}
                      isMyTurn={isMyTurn}
                      onSelect={() => {
                        if (isInGroup) return;
                        setSelectedCard(isSelected ? null : cid);
                      }}
                      onDragStart={(id) => setDraggingCard(id)}
                    />
                  );
                })}
              </div>
            </div>

            {/* ── Single Discard Button (only when card selected) ── */}
            <AnimatePresence>
              {canDiscard && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.9 }}
                  transition={{ type: 'spring', damping: 20 }}
                  className="flex justify-center"
                >
                  <button
                    onClick={doDiscard}
                    disabled={actionBusy}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 text-red-400 font-bold text-sm hover:from-red-500/30 hover:to-orange-500/30 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-red-500/10"
                  >
                    {actionBusy ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Discard{' '}
                        {parseCardId(selectedCard!).rank}
                        {selectedCard!.slice(-1).toUpperCase()}
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Declare Button ──────────────────────────────────────── */}
            {isMyTurn && hasPicked && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pb-2"
              >
                <button
                  onClick={doDeclare}
                  disabled={!canDeclare || actionBusy}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] ${
                    canDeclare
                      ? 'bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500 text-black shadow-xl shadow-yellow-500/30 hover:shadow-yellow-500/50 hover:brightness-110'
                      : 'bg-white/[0.03] border border-white/8 text-white/15 cursor-not-allowed'
                  }`}
                >
                  {actionBusy ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : canDeclare ? (
                    <>
                      <Trophy size={16} />
                      Declare & Win
                      <Sparkles size={14} />
                    </>
                  ) : (
                    <>
                      <Lock size={14} />
                      Complete all valid pairs to declare
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* ── Waiting indicator + Leave & Refund button ────────── */}
            {!isMyTurn && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4 py-4"
              >
                {/* Waiting text */}
                <div className="flex items-center gap-2.5 text-white/25 text-sm">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  >
                    <Clock size={16} />
                  </motion.div>
                  <span>
                    Waiting for{' '}
                    <span className="text-white/40 font-semibold">
                      {
                        game.playerData[game.currentTurnUid]?.name?.split(
                          ' '
                        )[0]
                      }
                    </span>
                    …
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ── Leave Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showLeaveModal && (
          <LeaveConfirmModal
            onConfirm={handleLeave}
            onCancel={() => setShowLeaveModal(false)}
            busy={leaveBusy}
          />
        )}
      </AnimatePresence>

      {/* ── Confetti on win ─────────────────────────────────────── */}
      <WinCelebration trigger={showResult && game.status === 'finished' && game.winnerId === myUid} />

      {/* ── Result ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showResult && game.status === 'finished' && (
          <ResultOverlay
            game={game}
            myUid={myUid}
            onReturn={() => navigate('/games/joker-pair')}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default JokerPairGame;
