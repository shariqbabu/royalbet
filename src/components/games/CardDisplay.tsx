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

// Premium suit colors — rich crimson & ink black (flat #ef4444 se better depth)
const suitColors: Record<string, string> = {
  hearts: '#c81e3a',
  diamonds: '#c81e3a',
  clubs: '#141420',
  spades: '#141420',
};

const valueDisplay: Record<string, string> = {
  A: 'A', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
  '8': '8', '9': '9', '10': '10', J: 'J', Q: 'Q', K: 'K',
};

// Face card decorations
const FACE_ORNAMENT: Record<string, string> = { J: '⚜', Q: '♛', K: '♚' };

// Size config — px-based for crisp detail control
const SIZE_CFG = {
  xs: { w: 36, h: 48, radius: 5, corner: 8,  center: 17, face: 15, orn: 8,  frame: 2 },
  sm: { w: 40, h: 56, radius: 6, corner: 9,  center: 21, face: 18, orn: 9,  frame: 2.5 },
  md: { w: 54, h: 76, radius: 7, corner: 11, center: 28, face: 24, orn: 12, frame: 3 },
  lg: { w: 64, h: 90, radius: 8, corner: 13, center: 34, face: 29, orn: 14, frame: 3.5 },
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
  const color = parsedCard ? suitColors[parsedCard.suit] : '#141420';
  const symbol = parsedCard ? suitSymbols[parsedCard.suit] : '';
  const val = parsedCard ? (valueDisplay[parsedCard.value] || parsedCard.value) : '';
  const isFace = val === 'J' || val === 'Q' || val === 'K';
  const isAce = val === 'A';
  const isRed = color === '#c81e3a';

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
          /* ══ FACE DOWN — royal brand card back ══ */
          <motion.div
            key="back"
            initial={{ rotateY: 90 }}
            animate={{ rotateY: 0 }}
            exit={{ rotateY: 90 }}
            transition={{ duration: 0.3 }}
            className="relative h-full w-full overflow-hidden"
            style={{
              borderRadius: cfg.radius,
              background: 'linear-gradient(150deg, #2a0f4a 0%, #1a0a33 45%, #0e0620 100%)',
              border: '1px solid rgba(212,168,83,0.55)',
              boxShadow:
                '0 4px 12px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 12px rgba(212,168,83,0.08)',
            }}
          >
            {/* gold lattice — crossed diagonals */}
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(212,168,83,0.16) 0, rgba(212,168,83,0.16) 0.5px, transparent 0.5px, transparent 6px),' +
                  'repeating-linear-gradient(-45deg, rgba(212,168,83,0.16) 0, rgba(212,168,83,0.16) 0.5px, transparent 0.5px, transparent 6px)',
              }}
            />
            {/* inner gold frame */}
            <div
              className="pointer-events-none absolute"
              style={{
                inset: cfg.frame + 1,
                borderRadius: Math.max(2, cfg.radius - 2),
                border: '1px solid rgba(212,168,83,0.45)',
                boxShadow: 'inset 0 0 6px rgba(212,168,83,0.12)',
              }}
            />
            {/* center medallion */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: '52%',
                  height: '38%',
                  background:
                    'radial-gradient(circle at 40% 30%, rgba(212,168,83,0.30), rgba(212,168,83,0.08) 60%, transparent 100%)',
                  border: '1px solid rgba(212,168,83,0.6)',
                  boxShadow: '0 0 8px rgba(212,168,83,0.25), inset 0 0 6px rgba(212,168,83,0.2)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontWeight: 900,
                    fontSize: size === 'lg' ? 20 : size === 'md' ? 16 : 11,
                    background: 'linear-gradient(180deg, #f6d987 0%, #d4a853 55%, #a87b2f 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))',
                  }}
                >
                  B
                </span>
              </div>
            </div>
            {/* diagonal sheen */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(120deg, rgba(255,255,255,0.14) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.05) 100%)',
              }}
            />
          </motion.div>
        ) : parsedCard ? (
          /* ══ FACE UP — ivory premium card ══ */
          <motion.div
            key="front"
            initial={{ rotateY: 90 }}
            animate={{ rotateY: 0 }}
            exit={{ rotateY: 90 }}
            transition={{ duration: 0.3 }}
            className="relative h-full w-full overflow-hidden"
            style={{
              borderRadius: cfg.radius,
              background: 'linear-gradient(155deg, #fffdf8 0%, #faf6ec 55%, #f0e9d8 100%)',
              border: '1px solid rgba(120,90,40,0.18)',
              boxShadow: isWinner
                ? '0 4px 16px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.9)'
                : isJoker
                  ? '0 4px 16px rgba(168,85,247,0.3), inset 0 1px 0 rgba(255,255,255,0.9)'
                  : '0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 2px rgba(120,90,40,0.08)',
            }}
          >
            {/* hairline gold inner frame */}
            <div
              className="pointer-events-none absolute"
              style={{
                inset: cfg.frame,
                borderRadius: Math.max(2, cfg.radius - 2),
                border: '0.5px solid rgba(180,140,60,0.28)',
              }}
            />

            {/* center emblem */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              {isFace ? (
                <>
                  {/* ornament above letter */}
                  <span
                    style={{
                      fontSize: cfg.orn,
                      lineHeight: 1,
                      color: isRed ? 'rgba(200,30,58,0.85)' : 'rgba(20,20,32,0.85)',
                      marginBottom: 1,
                      filter: 'drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.2))',
                    }}
                  >
                    {FACE_ORNAMENT[val]}
                  </span>
                  {/* royal serif letter */}
                  <span
                    style={{
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontWeight: 900,
                      fontSize: cfg.face,
                      lineHeight: 1,
                      background: isRed
                        ? 'linear-gradient(180deg, #e8425e 0%, #c81e3a 50%, #8f1128 100%)'
                        : 'linear-gradient(180deg, #3d3d52 0%, #141420 55%, #000008 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.25))',
                    }}
                  >
                    {val}
                  </span>
                  {/* small suit under letter */}
                  <span style={{ fontSize: cfg.orn, lineHeight: 1.2, color, marginTop: 1 }}>
                    {symbol}
                  </span>
                </>
              ) : (
                /* Ace & numbers — bold center suit with soft radial glow */
                <div className="relative flex items-center justify-center">
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: cfg.center * 1.6,
                      height: cfg.center * 1.6,
                      background: isRed
                        ? 'radial-gradient(circle, rgba(200,30,58,0.10) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(20,20,32,0.08) 0%, transparent 70%)',
                    }}
                  />
                  <span
                    style={{
                      fontSize: isAce ? cfg.center * 1.18 : cfg.center,
                      lineHeight: 1,
                      background: isRed
                        ? 'linear-gradient(180deg, #e8425e 0%, #c81e3a 55%, #8f1128 100%)'
                        : 'linear-gradient(180deg, #3d3d52 0%, #141420 55%, #000008 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.30))',
                    }}
                  >
                    {symbol}
                  </span>
                </div>
              )}
            </div>

            {/* top-left corner index */}
            <div
              className="absolute flex flex-col items-center leading-none font-bold"
              style={{
                left: cfg.frame + 1.5,
                top: cfg.frame + 1,
                color,
                fontSize: cfg.corner,
                fontFamily: 'Georgia, "Times New Roman", serif',
                textShadow: '0 0.5px 0 rgba(255,255,255,0.8)',
              }}
            >
              <span>{val}</span>
              <span style={{ marginTop: -1, fontSize: cfg.corner * 0.9 }}>{symbol}</span>
            </div>

            {/* bottom-right corner index (rotated) */}
            <div
              className="absolute flex flex-col items-center leading-none font-bold"
              style={{
                right: cfg.frame + 1.5,
                bottom: cfg.frame + 1,
                color,
                fontSize: cfg.corner,
                fontFamily: 'Georgia, "Times New Roman", serif',
                transform: 'rotate(180deg)',
                textShadow: '0 0.5px 0 rgba(255,255,255,0.8)',
              }}
            >
              <span>{val}</span>
              <span style={{ marginTop: -1, fontSize: cfg.corner * 0.9 }}>{symbol}</span>
            </div>

            {/* glossy diagonal sheen */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                borderRadius: cfg.radius,
                background:
                  'linear-gradient(125deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 35%, transparent 55%, rgba(120,90,40,0.04) 100%)',
              }}
            />

            {/* joker ribbon tag */}
            {isJoker && (
              <div
                className="absolute left-0 top-0 px-1.5 py-0.5 text-[7px] font-black text-white shadow-sm"
                style={{
                  borderBottomRightRadius: cfg.radius,
                  background: 'linear-gradient(90deg, #7c3aed, #db2777)',
                }}
              >
                JOKER
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
