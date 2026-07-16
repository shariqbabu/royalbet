// src/pages/games/PokerGame.tsx
import React, {
  useState, useEffect, useRef, useMemo, memo, useCallback,
} from 'react';
import { useParams, useNavigate }  from 'react-router-dom';
import { useAuth }                 from '../../context/AuthContext';
import { pokerApi, evalBestHand }  from '../../utils/pokerApi';
import type { PokerTable, PokerPlayer } from '../../utils/pokerApi';
import { subscribePokerTable }     from '../../firebase/poker-subscription';
import CardDisplay                 from '../../components/games/CardDisplay';
import { formatCurrency }          from '../../utils/helpers';
import { WinCelebration }          from '../../components/games/WinCelebration';
import { haptic }                  from '../../utils/haptics';
import {
  Loader2, LogOut, Volume2, VolumeX, Zap, Trophy, Users, Eye,
} from 'lucide-react';

// ─── Constants (hoisted to module scope) ─────────────────────────────────────
const TURN_SECS_CLIENT        = 20;
const AFK_WARNING_SECS_CLIENT = 15;

// ─── Theme constants ──────────────────────────────────────────────────────────
const G = { l:'#fef08a', m:'#eab308', d:'#a16207', glow:'rgba(234,179,8,0.25)' } as const;
const P = { l:'#d8b4fe', m:'#a855f7', glow:'rgba(168,85,247,0.3)'             } as const;
const R = { l:'#fca5a5', m:'#ef4444', glow:'rgba(239,68,68,0.3)'               } as const;

// ─── CSS injection ────────────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById('poker-styles')) return;
  const s      = document.createElement('style');
  s.id         = 'poker-styles';
  s.textContent = `
    @keyframes chipFloat   { 0%,100%{transform:translateY(0)rotate(0)} 50%{transform:translateY(-4px)rotate(3deg)} }
    @keyframes potGlow     { 0%,100%{box-shadow:0 0 12px rgba(234,179,8,.3),inset 0 0 20px rgba(234,179,8,.05)} 50%{box-shadow:0 0 24px rgba(234,179,8,.5),inset 0 0 30px rgba(234,179,8,.1)} }
    @keyframes winnerPulse { 0%,100%{box-shadow:0 0 0 0 rgba(234,179,8,.6)} 50%{box-shadow:0 0 0 8px rgba(234,179,8,0)} }
    @keyframes dealerSpin  { 0%{transform:rotate(0)scale(1)} 50%{transform:rotate(180deg)scale(1.1)} 100%{transform:rotate(360deg)scale(1)} }
    @keyframes slideUp     { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes rankReveal  { 0%{transform:scale(.5)rotate(-10deg);opacity:0} 60%{transform:scale(1.1)rotate(2deg)} 100%{transform:scale(1)rotate(0);opacity:1} }
    @keyframes shimmer     { 0%{background-position:-200% center} 100%{background-position:200% center} }
    @keyframes breathe     { 0%,100%{opacity:.7;transform:scale(1)} 50%{opacity:1;transform:scale(1.02)} }
    @keyframes allInFlare  { 0%,100%{text-shadow:0 0 4px #eab308} 50%{text-shadow:0 0 12px #fef08a,0 0 24px #eab308} }
    @keyframes afkPulse    { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.7)} 50%{box-shadow:0 0 0 6px rgba(239,68,68,0)} }
    @keyframes afkWarning  { 0%,100%{background:rgba(127,29,29,.95)} 50%{background:rgba(185,28,28,.95)} }
    @keyframes refundFloat {
      0%   { opacity:0; transform:translate(-50%,8px) scale(.8); }
      15%  { opacity:1; transform:translate(-50%,0)   scale(1); }
      75%  { opacity:1; transform:translate(-50%,-2px) scale(1); }
      100% { opacity:0; transform:translate(-50%,-14px) scale(.9); }
    }

    /* 3D SVG Action Button */
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

    /* Premium shine sweep across top face */
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
      animation: btnSheen 3.4s ease-in-out infinite;
    }
    .svg-btn3d:disabled .btn-sheen { animation: none; opacity: 0; }
    @keyframes btnSheen {
      0%       { transform: translateX(-180%) skewX(-18deg); }
      55%,100% { transform: translateX(460%)  skewX(-18deg); }
    }

    .shimmer-text {
      background:linear-gradient(90deg,#eab308 0%,#fef08a 30%,#eab308 60%,#a16207 100%);
      background-size:200% auto;
      -webkit-background-clip:text;
      -webkit-text-fill-color:transparent;
      animation:shimmer 2.5s linear infinite;
    }
  `;
  document.head.appendChild(s);
};

// ─── TimerRing ────────────────────────────────────────────────────────────────
const TimerRing: React.FC<{
  seconds: number; total?: number; size: number; sw?: number; isAfkWarning?: boolean;
}> = memo(({ seconds, total = 20, size, sw = 3, isAfkWarning = false }) => {
  const r    = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.max(0, seconds / total);
  const col  = isAfkWarning
    ? R.m
    : seconds <= 5 ? R.m : seconds <= 10 ? '#f97316' : '#10b981';
  return (
    <svg
      width={size} height={size}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 11, transform: 'rotate(-90deg)' }}
      viewBox={`0 0 ${size} ${size}`}
    >
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={col} strokeWidth={sw}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        style={{
          transition: 'stroke-dashoffset 1.05s linear,stroke .3s',
          filter: `drop-shadow(0 0 3px ${col})`,
        }}
      />
    </svg>
  );
});
TimerRing.displayName = 'TimerRing';

// ─── Hand rank config ─────────────────────────────────────────────────────────
const HAND_RANK_CONFIG: Record<string, { emoji: string; color: string; bg: string; border: string }> = {
  'Royal Flush 👑': { emoji: '👑', color: '#fef08a', bg: 'rgba(234,179,8,0.2)',   border: 'rgba(234,179,8,0.6)'   },
  'Straight Flush': { emoji: '🔥', color: '#f97316', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.5)'  },
  'Four of a Kind': { emoji: '💎', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)',border: 'rgba(167,139,250,0.5)' },
  'Full House':     { emoji: '🏠', color: '#34d399', bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.5)'  },
  'Flush':          { emoji: '🌊', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)', border: 'rgba(56,189,248,0.5)'  },
  'Straight':       { emoji: '⚡', color: '#fb923c', bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.5)'  },
  'Three of a Kind':{ emoji: '🎯', color: '#e879f9', bg: 'rgba(232,121,249,0.15)',border: 'rgba(232,121,249,0.5)' },
  'Two Pair':       { emoji: '✌️', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)',border: 'rgba(148,163,184,0.4)' },
  'One Pair':       { emoji: '🤝', color: '#7dd3fc', bg: 'rgba(125,211,252,0.1)', border: 'rgba(125,211,252,0.35)'},
  'High Card':      { emoji: '🃏', color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)' },
  'Won by Fold':    { emoji: '🏳️', color: '#fde68a', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.4)'   },
  'No Cards':       { emoji: '—',  color: '#475569', bg: 'rgba(0,0,0,0.2)',       border: 'rgba(255,255,255,0.06)'},
};

const getRankConfig = (rank?: string) =>
  HAND_RANK_CONFIG[rank || ''] || HAND_RANK_CONFIG['No Cards'];

// ─── PlayerAvatar ─────────────────────────────────────────────────────────────
interface PlayerAvatarProps {
  player?:            PokerPlayer;
  isMe?:              boolean;
  isActive?:          boolean;
  isWinner?:          boolean;
  isSplitWinner?:     boolean;
  refundAmount?:      number;
  phase:              string;
  seatIndex:          number;
  turnSecondsLeft?:   number;
  turnTotal?:         number;
  isAfkWarning?:      boolean;
  cardPos?:           'top' | 'bottom';
  allCommunityDealt?: boolean;
  showHandRank?:      boolean;
  allInShowdown?:     boolean;
}

