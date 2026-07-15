// src/components/SplashScreen.tsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 500);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'linear-gradient(135deg, #0a0614 0%, #0d0a1a 50%, #080510 100%)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            // ⚠️ FIX: AnimatePresence ka exit animation 0.6s tak chalta hai —
            // is dauraan motion.div abhi bhi DOM mein hota hai (position: fixed;
            // inset: 0), aur framer-motion by default isko clickable rakhta hai
            // (pointer-events: auto), chahe opacity animate ho rahi ho.
            //
            // Agar koi external trigger (jaise AuthContext ka visibilitychange
            // listener) is exit-animation ke beech mein re-render cascade
            // karwa de, to exit animation kabhi cleanly complete nahi hota
            // aur ye invisible-but-clickable div PERMANENTLY DOM mein reh
            // jaata hai — jisse sirf header (jiska z-index isse zyada hai)
            // pe click chalta hai, baaki sab jagah click is invisible layer
            // se block ho jaata hai.
            //
            // pointer-events: 'none' set karte hi, ye div kabhi bhi clicks
            // ko intercept nahi karega — chahe woh DOM mein stuck hi reh jaaye.
            pointerEvents: visible ? 'auto' : 'none',
          }}
        >
          {/* Background glow */}
          <div style={{
            position: 'absolute', top: '30%', left: '50%',
            transform: 'translateX(-50%)',
            width: 350, height: 350, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)',
            filter: 'blur(50px)', pointerEvents: 'none',
          }} />

          {/* Main content */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}
          >
            {/* Rotating rings + Logo */}
            <div style={{
              position: 'relative', width: 150, height: 150,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '2px solid transparent',
                  borderTopColor: 'rgba(245,158,11,0.7)',
                  borderRightColor: 'rgba(245,158,11,0.2)',
                }}
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute', inset: -12, borderRadius: '50%',
                  border: '1.5px solid transparent',
                  borderTopColor: 'rgba(251,146,60,0.4)',
                  borderLeftColor: 'rgba(251,146,60,0.15)',
                }}
              />
              <motion.img
                src="/logo.png"
                alt="BetAdda"
                animate={{
                  filter: [
                    'drop-shadow(0 0 16px rgba(245,158,11,0.4))',
                    'drop-shadow(0 0 32px rgba(245,158,11,0.9))',
                    'drop-shadow(0 0 16px rgba(245,158,11,0.4))',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 110, height: 110,
                  objectFit: 'contain',
                  position: 'relative', zIndex: 1,
                }}
              />
            </div>

            {/* Brand + Tagline */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              style={{ textAlign: 'center', marginTop: 20 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75, duration: 0.5 }}
                style={{
                  marginTop: 10, fontSize: 13,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: 2, textTransform: 'uppercase',
                }}
              >
                Play Smart,{' '}
                <span style={{
                  background: 'linear-gradient(90deg, #f59e0b, #fb923c)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text', fontWeight: 700,
                }}>
                  Win Big
                </span>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* 
── Loader HATA DIYA — ab App.tsx mein AppLoader use hoga ── */}

        </motion.div>
      )}
    </AnimatePresence>
  );
};
