// ============================================================
// NineCardGame.tsx — Poker-style premium table UI
// Logic same hai (subscribe, timers, auto-start, auto-reset,
// card reveal rules) — sirf presentation poker table jaisa:
// gold/emerald palette, avatar timer-ring, glow seats, bet pills,
// dealer felt, winner celebration overlay.
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { nineCardApi, subscribeNineCardTable } from '../../firebase/nineCardApi';
import type { NineCardTable, NineCardPlayer } from '../../firebase/nineCardApi';
import { ArrowLeft, Coins } from 'lucide-react';
import CardDisplay from '../../components/games/CardDisplay';
import { WinCelebration } from '../../components/games/WinCelebration';
import { ActionBtn3D } from '../../components/games/ActionBtn3D';
import { haptic } from '../../utils/haptics';

// Poker wali palette
const G = { l: "#fef08a", m: "#eab308", d: "#a16207", glow: "rgba(234,179,8,0.5)" };
const E = { l: "#6ee7b7", m: "#10b981", d: "#065f46" };
const R = { m: "#ef4444" };

const TURN_SECS = 30;

const SEAT_COORDS = [
  { left: 50, top: 86, cardDir: 'up' },    // Bottom - Hero
  { left: 13, top: 48, cardDir: 'right' }, // Left
  { left: 50, top: 13, cardDir: 'down' },  // Top
  { left: 87, top: 48, cardDir: 'left' },  // Right
];

// ── CardMini — CardDisplay wrapper (brand card-back + consistent look) ───────────
// Custom inline card (indigo gradient) hata ke shared CardDisplay use karta hai.
// Future CardDisplay updates automatically yahan bhi reflect honge.
const CardMini = ({ id, isBack, big }: { id?: string; isBack?: boolean; big?: boolean }) => (
  <CardDisplay card={id} faceDown={isBack} size={big ? 'sm' : 'xs'} />
);

// ── Timer ring (poker TimerRing jaisa) ────────────────────────
const TimerRing = ({ seconds, size }: { seconds: number; size: number }) => {
  const sw = 3;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, seconds / TURN_SECS);
  const col = seconds <= 5 ? R.m : seconds <= 10 ? '#f97316' : E.m;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{
      position: 'absolute', inset: 0, transform: 'rotate(-90deg)',
      pointerEvents: 'none', zIndex: 11,
    }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={col} strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s linear,stroke .3s', filter: `drop-shadow(0 0 3px ${col})` }}
      />
    </svg>
  );
};

// ── Status badge config ───────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  packed: { label: 'PACKED', color: '#f87171', bg: 'rgba(239,68,68,0.15)' },
  seen:   { label: '👁 SEEN', color: '#60a5fa', bg: 'rgba(59,130,246,0.15)' },
  show:   { label: 'SHOW',   color: G.l,       bg: 'rgba(234,179,8,0.15)' },
  blind:  { label: 'BLIND',  color: E.l,       bg: 'rgba(16,185,129,0.12)' },
};

