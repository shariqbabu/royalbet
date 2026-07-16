import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { idToCard } from '../../utils/CardHelper';

interface Card {
  suit: string; // 'hearts' | 'diamonds' | 'clubs' | 'spades' — loose taaki pokerApi ka Card bhi chale
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

// WinZO-style flat bold colors — max readability
const suitColors: Record<string, string> = {
  hearts: '#e11d48',
  diamonds: '#e11d48',
  clubs: '#1e2433',
  spades: '#1e2433',
};

// Size config — bade bold indexes, chhote decorations
const SIZE_CFG = {
  xs: { w: 36, h: 50, radius: 6,  corner: 13, suitSm: 10, center: 20, pad: 3 },
  sm: { w: 42, h: 58, radius: 7,  corner: 15, suitSm: 11, center: 24, pad: 3 },
  md: { w: 56, h: 78, radius: 8,  corner: 19, suitSm: 14, center: 32, pad: 4 },
  lg: { w: 66, h: 92, radius: 10, corner: 22, suitSm: 16, center: 38, pad: 5 },
} as const;

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
  const cfg = SIZE_CFG[size] || SIZE_CFG.sm;
  const color = (parsedCard && suitColors[parsedCard.suit]) || '#1e2433';
  const symbol = (parsedCard && suitSymbols[parsedCard.suit]) || '';
  const val = parsedCard ? (parsedCard.value === '10' ? '10' : parsedCard.value) : '';

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
      className="relative flex-shrink-0"
      style={{ perspective: 800, width: cfg.w, height: cfg.h }}
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
          /* ══ FACE DOWN — clean brand card back ══ */
          <motion.div
            key="back"
            initial={{ rotateY: 90 }}
            animate={{ rotateY: 0 }}
            exit={{ rotateY: 90 }}
            transition={{ duration: 0.3 }}
            className="relative h-full w-full overflow-hidden"
            style={{
              borderRadius: cfg.radius,
              background: 'linear-gradient(160deg, #5b21b6 0%, #3b0f7a 55%, #250a52 100%)',
              border: '2px solid #ffffff',
              boxShadow: '0 3px 10px rgba(0,0,0,0.5)',
            }}
          >
            {/* diamond pattern */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(255,255,255,0.25) 0, rgba(255,255,255,0.25) 1px, transparent 1px, transparent 7px),' +
                  'repeating-linear-gradient(-45deg, rgba(255,255,255,0.25) 0, rgba(255,255,255,0.25) 1px, transparent 1px, transparent 7px)',
              }}
            />
            {/* center badge */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: '58%',
                  aspectRatio: '1',
                  background: 'rgba(255,255,255,0.12)',
                  border: '1.5px solid rgba(255,255,255,0.55)',
                }}
              >
                <span
                  style={{
                    fontWeight: 900,
                    fontSize: size === 'lg' ? 22 : size === 'md' ? 18 : 13,
                    color: '#ffd54a',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  }}
                >
                  B
                </span>
              </div>
            </div>
          </motion.div>
        ) : parsedCard ? (
          /* ══ FACE UP — WinZO-style clean white card ══ */
          <motion.div
            key="front"
            initial={{ rotateY: 90 }}
            animate={{ rotateY: 0 }}
            exit={{ rotateY: 90 }}
            transition={{ duration: 0.3 }}
            className="relative h-full w-full overflow-hidden"
            style={{
              borderRadius: cfg.radius,
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.12)',
              boxShadow: isWinner
                ? '0 4px 16px rgba(16,185,129,0.4), 0 0 0 2px #10b981'
                : isJoker
                  ? '0 4px 16px rgba(168,85,247,0.35), 0 0 0 2px #a855f7'
                  : '0 3px 8px rgba(0,0,0,0.35)',
            }}
          >
            {/* top-left corner index — bada, bold, saaf */}
            <div
              className="absolute flex flex-col items-center"
              style={{
                left: cfg.pad,
                top: cfg.pad - 1,
                color,
                lineHeight: 1,
              }}
            >
              <span
                style={{
                  fontSize: cfg.corner,
                  fontWeight: 900,
                  letterSpacing: val === '10' ? -1.5 : 0,
                  fontFamily: "'Arial Black', Arial, sans-serif",
                }}
              >
                {val}
              </span>
              <span style={{ fontSize: cfg.suitSm, marginTop: -1 }}>{symbol}</span>
            </div>

            {/* center suit — bada bold symbol */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span
                style={{
                  fontSize: cfg.center,
                  lineHeight: 1,
                  color,
                  transform: 'translateY(12%)',
                }}
              >
                {symbol}
              </span>
            </div>

            {/* joker ribbon tag */}
            {isJoker && (
              <div
                className="absolute right-0 top-0 px-1 py-0.5 text-[7px] font-black text-white"
                style={{
                  borderBottomLeftRadius: cfg.radius - 2,
                  background: 'linear-gradient(90deg, #7c3aed, #db2777)',
                }}
              >
                J
              </div>
            )}
          </motion.div>
        ) : (
          /* ══ Empty placeholder slot ══ */
          <div
            className="h-full w-full border border-dashed border-white/10 bg-white/[0.02]"
            style={{ borderRadius: cfg.radius }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CardDisplay;
