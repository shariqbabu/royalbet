// src/components/games/ActionBtn3D.tsx
// Premium casino action button — shared across games (Poker/NineCard/etc.)
// Pure CSS 3D: gradient top face + dark edge (box-shadow layer), press pe
// button edge mein dabta hai, glossy highlight + subtle shine sweep.
import React, { memo, useEffect } from 'react';
import { haptic } from '../../utils/haptics';

export type ActionVariant3D = 'fold' | 'check' | 'call' | 'raise' | 'allin' | 'see' | 'show';

// Palette per variant: gradient stops + edge (3D depth) + glow
const ACTION_3D: Record<ActionVariant3D, {
  gradFrom: string; gradTo: string; edge: string;
  text: string; glow: string; border: string;
}> = {
  fold:  { gradFrom:'#f87171', gradTo:'#dc2626', edge:'#7f1d1d', text:'#fff', glow:'rgba(239,68,68,0.4)',  border:'rgba(254,202,202,0.5)' },
  check: { gradFrom:'#38bdf8', gradTo:'#0284c7', edge:'#075985', text:'#fff', glow:'rgba(14,165,233,0.4)', border:'rgba(186,230,253,0.5)' },
  call:  { gradFrom:'#34d399', gradTo:'#059669', edge:'#064e3b', text:'#fff', glow:'rgba(16,185,129,0.45)',border:'rgba(167,243,208,0.5)' },
  raise: { gradFrom:'#c084fc', gradTo:'#9333ea', edge:'#581c87', text:'#fff', glow:'rgba(168,85,247,0.4)', border:'rgba(233,213,255,0.5)' },
  allin: { gradFrom:'#fbbf24', gradTo:'#d97706', edge:'#78350f', text:'#fff', glow:'rgba(245,158,11,0.45)',border:'rgba(253,230,138,0.55)' },
  see:   { gradFrom:'#60a5fa', gradTo:'#2563eb', edge:'#1e3a8a', text:'#fff', glow:'rgba(59,130,246,0.4)', border:'rgba(191,219,254,0.5)' },
  show:  { gradFrom:'#facc15', gradTo:'#ca8a04', edge:'#713f12', text:'#1c1000', glow:'rgba(234,179,8,0.45)', border:'rgba(254,240,138,0.6)' },
};

const EDGE = 5; // 3D depth (px)

const injectBtn3DStyles = () => {
  if (document.getElementById('actionbtn3d-styles')) return;
  const s = document.createElement('style');
  s.id = 'actionbtn3d-styles';
  s.textContent = `
    .btn3d {
      position: relative;
      height: 52px;
      margin-bottom: ${EDGE}px;
      border: none;
      border-radius: 16px;
      padding: 0;
      cursor: pointer;
      outline: none;
      -webkit-tap-highlight-color: transparent;
      transform: translateY(0);
      transition: transform .1s cubic-bezier(.4,0,.2,1), box-shadow .1s cubic-bezier(.4,0,.2,1), filter .15s ease;
      overflow: hidden;
      isolation: isolate;
    }
    .btn3d:hover:not(:disabled) { filter: brightness(1.08); }
    .btn3d:active:not(:disabled) {
      transform: translateY(${EDGE - 1}px);
    }
    .btn3d:disabled {
      opacity: .35;
      cursor: not-allowed;
      filter: grayscale(.5);
    }
    /* Glossy top highlight */
    .btn3d::before {
      content: '';
      position: absolute;
      left: 6%; right: 6%; top: 3px;
      height: 45%;
      border-radius: 12px 12px 40% 40%;
      background: linear-gradient(180deg, rgba(255,255,255,.4), rgba(255,255,255,.05));
      pointer-events: none;
      z-index: 1;
    }
    /* Shine sweep */
    .btn3d::after {
      content: '';
      position: absolute;
      top: -20%; bottom: -20%;
      width: 30%;
      background: linear-gradient(105deg, transparent, rgba(255,255,255,.35), transparent);
      transform: translateX(-250%) skewX(-20deg);
      animation: btn3dSheen 3.2s ease-in-out infinite;
      pointer-events: none;
      z-index: 2;
    }
    .btn3d:disabled::after { animation: none; opacity: 0; }
    @keyframes btn3dSheen {
      0%       { transform: translateX(-250%) skewX(-20deg); }
      55%,100% { transform: translateX(480%)  skewX(-20deg); }
    }
    .btn3d .btn3d-label {
      position: relative;
      z-index: 3;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      pointer-events: none;
    }
  `;
  document.head.appendChild(s);
};

