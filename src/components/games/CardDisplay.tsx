import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { idToCard } from '../../utils/CardHelper';

interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: string;
  numericValue: number;
}

interface CardDisplayProps {
  card?: Card | string | null;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  animate?: boolean;
  delay?: number;
  isJoker?: boolean;
  isWinner?: boolean;
}

const suitSymbols: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const suitColors: Record<string, string> = {
  hearts: '#ef4444',
  diamonds: '#ef4444',
  clubs: '#0f0f14',
  spades: '#0f0f14',
};

const valueDisplay: Record<string, string> = {
  A: 'A', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
  '8': '8', '9': '9', '10': '10', J: 'J', Q: 'Q', K: 'K',
};

const sizeClasses = {
  xs: 'w-[36px] h-[48px]',
  sm: 'w-[38px] h-[54px]',
  md: 'w-[54px] h-[76px]',
  lg: 'w-[64px] h-[90px]',
};

const fontScale = {
  xs: { corner: 'text-[9px]', watermark: 'text-2xl' },
  sm: { corner: 'text-[10px]', watermark: 'text-3xl' },
  md: { corner: 'text-xs', watermark: 'text-4xl' },
  lg: { corner: 'text-sm', watermark: 'text-5xl' },
};

const parseCard = (input: string | Card | null | undefined): Card | null => {
  if (!input) return null;
  if (typeof input === 'object' && 'suit' in input) return input as Card;
  return idToCard(input.toString().trim());
};

export const CardDisplay: React.FC<CardDisplayProps> = ({
  card,
  faceDown = false,
  size = 'sm',
  animate = false,
  delay = 0,
  isJoker = false,
  isWinner = false,
}) => {
  const parsedCard = parseCard(card);
  const dims = sizeClasses[size] || sizeClasses.sm;
  const fonts = fontScale[size] || fontScale.sm;

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: -16, rotateY: 90 } : false}
      animate={
        animate
          ? { opacity: 1, y: 0, rotateY: 0 }
          : { rotateY: 0 }
      }
      transition={{ delay: delay / 1000, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileHover={!faceDown ? { y: -4, transition: { duration: 0.15 } } : undefined}
      className={`relative ${dims} flex-shrink-0`}
      style={{ perspective: 800 }}
    >
      {/* Winner glow ring */}
      {isWinner && !faceDown && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="pointer-events-none absolute -inset-1 rounded-xl bg-emerald-400/60 blur-md"
        />
      )}

      {/* Joker foil glow */}
      {isJoker && !faceDown && (
        <motion.div
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          className="pointer-events-none absolute -inset-1 rounded-xl bg-gradient-to-br from-yellow-400/50 via-pink-400/50 to-purple-500/50 blur-md"
        />
      )}

      <AnimatePresence mode="wait">
        {faceDown ? (
          /* ── FACE DOWN — brand card back ── */
          <motion.div
            key="back"
            initial={{ rotateY: 90 }}
            animate={{ rotateY: 0 }}
            exit={{ rotateY: 90 }}
            transition={{ duration: 0.3 }}
            className={`relative h-full w-full overflow-hidden rounded-lg border border-yellow-500/30 shadow-lg`}
            style={{
              background: 'linear-gradient(135deg, #1e1033 0%, #2d1854 50%, #1e1033 100%)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(251,191,36,0.15)',
            }}
          >
            {/* diamond pattern texture */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(251,191,36,0.08) 0, rgba(251,191,36,0.08) 1px, transparent 1px, transparent 8px)',
              }}
            />
            {/* center monogram */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-[55%] w-[55%] items-center justify-center rounded-full border border-yellow-500/40 bg-gradient-to-br from-yellow-500/20 to-transparent">
                <span
                  className="font-black text-yellow-400/80"
                  style={{ fontSize: size === 'lg' ? 20 : size === 'md' ? 16 : 11 }}
                >
                  B
                </span>
              </div>
            </div>
            {/* top-light sheen */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
          </motion.div>
        ) : parsedCard ? (
          /* ── FACE UP — real card ── */
          <motion.div
            key="front"
            initial={{ rotateY: 90 }}
            animate={{ rotateY: 0 }}
            exit={{ rotateY: 90 }}
            transition={{ duration: 0.3 }}
            className="relative h-full w-full overflow-hidden rounded-lg border border-black/5 bg-white shadow-lg"
            style={{
              boxShadow: isWinner
                ? '0 4px 16px rgba(16,185,129,0.35)'
                : isJoker
                  ? '0 4px 16px rgba(168,85,247,0.3)'
                  : '0 3px 8px rgba(0,0,0,0.35)',
            }}
          >
            {/* subtle top sheen (glossy premium feel) */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-black/[0.03]" />

            {/* center watermark suit */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span
                className={`${fonts.watermark} font-black opacity-[0.07]`}
                style={{ color: suitColors[parsedCard.suit] }}
              >
                {suitSymbols[parsedCard.suit]}
              </span>
            </div>

            {/* top-left corner index */}
            <div
              className={`absolute left-1 top-0.5 flex flex-col items-center leading-none ${fonts.corner} font-bold`}
              style={{ color: suitColors[parsedCard.suit] }}
            >
              <span>{valueDisplay[parsedCard.value] || parsedCard.value}</span>
              <span className="-mt-0.5">{suitSymbols[parsedCard.suit]}</span>
            </div>

            {/* bottom-right corner index (rotated, classic playing card look) */}
            <div
              className={`absolute bottom-0.5 right-1 flex flex-col items-center leading-none ${fonts.corner} font-bold`}
              style={{ color: suitColors[parsedCard.suit], transform: 'rotate(180deg)' }}
            >
              <span>{valueDisplay[parsedCard.value] || parsedCard.value}</span>
              <span className="-mt-0.5">{suitSymbols[parsedCard.suit]}</span>
            </div>

            {/* joker ribbon tag */}
            {isJoker && (
              <div className="absolute left-0 top-0 rounded-br-lg bg-gradient-to-r from-purple-600 to-pink-500 px-1.5 py-0.5 text-[7px] font-black text-white shadow-sm">
                JOKER
              </div>
            )}
          </motion.div>
        ) : (
          /* ── Empty placeholder slot ── */
          <div className="h-full w-full rounded-lg border border-dashed border-white/10 bg-white/[0.02]" />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CardDisplay;