export default function NineCardGame() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { user, wallet } = useAuth();
  const myUid = user?.uid || "";

  const [table, setTable] = useState<NineCardTable | null>(null);
  const [turnTime, setTurnTime] = useState(TURN_SECS);
  const [waitingCountdown, setWaitingCountdown] = useState<number | null>(null);
  const [showAfkWarning, setShowAfkWarning] = useState(false);

  // Winner overlay state
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<{ name: string; pot: number; isDraw: boolean } | null>(null);

  // Clock sync offset
  const [serverOffsetMs, setServerOffsetMs] = useState(0);

  // Guards
  const autoStartFiredRef = useRef(false);
  const autoResetFiredRef = useRef(false);
  const prevStatusRef     = useRef<string | null>(null);

  // ── Derived: is it my turn? (needed by AFK effect above table-null guard) ───
  const isMyTurn = table?.currentTurn === myUid && table?.status === 'playing';

  // ── Subscribe to table ──────────────────────────────────────
  useEffect(() => {
    if (!tableId) return;
    return subscribeNineCardTable(tableId, setTable);
  }, [tableId]);

  // ── Server clock offset ─────────────────────────────────────
  useEffect(() => {
    const updatedAtMs = (table as any)?.updatedAt?.toMillis?.();
    if (!updatedAtMs) return;
    setServerOffsetMs(updatedAtMs - Date.now());
  }, [table?.updatedAt]);

  // ── Turn Timer ──────────────────────────────────────────────
  useEffect(() => {
    if (table?.currentTurn && table.status === 'playing') {
      const interval = setInterval(() => {
        const start = table.players[table.currentTurn!]?.turnStartedAt?.toMillis() || Date.now();
        const correctedNow = Date.now() + serverOffsetMs;
        const elapsed = (correctedNow - start) / 1000;
        setTurnTime(Math.max(0, TURN_SECS - elapsed));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [table?.currentTurn, table?.status, serverOffsetMs]);

  // ── AFK Warning — last 5 seconds ─────────────────────────────────────────────
  useEffect(() => {
    if (isMyTurn && turnTime <= 5 && turnTime > 0) {
      setShowAfkWarning(true);
      haptic('urgent');
    } else {
      setShowAfkWarning(false);
    }
  }, [turnTime, isMyTurn]);

  // ── Waiting / Auto-Start Timer ──────────────────────────────
  useEffect(() => {
    if (table?.status === 'waiting' && Object.keys(table.players).length >= table.minPlayers) {
      autoStartFiredRef.current = false;
      setWaitingCountdown(15);
      const interval = setInterval(() => {
        setWaitingCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setWaitingCountdown(null);
    }
  }, [table?.status, table?.players]);

  // ── Auto-Start call ─────────────────────────────────────────
  useEffect(() => {
    if (waitingCountdown === 0 && tableId && !autoStartFiredRef.current) {
      autoStartFiredRef.current = true;
      nineCardApi.autoStart(tableId).catch((err) => {
        console.error('Auto-start failed', err);
        autoStartFiredRef.current = false;
      });
    }
  }, [waitingCountdown, tableId]);

  // ── Auto New Hand after 'finished' ──────────────────────────
  useEffect(() => {
    if (!table || !tableId) return;

    if (table.status === 'finished' && prevStatusRef.current !== 'finished') {
      const winnerPlayer = table.winnerId ? table.players[table.winnerId] : null;
      setResultData({
        name:   winnerPlayer ? String(winnerPlayer.displayName || 'Player').replace(/\s.*/, '') : 'No one',
        pot:    table.pot,
        isDraw: table.isDraw,
      });
      setShowResult(true);
      // Winner ko alag effect se 'win' pattern milta hai — baaki ko subtle buzz
      if (table.winnerId !== myUid) haptic('medium');
      autoResetFiredRef.current = false;

      const timer = setTimeout(() => {
        setShowResult(false);
        if (!autoResetFiredRef.current) {
          autoResetFiredRef.current = true;
          nineCardApi.reset(tableId).catch(err => {
            console.error('Auto-reset failed', err);
            autoResetFiredRef.current = false;
          });
        }
      }, 4000);

      return () => clearTimeout(timer);
    }

    prevStatusRef.current = table.status;
  }, [table?.status]);

  // ── Exit ────────────────────────────────────────────────────
  const handleExit = async () => {
    haptic('light');
    if (tableId) {
      try { await nineCardApi.leave(tableId); }
      catch (err) { console.error('Leave failed', err); }
    }
    navigate(-1);
  };

  // ── Action helper — press pe haptic + API call ───────────────
  const act = (fn: () => Promise<unknown>, pattern: 'light' | 'medium' = 'medium') => {
    haptic(pattern);
    fn().catch(() => {});
  };

  // ── Seat layout ─────────────────────────────────────────────
  const seats = useMemo(() => {
    const layout = Array(4).fill(null);
    if (!table) return layout;
    const order = table.playerOrder || [];
    const myIdx = order.indexOf(myUid);
    order.forEach((uid, idx) => {
      let seatPos = myIdx >= 0 ? (idx - myIdx + 4) % 4 : idx;
      if (seatPos < 4) layout[seatPos] = { uid, p: table.players[uid] };
    });
    return layout;
  }, [table, myUid]);

  // ── Haptics — my turn + win ──────────────────────────────────────────────────
  useEffect(() => { if (isMyTurn) haptic('medium'); }, [isMyTurn]);
  useEffect(() => {
    const isWinner = table?.status === 'finished' && table?.winnerId === myUid;
    if (isWinner) haptic('win');
  }, [table?.status, table?.winnerId, myUid]);

  if (!table) return null;

  const amount       = wallet?.totalBalance ?? 0;
  const myPlayer     = table.players[myUid];
  // isMyTurn already defined above (before null guard), reuse it
  const hasSeenCards = myPlayer?.seenCards ?? false;
  const turnName     = table.currentTurn && table.currentTurn !== myUid
    ? String(table.players[table.currentTurn]?.displayName || 'Player').replace(/\s.*/, '')
    : null;

  return (
    <div style={{
      width: "100%", height: "100dvh",
      background: "radial-gradient(circle at 50% 30%, #100c20 0%, #080512 55%, #04020a 100%)",
      overflow: "hidden", color: "#fff", fontFamily: "sans-serif", position: "relative",
      userSelect: "none", display: 'flex', flexDirection: 'column',
    }}>
      {/* Ambient glows — poker/lobby jaisa */}
      <div style={{
        position: 'absolute', top: -80, left: -80, width: 260, height: 260,
        borderRadius: '50%', background: 'rgba(234,179,8,0.07)', filter: 'blur(70px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -80, right: -80, width: 260, height: 260,
        borderRadius: '50%', background: 'rgba(16,185,129,0.07)', filter: 'blur(70px)', pointerEvents: 'none',
      }} />

      {/* ── Header ── */}
      <div style={{
        flexShrink: 0, padding: "10px 14px",
        display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 50,
        background: "rgba(4,3,8,0.85)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <button onClick={handleExit} style={{
          background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.22)",
          color: "#f87171", padding: "7px 13px", borderRadius: 12,
          display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, cursor: "pointer",
        }}>
          <ArrowLeft size={14}/> Exit
        </button>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: "linear-gradient(180deg,rgba(234,179,8,0.14),rgba(234,179,8,0.05))",
          border: `1px solid rgba(234,179,8,0.3)`,
          padding: "6px 14px", borderRadius: 99,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
        }}>
          <Coins size={12} color={G.m} />
          <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 800, letterSpacing: 1 }}>BOOT</span>
          <span style={{ fontSize: 12, color: G.l, fontWeight: 900 }}>₹{table.bootAmount}</span>
        </div>

        <div style={{
          textAlign: "right", background: "rgba(15,23,42,0.7)",
          padding: "5px 13px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize: 8, color: '#64748b', fontWeight: 800, letterSpacing: 1 }}>BALANCE</div>
          <div style={{ color: G.l, fontWeight: 900, fontSize: 14, lineHeight: 1.2 }}>₹{amount}</div>
        </div>
      </div>

      {/* ── Table Area ── */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        {/* Under-glow — table ke neeche soft gold ambience */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%", height: "70%", borderRadius: "1000px",
          background: "radial-gradient(ellipse, rgba(234,179,8,0.09), transparent 70%)",
          filter: "blur(28px)", pointerEvents: "none",
        }} />

        {/* Metallic gold rim — premium casino edge */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "84%", height: "62%", borderRadius: "1000px",
          background: "linear-gradient(160deg,#fde68a 0%,#a16207 22%,#713f12 48%,#fbbf24 76%,#854d0e 100%)",
          padding: 2.5,
          boxShadow: "0 24px 60px rgba(0,0,0,0.9), 0 0 44px rgba(234,179,8,0.10)",
        }}>
          {/* Wood rail — walnut sheen */}
          <div style={{
            width: "100%", height: "100%", borderRadius: "1000px",
            background: "linear-gradient(135deg,#4a2410 0%,#2a1206 45%,#52301a 100%)",
            padding: 9,
            boxShadow: "inset 0 2px 6px rgba(255,255,255,0.12), inset 0 -3px 10px rgba(0,0,0,0.65)",
          }}>
            {/* Inner gold pinline */}
            <div style={{
              width: "100%", height: "100%", borderRadius: "1000px",
              background: "linear-gradient(180deg,rgba(234,179,8,0.55),rgba(234,179,8,0.12))",
              padding: 1.5,
            }}>
              {/* Felt */}
              <div style={{
                width: "100%", height: "100%", borderRadius: "1000px",
                position: "relative", overflow: "hidden",
                background: "radial-gradient(ellipse at 50% 28%, #0c8a60 0%, #065f46 42%, #043b2b 72%, #02291d 100%)",
                boxShadow: "inset 0 0 70px rgba(0,0,0,0.8), inset 0 2px 14px rgba(255,255,255,0.05)",
              }}>
                {/* Felt sheen sweep */}
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.035) 46%, transparent 62%)",
                }} />
                {/* Racetrack line */}
                <div style={{
                  position: "absolute", inset: "12% 9%", borderRadius: "1000px",
                  border: "1.5px solid rgba(234,179,8,0.15)",
                  boxShadow: "inset 0 0 26px rgba(0,0,0,0.3)",
                }} />
                {/* Brand watermark — felt pe embossed (pot ke neeche wali jagah) */}
                <div style={{
                  position: "absolute", left: 0, right: 0, bottom: "12%",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 3,
                  pointerEvents: "none",
                }}>
                  <div style={{
                    fontSize: "clamp(15px, 4.5vw, 26px)", fontWeight: 900, letterSpacing: 6,
                    color: "rgba(255,255,255,0.05)", textShadow: "0 1px 0 rgba(0,0,0,0.3)",
                  }}>NINE CARD</div>
                  <div style={{ fontSize: 11, letterSpacing: 8, color: "rgba(234,179,8,0.10)" }}>
                    ♠ ♥ ♣ ♦
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pot — poker PotDisplay jaisa */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)", textAlign: "center", zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: "linear-gradient(180deg, rgba(23,16,40,0.95), rgba(5,3,12,0.97))",
            padding: "8px 20px", borderRadius: 999,
            border: `1px solid rgba(234,179,8,0.45)`, backdropFilter: "blur(8px)",
            boxShadow: `0 0 22px rgba(234,179,8,0.18), 0 8px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)`,
          }}>
            {/* Gold chip coin */}
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: 'radial-gradient(circle at 35% 30%, #fef08a 0%, #eab308 48%, #a16207 100%)',
              border: '1px dashed rgba(0,0,0,0.35)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Coins size={13} color="#451a03" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 8, color: G.l, opacity: 0.75, letterSpacing: 2, fontWeight: 800 }}>POT</div>
              <div style={{
                fontSize: 20, fontWeight: 900, lineHeight: 1,
                background: 'linear-gradient(180deg,#fff 30%,#fde68a)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>₹{table.pot}</div>
            </div>
          </div>

          <div style={{
            fontSize: 9, fontWeight: 800, letterSpacing: 1,
            color: 'rgba(234,179,8,0.75)',
            background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(234,179,8,0.2)',
            padding: '2.5px 10px', borderRadius: 99,
          }}>
            CALL ₹{table.currentCallAmount}
          </div>

          {table.status === 'waiting' && (
            <div style={{
              fontSize: 11, fontWeight: 800, color: E.l,
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
              padding: '3px 12px', borderRadius: 12,
              animation: waitingCountdown !== null ? "pulse 1.5s infinite" : undefined,
            }}>
              {waitingCountdown !== null
                ? `Starting in ${waitingCountdown}s`
                : `Waiting for players ${Object.keys(table.players).length}/${table.minPlayers}+`}
            </div>
          )}
        </div>

        {/* ── Seats ── */}
        {seats.map((seat, i) => {
          const pos    = SEAT_COORDS[i];
          const isTurn = table.currentTurn === seat?.uid && table.status === 'playing';
          const player = seat?.p as NineCardPlayer | undefined;
          const isHero = seat?.uid === myUid;

          const firstName = isHero
            ? "YOU"
            : String(player?.displayName || 'Player').replace(/\s.*/, '');

          const isShowPhase = table.status === 'finished' || table.status === 'showdown';
          const isWinner    = seat?.uid === table.winnerId;
          const heroHasSeen = myPlayer?.seenCards ?? false;
          const revealCards = isShowPhase || (isHero && heroHasSeen);
          const packed      = player?.status === 'packed';
          const statusCfg   = player ? (STATUS_CFG[player.status] || STATUS_CFG.blind) : null;

          const avSz   = isHero ? 50 : 44;
          const ringSz = avSz + 8;

          // Empty seat
          if (!seat) {
            return (
              <div key={i} style={{
                position: "absolute", top: `${pos.top}%`, left: `${pos.left}%`,
                transform: "translate(-50%, -50%)", zIndex: 20,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  border: "1.5px dashed rgba(255,255,255,0.12)",
                  background: "radial-gradient(circle,rgba(255,255,255,0.03),transparent 70%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, color: 'rgba(255,255,255,0.2)',
                }}>+</div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.18)', fontWeight: 700, letterSpacing: 1 }}>OPEN</div>
              </div>
            );
          }

          return (
            <div key={i} style={{
              position: "absolute", top: `${pos.top}%`, left: `${pos.left}%`,
              transform: "translate(-50%, -50%)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 5, zIndex: 20,
              opacity: packed ? 0.45 : 1, transition: 'opacity 0.4s',
            }}>
              {/* Winner banner — poker WIN pill jaisa */}
              {isWinner && isShowPhase && (
                <div style={{
                  position: 'absolute', top: -26, left: '50%', transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap', zIndex: 50, animation: 'slideUp 0.4s ease-out',
                }}>
                  <span style={{
                    fontSize: 9, fontWeight: 900, padding: '3px 10px', borderRadius: 99,
                    background: `linear-gradient(135deg,${G.l},${G.m})`, color: '#000',
                    boxShadow: `0 2px 12px ${G.glow}`,
                  }}>🏆 WIN ₹{table.pot}</span>
                </div>
              )}

              {/* Cards */}
              <div style={{
                display: "flex", gap: 3, order: pos.cardDir === 'down' ? 3 : 1,
                filter: isShowPhase && isWinner
                  ? `drop-shadow(0 0 8px ${G.m}) drop-shadow(0 0 16px ${G.m})`
                  : "none",
                transition: "filter 0.4s ease",
              }}>
                {player && !packed && (
                  player.cardIds.length > 0
                  ? player.cardIds.map((id, ci) => (
                      <div key={id} style={{
                        transform: `rotate(${(ci - (player.cardIds.length - 1) / 2) * 6}deg) translateY(${Math.abs(ci - (player.cardIds.length - 1) / 2) * 1.5}px)`,
                      }}>
                        <CardMini id={id} isBack={!revealCards} big={isHero} />
                      </div>
                    ))
                  : [1, 2].map(n => <CardMini key={n} isBack big={isHero} />)
                )}
                {packed && (
                  <div style={{
                    fontSize: 9, fontWeight: 800, color: '#f87171',
                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                    padding: '3px 10px', borderRadius: 10,
                  }}>PACKED</div>
                )}
              </div>

              {/* Avatar + timer ring — poker jaisa */}
              <div style={{ position: "relative", width: ringSz, height: ringSz, order: 2, flexShrink: 0 }}>
                {isTurn && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    border: `2px solid ${G.m}`,
                    animation: 'winnerPulse 1.5s ease-out infinite',
                    zIndex: 10, pointerEvents: 'none',
                  }} />
                )}
                {isTurn && <TimerRing seconds={turnTime} size={ringSz} />}
                {isWinner && isShowPhase && (
                  <div style={{
                    position: 'absolute', inset: -3, borderRadius: '50%',
                    background: `conic-gradient(${G.l},${G.m},${G.d},${G.l})`,
                    animation: 'dealerSpin 3s linear infinite', zIndex: 8,
                  }} />
                )}
                <div style={{
                  position: 'absolute', inset: isWinner && isShowPhase ? 3 : 2, borderRadius: "50%",
                  background: isHero
                    ? "linear-gradient(135deg,#064e3b,#022c22)"
                    : "linear-gradient(135deg,#1e293b,#0f172a)",
                  border: `2px solid ${
                    isWinner && isShowPhase ? G.m : isTurn ? G.m : isHero ? E.m : '#334155'
                  }`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: isHero ? 17 : 14, fontWeight: 900, overflow: "hidden", zIndex: 12,
                  color: isHero ? E.l : '#94a3b8',
                  boxShadow: isWinner && isShowPhase
                    ? `0 0 20px ${G.glow},0 4px 12px rgba(0,0,0,0.8)`
                    : isTurn
                    ? '0 0 12px rgba(234,179,8,0.35),0 4px 10px rgba(0,0,0,0.7)'
                    : '0 4px 10px rgba(0,0,0,0.6)',
                  transition: 'box-shadow 0.3s,border-color 0.3s',
                }}>
                  {player?.photoURL
                    ? <img src={player.photoURL} style={{ width: "100%", height: "100%", objectFit: 'cover' }} alt="" />
                    : (firstName[0] || '?')
                  }
                </div>
                {isWinner && isShowPhase && (
                  <div style={{
                    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                    fontSize: 17, lineHeight: 1, zIndex: 15,
                    filter: `drop-shadow(0 0 4px ${G.m})`,
                  }}>👑</div>
                )}
              </div>

              {/* Name + status + bet — poker seat plate jaisa */}
              {player && (
                <div style={{
                  background: "rgba(8,5,18,0.92)",
                  border: `1px solid ${isTurn ? 'rgba(234,179,8,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  padding: "3px 10px", borderRadius: 10, textAlign: "center", minWidth: 76,
                  order: pos.cardDir === 'up' ? 3 : 1,
                  backdropFilter: 'blur(6px)',
                  boxShadow: isTurn ? '0 0 10px rgba(234,179,8,0.2)' : 'none',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: isHero ? E.l : '#e2e8f0' }}>{firstName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 1 }}>
                    {statusCfg && (
                      <span style={{
                        fontSize: 8, fontWeight: 800, color: statusCfg.color,
                        background: statusCfg.bg, padding: '1px 6px', borderRadius: 6,
                      }}>{statusCfg.label}</span>
                    )}
                    {(player.totalBet || 0) > 0 && (
                      <span style={{ fontSize: 8.5, fontWeight: 800, color: G.l }}>₹{player.totalBet}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer: turn hint / action bar ── */}
      <div style={{
        flexShrink: 0, zIndex: 100,
        padding: "10px 15px",
        paddingBottom: "calc(14px + env(safe-area-inset-bottom))",
        background: "linear-gradient(to top, #080512 65%, transparent)",
      }}>
        {isMyTurn ? (
          <div style={{ width: "100%", maxWidth: 460, margin: '0 auto' }}>
            {/* Turn timer bar — action bar ke upar thin progress */}
            <div style={{
              height: 3, borderRadius: 99, marginBottom: 9,
              background: 'rgba(255,255,255,0.07)', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: `${(Math.max(0, turnTime) / TURN_SECS) * 100}%`,
                background: turnTime <= 5
                  ? 'linear-gradient(90deg,#ef4444,#f97316)'
                  : 'linear-gradient(90deg,#10b981,#eab308)',
                transition: 'width 0.5s linear, background 0.3s',
                boxShadow: turnTime <= 5 ? '0 0 8px rgba(239,68,68,0.6)' : '0 0 8px rgba(234,179,8,0.4)',
              }} />
            </div>

            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              {/* PACK */}
              <ActionBtn3D
                label="Pack"
                variant="fold"
                onClick={() => act(() => nineCardApi.pack(tableId!), 'light')}
              />

              {/* SEE — only if not yet seen */}
              {!hasSeenCards && (
                <ActionBtn3D
                  label="See"
                  variant="see"
                  onClick={() => act(() => nineCardApi.seeCards(tableId!), 'light')}
                />
              )}

              {/* CALL — primary (double width) */}
              <ActionBtn3D
                label="Call"
                sublabel={`₹${table.currentCallAmount}`}
                variant="call"
                grow={2}
                onClick={() => act(() => nineCardApi.call(tableId!))}
              />

              {/* SHOW — only after seen */}
              {hasSeenCards && (
                <ActionBtn3D
                  label="Show"
                  variant="show"
                  onClick={() => act(() => nineCardApi.show(tableId!))}
                />
              )}
            </div>
          </div>
        ) : table.status === 'playing' && turnName ? (
          <div style={{
            textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#64748b',
            padding: '8px 0',
          }}>
            Waiting on <span style={{ color: G.l }}>{turnName}</span>…
          </div>
        ) : null}
      </div>

      {/* ── AFK Warning overlay ── */}
      {showAfkWarning && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          zIndex: 150, padding: '8px 18px', borderRadius: 14,
          background: 'rgba(185,28,28,0.95)', border: '1px solid rgba(239,68,68,0.5)',
          color: '#fca5a5', fontWeight: 800, fontSize: 12,
          animation: 'afkPulse 1s ease-in-out infinite',
          boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
          whiteSpace: 'nowrap',
        }}>
          ⚠ Act now! Auto-pack in {Math.ceil(turnTime)}s
        </div>
      )}

      {/* ── Confetti on win ── */}
      <WinCelebration trigger={showResult && !!(resultData && !resultData.isDraw)} />

      {/* ── Winner Result Overlay ── */}
      {showResult && resultData && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(2,6,23,0.9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 200, flexDirection: "column", gap: 16,
          backdropFilter: "blur(6px)", animation: 'slideUp 0.3s ease-out',
        }}>
          <div style={{
            background: "linear-gradient(160deg,#0f172a,#080512)",
            border: `1.5px solid ${G.m}`,
            borderRadius: 26, padding: "28px 34px", textAlign: "center",
            minWidth: 290, maxWidth: '90vw',
            boxShadow: `0 0 50px ${G.glow}`,
          }}>
            <div style={{ fontSize: 44, filter: `drop-shadow(0 0 10px ${G.m})` }}>
              {resultData.isDraw ? '🤝' : '🏆'}
            </div>

            <div style={{ fontSize: 22, fontWeight: 900, color: G.l, marginTop: 8 }}>
              {resultData.isDraw ? "Draw!" : `${resultData.name} Wins!`}
            </div>
            <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>
              {resultData.isDraw ? `Pot split ₹${resultData.pot}` : `₹${resultData.pot} won`}
            </div>

            {/* All players' cards face-up */}
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              {table.playerOrder.map(uid => {
                const p = table.players[uid];
                if (!p) return null;
                const isWin = uid === table.winnerId;
                const name  = uid === myUid ? "YOU" : String(p.displayName || 'Player').replace(/\s.*/, '');
                return (
                  <div key={uid} style={{
                    display: "flex", alignItems: "center", justifyContent: 'space-between', gap: 10,
                    background: isWin ? "rgba(234,179,8,0.1)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isWin ? 'rgba(234,179,8,0.5)' : "rgba(255,255,255,0.07)"}`,
                    borderRadius: 14, padding: "8px 14px",
                    boxShadow: isWin ? `0 0 14px rgba(234,179,8,0.25)` : "none",
                  }}>
                    <div style={{
                      fontSize: 11, fontWeight: 800,
                      color: isWin ? G.l : "#94a3b8", minWidth: 48, textAlign: 'left',
                    }}>
                      {isWin ? "🏆 " : ""}{name}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {(p.cardIds || []).map(id => (
                        <CardMini key={id} id={id} isBack={false} />
                      ))}
                      {p.status === 'packed' && (
                        <span style={{ fontSize: 9, fontWeight: 800, color: '#f87171', alignSelf: 'center' }}>PACKED</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: 11, color: "#475569", marginTop: 16 }}>
              ⏳ Next hand starting…
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%   { opacity: 0.6; }
          50%  { opacity: 1; transform: scale(1.04); }
          100% { opacity: 0.6; }
        }
        @keyframes winnerPulse {
          0%   { transform: scale(1);    opacity: 0.9; }
          100% { transform: scale(1.22); opacity: 0; }
        }
        @keyframes dealerSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes afkPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
          50%     { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
        }
      `}</style>
    </div>
  );
}