export const ActionBtn3D: React.FC<{
  label:     string;
  sublabel?: string;
  onClick:   () => void;
  disabled?: boolean;
  variant:   ActionVariant3D;
  grow?:     number;          // flex-grow (default 1) — CALL jaise primary ko 2 do
}> = memo(({ label, sublabel, onClick, disabled, variant, grow = 1 }) => {
  useEffect(() => { injectBtn3DStyles(); }, []);

  const c = ACTION_3D[variant];

  return (
    <button
      className="btn3d"
      disabled={disabled}
      onClick={() => { haptic('medium'); onClick(); }}
      style={{
        flex: grow,
        background: `linear-gradient(180deg, ${c.gradFrom} 0%, ${c.gradTo} 100%)`,
        // Layered shadow: 3D edge + inner rim light + ambient glow
        boxShadow: [
          `0 ${EDGE}px 0 ${c.edge}`,
          `0 ${EDGE + 6}px 16px rgba(0,0,0,0.5)`,
          `0 ${EDGE + 2}px 22px ${c.glow}`,
          `inset 0 1px 0 ${c.border}`,
          `inset 0 -2px 4px rgba(0,0,0,0.2)`,
        ].join(', '),
      }}
      onMouseDown={e => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.boxShadow = [
          `0 1px 0 ${c.edge}`,
          `0 3px 8px rgba(0,0,0,0.45)`,
          `0 2px 12px ${c.glow}`,
          `inset 0 1px 0 ${c.border}`,
          `inset 0 2px 6px rgba(0,0,0,0.25)`,
        ].join(', ');
      }}
      onMouseUp={e => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = [
          `0 ${EDGE}px 0 ${c.edge}`,
          `0 ${EDGE + 6}px 16px rgba(0,0,0,0.5)`,
          `0 ${EDGE + 2}px 22px ${c.glow}`,
          `inset 0 1px 0 ${c.border}`,
          `inset 0 -2px 4px rgba(0,0,0,0.2)`,
        ].join(', ');
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = [
          `0 ${EDGE}px 0 ${c.edge}`,
          `0 ${EDGE + 6}px 16px rgba(0,0,0,0.5)`,
          `0 ${EDGE + 2}px 22px ${c.glow}`,
          `inset 0 1px 0 ${c.border}`,
          `inset 0 -2px 4px rgba(0,0,0,0.2)`,
        ].join(', ');
      }}
      onTouchStart={e => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.boxShadow = [
          `0 1px 0 ${c.edge}`,
          `0 3px 8px rgba(0,0,0,0.45)`,
          `0 2px 12px ${c.glow}`,
          `inset 0 1px 0 ${c.border}`,
          `inset 0 2px 6px rgba(0,0,0,0.25)`,
        ].join(', ');
      }}
      onTouchEnd={e => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = [
          `0 ${EDGE}px 0 ${c.edge}`,
          `0 ${EDGE + 6}px 16px rgba(0,0,0,0.5)`,
          `0 ${EDGE + 2}px 22px ${c.glow}`,
          `inset 0 1px 0 ${c.border}`,
          `inset 0 -2px 4px rgba(0,0,0,0.2)`,
        ].join(', ');
      }}
    >
      <span className="btn3d-label" style={{ color: c.text }}>
        <span style={{
          fontSize: sublabel ? 13.5 : 15, fontWeight: 900, letterSpacing: 1.4,
          lineHeight: 1, textTransform: 'uppercase',
          textShadow: variant === 'show' ? '0 1px 0 rgba(255,255,255,0.3)' : '0 1.5px 2px rgba(0,0,0,0.4)',
        }}>{label}</span>
        {sublabel && (
          <span style={{
            fontSize: 10.5, fontWeight: 800, marginTop: 3,
            letterSpacing: 0.4, opacity: 0.95,
            textShadow: variant === 'show' ? 'none' : '0 1px 1.5px rgba(0,0,0,0.4)',
          }}>{sublabel}</span>
        )}
      </span>
    </button>
  );
});
ActionBtn3D.displayName = 'ActionBtn3D';

export default ActionBtn3D;