const PlayerAvatar: React.FC<PlayerAvatarProps> = memo(({
  player, isMe, isActive, isWinner, isSplitWinner, refundAmount = 0, phase,
  seatIndex, turnSecondsLeft, turnTotal = TURN_SECS_CLIENT,
  isAfkWarning = false,
  cardPos = 'bottom',
  allCommunityDealt = false,
  showHandRank = false,
  allInShowdown = false,
}) => {
  // ── Empty seat ────────────────────────────────────────────────────────────
  if (!player) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          border: '1.5px dashed rgba(255,255,255,0.1)',
          background: 'radial-gradient(circle,rgba(255,255,255,0.03) 0%,transparent 70%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 14, opacity: 0.2 }}>+</span>
        </div>
        <div style={{
          fontSize: 7, color: 'rgba(255,255,255,0.15)',
          fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase',
        }}>
          Open
        </div>
      </div>
    );
  }

  // ── LEFT_SEAT placeholder ─────────────────────────────────────────────────
  if ((player as any).seatStatus === 'LEFT_SEAT') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          border: '1.5px dashed rgba(100,116,139,0.3)',
          background: 'rgba(15,23,42,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Eye style={{ width: 14, height: 14, color: '#475569' }} />
        </div>
        <div style={{
          fontSize: 7, color: '#475569', fontWeight: 600,
          letterSpacing: 0.5, textAlign: 'center',
          background: 'rgba(15,23,42,0.8)',
          padding: '1px 5px', borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          👁 Watching
        </div>
      </div>
    );
  }

  const isPlaying = phase !== 'waiting';
  const folded    = player.status === 'folded';
  const isDC      = player.status === 'disconnected' || (player as any).seatStatus === 'DISCONNECTED';
  const isAllIn   = player.status === 'allin';
  const showCards = isPlaying && player.holeCards && player.holeCards.length > 0;
  const isWin     = isWinner || isSplitWinner;

  const faceUp =
    isMe ||
    (!folded && allInShowdown) ||
    (!folded && phase === 'showdown' && allCommunityDealt);

  const avSz   = isMe ? 46 : 38;
  const ringSz = avSz + 8;

  const rankCfg = showHandRank && player.handRank
    ? getRankConfig(typeof player.handRank === 'string' ? player.handRank : undefined)
    : null;

  const borderCol = isAfkWarning
    ? R.m
    : isWin
    ? G.m
    : isActive && isPlaying
    ? G.l
    : isMe
    ? P.m
    : isDC
    ? '#1e293b'
    : 'rgba(255,255,255,0.12)';

  const CardRow = () => {
    if (!showCards) return null;
    return (
      <div style={{
        display: 'flex', gap: 2, justifyContent: 'center',
        transform: isMe ? 'scale(0.95)' : 'scale(0.78)',
        zIndex: 35,
        marginTop:    cardPos === 'top'    ? 0 : -10,
        marginBottom: cardPos === 'bottom' ? 0 : -10,
        filter:  folded ? 'grayscale(0.8) brightness(0.6)' : 'none',
        transition: 'filter 0.3s',
      }}>
        {player.holeCards.map((card, i) => (
          <div key={`${seatIndex}-card-${i}`} style={{
            display: 'inline-block',
            filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.85))',
            transform: isMe
              ? (i === 0 ? 'rotate(-7deg) translateY(2px)' : 'rotate(7deg) translateY(2px)')
              : (i === 0 ? 'rotate(-3deg)' : 'rotate(3deg)'),
            transition: 'transform 0.3s',
          }}>
            {faceUp
              ? <CardDisplay card={card} size={isMe ? 'sm' : 'xs'} />
              : <CardDisplay faceDown size="xs" />
            }
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      opacity: folded ? 0.45 : 1,
      transition: 'opacity 0.4s ease',
      position: 'relative',
    }}>
      {/* Win banner — real winner ko WINNER, genuine split pe hi SPLIT */}
      {isWin && (
        <div style={{
          position: 'absolute', top: -24, left: '50%', transform: 'translateX(-50%)',
          whiteSpace: 'nowrap', zIndex: 50, animation: 'slideUp 0.4s ease-out',
        }}>
          <span style={{
            fontSize: 8, fontWeight: 900, padding: '3px 8px', borderRadius: 99,
            background: isSplitWinner
              ? 'linear-gradient(135deg,#38bdf8,#0ea5e9)'
              : `linear-gradient(135deg,${G.l},${G.m})`,
            color: '#000',
            boxShadow: isSplitWinner
              ? '0 2px 12px rgba(56,189,248,0.6)'
              : `0 2px 12px ${G.glow}`,
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            {isSplitWinner ? '🤝 SPLIT' : '🏆 WINNER'}
          </span>
        </div>
      )}

      {/* Refund banner — uncalled all-in wapas mila, winner nahi */}
      {!isWin && refundAmount > 0 && (
        <div style={{
          position: 'absolute', top: -24, left: '50%', transform: 'translateX(-50%)',
          whiteSpace: 'nowrap', zIndex: 50, animation: 'refundFloat 1.8s ease-out forwards',
        }}>
          <span style={{
            fontSize: 8, fontWeight: 900, padding: '3px 8px', borderRadius: 99,
            background: 'rgba(15,23,42,0.95)',
            color: '#94a3b8',
            border: '1px solid rgba(148,163,184,0.35)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            ↩ {formatCurrency(refundAmount)} returned
          </span>
        </div>
      )}

      {/* AFK Warning banner */}
      {isAfkWarning && !folded && (
        <div style={{
          position: 'absolute', top: -28, left: '50%', transform: 'translateX(-50%)',
          whiteSpace: 'nowrap', zIndex: 50, animation: 'slideUp 0.3s ease-out',
        }}>
          <span style={{
            fontSize: 7.5, fontWeight: 900, padding: '3px 8px', borderRadius: 99,
            background: 'rgba(185,28,28,0.95)',
            color: '#fca5a5',
            border: '1px solid rgba(239,68,68,0.5)',
            boxShadow: '0 2px 12px rgba(239,68,68,0.4)',
            display: 'flex', alignItems: 'center', gap: 3,
            animation: 'afkPulse 1.2s ease-in-out infinite',
          }}>
            ⚠ Inactive
          </span>
        </div>
      )}

      {cardPos === 'top' && <CardRow />}

      {/* Avatar ring */}
      <div style={{
        position: 'relative', width: ringSz, height: ringSz,
        flexShrink: 0, zIndex: 20,
      }}>
        {isActive && isPlaying && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `2px solid ${isAfkWarning ? R.m : G.m}`,
            animation: isAfkWarning
              ? 'afkPulse 1.2s ease-in-out infinite'
              : 'winnerPulse 1.5s ease-out infinite',
            zIndex: 10, pointerEvents: 'none',
          }} />
        )}
        {isActive && isPlaying && turnSecondsLeft !== undefined && (
          <TimerRing
            seconds={turnSecondsLeft}
            total={turnTotal}
            size={ringSz}
            isAfkWarning={isAfkWarning}
          />
        )}
        {isWin && (
          <div style={{
            position: 'absolute', inset: -3, borderRadius: '50%',
            background: `conic-gradient(${G.l},${G.m},${G.d},${G.l})`,
            animation: 'dealerSpin 3s linear infinite',
            zIndex: 8,
          }} />
        )}
        <div style={{
          position: 'absolute', inset: isWin ? 3 : 2, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          border: `2px solid ${borderCol}`,
          background: isMe
            ? 'linear-gradient(135deg,#1e1040 0%,#0f0a25 100%)'
            : 'linear-gradient(135deg,#1e293b 0%,#0f172a 100%)',
          boxShadow: isAfkWarning
            ? '0 0 16px rgba(239,68,68,0.5),0 4px 10px rgba(0,0,0,0.7)'
            : isWin
            ? `0 0 20px ${G.glow},0 4px 12px rgba(0,0,0,0.8)`
            : isActive && isPlaying
            ? '0 0 12px rgba(234,179,8,0.3),0 4px 10px rgba(0,0,0,0.7)'
            : '0 4px 10px rgba(0,0,0,0.6)',
          transition: 'box-shadow 0.3s,border-color 0.3s',
          zIndex: 12,
        }}>
          {(player as any).photoURL
            ? <img src={(player as any).photoURL} alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{
                fontWeight: 900,
                fontSize: isMe ? 16 : 13,
                color: isMe ? P.l : '#94a3b8',
                letterSpacing: -0.5,
              }}>
                {player.name.charAt(0).toUpperCase()}
              </span>
          }
        </div>
        {player.isDealer && (
          <div style={{
            position: 'absolute', top: -2, right: -2,
            width: 15, height: 15, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 7, fontWeight: 900,
            background: 'linear-gradient(135deg,#f8fafc,#cbd5e1)',
            color: '#0f172a',
            border: '1.5px solid rgba(0,0,0,0.3)',
            zIndex: 30,
            boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
          }}>D</div>
        )}
      </div>

      {cardPos === 'bottom' && <CardRow />}

      {/* Name + Chips label */}
      <div style={{
        textAlign: 'center', padding: '3px 7px', borderRadius: 10, minWidth: 58,
        background: isAfkWarning
          ? 'rgba(30,5,5,0.97)'
          : isWin
          ? 'rgba(20,16,0,0.95)'
          : 'rgba(8,6,18,0.92)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${
          isAfkWarning ? 'rgba(239,68,68,0.4)'
          : isWin ? 'rgba(234,179,8,0.45)'
          : isActive && isPlaying ? 'rgba(234,179,8,0.25)'
          : isMe ? 'rgba(168,85,247,0.25)'
          : 'rgba(255,255,255,0.07)'
        }`,
        boxShadow: isAfkWarning
          ? '0 4px 16px rgba(239,68,68,0.2),0 2px 6px rgba(0,0,0,0.6)'
          : isWin
          ? '0 4px 16px rgba(234,179,8,0.15),0 2px 6px rgba(0,0,0,0.6)'
          : '0 4px 10px rgba(0,0,0,0.5)',
        zIndex: 25,
        transition: 'all 0.3s',
      }}>
        <p style={{
          fontSize: 8, fontWeight: 700,
          color: isAfkWarning ? '#fca5a5' : isMe ? P.l : isWin ? G.l : '#cbd5e1',
          maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', lineHeight: 1.3,
        }}>
          {isMe ? 'You' : player.name}
          {isDC && !folded ? ' 📵' : ''}
          {isAfkWarning && !isMe ? ' ⚠' : ''}
        </p>
        <p style={{
          fontSize: 9, fontWeight: 900, lineHeight: 1.2,
          color: isWin ? G.l : '#e2e8f0',
        }}>
          {formatCurrency(player.chips)}
        </p>
        {rankCfg && player.handRank && (
          <div style={{
            marginTop: 3, padding: '2px 5px', borderRadius: 6,
            background: rankCfg.bg, border: `1px solid ${rankCfg.border}`,
            animation: 'rankReveal 0.4s ease-out',
          }}>
            <p style={{
              fontSize: 7, fontWeight: 800, lineHeight: 1.2,
              color: rankCfg.color, whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 56,
            }}>
              {isWin ? '👑 ' : rankCfg.emoji + ' '}
              {typeof player.handRank === 'string' ? player.handRank : ''}
            </p>
          </div>
        )}
      </div>

      {/* Status tags */}
      <div style={{
        position: 'absolute', bottom: -14, zIndex: 40,
        display: 'flex', gap: 2, justifyContent: 'center',
      }}>
        {folded && (
          <span style={{
            fontSize: 6.5, fontWeight: 900, color: '#fca5a5',
            background: 'rgba(127,29,29,0.9)', padding: '1px 5px',
            borderRadius: 4, border: '1px solid rgba(239,68,68,0.3)', letterSpacing: 0.5,
          }}>FOLD</span>
        )}
        {isAllIn && (
          <span style={{
            fontSize: 6.5, fontWeight: 900, color: G.l,
            background: 'rgba(120,80,0,0.9)', padding: '1px 5px',
            borderRadius: 4, border: `1px solid ${G.d}80`,
            animation: 'allInFlare 1.5s ease-in-out infinite', letterSpacing: 0.5,
          }}>ALL IN</span>
        )}
        {isDC && !folded && (
          <span style={{
            fontSize: 6.5, fontWeight: 700, color: '#94a3b8',
            background: 'rgba(15,23,42,0.9)', padding: '1px 5px',
            borderRadius: 4, border: '1px solid rgba(148,163,184,0.15)', letterSpacing: 0.5,
          }}>AWAY</span>
        )}
      </div>
    </div>
  );
});
PlayerAvatar.displayName = 'PlayerAvatar';

// ─── Community Cards ──────────────────────────────────────────────────────────
const CommunityCards: React.FC<{ cards: any[]; phase: string }> = memo(({ cards, phase }) => {
  const [revealed, setRevealed] = useState<boolean[]>([false, false, false, false, false]);
  const prevLenRef              = useRef(0);

  useEffect(() => {
    const newLen = cards.length;
    if (newLen > prevLenRef.current) {
      for (let i = prevLenRef.current; i < newLen; i++) {
        const idx = i;
        setTimeout(() => {
          setRevealed(r => { const n = [...r]; n[idx] = true; return n; });
        }, (idx - prevLenRef.current) * 200);
      }
    } else if (newLen === 0) {
      setRevealed([false, false, false, false, false]);
    }
    prevLenRef.current = newLen;
  }, [cards.length]);

  const phaseLabel: Record<string, string> = {
    flop: 'FLOP', turn: 'TURN', river: 'RIVER', showdown: 'SHOWDOWN',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {phaseLabel[phase] && (
        <div style={{
          fontSize: 7, fontWeight: 800, letterSpacing: 2,
          color: 'rgba(234,179,8,0.7)', textTransform: 'uppercase',
        }}>
          {phaseLabel[phase]}
        </div>
      )}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
        {[...Array(5)].map((_, i) => {
          const card = cards[i];
          if (!card) return (
            <div key={`placeholder-${i}`} style={{
              width: 36, height: 46, borderRadius: 10,
              background: 'transparent',
              border: '2px dashed rgba(255,255,255,0.25)',
            }} />
          );
          return (
            <div key={`community-${i}`} style={{
              filter: 'drop-shadow(0 5px 8px rgba(0,0,0,0.8))',
              transform: revealed[i]
                ? 'rotateY(0deg) scale(1) translateY(0px)'
                : 'rotateY(90deg) scale(0.8) translateY(4px)',
              opacity: revealed[i] ? 1 : 0,
              transition: 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1),opacity 0.2s ease-out',
            }}>
              <CardDisplay card={card} size="xs" />
            </div>
          );
        })}
      </div>
    </div>
  );
});
CommunityCards.displayName = 'CommunityCards';

// ─── Pot Display ──────────────────────────────────────────────────────────────
const PotDisplay: React.FC<{ pot: number }> = memo(({ pot }) => (
  <div style={{
    background: 'rgba(0,0,0,0.7)', border: `1px solid ${G.d}50`,
    borderRadius: 12, padding: '4px 14px', textAlign: 'center',
    animation: pot > 0 ? 'potGlow 2.5s ease-in-out infinite' : 'none',
    backdropFilter: 'blur(12px)',
  }}>
    <div style={{
      fontSize: 6, color: G.d, letterSpacing: 2,
      fontWeight: 800, textTransform: 'uppercase', marginBottom: 1,
    }}>
      POT
    </div>
    <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
      {formatCurrency(pot)}
    </div>
  </div>
));
PotDisplay.displayName = 'PotDisplay';

// ─── Pot → Winner chip flight ─────────────────────────────────────────────────
// Seat positions (% of table area) — renderSeat coords se match karte hain
const SEAT_POS_PCT: Record<number, { left: number; top: number }> = {
  0: { left: 50, top: 88 },
  1: { left: 50, top: 12 },
  4: { left: 18, top: 30 },
  3: { left: 82, top: 30 },
  5: { left: 18, top: 70 },
  2: { left: 82, top: 70 },
};

const ChipsToWinner: React.FC<{ seats: number[] }> = memo(({ seats }) => {
  // flown=false → chips pot pe; ek frame baad true → left/top transition
  // se target seat tak smooth udte hain
  const [flown, setFlown] = React.useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setFlown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!seats.length) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, pointerEvents: 'none' }}>
      {seats.map(seat => {
        const target = SEAT_POS_PCT[seat] || SEAT_POS_PCT[0];
        return Array.from({ length: 6 }, (_, i) => (
          <span
            key={`chip-${seat}-${i}`}
            style={{
              position: 'absolute',
              width: 14, height: 14, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #fef08a 0%, #eab308 45%, #a16207 100%)',
              border: '1.5px dashed rgba(255,255,255,0.8)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.6), 0 0 10px rgba(234,179,8,0.5)',
              left: flown ? `${target.left}%` : `calc(50% + ${(i % 3 - 1) * 12}px)`,
              top:  flown ? `${target.top}%`  : `calc(46% + ${(i % 2) * 10}px)`,
              opacity: flown ? 0 : 1,
              transform: flown ? 'scale(0.5)' : 'scale(1)',
              transition: `left .85s cubic-bezier(.25,.8,.35,1) ${i * 80}ms, top .85s cubic-bezier(.25,.8,.35,1) ${i * 80}ms, opacity .3s ease ${550 + i * 80}ms, transform .85s ease ${i * 80}ms`,
            }}
          />
        ));
      })}
    </div>
  );
});
ChipsToWinner.displayName = 'ChipsToWinner';

// ─── 3D SVG Action Button ─────────────────────────────────────────────────────
type ActionVariant = 'fold' | 'check' | 'call' | 'raise' | 'allin';

// Palette per variant: [topLight, topMid, topDark, sideDark, textColor, glow]
const ACTION_3D: Record<ActionVariant, {
  topLight: string; topMid: string; topDark: string;
  sideDark: string; text: string; glow: string;
}> = {
  fold:  { topLight:'#fca5a5', topMid:'#ef4444', topDark:'#991b1b', sideDark:'#450a0a', text:'#fff5f5', glow:'rgba(239,68,68,0.55)'  },
  check: { topLight:'#7dd3fc', topMid:'#0ea5e9', topDark:'#0369a1', sideDark:'#0c2340', text:'#f0f9ff', glow:'rgba(14,165,233,0.55)' },
  call:  { topLight:'#6ee7b7', topMid:'#10b981', topDark:'#065f46', sideDark:'#022c22', text:'#ecfdf5', glow:'rgba(16,185,129,0.55)' },
  raise: { topLight:'#d8b4fe', topMid:'#a855f7', topDark:'#6b21a8', sideDark:'#2e1065', text:'#faf5ff', glow:'rgba(168,85,247,0.55)' },
  allin: { topLight:'#fde68a', topMid:'#f59e0b', topDark:'#b45309', sideDark:'#451a03', text:'#fffbeb', glow:'rgba(245,158,11,0.6)'  },
};

const ActionBtn: React.FC<{
  label:     string;
  sublabel?: string;
  onClick:   () => void;
  disabled?: boolean;
  variant:   ActionVariant;
}> = memo(({ label, sublabel, onClick, disabled, variant }) => {
  const c        = ACTION_3D[variant];
  const uid      = `${variant}-${label}`.replace(/\s+/g,'-');
  const gradTop  = `gradTop-${uid}`;
  const gradSide = `gradSide-${uid}`;
  const gradGloss= `gradGloss-${uid}`;
  const gradRim  = `gradRim-${uid}`;
  const filterId = `blur-${uid}`;

  return (
    <button
      className="svg-btn3d"
      onClick={onClick}
      disabled={disabled}
      style={{ filter: disabled ? undefined : `drop-shadow(0 6px 14px ${c.glow})` }}
    >
      <svg viewBox="0 0 120 56" preserveAspectRatio="none" aria-hidden>
        <defs>
          {/* Top face gradient */}
          <linearGradient id={gradTop} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={c.topLight} />
            <stop offset="45%" stopColor={c.topMid}   />
            <stop offset="100%"stopColor={c.topDark}  />
          </linearGradient>
          {/* Side face gradient (base) */}
          <linearGradient id={gradSide} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={c.topDark}  />
            <stop offset="100%" stopColor={c.sideDark} />
          </linearGradient>
          {/* Glossy highlight */}
          <linearGradient id={gradGloss} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="60%"  stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0"    />
          </linearGradient>
          {/* Metallic rim light — top edge bright, bottom edge dark */}
          <linearGradient id={gradRim} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.65" />
            <stop offset="35%"  stopColor="#ffffff" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
          </linearGradient>
          <filter id={filterId}>
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
        </defs>

        {/* Base (side / shadow) — stays put so top can push down */}
        <rect
          x="2" y="6" width="116" height="48" rx="14"
          fill={`url(#${gradSide})`}
          stroke="rgba(0,0,0,0.5)" strokeWidth="1"
        />
        {/* Inner base shadow */}
        <rect
          x="2" y="6" width="116" height="48" rx="14"
          fill="none"
          stroke="rgba(0,0,0,0.4)" strokeWidth="2"
          filter={`url(#${filterId})`}
        />

        {/* Top face (this translates on press via CSS) */}
        <g className="btn-top">
          <rect
            x="2" y="0" width="116" height="48" rx="14"
            fill={`url(#${gradTop})`}
            stroke="rgba(0,0,0,0.35)" strokeWidth="1"
          />
          {/* Metallic rim light stroke */}
          <rect
            x="3" y="1" width="114" height="46" rx="13"
            fill="none"
            stroke={`url(#${gradRim})`} strokeWidth="1.2"
          />
          {/* Glossy top-half highlight */}
          <rect
            x="6" y="3" width="108" height="22" rx="10"
            fill={`url(#${gradGloss})`}
          />
          {/* Bottom inner rim highlight */}
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

      {/* Label overlay (also translates with top face) */}
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
ActionBtn.displayName = 'ActionBtn';

// ─── AFK Warning Overlay ──────────────────────────────────────────────────────
const AfkWarningOverlay: React.FC<{
  secondsLeft: number;
  total:       number;
  onDismiss:   () => void;
}> = memo(({ secondsLeft, total, onDismiss }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 200,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    animation: 'slideUp 0.3s ease-out',
  }}>
    <div style={{
      background: 'linear-gradient(160deg,#1a0505 0%,#0d0202 100%)',
      border: '1px solid rgba(239,68,68,0.4)',
      borderRadius: 20, padding: '28px 28px 24px',
      maxWidth: 320, width: '90%',
      textAlign: 'center',
      boxShadow: '0 12px 40px rgba(239,68,68,0.3)',
      animation: 'afkWarning 1.5s ease-in-out infinite',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
        border: '3px solid #ef4444',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'afkPulse 1.2s ease-in-out infinite',
        position: 'relative',
      }}>
        <TimerRing seconds={secondsLeft} total={total} size={64} sw={3} isAfkWarning />
        <span style={{ fontSize: 24, position: 'absolute' }}>⚠️</span>
      </div>
      <h3 style={{ fontWeight: 900, fontSize: 18, color: '#fca5a5', marginBottom: 8 }}>
        You are Inactive!
      </h3>
      <p style={{ fontSize: 12, color: '#f87171', lineHeight: 1.5, marginBottom: 20 }}>
        Act now or your seat will be released in{' '}
        <strong style={{ color: '#ef4444', fontSize: 16 }}>{secondsLeft}s</strong>
      </p>
      <button onClick={onDismiss} style={{
        width: '100%', height: 46, borderRadius: 14,
        background: 'linear-gradient(135deg,#dc2626,#991b1b)',
        border: '1px solid rgba(239,68,68,0.4)',
        color: '#fff', fontWeight: 900, fontSize: 14,
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(239,68,68,0.4)',
      }}>
        I&apos;m Here! Continue
      </button>
    </div>
  </div>
));
AfkWarningOverlay.displayName = 'AfkWarningOverlay';

// ─── Take Seat Panel (spectator) ──────────────────────────────────────────────
const TakeSeatPanel: React.FC<{
  table:      PokerTable;
  onTakeSeat: (buyIn: number) => void;
  loading:    boolean;
}> = memo(({ table, onTakeSeat, loading }) => {
  const [amount, setAmount] = useState(table.minBuyIn);

  useEffect(() => { setAmount(table.minBuyIn); }, [table.minBuyIn]);

  return (
    <div style={{
      padding: '12px 14px 14px',
      background: 'rgba(4,3,8,0.98)',
      borderTop: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{ maxWidth: 460, margin: '0 auto' }}>
        <div style={{
          padding: '12px 14px', borderRadius: 14,
          background: 'rgba(15,23,42,0.9)',
          border: '1px solid rgba(14,165,233,0.2)',
          marginBottom: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Eye style={{ width: 13, height: 13, color: '#38bdf8' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>
              Spectator Mode — Take a Seat to Play
            </span>
          </div>
          <p style={{ fontSize: 10, color: '#475569', lineHeight: 1.4 }}>
            {table.status === 'playing'
              ? '🎴 Hand in progress. Seat available after this hand ends.'
              : '✅ Seat available now!'}
          </p>
        </div>

        {table.status !== 'playing' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              min={table.minBuyIn}
              max={table.maxBuyIn}
              step={table.bigBlind || 20}
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              style={{
                flex: 1, height: 44, borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.03)',
                color: '#fff', padding: '0 12px', outline: 'none', fontSize: 13,
              }}
            />
            <button
              onClick={() => onTakeSeat(amount)}
              disabled={loading || amount < table.minBuyIn || amount > table.maxBuyIn}
              style={{
                minWidth: 120, height: 44, borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg,#0ea5e9,#0369a1)',
                color: '#fff', fontWeight: 900, fontSize: 13, cursor: 'pointer',
              }}
            >
              {loading ? <Loader2 style={{ width: 14, height: 14, display: 'inline', animation: 'dealerSpin 0.9s linear infinite' }} /> : '🪑 Take Seat'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
TakeSeatPanel.displayName = 'TakeSeatPanel';

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────
const PokerGamePage: React.FC = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const { user }    = useAuth();
  const navigate    = useNavigate();

  useEffect(() => { injectStyles(); }, []);

  const [table,           setTable          ] = useState<PokerTable | null>(null);
  const [loading,         setLoading        ] = useState(true);
  const [actionLoading,   setActionLoading  ] = useState(false);
  const [leaving,         setLeaving        ] = useState(false);
  const [raiseAmount,     setRaiseAmount    ] = useState(0);
  const [error,           setError          ] = useState('');
  const [showLeave,       setShowLeave      ] = useState(false);
  const [showRaise,       setShowRaise      ] = useState(false);
  const [soundOn,         setSoundOn        ] = useState(true);
  const [turnLeft,        setTurnLeft       ] = useState<number | null>(null);
  const [turnTotal,       setTurnTotal      ] = useState(TURN_SECS_CLIENT);
  const [takeSeatLoading, setTakeSeatLoading] = useState(false);
  const [showRebuyToast,  setShowRebuyToast ] = useState(false);
  const [rebuyAmount,     setRebuyAmount    ] = useState(0);
  const [rebuyLoading,    setRebuyLoading   ] = useState(false);
  const [afkDismissed,    setAfkDismissed   ] = useState(false);

  const prevActiveCount    = useRef(0);
  const autoStartLock      = useRef(false);
  const rebuyDismissedRef  = useRef(false);
  const tableRef           = useRef<PokerTable | null>(null);
  const afkWarnSentRef     = useRef<string | null>(null);

  useEffect(() => { tableRef.current = table; }, [table]);

  const phase    = table?.phase  || 'waiting';
  const myP      = table?.players.find(p => p.uid === user?.uid && (p as any).seatStatus !== 'LEFT_SEAT');
  const isMyTurn = table?.activePlayerUid === user?.uid;
  const pot      = table?.pot    || 0;
  const curBet   = table?.currentBet || 0;
  const callAmt  = myP ? Math.max(0, Math.min(curBet - myP.bet, myP.chips)) : 0;
  // Server rule: min raise-to = currentBet + lastRaiseSize; koi bet na ho to bigBlind
  const lastRaiseSize = (table as any)?.lastRaiseSize || table?.bigBlind || 20;
  const minRaise = curBet > 0 ? curBet + lastRaiseSize : (table?.bigBlind || 20);
  const maxRaise = myP ? myP.chips + myP.bet : 0;

  const myRole = useMemo<'player' | 'spectator' | null>(() => {
    if (!table || !user) return null;
    const seated = table.players.find(p => p.uid === user.uid);
    if (seated && (seated as any).seatStatus !== 'LEFT_SEAT') return 'player';
    const inQueue = (table.spectatorQueue || []).some((s: any) => s.uid === user.uid);
    if (inQueue || (seated && (seated as any).seatStatus === 'LEFT_SEAT')) return 'spectator';
    return null;
  }, [table, user]);

  const isMyAfkWarning = useMemo(() =>
    isMyTurn &&
    (table as any)?.afkWarningUid === user?.uid &&
    !!(table as any)?.afkWarningEndsAt &&
    !afkDismissed,
    [isMyTurn, table, user?.uid, afkDismissed]
  );

  const afkWarningPlayerUid = useMemo<string | null>(() =>
    (table as any)?.afkWarningUid ?? null,
    [table]
  );

  const showActions = isMyTurn
    && phase !== 'waiting'
    && phase !== 'showdown'
    && myP?.status === 'active'
    && myRole === 'player'
    && !actionLoading;

  useEffect(() => {
    if (!tableId) return;
    return subscribePokerTable(tableId, (data) => {
      setTable(data);
      setLoading(false);
    });
  }, [tableId]);

  useEffect(() => {
    if (!tableId || !user?.uid) return;
    const onVis = async () => {
      const t = tableRef.current;
      if (!t) return;
      const isSeated = t.players.some(
        (p) => p.uid === user.uid && (p as any).seatStatus !== 'LEFT_SEAT'
      );
      if (!isSeated) return;
      try {
        if (document.hidden) await pokerApi.markDisconnect(tableId);
        else                 await pokerApi.markReconnect(tableId);
      } catch (e) {
        console.warn('[VISIBILITY]', e);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [tableId, user?.uid]);

  const myLiveHandRank = useMemo(() => {
    if (!myP?.holeCards || myP.holeCards.length < 2) return null;
    if (!table?.communityCards || table.communityCards.length === 0) return null;
    return evalBestHand([...myP.holeCards, ...table.communityCards]);
  }, [myP?.holeCards, table?.communityCards]);

  const liveRankCfg = myLiveHandRank ? getRankConfig(myLiveHandRank.name) : null;

  const allInShowdown = useMemo(() => {
    if (!table) return false;
    if (phase === 'showdown') return !!(table as any).lastHandAllIn;
    const contenders = table.players.filter(
      p => p.status === 'active' || p.status === 'allin'
    );
    return contenders.length >= 2 && contenders.every(p => p.status === 'allin');
  }, [phase, table]);

  const allCommunityDealt = useMemo(() =>
    (table?.communityCards?.length ?? 0) >= 5,
    [table?.communityCards?.length]
  );

  useEffect(() => {
    if (!table?.turnExpiresAt || !table.activePlayerUid) {
      setTurnLeft(null);
      return;
    }

    const raw = table.turnExpiresAt;
    const exp = raw?.toMillis ? raw.toMillis() : Number(raw);
    if (!exp || isNaN(exp)) { setTurnLeft(null); return; }

    const isAfk  = !!afkWarningPlayerUid;
    const total  = isAfk ? AFK_WARNING_SECS_CLIENT : TURN_SECS_CLIENT;
    setTurnTotal(total);

    let autoFoldFired = false;
    const tick = () => {
      const r = Math.max(0, Math.ceil((exp - Date.now()) / 1000));
      setTurnLeft(r);
      if (r === 0 && tableId && !autoFoldFired) {
        autoFoldFired = true;
        clearInterval(iv);
        pokerApi.autoFold(tableId).catch(() => {});
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    table?.turnExpiresAt,
    table?.activePlayerUid,
    afkWarningPlayerUid,
    tableId,
  ]);

  const afkWarningUidValue = (table as any)?.afkWarningUid ?? null;

  useEffect(() => {
    if (!table || !tableId) return;
    const activeUid = table.activePlayerUid;
    if (!activeUid) {
      afkWarnSentRef.current = null;
      return;
    }
    const activePlayer = table.players.find(p => p.uid === activeUid);
    if (!activePlayer) return;

    const shouldTrigger =
      (activePlayer.missedTurns || 0) >= 1 &&
      !afkWarningUidValue &&
      (activePlayer as any).seatStatus !== 'AFK_WARNING' &&
      afkWarnSentRef.current !== activeUid;

    if (shouldTrigger) {
      afkWarnSentRef.current = activeUid;
      pokerApi.startAfkWarning(tableId).catch(() => {});
    }

    if (afkWarningUidValue && afkWarningUidValue !== activeUid) {
      afkWarnSentRef.current = null;
    }
  }, [table?.activePlayerUid, afkWarningUidValue, tableId, table?.players]);

  useEffect(() => {
    if (!table || !tableId) return;
    if (table.phase !== 'showdown' || table.status !== 'waiting') return;

    const eligible = table.players.filter(
      (p: any) =>
        p.seatStatus !== 'LEFT_SEAT' &&
        p.chips > 0
    );

    if (eligible.length < 2) return;

    let delay: number;

    if (table.nextHandAt) {
      const rawAt   = table.nextHandAt;
      const readyAt = rawAt?.toMillis ? rawAt.toMillis() : new Date(rawAt).getTime();
      delay         = Math.max(readyAt - Date.now(), 200);
    } else {
      delay = 3000;
    }

    const t = setTimeout(async () => {
      const cur = tableRef.current;
      if (!cur || cur.status === 'playing') return;
      const stillEligible = cur.players.filter(
        (p: any) => p.seatStatus !== 'LEFT_SEAT' && p.chips > 0
      );
      if (stillEligible.length < 2) return;

      try {
        await pokerApi.startHand(tableId);
      } catch (e: any) {
        if (
          !e.message?.includes('already in progress') &&
          !e.message?.includes('2 players') &&
          !e.message?.includes('Showdown')
        ) {
          console.error('[AUTO RESTART]', e.message);
        }
      }
    }, delay);

    return () => clearTimeout(t);
  }, [
    table?.phase,
    table?.status,
    table?.nextHandAt,
    table?.players?.map((p: any) => `${p.uid}:${p.chips}:${p.seatStatus}`).join(','),
    tableId,
  ]);

  useEffect(() => {
    if (!table || !tableId) return;
    if (table.phase !== 'waiting' || table.status !== 'waiting') return;

    const eligible = table.players.filter(
      (p: any) => p.seatStatus !== 'LEFT_SEAT' && p.chips > 0
    );

    if (eligible.length < 2 || autoStartLock.current) return;

    autoStartLock.current = true;
    const t = setTimeout(async () => {
      const cur = tableRef.current;
      if (!cur || cur.status === 'playing' || cur.phase !== 'waiting') {
        autoStartLock.current = false;
        return;
      }
      const stillEligible = cur.players.filter(
        (p: any) => p.seatStatus !== 'LEFT_SEAT' && p.chips > 0
      );
      if (stillEligible.length < 2) {
        autoStartLock.current = false;
        return;
      }
      try {
        await pokerApi.startHand(tableId);
      } catch (e: any) {
        if (!e.message?.includes('already in progress'))
          console.error('[AUTO START]', e.message);
      } finally {
        autoStartLock.current = false;
      }
    }, 1500);

    return () => {
      clearTimeout(t);
      autoStartLock.current = false;
    };
  }, [
    table?.phase,
    table?.status,
    table?.players?.map((p: any) => `${p.uid}:${p.chips}:${p.seatStatus}`).join(','),
    tableId,
  ]);

  useEffect(() => {
    if (!myP) { setShowRebuyToast(false); return; }
    if (myP.chips > 0) {
      rebuyDismissedRef.current = false;
      setShowRebuyToast(false);
      return;
    }
    const handOver = table?.status === 'waiting' && (phase === 'showdown' || phase === 'waiting');
    if (handOver && !rebuyDismissedRef.current) {
      setShowRebuyToast(true);
      if (rebuyAmount === 0) setRebuyAmount(table?.minBuyIn || 100);
    }
  }, [myP?.chips, table?.status, phase, rebuyAmount, table?.minBuyIn]);

  useEffect(() => {
    if (minRaise > 0) setRaiseAmount(Math.min(minRaise, maxRaise));
  }, [minRaise, maxRaise]);

  useEffect(() => {
    setAfkDismissed(false);
  }, [table?.activePlayerUid]);

  // ── Payout classification: real winners vs uncalled-bet refunds ─────────────
  // P1 all-in ₹300 vs P2 all-in ₹150 → P1 ko ₹150 wapas milta hai (refund),
  // woh winner NAHI hai. Real winner = jise apne totalBet se zyada (ya barabar,
  // split case) mila. Refund = apne contribution se KAM wapas mila.
  const { winnerUids, refundMap } = useMemo(() => {
    const winners = new Set<string>();
    const refunds = new Map<string, number>();
    if (phase !== 'showdown' || !table) return { winnerUids: winners, refundMap: refunds };
    const wins = (table as any).lastHandWins as Record<string, number> | undefined;
    const lw   = (table as any).lastWinner as string | undefined;
    if (wins && Object.keys(wins).length > 0) {
      const entries = Object.entries(wins).filter(([, amt]) => (amt || 0) > 0);
      for (const [uid, amt] of entries) {
        const p = table.players.find(pl => pl.uid === uid);
        const contributed = p?.totalBet ?? 0;
        // Declared winner hamesha winner; warna jo apne contribution se kam
        // paaye woh sirf refund hai (uncalled bet wapas gaya)
        if (uid === lw || amt >= contributed) winners.add(uid);
        else refunds.set(uid, amt);
      }
      // Safety: sab refund classify ho gaye to declared winner ko winner banao
      if (winners.size === 0) {
        if (lw) winners.add(lw);
        else entries.forEach(([uid]) => winners.add(uid));
      }
    } else if (lw) {
      winners.add(lw);
    }
    return { winnerUids: winners, refundMap: refunds };
  }, [phase, table]);

  const isSplitPot = winnerUids.size > 1;

  // ── Haptics ────────────────────────────────────────────────────────────────
  useEffect(() => { if (isMyTurn) haptic('medium'); }, [isMyTurn]);
  useEffect(() => {
    if (phase === 'showdown' && winnerUids.has(user?.uid || '')) haptic('win');
  }, [phase, winnerUids, user?.uid]);
  useEffect(() => {
    // Refund mila (uncalled bet wapas) — halki si vibration, win wali nahi
    if (phase === 'showdown' && refundMap.has(user?.uid || '')) haptic('light');
  }, [phase, refundMap, user?.uid]);

  const activeSeatedCount = useMemo(() =>
    table?.players.filter((p: any) => p.seatStatus !== 'LEFT_SEAT').length ?? 0,
    [table?.players]
  );

  const showErr = useCallback((m: string) => {
    setError(m);
    setTimeout(() => setError(''), 3500);
  }, []);

  const doAction = useCallback(async (a: 'fold' | 'check' | 'call' | 'raise' | 'allin') => {
    if (!user || !tableId || actionLoading) return;
    if (a === 'raise') setShowRaise(false);
    setActionLoading(true);
    try {
      await pokerApi.action(tableId, a, a === 'raise' ? raiseAmount : undefined);
    } catch (e: any) {
      showErr(e.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  }, [user, tableId, actionLoading, raiseAmount, showErr]);

  const doLeave = useCallback(async () => {
    if (!user || !tableId || leaving) return;
    setLeaving(true);
    try {
      await pokerApi.leave(tableId);
      navigate('/games/poker');
    } catch (e: any) {
      showErr(e.message || 'Leave failed');
      setLeaving(false);
    }
  }, [user, tableId, leaving, navigate, showErr]);

  const doTakeSeat = useCallback(async (buyIn: number) => {
    if (!user || !tableId || takeSeatLoading) return;
    setTakeSeatLoading(true);
    try {
      await pokerApi.takeSeat(tableId, buyIn);
    } catch (e: any) {
      showErr(e.message || 'Take seat failed');
    } finally {
      setTakeSeatLoading(false);
    }
  }, [user, tableId, takeSeatLoading, showErr]);

  const doRebuy = useCallback(async () => {
    if (!user || !tableId || rebuyLoading) return;
    const amt = Math.max(rebuyAmount || 0, tableRef.current?.minBuyIn || 100);
    if (amt <= 0) { showErr('Enter a valid amount'); return; }
    setRebuyLoading(true);
    try {
      await pokerApi.rebuy(tableId, user.uid, amt);
      setShowRebuyToast(false);
      rebuyDismissedRef.current = false;
    } catch (e: any) {
      showErr(e.message || 'Rebuy failed');
    } finally {
      setRebuyLoading(false);
    }
  }, [user, tableId, rebuyAmount, rebuyLoading, showErr]);

  const arranged = useMemo(() => {
    if (!table) return [];
    const allActive = table.players.filter(
      (p: any) => p.seatStatus !== 'LEFT_SEAT'
    );
    const me     = allActive.find(p => p.uid === user?.uid);
    const others = allActive.filter(p => p.uid !== user?.uid);
    const result: (PokerPlayer & { seat: number })[] = [];
    if (me) result.push({ ...me, seat: 0 });
    others.forEach((p, i) => result.push({ ...p, seat: i + 1 }));
    return result;
  }, [table, user?.uid]);

  const atSeat = useCallback((s: number) =>
    arranged.find(p => p.seat === s) as PokerPlayer | undefined,
    [arranged]
  );

  // Winner seat numbers — chip flight animation ke liye
  const winnerSeats = useMemo(() => {
    if (phase !== 'showdown' || winnerUids.size === 0) return [] as number[];
    return arranged.filter(p => winnerUids.has(p.uid)).map(p => p.seat);
  }, [phase, winnerUids, arranged]);

  const renderSeat = useCallback((seat: number, cardPos: 'top' | 'bottom') => {
    const p         = atSeat(seat);
    const isActive  = !!p && table?.activePlayerUid === p.uid;
    const isThisMe  = p?.uid === user?.uid;
    const isWin     = !!p && winnerUids.has(p.uid);
    const isAfkWarn = !!p && afkWarningPlayerUid === p.uid;
    const refundAmt = p ? (refundMap.get(p.uid) || 0) : 0;

    const showHandRank =
      phase === 'showdown' &&
      !!p?.handRank &&
      (isThisMe || allCommunityDealt || allInShowdown);

    return (
      <PlayerAvatar
        player={p}
        isMe={isThisMe}
        isActive={isActive}
        isWinner={isWin && !isSplitPot}
        isSplitWinner={isWin && isSplitPot}
        refundAmount={refundAmt}
        phase={phase}
        seatIndex={p?.seatIndex ?? seat}
        turnSecondsLeft={isActive && turnLeft !== null ? turnLeft : undefined}
        turnTotal={isAfkWarn ? AFK_WARNING_SECS_CLIENT : TURN_SECS_CLIENT}
        isAfkWarning={isAfkWarn}
        cardPos={cardPos}
        allCommunityDealt={allCommunityDealt}
        showHandRank={showHandRank}
        allInShowdown={allInShowdown}
      />
    );
  }, [
    atSeat, table?.activePlayerUid, user?.uid, winnerUids, refundMap,
    afkWarningPlayerUid, phase, allCommunityDealt, allInShowdown,
    isSplitPot, turnLeft,
  ]);

  if (loading) return (
    <div style={{
      height: '100dvh',
      background: 'radial-gradient(circle at center,#110e24 0%,#06040a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', margin: '0 auto',
          border: `3px solid ${G.m}`, borderTopColor: 'transparent',
          animation: 'dealerSpin 0.9s linear infinite',
        }} />
        <p style={{ color: '#475569', fontSize: 12, marginTop: 18, letterSpacing: 1 }}>
          Entering Suite…
        </p>
      </div>
    </div>
  );

  return (
    <div style={{
      height: '100dvh', background: '#060408', color: '#fff',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', userSelect: 'none', position: 'relative',
    }}>

      {/* Confetti on win */}
      <WinCelebration trigger={phase === 'showdown' && winnerUids.has(user?.uid || '')} />

      {isMyAfkWarning && turnLeft !== null && (
        <AfkWarningOverlay
          secondsLeft={turnLeft}
          total={AFK_WARNING_SECS_CLIENT}
          onDismiss={() => setAfkDismissed(true)}
        />
      )}

      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 14px', zIndex: 50,
        background: 'rgba(4,3,8,0.97)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <button onClick={() => setShowLeave(true)} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 11px', borderRadius: 12,
          border: '1px solid rgba(239,68,68,0.2)',
          background: 'rgba(239,68,68,0.07)',
          fontSize: 11, fontWeight: 700, color: '#f87171', cursor: 'pointer',
        }}>
          <LogOut style={{ width: 12, height: 12 }} /> Exit
        </button>

        <div style={{ textAlign: 'center' }}>
          <div className="shimmer-text" style={{ fontSize: 17, fontWeight: 900 }}>
            {myRole === 'spectator' && !myP
              ? 'Spectating'
              : formatCurrency(myP?.chips || 0)}
          </div>
          <div style={{
            fontSize: 6.5, color: '#334155',
            letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase',
          }}>
            {myRole === 'spectator' ? 'Watching' : 'My Chips'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {myRole === 'spectator' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 10,
              background: 'rgba(14,165,233,0.08)',
              border: '1px solid rgba(14,165,233,0.2)',
            }}>
              <Eye style={{ width: 10, height: 10, color: '#38bdf8' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#38bdf8' }}>Watch</span>
            </div>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', borderRadius: 10,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <Users style={{ width: 10, height: 10, color: '#475569' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>
              {activeSeatedCount}/6
            </span>
          </div>
          <button onClick={() => setSoundOn(s => !s)} style={{
            width: 30, height: 30, borderRadius: 9,
            border: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(255,255,255,0.02)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
            {soundOn
              ? <Volume2 style={{ width: 13, height: 13, color: '#a78bfa' }} />
              : <VolumeX  style={{ width: 13, height: 13, color: '#334155' }} />}
          </button>
        </div>
      </div>

      <div style={{
        flex: 1, position: 'relative', minHeight: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        <div style={{
          position: 'relative', width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src="/poker.webp" alt="Poker Table" style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            height: '100%', width: 'auto', maxWidth: '100%',
            objectFit: 'contain', pointerEvents: 'none', zIndex: 1,
          }} />

          <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              zIndex: 20,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}>
              <PotDisplay pot={pot} />
              <CommunityCards cards={table?.communityCards || []} phase={phase} />

              {myLiveHandRank && liveRankCfg && phase !== 'waiting' && myRole === 'player' && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '1px 4px', borderRadius: 10,
                  background: winnerUids.has(user?.uid || '')
                    ? 'linear-gradient(135deg,rgba(234,179,8,0.2),rgba(161,98,7,0.1))'
                    : liveRankCfg.bg,
                  border: `1px solid ${winnerUids.has(user?.uid || '') ? 'rgba(234,179,8,0.5)' : liveRankCfg.border}`,
                  backdropFilter: 'blur(8px)', width: 'fit-content', margin: '0 auto',
                }}>
                  <span style={{
                    fontSize: 7, fontWeight: 900, lineHeight: 1, letterSpacing: 0.2,
                    color: winnerUids.has(user?.uid || '') ? G.l : liveRankCfg.color,
                  }}>
                    {liveRankCfg.emoji} {myLiveHandRank.name}
                  </span>
                </div>
              )}

              {allInShowdown && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 8, fontWeight: 800, color: G.l,
                  background: 'rgba(0,0,0,0.8)', border: `1px solid ${G.d}50`,
                  borderRadius: 20, padding: '3px 10px',
                  animation: 'breathe 2s ease-in-out infinite',
                }}>
                  <Zap style={{ width: 9, height: 9 }} />
                  ALL IN — Cards Running
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ fontSize: 7, color: 'rgba(234,179,8,0.4)', fontWeight: 700, letterSpacing: 1 }}>
                  {table?.smallBlind}/{table?.bigBlind}
                </div>
                {isSplitPot && phase === 'showdown' && (
                  <div style={{
                    fontSize: 7.5, fontWeight: 800, color: '#38bdf8',
                    background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)',
                    borderRadius: 10, padding: '1px 7px', animation: 'slideUp 0.4s ease-out',
                  }}>🤝 Split Pot</div>
                )}
              </div>
            </div>

            <div style={{ position: 'absolute', top: '9%',  left: '50%', transform: 'translate(-50%,0)',        zIndex: 30 }}>{renderSeat(1, 'bottom')}</div>
            <div style={{ position: 'absolute', top: '30%', left: '14%', transform: 'translate(0,-50%)',         zIndex: 30 }}>{renderSeat(4, 'bottom')}</div>
            <div style={{ position: 'absolute', top: '30%', left: '86%', transform: 'translate(-100%,-50%)',     zIndex: 30 }}>{renderSeat(3, 'bottom')}</div>
            <div style={{ position: 'absolute', top: '70%', left: '14%', transform: 'translate(0,-50%)',         zIndex: 30 }}>{renderSeat(5, 'top')}</div>
            <div style={{ position: 'absolute', top: '70%', left: '86%', transform: 'translate(-100%,-50%)',     zIndex: 30 }}>{renderSeat(2, 'top')}</div>
            <div style={{ position: 'absolute', bottom: '5%',left: '50%', transform: 'translate(-50%,0)',        zIndex: 31 }}>{renderSeat(0, 'top')}</div>

            {/* Pot → winner chip flight */}
            {winnerSeats.length > 0 && (
              <ChipsToWinner key={`flight-${table?.handNumber}-${winnerSeats.join('-')}`} seats={winnerSeats} />
            )}

            {arranged.map(p => {
              if ((p.bet || 0) <= 0) return null;
              const betPos: Record<number, React.CSSProperties> = {
                0: { top: '80%', left: '50%', transform: 'translateX(-50%)' },
                1: { top: '20%', left: '50%', transform: 'translateX(-50%)' },
                4: { top: '38%', left: '30%', transform: 'translateX(-50%)' },
                3: { top: '38%', left: '70%', transform: 'translateX(-50%)' },
                5: { top: '58%', left: '30%', transform: 'translateX(-50%)' },
                2: { top: '58%', left: '70%', transform: 'translateX(-50%)' },
              };
              return (
                <div key={`bet-${p.uid}`} style={{
                  position: 'absolute', zIndex: 25,
                  display: 'flex', alignItems: 'center', gap: 3,
                  padding: '2px 7px', borderRadius: 10,
                  background: 'rgba(0,0,0,0.88)',
                  border: '1px solid rgba(234,179,8,0.3)',
                  backdropFilter: 'blur(6px)',
                  animation: 'chipFloat 2s ease-in-out infinite',
                  ...betPos[p.seat],
                }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: `radial-gradient(circle,${G.l},${G.m})`,
                    boxShadow: `0 0 4px ${G.glow}`,
                  }} />
                  <span style={{ fontSize: 8.5, fontWeight: 800, color: G.l }}>
                    {formatCurrency(p.bet)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{
        flexShrink: 0, zIndex: 50,
        background: 'rgba(4,3,8,0.98)', backdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        boxShadow: '0 -12px 32px rgba(0,0,0,0.9)',
      }}>
        {myRole === 'spectator' && table && (
          <TakeSeatPanel
            table={table}
            onTakeSeat={doTakeSeat}
            loading={takeSeatLoading}
          />
        )}

        {myRole === 'player' && (
          <div style={{
            maxWidth: 460, margin: '0 auto',
            padding: '8px 12px 12px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {showActions && showRaise && (myP?.chips || 0) > callAmt && (
              <div style={{
                padding: '9px 12px', borderRadius: 14,
                border: '1px solid rgba(168,85,247,0.15)',
                background: 'rgba(88,28,135,0.08)',
                display: 'flex', flexDirection: 'column', gap: 7,
                animation: 'slideUp 0.2s ease-out',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#7c3aed', fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>
                    Raise Amount
                  </span>
                  <span style={{
                    fontWeight: 900, fontSize: 14,
                    background: `linear-gradient(90deg,${P.l},${P.m})`,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>
                    {formatCurrency(Math.min(raiseAmount, maxRaise))}
                  </span>
                </div>
                <input
                  type="range"
                  min={minRaise}
                  max={maxRaise}
                  step={table?.bigBlind || 10}
                  value={Math.min(raiseAmount, maxRaise)}
                  onChange={e => setRaiseAmount(Number(e.target.value))}
                  style={{ width: '100%', accentColor: P.m, height: 4 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 8.5, color: '#475569' }}>{formatCurrency(minRaise)}</span>
                  <span style={{ fontSize: 8.5, color: '#475569' }}>{formatCurrency(maxRaise)}</span>
                </div>
              </div>
            )}

            {showActions ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <ActionBtn
                  label="Fold"
                  onClick={() => doAction('fold')}
                  disabled={actionLoading}
                  variant="fold"
                />
                {(myP?.bet || 0) >= curBet ? (
                  <ActionBtn
                    label="Check"
                    onClick={() => doAction('check')}
                    disabled={actionLoading}
                    variant="check"
                  />
                ) : (
                  <ActionBtn
                    label="Call"
                    sublabel={formatCurrency(callAmt)}
                    onClick={() => doAction('call')}
                    disabled={actionLoading || callAmt === 0}
                    variant="call"
                  />
                )}
                {(myP?.chips || 0) > callAmt && (
                  <ActionBtn
                    label={showRaise ? 'Confirm' : 'Raise'}
                    onClick={() => {
                      if (showRaise) doAction('raise');
                      else setShowRaise(true);
                    }}
                    disabled={actionLoading || raiseAmount < minRaise || raiseAmount > maxRaise}
                    variant="raise"
                  />
                )}
                <ActionBtn
                  label="All In"
                  sublabel={formatCurrency(myP?.chips || 0)}
                  onClick={() => doAction('allin')}
                  disabled={actionLoading || (myP?.chips || 0) === 0}
                  variant="allin"
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '6px 0' }}>
                {!isMyTurn && phase !== 'waiting' && phase !== 'showdown' && myP?.status === 'active' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', background: G.m,
                      animation: 'breathe 1.5s ease-in-out infinite',
                    }} />
                    <span style={{ color: '#475569', fontSize: 12 }}>
                      Waiting on{' '}
                      <span style={{ color: G.l, fontWeight: 700 }}>
                        {table?.players.find(p => p.uid === table?.activePlayerUid)?.name || 'Player'}
                      </span>
                    </span>
                  </div>
                )}
                {phase === 'showdown' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    {allInShowdown
                      ? <Zap style={{ width: 13, height: 13, color: G.m }} />
                      : <Trophy style={{ width: 13, height: 13, color: P.m }} />}
                    <span style={{ fontSize: 12, fontWeight: 700, color: allInShowdown ? G.l : '#a78bfa' }}>
                      {allInShowdown ? 'All In Showdown…' : isSplitPot ? '🤝 Split Pot!' : 'Showdown!'}
                    </span>
                  </div>
                )}
                {phase === 'waiting' && table && (
                  <p style={{ color: '#334155', fontSize: 12 }}>
                    {activeSeatedCount < 2 ? 'Waiting for players…' : 'Starting next hand…'}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showLeave && (
        <div
          onClick={() => setShowLeave(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 400,
              borderRadius: '22px 22px 0 0', padding: '22px 20px 32px',
              border: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none',
              background: 'linear-gradient(170deg,#0e0b1e 0%,#080614 100%)',
              textAlign: 'center', animation: 'slideUp 0.3s ease-out',
            }}
          >
            <div style={{
              width: 40, height: 4, borderRadius: 2,
              margin: '0 auto 18px', background: 'rgba(255,255,255,0.1)',
            }} />
            <h3 style={{ fontWeight: 900, fontSize: 19, color: '#fff', marginBottom: 8 }}>
              Leave Table?
            </h3>
            <p style={{ color: '#475569', fontSize: 13, marginBottom: 22, lineHeight: 1.5 }}>
              {myRole === 'player' && (myP?.chips || 0) > 0
                ? `Your chips (${formatCurrency(myP?.chips || 0)}) will be returned instantly.`
                : 'You will leave the table.'}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowLeave(false)}
                style={{
                  flex: 1, fontWeight: 700, padding: '13px 0', fontSize: 14, borderRadius: 12,
                  color: '#94a3b8', border: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(255,255,255,0.03)', cursor: 'pointer',
                }}
              >
                Stay
              </button>
              <button
                onClick={doLeave}
                disabled={leaving}
                style={{
                  flex: 1, fontWeight: 800, padding: '13px 0', fontSize: 14, borderRadius: 12,
                  color: '#fff', border: 'none',
                  background: 'linear-gradient(135deg,#ef4444 0%,#991b1b 100%)',
                  cursor: 'pointer', opacity: leaving ? 0.6 : 1,
                }}
              >
                {leaving ? 'Leaving…' : 'Exit Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRebuyToast && myRole === 'player' && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          zIndex: 210, width: 'calc(100% - 24px)', maxWidth: 360,
          background: 'linear-gradient(160deg,#0e0a1e 0%,#08060f 100%)',
          border: `1px solid ${G.d}50`, borderRadius: 16, padding: '12px 14px',
          boxShadow: `0 12px 40px rgba(0,0,0,0.7),0 0 20px ${G.glow}`,
          backdropFilter: 'blur(20px)', animation: 'slideUp 0.3s ease-out',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', gap: 10, marginBottom: 10,
          }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 14, color: G.l, marginBottom: 2 }}>
                🎰 Rebuy Available
              </div>
              <div style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.4 }}>
                You ran out of chips. Rejoin the same table.
              </div>
            </div>
            <button
              onClick={() => { rebuyDismissedRef.current = true; setShowRebuyToast(false); }}
              style={{
                border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)',
                color: '#475569', borderRadius: 9, padding: '5px 9px',
                cursor: 'pointer', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
              }}
            >
              Later
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              min={table?.minBuyIn || 100}
              step={table?.bigBlind || 20}
              value={rebuyAmount}
              onChange={e => setRebuyAmount(Number(e.target.value))}
              style={{
                flex: 1, height: 40, borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.03)',
                color: '#fff', padding: '0 10px', outline: 'none', fontSize: 13,
              }}
            />
            <button
              onClick={doRebuy}
              disabled={rebuyLoading || rebuyAmount < (table?.minBuyIn || 100)}
              style={{
                minWidth: 108, height: 40, borderRadius: 10, border: 'none',
                background: `linear-gradient(135deg,${G.m} 0%,${G.d} 100%)`,
                color: '#000', fontWeight: 900, cursor: 'pointer', fontSize: 13,
              }}
            >
              {rebuyLoading ? 'Adding…' : 'Add Chips'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg,#7f1d1d,#991b1b)',
          color: '#fca5a5', fontWeight: 700, fontSize: 12,
          padding: '9px 20px', borderRadius: 12, zIndex: 300,
          border: '1px solid rgba(239,68,68,0.3)',
          boxShadow: '0 6px 24px rgba(239,68,68,0.3)',
          animation: 'slideUp 0.2s ease-out',
          backdropFilter: 'blur(12px)',
          whiteSpace: 'nowrap',
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default PokerGamePage;
