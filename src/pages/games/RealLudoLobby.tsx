import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/config";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { ludoApi } from "../../lib/apiClient";

const TIER: any = {
  Bronze:  { color: "#f97316", icon: "🥉", label: "BRONZE" },
  Silver:  { color: "#94a3b8", icon: "🥈", label: "SILVER" },
  Gold:    { color: "#fbbf24", icon: "🥇", label: "GOLD"   },
  Diamond: { color: "#c084fc", icon: "💎", label: "DIAMOND"},
};

export default function Lobby() {
  const { firebaseUser, user, wallet } = useAuth();
  const navigate = useNavigate();
  const uid = firebaseUser?.uid;
  const name = user?.name || "Player";
  const avatar = firebaseUser?.photoURL || "";
  const balance = wallet?.totalBalance ?? 0;
  const initial = name.charAt(0).toUpperCase();

  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinedTable, setJoinedTable] = useState<string | null>(null);
  const [startingTableId, setStartingTableId] = useState<string | null>(null);

  const tablesUnsubRef = useRef<any>(null);
  const gameUnsubRef = useRef<any>(null);
  const startCalledRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "ludoTables"), where("status", "in", ["waiting", "playing"]));
    tablesUnsubRef.current = onSnapshot(q, async (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() as any }));
      data.sort((a: any, b: any) => (a.entryFee || 0) - (b.entryFee || 0));
      setTables(data);
      setLoading(false);

      if (!uid) return;
      for (const t of data) {
        const players = t.players || t.playerUids || [];
        if (!players.includes(uid)) continue;
        if (t.status === "waiting" && players.length === 2 && !startCalledRef.current[t.id]) {
          startCalledRef.current[t.id] = true;
          setStartingTableId(t.id);
          try { await ludoApi.start(t.id); }
          catch { startCalledRef.current[t.id] = false; }
          finally { setStartingTableId(null); }
        }
        if (t.status === "playing") setJoinedTable(t.id);
      }
    }, () => { setError("Failed to load tables"); setLoading(false); });

    return () => { tablesUnsubRef.current?.(); gameUnsubRef.current?.(); };
  }, [uid]);

  useEffect(() => {
    if (!joinedTable) return;
    gameUnsubRef.current?.();
    gameUnsubRef.current = onSnapshot(doc(db, "ludoGames", joinedTable), (snap) => {
      const data = snap.data();
      if (!data) return;
      if (data.status === "playing") {
        gameUnsubRef.current?.();
        navigate(`/games/realludogame/${joinedTable}`);
      }
    });
    return () => gameUnsubRef.current?.();
  }, [joinedTable, navigate]);

  async function joinTable(table: any) {
    if (!uid) { setError("Please login first"); return; }
    if (balance < table.entryFee) { setError(`Need ₹${table.entryFee}`); return; }
    if (table.status !== "waiting") { setError("Game already started"); return; }
    const players = table.players || table.playerUids || [];
    if (players.length >= 2) { setError("Table is full"); return; }
    setJoiningId(table.id); setError("");
    try {
      await ludoApi.join(table.id, name, avatar);
      setJoinedTable(table.id);
    } catch (e: any) { setError(e.message || "Failed to join"); setJoinedTable(null); }
    finally { setJoiningId(null); }
  }

  return (
    <div style={styles.root}>
      <style>{KEYFRAMES}</style>

      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.userInfo}>
          {avatar
            ? <img src={avatar} alt="av" style={styles.avatar}/>
            : <div style={styles.avatarFallback}>{initial}</div>}
          <div style={{ minWidth: 0 }}>
            <div style={styles.userName}>{name}</div>
            <div style={styles.userStatus}>
              <span style={styles.statusDot}/>Online
            </div>
          </div>
        </div>
        <div style={styles.wallet}>
          <div style={styles.walletIcon}>💰</div>
          <div>
            <div style={styles.walletLabel}>WALLET</div>
            <div style={styles.walletAmount}>₹{balance}</div>
          </div>
        </div>
      </div>

      {/* HERO */}
      <div style={styles.hero}>
        <div style={styles.heroGlow}/>
        <div style={styles.heroContent}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
            <div style={styles.heroEmoji}>🎲</div>
            <div>
              <div style={styles.heroTitle}>LUDO ARENA</div>
              <div style={styles.heroSub}>Play & win real cash</div>
            </div>
          </div>
          <div style={styles.livePill}>
            <span style={styles.liveDot}/>LIVE
          </div>
        </div>
      </div>

      {/* SECTION HEADER */}
      <div style={styles.secHead}>
        <div>
          <div style={styles.secTitle}>ACTIVE TABLES</div>
          <div style={styles.secSub}>{tables.length} available · 2 player</div>
        </div>
        <button style={styles.filterBtn}>⚡ All</button>
      </div>

      {/* TABLES */}
      {loading ? (
        <div style={styles.centerBox}>
          <div style={styles.spinner}/>
          <div style={{ color: "#64748b", fontSize: 13, marginTop: 12 }}>Loading tables...</div>
        </div>
      ) : tables.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: 40 }}>📭</div>
          <div style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600 }}>No tables available</div>
          <div style={{ color: "#475569", fontSize: 11 }}>Check back in a moment</div>
        </div>
      ) : (
        <div style={styles.tableGrid}>
          {tables.map(table => {
            const players = table.players || table.playerUids || [];
            const pc = players.length;
            const isFull = pc >= 2;
            const isJoined = players.includes(uid);
            const isStarting = startingTableId === table.id;
            const isJoining = joiningId === table.id;
            const canJoin = !isFull && !isJoined && balance >= (table.entryFee || 0) && table.status === "waiting";
            const tc = TIER[table.tier || "Bronze"] || TIER.Bronze;
            const prizePool = table.prizePool || (table.entryFee || 0) * 2;
            const winAmount = Math.round(prizePool * 0.9);

            return (
              <div key={table.id} style={{
                ...styles.card,
                borderColor: isJoined ? tc.color : "rgba(255,255,255,0.08)",
                boxShadow: isJoined ? `0 0 0 1px ${tc.color}44, 0 12px 30px ${tc.color}22` : "0 8px 20px rgba(0,0,0,0.3)",
              }}>
                {/* Left color stripe */}
                <div style={{ ...styles.cardStripe, background: `linear-gradient(180deg, ${tc.color}, ${tc.color}66)` }}/>

                {/* Card top row */}
                <div style={styles.cardTop}>
                  <div style={styles.tierChip(tc.color)}>
                    <span style={{ fontSize: 14 }}>{tc.icon}</span>
                    <span>{tc.label}</span>
                  </div>
                  <div style={styles.statusChip(table.status)}>
                    {table.status === "playing" ? "🔴 LIVE" : "🟢 OPEN"}
                  </div>
                </div>

                {/* Entry + prize display */}
                <div style={styles.priceRow}>
                  <div style={styles.entryBox}>
                    <div style={styles.smallLbl}>ENTRY</div>
                    <div style={styles.entryVal}>₹{table.entryFee}</div>
                  </div>
                  <div style={styles.arrow}>→</div>
                  <div style={styles.winBox}>
                    <div style={styles.smallLbl}>WIN UPTO</div>
                    <div style={styles.winVal}>₹{winAmount}</div>
                  </div>
                </div>

                {/* Player slots */}
                <div style={styles.slotRow}>
                  <PlayerSlot pId={players[0]} uid={uid} names={table.playerNames} avatars={table.playerAvatars} color="#3b82f6"/>
                  <div style={styles.vsBadge}>VS</div>
                  <PlayerSlot pId={players[1]} uid={uid} names={table.playerNames} avatars={table.playerAvatars} color="#22c55e"/>
                </div>

                {/* Stats footer */}
                <div style={styles.statsRow}>
                  <div style={styles.statCell}>
                    <span style={{ color: "#fbbf24" }}>💎</span>
                    <span>₹{prizePool} pool</span>
                  </div>
                  <div style={styles.statCell}>
                    <span style={{ color: isFull ? "#f87171" : "#60a5fa" }}>👥</span>
                    <span>{pc}/2 seats</span>
                  </div>
                </div>

                {/* Action */}
                {isJoined ? (
                  <div style={styles.joinedBar(tc.color)}>
                    <span style={styles.pulseDot(tc.color)}/>
                    <span>{isStarting ? "Starting game..." : isFull ? "Both joined, starting..." : "Waiting for opponent..."}</span>
                  </div>
                ) : isFull ? (
                  <button style={styles.fullBtn} disabled>TABLE FULL</button>
                ) : (
                  <button
                    style={{ ...styles.joinBtn(tc.color), opacity: canJoin && !isJoining ? 1 : 0.5, cursor: canJoin && !isJoining ? "pointer" : "not-allowed" }}
                    onClick={() => canJoin && !isJoining && joinTable(table)}
                    disabled={!canJoin || isJoining}
                  >
                    {isJoining ? "JOINING..." : !uid ? "LOGIN TO PLAY" : balance < table.entryFee ? `NEED ₹${table.entryFee - balance} MORE` : `JOIN — ₹${table.entryFee}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div style={styles.toast}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ flex: 1 }}>{error}</span>
          <button style={styles.toastClose} onClick={() => setError("")}>✕</button>
        </div>
      )}
    </div>
  );
}

function PlayerSlot({ pId, uid, names, avatars, color }: any) {
  if (!pId) {
    return (
      <div style={{ ...slotStyles.card, border: `1.5px dashed ${color}55`, background: "rgba(255,255,255,0.02)" }}>
        <div style={{ ...slotStyles.circle, border: `1.5px dashed ${color}88`, background: "transparent", color: `${color}` }}>?</div>
        <div style={slotStyles.name}>Waiting</div>
      </div>
    );
  }
  const isMe = pId === uid;
  return (
    <div style={{ ...slotStyles.card, border: `1.5px solid ${color}88`, background: `${color}0f` }}>
      <div style={{ ...slotStyles.circle, border: `2px solid ${color}`, background: `${color}22` }}>
        {avatars?.[pId]
          ? <img src={avatars[pId]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}/>
          : <span>{(names?.[pId]?.[0] || "?").toUpperCase()}</span>}
      </div>
      <div style={slotStyles.name}>{names?.[pId] || "Player"}</div>
      {isMe && <div style={slotStyles.youTag}>YOU</div>}
    </div>
  );
}

const styles: any = {
  root: {
    minHeight: "100dvh",
    background: "radial-gradient(circle at top, #1e1b4b 0%, #0f172a 40%, #020617 100%)",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "12px 12px 80px", gap: 14,
    fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
    color: "#f8fafc", boxSizing: "border-box",
  },
  header: {
    width: "100%", maxWidth: 560,
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
    background: "linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.9))",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "10px 14px",
    backdropFilter: "blur(10px)",
  },
  userInfo: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  avatar: { width: 40, height: 40, borderRadius: "50%", objectFit: "cover" as any, border: "2px solid #fbbf24" },
  avatarFallback: {
    width: 40, height: 40, borderRadius: "50%",
    background: "linear-gradient(135deg,#fbbf24,#d97706)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 900, color: "#000", fontSize: 16,
  },
  userName: { fontSize: 14, fontWeight: 800, color: "#fff", lineHeight: 1.2 },
  userStatus: { fontSize: 10, color: "#22c55e", display: "flex", alignItems: "center", gap: 4, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" },
  wallet: {
    display: "flex", alignItems: "center", gap: 8,
    background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(217,119,6,0.08))",
    border: "1px solid rgba(251,191,36,0.3)", borderRadius: 12, padding: "6px 12px",
  },
  walletIcon: { fontSize: 22 },
  walletLabel: { fontSize: 8, letterSpacing: 1.5, color: "#fbbf24aa", fontWeight: 700 },
  walletAmount: { fontSize: 16, fontWeight: 900, color: "#fbbf24", lineHeight: 1 },

  hero: {
    width: "100%", maxWidth: 560, position: "relative" as any, overflow: "hidden",
    background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(147,51,234,0.15), rgba(251,191,36,0.1))",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: "14px 16px",
  },
  heroGlow: {
    position: "absolute" as any, top: -50, right: -50, width: 150, height: 150,
    borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,36,0.25), transparent 70%)",
    pointerEvents: "none" as any,
  },
  heroContent: { display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" as any },
  heroEmoji: {
    fontSize: 32, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))",
    animation: "float 3s ease-in-out infinite",
  },
  heroTitle: {
    fontSize: 20, fontWeight: 900, letterSpacing: 2,
    background: "linear-gradient(180deg,#fff,#94a3b8)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    lineHeight: 1,
  },
  heroSub: { fontSize: 11, color: "#94a3b8", marginTop: 3 },
  livePill: {
    display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
    borderRadius: 999, background: "rgba(239,68,68,0.15)",
    border: "1px solid rgba(239,68,68,0.4)", color: "#f87171",
    fontSize: 10, fontWeight: 900, letterSpacing: 1,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: "50%", background: "#ef4444",
    boxShadow: "0 0 8px #ef4444", animation: "pulse 1.5s infinite",
  },

  secHead: {
    width: "100%", maxWidth: 560,
    display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4,
  },
  secTitle: { fontSize: 13, fontWeight: 900, color: "#e2e8f0", letterSpacing: 1.5 },
  secSub: { fontSize: 10, color: "#64748b", marginTop: 2 },
  filterBtn: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#e2e8f0", borderRadius: 999, padding: "6px 12px",
    fontSize: 11, fontWeight: 700, cursor: "pointer",
  },

  centerBox: { width: "100%", maxWidth: 560, padding: 40, textAlign: "center" as any },
  spinner: {
    width: 32, height: 32, margin: "0 auto",
    borderRadius: "50%", border: "3px solid rgba(255,255,255,0.08)",
    borderTop: "3px solid #fbbf24", animation: "spin 1s linear infinite",
  },
  empty: {
    width: "100%", maxWidth: 560, padding: "40px 20px",
    display: "flex", flexDirection: "column" as any, alignItems: "center", gap: 8,
    background: "rgba(30,41,59,0.4)", border: "1px dashed rgba(255,255,255,0.08)",
    borderRadius: 16,
  },

  tableGrid: {
    width: "100%", maxWidth: 560,
    display: "grid", gridTemplateColumns: "1fr", gap: 12,
  },

  card: {
    position: "relative" as any, overflow: "hidden",
    background: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(2,6,23,0.95))",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16,
    padding: "12px 12px 12px 18px",
    display: "flex", flexDirection: "column" as any, gap: 10,
    transition: "all 0.3s",
  },
  cardStripe: {
    position: "absolute" as any, left: 0, top: 0, bottom: 0, width: 5,
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  tierChip: (color: string) => ({
    display: "flex", alignItems: "center", gap: 5,
    padding: "3px 9px", borderRadius: 999,
    background: `${color}20`, border: `1px solid ${color}55`,
    color, fontSize: 10, fontWeight: 900, letterSpacing: 1,
  }),
  statusChip: (status: string) => ({
    fontSize: 10, fontWeight: 900, letterSpacing: 1,
    color: status === "playing" ? "#f87171" : "#22c55e",
  }),

  priceRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "rgba(0,0,0,0.35)", borderRadius: 12, padding: "10px 14px",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  entryBox: { textAlign: "center" as any },
  winBox: { textAlign: "center" as any },
  smallLbl: { fontSize: 8, letterSpacing: 1.5, color: "#64748b", fontWeight: 700 },
  entryVal: { fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1.2 },
  winVal: {
    fontSize: 20, fontWeight: 900, lineHeight: 1.2,
    background: "linear-gradient(90deg, #fde68a, #fbbf24)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  arrow: { fontSize: 20, color: "#475569", fontWeight: 900 },

  slotRow: {
    display: "grid", gridTemplateColumns: "1fr auto 1fr",
    gap: 8, alignItems: "center",
  },
  vsBadge: {
    fontSize: 11, fontWeight: 900, color: "#fff",
    background: "linear-gradient(135deg, #ef4444, #b91c1c)",
    padding: "4px 8px", borderRadius: 8,
    boxShadow: "0 4px 10px rgba(239,68,68,0.3)",
  },

  statsRow: {
    display: "flex", justifyContent: "space-between",
    padding: "0 4px", fontSize: 10, color: "#94a3b8", fontWeight: 600,
  },
  statCell: { display: "flex", alignItems: "center", gap: 5 },

  joinedBar: (color: string) => ({
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "12px", borderRadius: 12,
    background: `linear-gradient(135deg, ${color}22, ${color}11)`,
    border: `1px solid ${color}55`, color,
    fontSize: 12, fontWeight: 800,
  }),
  pulseDot: (color: string) => ({
    width: 8, height: 8, borderRadius: "50%", background: color,
    boxShadow: `0 0 10px ${color}`, animation: "pulse 1.2s infinite",
  }),
  fullBtn: {
    width: "100%", padding: 12, borderRadius: 12,
    border: "1px solid rgba(248,113,113,0.3)",
    background: "rgba(248,113,113,0.1)",
    color: "#f87171", fontSize: 12, fontWeight: 900, letterSpacing: 1,
    cursor: "not-allowed",
  },
  joinBtn: (color: string) => ({
    width: "100%", padding: 12, borderRadius: 12, border: "none",
    background: `linear-gradient(135deg, ${color}, ${color}dd)`,
    color: "#000", fontSize: 13, fontWeight: 900, letterSpacing: 1,
    boxShadow: `0 6px 20px ${color}55`,
    transition: "transform 0.15s",
  }),

  toast: {
    position: "fixed" as any, left: 12, right: 12, bottom: 16,
    display: "flex", alignItems: "center", gap: 10,
    padding: "12px 14px", borderRadius: 14,
    background: "linear-gradient(135deg, rgba(127,29,29,0.95), rgba(69,10,10,0.95))",
    border: "1px solid rgba(248,113,113,0.4)",
    color: "#fff", fontSize: 13, fontWeight: 600,
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    zIndex: 999, maxWidth: 560, margin: "0 auto",
  },
  toastClose: {
    background: "transparent", border: "none", color: "#fff",
    fontSize: 16, cursor: "pointer", padding: 0,
  },
};

const slotStyles: any = {
  card: {
    minHeight: 60, borderRadius: 12, padding: "8px 6px",
    display: "flex", flexDirection: "column" as any, alignItems: "center",
    justifyContent: "center", gap: 4, position: "relative" as any,
  },
  circle: {
    width: 30, height: 30, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden", fontWeight: 900, fontSize: 12, color: "#fff",
  },
  name: {
    fontSize: 11, color: "#e2e8f0", fontWeight: 700,
    whiteSpace: "nowrap" as any, overflow: "hidden", textOverflow: "ellipsis",
    maxWidth: "100%",
  },
  youTag: {
    position: "absolute" as any, top: 4, right: 4,
    fontSize: 7, fontWeight: 900, padding: "1px 5px", borderRadius: 4,
    background: "#fbbf24", color: "#000", letterSpacing: 0.5,
  },
};

const KEYFRAMES = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
  @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
  * { box-sizing: border-box; }
  html, body, #root { max-width: 100%; overflow-x: hidden; }
  button:active { transform: scale(0.97); }
  @media (min-width: 640px) {
    .table-grid-2 { grid-template-columns: repeat(2, 1fr) !important; }
  }
`;
