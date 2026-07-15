// ============================================================
// NineCardGame.tsx — FIXED VERSION
// FIXES:
//  1. displayName.split crash → optional chaining + fallback
//  2. Auto new hand after 'finished' → useEffect calls reset
//  3. Seen status visible to opponent (backend already sets it)
//  4. Show button only when seenCards = true
//  5. Timer clock sync (existing fix preserved)
//  6. autoStartFired guard (existing fix preserved)
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { nineCardApi, subscribeNineCardTable } from '../../firebase/nineCardApi';
import type { NineCardTable, NineCardPlayer } from '../../firebase/nineCardApi';
import { Plus, ArrowLeft } from 'lucide-react';

const G = { l: "#fef08a", m: "#eab308", d: "#a16207" };
const E = { l: "#6ee7b7", m: "#10b981", d: "#065f46" };

const SEAT_COORDS = [
  { left: 50, top: 88, cardDir: 'up' },    // Bottom - Hero
  { left: 12, top: 50, cardDir: 'right' }, // Left
  { left: 50, top: 12, cardDir: 'down' },  // Top
  { left: 88, top: 50, cardDir: 'left' },  // Right
];

// ── Suit symbol helper ────────────────────────────────────────
const suitSymbol = (s: string) =>
  s === 'S' ? '♠' : s === 'H' ? '♥' : s === 'D' ? '♦' : '♣';

const CardMini = ({ id, isBack }: { id?: string; isBack?: boolean }) => (
  <div style={{
    width: 26, height: 38, borderRadius: 4,
    background: isBack ? "linear-gradient(135deg, #1e3a5f, #0f172a)" : "#fff",
    border: isBack ? "1px solid #2d5a8e" : "1px solid #ddd",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 10, fontWeight: "bold",
    color: id && "HD".includes(id.slice(-1)) ? "#ef4444" : "#000",
    boxShadow: "0 2px 4px rgba(0,0,0,0.4)", flexShrink: 0
  }}>
    {!isBack && id ? (
      <div style={{ textAlign: "center", lineHeight: 1 }}>
        <div>{id.slice(0, -1)}</div>
        <div style={{ fontSize: 8 }}>{suitSymbol(id.slice(-1))}</div>
      </div>
    ) : "♣"}
  </div>
);

// ── Status badge color ────────────────────────────────────────
const statusColor = (status: string) => {
  if (status === 'packed') return '#ef4444';
  if (status === 'seen')   return '#60a5fa';
  if (status === 'show')   return '#fbbf24';
  return E.l;
};

