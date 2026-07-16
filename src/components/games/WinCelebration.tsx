// src/components/games/WinCelebration.tsx
// Shared confetti overlay — teeno games mein consistent winner feel
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface WinCelebrationProps {
  trigger: boolean;
}

export const WinCelebration: React.FC<WinCelebrationProps> = ({ trigger }) => {
  // Deterministic particles based on index — no Math.random() instability on re-render
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * 2 * Math.PI;
        const dist  = 80 + (i % 5) * 44;
        return {
          id:     i,
          x:      Math.cos(angle) * dist,
          y:      -Math.abs(Math.sin(angle) * dist) - 30,
          rotate: i * 15,
          delay:  (i % 6) * 0.05,
          emoji:  (['🎉', '✨', '🪙', '⭐'] as const)[i % 4],
        };
      }),
    [],
  );

  if (!trigger) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[250] flex items-center justify-center overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.5, rotate: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 1.2, rotate: p.rotate }}
          transition={{ duration: 1.6, delay: p.delay, ease: 'easeOut' }}
          className="absolute text-2xl"
        >
          {p.emoji}
        </motion.span>
      ))}
    </div>
  );
};
