// src/components/games/ActionBtn3D.tsx
// Poker-style 3D SVG action button — shared across games (Poker/NineCard/etc.)
// Press pe top face neeche dabta hai, metallic rim light + animated shine sweep.
import React, { memo, useEffect } from 'react';

export type ActionVariant3D = 'fold' | 'check' | 'call' | 'raise' | 'allin' | 'see' | 'show';

// Palette per variant: [topLight, topMid, topDark, sideDark, textColor, glow]
const ACTION_3D: Record<ActionVariant3D, {
  topLight: string; topMid: string; topDark: string;
  sideDark: string; text: string; glow: string;
}> = {
  fold:  { topLight:'#fca5a5', topMid:'#ef4444', topDark:'#991b1b', sideDark:'#450a0a', text:'#fff5f5', glow:'rgba(239,68,68,0.55)'  },
  check: { topLight:'#7dd3fc', topMid:'#0ea5e9', topDark:'#0369a1', sideDark:'#0c2340', text:'#f0f9ff', glow:'rgba(14,165,233,0.55)' },
  call:  { topLight:'#6ee7b7', topMid:'#10b981', topDark:'#065f46', sideDark:'#022c22', text:'#ecfdf5', glow:'rgba(16,185,129,0.55)' },
  raise: { topLight:'#d8b4fe', topMid:'#a855f7', topDark:'#6b21a8', sideDark:'#2e1065', text:'#faf5ff', glow:'rgba(168,85,247,0.55)' },
  allin: { topLight:'#fde68a', topMid:'#f59e0b', topDark:'#b45309', sideDark:'#451a03', text:'#fffbeb', glow:'rgba(245,158,11,0.6)'  },
  see:   { topLight:'#93c5fd', topMid:'#3b82f6', topDark:'#1d4ed8', sideDark:'#172554', text:'#eff6ff', glow:'rgba(59,130,246,0.55)' },
  show:  { topLight:'#fef08a', topMid:'#eab308', topDark:'#a16207', sideDark:'#451a03', text:'#fefce8', glow:'rgba(234,179,8,0.6)'   },
};

const injectBtn3DStyles = () => {
  if (document.getElementById('actionbtn3d-styles')) return;
  const s = document.createElement('style');
  s.id = 'actionbtn3d-styles';
  s.textContent = `
    .svg-btn3d {
      position: relative;
      flex: 1;
      height: 56px;
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
      outline: none;
      transition: transform .12s cubic-bezier(.4,0,.2,1), filter .12s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .svg-btn3d svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .svg-btn3d .btn-top   { transition: transform .12s cubic-bezier(.4,0,.2,1); }
    .svg-btn3d:hover:not(:disabled)          { filter: brightness(1.12); }
    .svg-btn3d:active:not(:disabled) .btn-top{ transform: translateY(4px); }
    .svg-btn3d:disabled { opacity:.4; cursor:not-allowed; filter: grayscale(.4); }
    .svg-btn3d .btn-label {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      pointer-events: none;
      transition: transform .12s cubic-bezier(.4,0,.2,1);
      text-shadow: 0 1px 0 rgba(0,0,0,.6), 0 0 6px rgba(0,0,0,.3);
    }
    .svg-btn3d:active:not(:disabled) .btn-label { transform: translateY(4px); }
    .svg-btn3d .btn-sheenwrap {
      position: absolute; left: 4px; right: 4px; top: 2px; height: 42px;
      border-radius: 12px; overflow: hidden; pointer-events: none;
      transition: transform .12s cubic-bezier(.4,0,.2,1);
    }
    .svg-btn3d:active:not(:disabled) .btn-sheenwrap { transform: translateY(4px); }
    .svg-btn3d .btn-sheen {
      position: absolute; top: 0; bottom: 0; width: 34%;
      background: linear-gradient(105deg, transparent 0%, rgba(255,255,255,.35) 50%, transparent 100%);
      transform: translateX(-180%) skewX(-18deg);
      animation: btn3dSheen 3.4s ease-in-out infinite;
    }
    .svg-btn3d:disabled .btn-sheen { animation: none; opacity: 0; }
    @keyframes btn3dSheen {
      0%       { transform: translateX(-180%) skewX(-18deg); }
      55%,100% { transform: translateX(460%)  skewX(-18deg); }
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

  const c        = ACTION_3D[variant];
  const uid      = `${variant}-${label}`.replace(/\s+/g, '-');
  const gradTop  = `b3dTop-${uid}`;
  const gradSide = `b3dSide-${uid}`;
  const gradGloss= `b3dGloss-${uid}`;
  const gradRim  = `b3dRim-${uid}`;
  const filterId = `b3dBlur-${uid}`;

  return (
    <button
      className="svg-btn3d"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: grow,
        filter: disabled ? undefined : `drop-shadow(0 6px 14px ${c.glow})`,
      }}
    >
      <svg viewBox="0 0 120 56" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={gradTop} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={c.topLight} />
            <stop offset="45%" stopColor={c.topMid}   />
            <stop offset="100%"stopColor={c.topDark}  />
          </linearGradient>
          <linearGradient id={gradSide} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={c.topDark}  />
            <stop offset="100%" stopColor={c.sideDark} />
          </linearGradient>
          <linearGradient id={gradGloss} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="60%"  stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0"    />
          </linearGradient>
          <linearGradient id={gradRim} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.65" />
            <stop offset="35%"  stopColor="#ffffff" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
          </linearGradient>
          <filter id={filterId}>
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
        </defs>

        {/* Base (side / shadow) */}
        <rect
          x="2" y="6" width="116" height="48" rx="14"
          fill={`url(#${gradSide})`}
          stroke="rgba(0,0,0,0.5)" strokeWidth="1"
        />
        <rect
          x="2" y="6" width="116" height="48" rx="14"
          fill="none"
          stroke="rgba(0,0,0,0.4)" strokeWidth="2"
          filter={`url(#${filterId})`}
        />

        {/* Top face */}
        <g className="btn-top">
          <rect
            x="2" y="0" width="116" height="48" rx="14"
            fill={`url(#${gradTop})`}
            stroke="rgba(0,0,0,0.35)" strokeWidth="1"
          />
          <rect
            x="3" y="1" width="114" height="46" rx="13"
            fill="none"
            stroke={`url(#${gradRim})`} strokeWidth="1.2"
          />
          <rect
            x="6" y="3" width="108" height="22" rx="10"
            fill={`url(#${gradGloss})`}
          />
          <rect
            x="4" y="42" width="112" height="4" rx="2"
            fill="rgba(0,0,0,0.25)"
          />
        </g>
      </svg>

      {/* Animated shine sweep */}
      <span className="btn-sheenwrap" aria-hidden>
        <span className="btn-sheen" />
      </span>

      {/* Label */}
      <span className="btn-label" style={{ color: c.text }}>
        <span style={{
          fontSize: sublabel ? 13 : 14.5, fontWeight: 900, letterSpacing: 1.1,
          lineHeight: 1, textTransform: 'uppercase',
          textShadow: '0 1px 2px rgba(0,0,0,0.55), 0 0 10px rgba(0,0,0,0.25)',
        }}>{label}</span>
        {sublabel && (
          <span style={{
            fontSize: 9.5, fontWeight: 800, opacity: 0.95, marginTop: 2.5,
            letterSpacing: 0.5,
            textShadow: '0 1px 1.5px rgba(0,0,0,0.5)',
          }}>{sublabel}</span>
        )}
      </span>
    </button>
  );
});
ActionBtn3D.displayName = 'ActionBtn3D';

export default ActionBtn3D;