export default function NineCardGame() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { user, wallet } = useAuth();
  const myUid = user?.uid || "";

  const [table, setTable] = useState<NineCardTable | null>(null);
  const [turnTime, setTurnTime] = useState(30);
  const [waitingCountdown, setWaitingCountdown] = useState<number | null>(null);

  // Winner overlay state
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<{ name: string; pot: number; isDraw: boolean } | null>(null);

  // Clock sync offset
  const [serverOffsetMs, setServerOffsetMs] = useState(0);

  // Guards
  const autoStartFiredRef = useRef(false);
  const autoResetFiredRef = useRef(false);       // FIX #2: prevent double-reset
  const prevStatusRef     = useRef<string | null>(null);

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
        setTurnTime(Math.max(0, 30 - elapsed));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [table?.currentTurn, table?.status, serverOffsetMs]);

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

  // ── FIX #2: Auto New Hand after 'finished' ──────────────────
  // Show result for 4 seconds, then auto-reset for next hand
  useEffect(() => {
    if (!table || !tableId) return;

    if (table.status === 'finished' && prevStatusRef.current !== 'finished') {
      // Show winner overlay
      const winnerPlayer = table.winnerId ? table.players[table.winnerId] : null;
      setResultData({
        // FIX #1 applied here too — safe name access
        name:   winnerPlayer ? String(winnerPlayer.displayName || 'Player').replace(/\s.*/, '') : 'No one',
        pot:    table.pot,
        isDraw: table.isDraw,
      });
      setShowResult(true);
      autoResetFiredRef.current = false;

      // After 4 seconds, auto-reset for next hand
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
    if (tableId) {
      try { await nineCardApi.leave(tableId); }
      catch (err) { console.error('Leave failed', err); }
    }
    navigate(-1);
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

  if (!table) return null;

  const amount  = wallet?.totalBalance ?? 0;
  const myPlayer   = table.players[myUid];
  const isMyTurn   = table.currentTurn === myUid && table.status === 'playing';
  const hasSeenCards = myPlayer?.seenCards ?? false;

  return (
    <div style={{
      width: "100%", height: "100vh", backgroundColor: "#020617",
      overflow: "hidden", color: "#fff", fontFamily: "sans-serif", position: "relative"
    }}>

      {/* ── Header ── */}
      <div style={{
        position: "absolute", top: 0, width: "100%", padding: "12px 15px",
        display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 50
      }}>
        <button onClick={handleExit} style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          color: "#fff", padding: "6px 12px", borderRadius: 10,
          display: "flex", alignItems: "center", gap: 5, fontSize: 13, cursor: "pointer"
        }}>
          <ArrowLeft size={16}/> Exit
        </button>
        <div style={{
          textAlign: "right", background: "rgba(15,23,42,0.8)",
          padding: "4px 12px", borderRadius: 12, border: "1px solid #1e293b"
        }}>
          <div style={{ fontSize: 9, opacity: 0.5 }}>BALANCE</div>
          <div style={{ color: G.l, fontWeight: 900, fontSize: 14 }}>₹{amount}</div>
        </div>
      </div>

      {/* ── Table Area ── */}
      <div style={{ position: "relative", width: "100%", height: "70%", top: "10%" }}>
        {/* Oval felt */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "82%", height: "60%", borderRadius: "1000px",
          background: "radial-gradient(circle at 50% 30%, #065f46 0%, #022c22 100%)",
          border: "8px solid #1e293b",
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.8), 0 15px 40px rgba(0,0,0,0.9)",
        }} />

        {/* Pot */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)", textAlign: "center", zIndex: 10
        }}>
          <div style={{
            background: "rgba(0,0,0,0.85)", padding: "6px 16px", borderRadius: "18px",
            border: `1px solid ${G.m}40`, backdropFilter: "blur(8px)", minWidth: 100
          }}>
            <div style={{ fontSize: 8, color: G.l, opacity: 0.7, letterSpacing: 1.5, fontWeight: "bold" }}>POT</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>₹{table.pot}</div>
          </div>
          {table.status === 'waiting' && waitingCountdown !== null && (
            <div style={{
              marginTop: 8, fontSize: 11, fontWeight: "bold", color: G.l,
              textShadow: "0 2px 4px rgba(0,0,0,0.5)", animation: "pulse 1.5s infinite"
            }}>
              Start in {waitingCountdown}s
            </div>
          )}
        </div>

        {/* ── Seats ── */}
        {seats.map((seat, i) => {
          const pos    = SEAT_COORDS[i];
          const isTurn = table.currentTurn === seat?.uid;
          const player = seat?.p as NineCardPlayer | undefined;
          const isHero = seat?.uid === myUid;

          // FIX #1: safe displayName — never call .split on undefined/null
          const firstName = isHero
            ? "YOU"
            : String(player?.displayName || 'Player').replace(/\s.*/, '');

          // CARD REVEAL RULES:
          // - 'blind'    => nobody sees any cards (both sides show card back)
          // - 'seen'     => hero sees own cards only; opponent stays hidden
          // - 'show' / 'finished' / 'showdown' => all cards face-up for everyone
          const isShowPhase  = table.status === 'finished' || table.status === 'showdown';
          const isWinner     = seat?.uid === table.winnerId;
          const heroHasSeen  = myPlayer?.seenCards ?? false;
          // reveal this seat's cards only when:
          //   (a) showdown/finished (everyone revealed), OR
          //   (b) it's the hero's own seat AND they have already clicked SEE
          const revealCards  = isShowPhase || (isHero && heroHasSeen);

          return (
            <div key={i} style={{
              position: "absolute", top: `${pos.top}%`, left: `${pos.left}%`,
              transform: "translate(-50%, -50%)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 20
            }}>
              {/* Cards — face-up for all in show phase, winner gets gold glow */}
              <div style={{
                display: "flex", gap: 3, order: pos.cardDir === 'down' ? 3 : 1,
                // Gold glow on winner cards during show
                filter: isShowPhase && isWinner
                  ? "drop-shadow(0 0 8px #eab308) drop-shadow(0 0 16px #eab308)"
                  : "none",
                transition: "filter 0.4s ease"
              }}>
                {player && player.status !== 'packed' && (
                  player.cardIds.length > 0
                  ? player.cardIds.map(id => (
                      <CardMini
                        key={id}
                        id={id}
                        isBack={!revealCards}
                      />
                    ))
                  : [1, 2].map(n => <CardMini key={n} isBack />)
                )}
              </div>

              {/* Avatar with turn timer ring */}
              <div style={{ position: "relative", order: 2 }}>
                {isTurn && (
                  <svg style={{
                    position: "absolute", inset: -4, width: 60, height: 60, transform: "rotate(-90deg)"
                  }}>
                    <circle cx="30" cy="30" r="27" fill="none" stroke={E.m} strokeWidth="3"
                      strokeDasharray={169.6}
                      strokeDashoffset={169.6 * (1 - turnTime / 30)}
                      style={{ transition: "stroke-dashoffset 0.5s linear" }}
                    />
                  </svg>
                )}
                <div style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: isHero ? "linear-gradient(135deg, #064e3b, #022c22)" : "#1e293b",
                  border: `2px solid ${isWinner && isShowPhase ? "#eab308" : isTurn ? E.m : isHero ? E.l : "#334155"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: "bold", overflow: "hidden",
                  boxShadow: isWinner && isShowPhase ? "0 0 14px #eab30888" : "none",
                }}>
                  {player?.photoURL
                    ? <img src={player.photoURL} style={{ width: "100%" }} alt="avatar" />
                    : (firstName[0] || <Plus size={18} color="#334155"/>)
                  }
                </div>
                {/* Winner crown badge */}
                {isWinner && isShowPhase && (
                  <div style={{
                    position: "absolute", top: -10, left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: 18, lineHeight: 1,
                    filter: "drop-shadow(0 0 4px #eab308)",
                  }}>👑</div>
                )}
              </div>

              {/* Name + Status badge */}
              {player && (
                <div style={{
                  background: "rgba(15,23,42,0.9)",
                  border: `1px solid ${isTurn ? E.m : "#334155"}`,
                  padding: "3px 10px", borderRadius: 10, textAlign: "center", minWidth: 70,
                  order: pos.cardDir === 'up' ? 3 : 1
                }}>
                  {/* FIX #1: firstName already safe */}
                  <div style={{ fontSize: 9, fontWeight: "bold" }}>{firstName}</div>
                  <div style={{
                    fontSize: 8, fontWeight: "bold",
                    color: statusColor(player.status)
                  }}>
                    {player.status.toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Action Buttons ── */}
      {isMyTurn && (
        <div style={{
          position: "fixed", bottom: 0, width: "100%",
          padding: "20px 15px", paddingBottom: "35px",
          background: "linear-gradient(to top, #020617, transparent)",
          display: "flex", gap: 8, justifyContent: "center", zIndex: 100
        }}>
          <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 450 }}>
            {/* PACK */}
            <button
              onClick={() => { nineCardApi.pack(tableId!).catch(() => {}); }}
              style={{
                flex: 1, height: 50, borderRadius: 12, border: 0,
                background: "rgba(239,68,68,0.2)", color: "#f87171",
                fontWeight: "bold", fontSize: 13, cursor: "pointer"
              }}
            >
              PACK
            </button>

            {/* SEE — only if not yet seen */}
            {!hasSeenCards && (
              <button
                onClick={() => { nineCardApi.seeCards(tableId!).catch(() => {}); }}
                style={{
                  flex: 1, borderRadius: 12, border: 0,
                  background: "rgba(59,130,246,0.2)", color: "#60a5fa",
                  fontWeight: "bold", fontSize: 13, cursor: "pointer"
                }}
              >
                SEE
              </button>
            )}

            {/* CALL */}
            <button
              onClick={() => { nineCardApi.call(tableId!).catch(() => {}); }}
              style={{
                flex: 2, borderRadius: 12, border: 0,
                background: E.m, color: "#fff",
                fontWeight: "900", fontSize: 15, cursor: "pointer"
              }}
            >
              CALL ₹{table.currentCallAmount}
            </button>

            {/* SHOW — FIX #4: only visible after seenCards = true */}
            {hasSeenCards && (
              <button
                onClick={() => { nineCardApi.show(tableId!).catch(() => {}); }}
                style={{
                  flex: 1, borderRadius: 12, border: 0,
                  background: "rgba(234,179,8,0.2)", color: G.m,
                  fontWeight: "bold", fontSize: 13, cursor: "pointer"
                }}
              >
                SHOW
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Winner Result Overlay with card reveal ── */}
      {showResult && resultData && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 200, flexDirection: "column", gap: 16,
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "#0f172a", border: `2px solid ${G.m}`,
            borderRadius: 24, padding: "28px 36px", textAlign: "center",
            minWidth: 280, boxShadow: `0 0 40px ${G.m}44`
          }}>

            {/* Trophy / Draw icon */}
            {resultData.isDraw ? (
              <div style={{ fontSize: 40 }}>🤝</div>
            ) : (
              <div style={{ fontSize: 40 }}>🏆</div>
            )}

            {/* Winner name */}
            <div style={{ fontSize: 22, fontWeight: 900, color: G.l, marginTop: 8 }}>
              {resultData.isDraw ? "Draw!" : `${resultData.name} Wins!`}
            </div>
            <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>
              {resultData.isDraw ? `Pot split ₹${resultData.pot}` : `₹${resultData.pot} won`}
            </div>

            {/* All players' cards shown face-up in overlay */}
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              {table.playerOrder.map(uid => {
                const p        = table.players[uid];
                if (!p) return null;
                const isWin    = uid === table.winnerId;
                const name     = uid === myUid ? "YOU" : String(p.displayName || 'Player').replace(/\s.*/, '');
                return (
                  <div key={uid} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: isWin ? "rgba(234,179,8,0.1)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isWin ? G.m : "#1e293b"}`,
                    borderRadius: 12, padding: "8px 14px",
                    boxShadow: isWin ? `0 0 12px ${G.m}55` : "none"
                  }}>
                    {/* Name */}
                    <div style={{ fontSize: 11, fontWeight: "bold", color: isWin ? G.l : "#94a3b8", minWidth: 40 }}>
                      {isWin ? "🏆 " : ""}{name}
                    </div>
                    {/* Cards face-up */}
                    <div style={{ display: "flex", gap: 4 }}>
                      {(p.cardIds || []).map(id => (
                        <CardMini key={id} id={id} isBack={false} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: 11, color: "#475569", marginTop: 18 }}>
              ⏳ Next hand starting...
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%   { opacity: 0.6; }
          50%  { opacity: 1; transform: scale(1.05); }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
