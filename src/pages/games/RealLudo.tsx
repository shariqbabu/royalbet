import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase/config";
import { doc, onSnapshot } from "firebase/firestore";
import { ludoApi } from "../../lib/apiClient";

// ═══════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════
type PlayerColor = "blue" | "green";

interface ServerPawn {
  id: 0 | 1;
  color: PlayerColor;
  position: number; // 0..56, 57 = finished (server uses 0..56 on-board, isFinished flag separately)
  isFinished: boolean;
}

interface GameState {
  turn: "you" | "opp";
  diceVal: number | null;
  diceRolled: boolean;
  scores: { you: number; opp: number };
  gameOver: boolean;
  pawns: { you: ServerPawn[]; opp: ServerPawn[] };
}

// ═══════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════
const PATH: [number, number][] = [
  [6,13],[6,12],[6,11],[6,10],[6,9],
  [5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
  [0,7],[0,6],
  [1,6],[2,6],[3,6],[4,6],[5,6],
  [6,5],[6,4],[6,3],[6,2],[6,1],[6,0],
  [7,0],
  [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],
  [9,6],[10,6],[11,6],[12,6],[13,6],[14,6],
  [14,7],[14,8],
  [13,8],[12,8],[11,8],[10,8],[9,8],
  [8,9],[8,10],[8,11],[8,12],[8,13],[8,14],
  [7,14],[6,14],
];
// PATH.length = 52, indices 0–51

// "you" always renders at the BLUE (bottom-left) side visually
// "opp" always renders at the GREEN (top-right) side visually
const BLUE_HOME_STRETCH:  [number,number][] = [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]];
const GREEN_HOME_STRETCH: [number,number][] = [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]];

const GREEN_START = 26;  // PATH[26] = [8,1]
const PATH_LEN     = 52;
const OUTER_LEN    = 52;
const TOTAL_STEPS  = 57; // OUTER_LEN(52) + home stretch — server "finished" threshold

// 🆕 Add this — module-level function
function canMovePawn(pawn: ServerPawn, dice: number | null): boolean {
  if (pawn.isFinished || !dice) return false;
  return pawn.position + dice <= TOTAL_STEPS;
}


const DOT_POSITIONS: Record<number,[number,number][]> = {
  1:[[50,50]],
  2:[[25,25],[75,75]],
  3:[[25,25],[50,50],[75,75]],
  4:[[25,25],[75,25],[25,75],[75,75]],
  5:[[25,25],[75,25],[50,50],[25,75],[75,75]],
  6:[[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]],
};

const GAME_DURATION   = 300; // seconds — must match backend GAME_DURATION
const COMMISSION_RATE = 0.10; // must match backend COMMISSION_RATE

// ═══════════════════════════════════════════════
//  DISPLAY PATH OFFSET
//  "you" is ALWAYS displayed in the blue-visual frame (own start → PATH[0],
//  bottom-left) and "opp" is ALWAYS displayed in the green-visual frame (own
//  start → PATH[GREEN_START], top-right) — regardless of each player's true
//  assigned color. Server pawn positions are relative to each pawn's own
//  start, so this offset is symmetric and capture cells still line up.
// ═══════════════════════════════════════════════
function getDisplayPathPos(pathPos: number, colorKey: "you" | "opp"): number {
  if (colorKey === "you") return pathPos;
  return (pathPos + GREEN_START) % PATH_LEN;
}

// ═══════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════
// Haptic feedback — mobile browsers only (no-op elsewhere)
function haptic(pattern: number | number[]) {
  try { (navigator as any).vibrate?.(pattern); } catch { /* unsupported */ }
}

function gc(col:number,row:number){return{x:col*60+30,y:row*60+30};}

/**
 * Server pawn shape: position 0..56 (0..51 = outer ring, 52..56 = home stretch,
 * 57 / isFinished = finished). Treat position >= TOTAL_STEPS as finished even
 * if the flag lags a snapshot behind.
 */
function derivePawnVisualState(p: ServerPawn) {
  const finished = p.isFinished || p.position >= TOTAL_STEPS;
  const inStretch = !finished && p.position >= OUTER_LEN;
  const pathPos = !finished && !inStretch ? p.position : -1;
  const homeStretch = inStretch ? p.position - OUTER_LEN : -1; // 0..5
  return { finished, inStretch, pathPos, homeStretch };
}

// Returns pixel coords for a SPECIFIC path position (or home-stretch step)
function positionToPixel(position: number, colorKey: "you" | "opp", stackIndex = 0) {
  const finished = position >= TOTAL_STEPS;
  if (finished) {
    const o = [{x:-12,y:-12},{x:12,y:-12},{x:-12,y:12},{x:12,y:12}][stackIndex] || {x:0,y:0};
    return { x: 450 + o.x, y: 450 + o.y };
  }

  let base: {x:number; y:number};
  if (position >= OUTER_LEN) {
    const stretch = colorKey === "you" ? BLUE_HOME_STRETCH : GREEN_HOME_STRETCH;
    const idx = Math.max(0, Math.min(position - OUTER_LEN, stretch.length - 1));
    const [col, row] = stretch[idx];
    base = gc(col, row);
  } else {
    const displayPos = getDisplayPathPos(position, colorKey);
    const [col, row] = PATH[((displayPos % PATH_LEN) + PATH_LEN) % PATH_LEN];
    base = gc(col, row);
  }
  const off = [{x:0,y:0},{x:13,y:-13},{x:-13,y:13},{x:13,y:13}][stackIndex] || {x:0,y:0};
  return { x: base.x + off.x, y: base.y + off.y };
}

// Waypoints between prevPos and newPos — one per cell hop
function buildWaypoints(
  prevPos: number, newPos: number,
  colorKey: "you" | "opp", stackIndex: number
): {x:number;y:number}[] {
  const points: {x:number;y:number}[] = [];
  if (prevPos === newPos) return points;

  // Forward stepping (Ludo pawns never move backward except on capture reset)
  if (newPos > prevPos) {
    for (let p = prevPos + 1; p <= newPos; p++) {
      points.push(positionToPixel(p, colorKey, stackIndex));
    }
  } else {
    // Capture reset — pawn goes back to yard (single teleport, no hop)
    points.push(positionToPixel(newPos, colorKey, stackIndex));
  }
  return points;
}


function computeStackIndices(gs: GameState): Record<string, number> {
  const result: Record<string,number> = {};
  const cellMap: Record<string,string[]> = {};
  const key = (pawn: ServerPawn, p: "you"|"opp") => {
    const { finished, homeStretch, pathPos } = derivePawnVisualState(pawn);
    if (finished) return `fin-${p}`;
    if (homeStretch >= 0) return `str-${p}-${homeStretch}`;
    return `path-${((getDisplayPathPos(pathPos, p) % PATH_LEN) + PATH_LEN) % PATH_LEN}`;
  };
  (["you","opp"] as const).forEach(p => gs.pawns[p].forEach(pw => {
    const k = key(pw, p);
    const uid = `${p}${pw.id}`;
    if (!cellMap[k]) cellMap[k] = [];
    cellMap[k].push(uid);
  }));
  Object.values(cellMap).forEach(ids => ids.forEach((id, i) => { result[id] = i; }));
  return result;
}

/** Map server game doc (colorOf/blue/green) → this component's you/opp GameState */
function remoteToLocal(data: any, myColor: PlayerColor): GameState {
  const oppColor: PlayerColor = myColor === "blue" ? "green" : "blue";
  return {
    turn: data.currentTurn === myColor ? "you" : "opp",
    diceVal: data.diceValue ?? null,
    diceRolled: !!data.diceRolled,
    scores: { you: data.scores?.[myColor] ?? 0, opp: data.scores?.[oppColor] ?? 0 },
    gameOver: data.status === "finished",
    pawns: {
      you: (data.pawns?.[myColor] || []) as ServerPawn[],
      opp: (data.pawns?.[oppColor] || []) as ServerPawn[],
    },
  };
}

// ═══════════════════════════════════════════════
//  BOARD CELLS
// ═══════════════════════════════════════════════
function BoardCells() {
  const cells: React.ReactElement[] = [];
  // Safe cells = 4 start cells + 4 mid-path stars (PATH indices 8/21/34/47)
  const stars: [number,number][] = [[6,13],[1,6],[8,1],[13,8],[2,8],[6,2],[12,6],[8,12]];

  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      if ((col<6 && row<6) || (col>8 && row<6) ||
          (col<6 && row>8) || (col>8 && row>8)) continue;
      if (col>=6 && col<=8 && row>=6 && row<=8) continue;
      if (!(col>=6 && col<=8) && !(row>=6 && row<=8)) continue;

      const x = col*60, y = row*60, cx = x+30, cy = y+30;

      let fill = "#F5EBC9";
      let startColor: string | null = null;
      let entryArrow: "up"|"down"|"left"|"right"|null = null;
      let entryColor = "";

      if (col===7 && row>=1 && row<=5)  fill = "#16A34A"; // GREEN home (top)
      if (col===7 && row>=9 && row<=13) fill = "#1D4ED8"; // BLUE home (bottom)
      if (row===7 && col>=1 && col<=5)  fill = "#DC2626"; // RED home (left)
      if (row===7 && col>=9 && col<=13) fill = "#F59E0B"; // YELLOW home (right)

      if (col===7 && row===0)  { entryArrow="down";  entryColor="#16A34A"; }
      if (col===7 && row===14) { entryArrow="up";    entryColor="#1D4ED8"; }
      if (row===7 && col===0)  { entryArrow="right"; entryColor="#DC2626"; }
      if (row===7 && col===14) { entryArrow="left";  entryColor="#F59E0B"; }

      if (col===6  && row===13) startColor = "#1D4ED8"; // BLUE start (PATH[0])
      if (col===8  && row===1)  startColor = "#16A34A"; // GREEN start (PATH[26])
      if (col===13 && row===8)  startColor = "#F59E0B"; // YELLOW start (PATH[39])
      if (col===1  && row===6)  startColor = "#DC2626"; // RED start (PATH[13])

      const isStar = stars.some(([c,r]) => c===col && r===row);
      const isColored = fill !== "#F5EBC9";

      cells.push(
        <g key={`c-${col}-${row}`}>
          <rect x={x+3} y={y+3} width={54} height={54} rx={10}
            fill={fill}
            stroke={isColored ? "rgba(0,0,0,0.35)" : "rgba(101,84,45,0.4)"}
            strokeWidth={1.5}/>
          {startColor && (
            <>
              <rect x={x+3} y={y+3} width={54} height={54} rx={10}
                fill={startColor} opacity={0.92}/>
              <text x={cx} y={cy+8} fontSize={26} textAnchor="middle"
                fill="#fff" fontWeight={900} opacity={0.9}
                pointerEvents="none">★</text>
            </>
          )}
          {isStar && !startColor && (
            <text x={cx} y={cy+8} fontSize={24} textAnchor="middle"
              fill="rgba(0,0,0,0.35)" pointerEvents="none">★</text>
          )}
          {entryArrow==="down"  && <polygon points={`${cx-11},${cy-4} ${cx+11},${cy-4} ${cx},${cy+12}`} fill={entryColor}/>}
          {entryArrow==="up"    && <polygon points={`${cx-11},${cy+4} ${cx+11},${cy+4} ${cx},${cy-12}`} fill={entryColor}/>}
          {entryArrow==="right" && <polygon points={`${cx-4},${cy-11} ${cx-4},${cy+11} ${cx+12},${cy}`} fill={entryColor}/>}
          {entryArrow==="left"  && <polygon points={`${cx+4},${cy-11} ${cx+4},${cy+11} ${cx-12},${cy}`} fill={entryColor}/>}
        </g>
      );
    }
  }
  return <g>{cells}</g>;
}

// ═══════════════════════════════════════════════
//  ANIMATED PAWN  — "you"=BLUE always, "opp"=GREEN always
// ═══════════════════════════════════════════════
function AnimatedPawn({
  pawnId, position, colorKey, stackIndex, selectable, finished, onClick
}: {
  pawnId: string;
  position: number;
  colorKey: "you" | "opp";
  stackIndex: number;
  selectable: boolean;
  finished: boolean;
  onClick: (p: "you" | "opp", id: string) => void;
}) {
  const initial = positionToPixel(position, colorKey, stackIndex);
  const [pos, setPos] = useState(initial);
  const prevPosRef = useRef(position);
  const curPixel = useRef(initial);
  const animRef = useRef<number | null>(null);
  const player = colorKey;

  useEffect(() => {
    const prev = prevPosRef.current;
    if (prev === position) {
      // Only stack shift or no change — snap silently
      const target = positionToPixel(position, colorKey, stackIndex);
      curPixel.current = target;
      setPos(target);
      return;
    }

    const waypoints = buildWaypoints(prev, position, colorKey, stackIndex);
    prevPosRef.current = position;

    if (waypoints.length === 0) return;

    // Hop through waypoints — each hop 120ms with a slight lift bounce
    const HOP_MS = 130;
    let idx = 0;
    let hopStart: number | null = null;
    let hopFrom = { ...curPixel.current };
    let hopTo = waypoints[0];

    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const frame = (ts: number) => {
      if (!hopStart) hopStart = ts;
      const t = Math.min((ts - hopStart) / HOP_MS, 1);
      const e = ease(t);

      // Vertical bounce — pawn lifts slightly between cells
      const lift = Math.sin(t * Math.PI) * -8;

      const nx = hopFrom.x + (hopTo.x - hopFrom.x) * e;
      const ny = hopFrom.y + (hopTo.y - hopFrom.y) * e + lift;

      curPixel.current = { x: nx, y: ny };
      setPos({ x: nx, y: ny });

      if (t < 1) {
        animRef.current = requestAnimationFrame(frame);
      } else {
        // Land at target
        curPixel.current = { ...hopTo };
        setPos({ ...hopTo });
        haptic(8); // tick per cell hop
        idx++;
        if (idx < waypoints.length) {
          hopFrom = { ...hopTo };
          hopTo = waypoints[idx];
          hopStart = null;
          animRef.current = requestAnimationFrame(frame);
        }
      }
    };

    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(frame);

    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [position, colorKey, stackIndex]);

  const c = player === "you"
    ? { edge: "#0A1226", dark: "#1E3A8A", main: "#2563EB", light: "#93C5FD", glow: "rgba(59,130,246,0.95)" }
    : { edge: "#022C22", dark: "#065F46", main: "#10B981", light: "#6EE7B7", glow: "rgba(16,185,129,0.95)" };

  return (
    <g transform={`translate(${pos.x},${pos.y})`}
       onClick={() => { if (!finished) { haptic(12); onClick(player, pawnId); } }}
       style={{ cursor: finished ? "default" : "pointer" }}>
      {selectable && (
        <circle cx="0" cy="-6" r="36" fill="none" stroke={c.glow} strokeWidth="3.5"
          style={{ animation: "pawnPulse 0.65s ease-in-out infinite alternate" }}/>
      )}
      <rect x="-30" y="-38" width="60" height="72" fill="transparent"/>

      {/* Ground shadow */}
      <ellipse cx="0" cy="27" rx="20" ry="5.5" fill="#000" opacity="0.30"/>
      <ellipse cx="0" cy="27" rx="13" ry="3.5" fill="#000" opacity="0.30"/>

      {/* Base disc — two stacked rings for depth */}
      <ellipse cx="0" cy="24" rx="19" ry="7" fill={c.edge}/>
      <path d={`M -19,18 A 19 7 0 0 0 19,18 L 19,24 A 19 7 0 0 1 -19,24 Z`} fill={c.edge}/>
      <ellipse cx="0" cy="18" rx="19" ry="7" fill={`url(#pawn-base-${player})`} stroke={c.edge} strokeWidth="1.2"/>
      <ellipse cx="-5" cy="16.5" rx="9" ry="2.6" fill="#fff" opacity="0.35"/>

      {/* Body — smooth flared cone, straight-on view */}
      <path d="M -5.5,-8 C -6.5,2 -9.5,9 -14,16.5 C -15,18.5 -13,19.5 0,19.5 C 13,19.5 15,18.5 14,16.5 C 9.5,9 6.5,2 5.5,-8 Z"
        fill={`url(#pawn-body-${player})`} stroke={c.edge} strokeWidth="1.6" strokeLinejoin="round"/>
      {/* Specular strip on body */}
      <path d="M -4,-7 C -5,2 -7,9 -10,15.5 C -9,16.5 -7.5,16.5 -6.5,15.5 C -4.5,9 -3,2 -2.5,-7 Z"
        fill="#fff" opacity="0.45"/>

      {/* Neck collar ring */}
      <ellipse cx="0" cy="-8" rx="7.5" ry="3" fill={c.edge}/>
      <ellipse cx="0" cy="-9" rx="6.5" ry="2.2" fill={`url(#pawn-base-${player})`}/>

      {/* Head — glossy sphere */}
      <circle cx="0" cy="-20" r="12.5" fill={`url(#pawn-head-${player})`} stroke={c.edge} strokeWidth="1.6"/>
      {/* Big soft highlight + hot spot */}
      <ellipse cx="-4.5" cy="-24.5" rx="5" ry="3.6" fill="#fff" opacity="0.55" transform="rotate(-25 -4.5 -24.5)"/>
      <circle cx="-3" cy="-26" r="1.8" fill="#fff" opacity="0.95"/>
    </g>
  );
}

// ═══════════════════════════════════════════════
//  DICE
// ═══════════════════════════════════════════════
function DiceFace({ value, rolling, onClick, disabled }: {
  value: number; rolling: boolean; onClick: () => void; disabled: boolean;
}) {
  const positions = DOT_POSITIONS[value] || [];
  const SIZE = 78;
  const DOT_AREA = 58;
  const DOT = 12;

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={rolling ? "dice-rolling" : ""}
      style={{
        width: SIZE, height: SIZE,
        position: "relative",
        background: disabled
          ? "linear-gradient(145deg,#334155 0%,#1e293b 100%)"
          : "linear-gradient(145deg,#ffffff 0%,#f1f5f9 55%,#cbd5e1 100%)",
        border: `2px solid ${disabled ? "#475569" : "rgba(0,0,0,0.18)"}`,
        borderRadius: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        flexShrink: 0,
        boxShadow: disabled
          ? "inset 0 -3px 0 rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.3)"
          : "0 10px 24px rgba(59,130,246,0.35), 0 4px 6px rgba(0,0,0,0.25), inset 0 -4px 0 rgba(0,0,0,0.12), inset 0 3px 0 rgba(255,255,255,0.9), 0 0 0 1px rgba(255,255,255,0.6)",
        opacity: disabled ? 0.55 : 1,
        transition: "all 0.2s",
      }}
    >
      {/* Subtle inner border for that "printed dot" feel */}
      {!disabled && (
        <div style={{
          position: "absolute", inset: 5,
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.06)",
          pointerEvents: "none",
        }} />
      )}
      <div style={{ position: "relative", width: DOT_AREA, height: DOT_AREA }}>
        {positions.map(([px, py], i) => (
          <div key={i} style={{
            position: "absolute",
            width: DOT, height: DOT,
            borderRadius: "50%",
            background: disabled
              ? "#64748b"
              : "radial-gradient(circle at 32% 30%, #334155 0%, #0f172a 55%, #020617 100%)",
            boxShadow: disabled
              ? "none"
              : "inset 0 1px 2px rgba(0,0,0,0.65), 0 0.5px 0 rgba(255,255,255,0.4)",
            left: (px / 100) * DOT_AREA - DOT / 2,
            top:  (py / 100) * DOT_AREA - DOT / 2,
          }} />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  TIMER
// ═══════════════════════════════════════════════
function TimerRing({ seconds }: {seconds:number}) {
  const pct = Math.max(0, Math.min(1, seconds/GAME_DURATION));
  const r = 18, circ = 2*Math.PI*r;
  const urgent = seconds<=30, warn = seconds<=60;
  const color = urgent ? "#ef4444" : warn ? "#f59e0b" : "#34d399";
  const mins = Math.floor(seconds/60), secs = seconds%60;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
      <svg width={46} height={46} style={{overflow:"visible"}}>
        <circle cx={23} cy={23} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3.5}/>
        <circle cx={23} cy={23} r={r} fill="none" stroke={color} strokeWidth={3.5}
          strokeDasharray={circ} strokeDashoffset={circ*(1-pct)}
          strokeLinecap="round" transform="rotate(-90 23 23)"
          style={{transition:"stroke-dashoffset 1s linear,stroke 0.5s"}}/>
        <text x={23} y={27} fontSize={11} fontWeight={900} fill={color}
          textAnchor="middle" fontFamily="monospace">
          {mins}:{secs.toString().padStart(2,"0")}
        </text>
      </svg>
      {urgent && <div style={{fontSize:8,color:"#ef4444",fontWeight:900,letterSpacing:1,
        animation:"urgentBlink 0.5s infinite",marginTop:1}}>HURRY!</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  SCORE AVATAR
// ═══════════════════════════════════════════════
function ScoreAvatar({ playerKey,name,active,photoURL }: {
  playerKey:"you"|"opp"; name:string; active:boolean; photoURL?:string;
}) {
  const isYou = playerKey === "you";
  const color  = isYou ? "#60a5fa" : "#34d399";
  const bg     = isYou ? "linear-gradient(145deg,#1e3a8a,#1d4ed8)" : "linear-gradient(145deg,#064e3b,#065f46)";
  const border = active ? color : "rgba(255,255,255,0.1)";
  const glow   = active ? (isYou ? "0 0 18px rgba(59,130,246,0.5)" : "0 0 18px rgba(52,211,153,0.5)") : "none";
  return (
    <div style={{position:"relative",flexShrink:0}}>
      {active && (
        <div style={{position:"absolute",inset:-5,borderRadius:"50%",border:`2px solid ${color}`,
          borderTopColor:"transparent",animation:"spinRing 1.8s linear infinite",zIndex:1}}/>
      )}
      <div style={{width:62,height:62,borderRadius:"50%",background:bg,border:`2.5px solid ${border}`,
        boxShadow:glow,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        position:"relative",zIndex:2,overflow:"hidden"}}>
        {photoURL
          ? <img src={photoURL} alt="avatar" style={{width:62,height:62,objectFit:"cover",borderRadius:"50%"}}/>
          : <span style={{fontSize:16,fontWeight:900,color,lineHeight:1}}>{(name||"P").charAt(0).toUpperCase()}</span>
        }
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  PRIZE POOL BANNER
// ═══════════════════════════════════════════════
function PrizePoolBanner({ timeLeft, prizePool }: {timeLeft:number; prizePool:number}) {
  return (
    <div style={{width:"100%",maxWidth:480,
      background:"linear-gradient(135deg,#0a0f1e 0%,#0d1933 40%,#0a1628 100%)",
      borderBottom:"1px solid rgba(251,191,36,0.2)",padding:"0 16px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:1,
        background:"linear-gradient(90deg,transparent,rgba(251,191,36,0.6),transparent)",
        animation:"shimmerLine 2s infinite"}}/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:42,height:42,borderRadius:12,background:"linear-gradient(145deg,#78350f,#b45309)",
            border:"1.5px solid rgba(251,191,36,0.4)",display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:22,boxShadow:"0 4px 12px rgba(251,191,36,0.25)",flexShrink:0}}>🏆</div>
          <div>
            <div style={{fontSize:9,fontWeight:800,letterSpacing:2.5,color:"rgba(251,191,36,0.6)",textTransform:"uppercase",lineHeight:1}}>Prize Pool</div>
            <div style={{fontSize:26,fontWeight:900,lineHeight:1.15,
              background:"linear-gradient(90deg,#fde68a,#fbbf24,#f59e0b,#fbbf24,#fde68a)",
              backgroundSize:"300%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
              animation:"shimmer 3s infinite linear",letterSpacing:-0.5}}>₹{prizePool||0}</div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
          <div style={{display:"flex",alignItems:"center",gap:5,
            background:"linear-gradient(135deg,rgba(239,68,68,0.2),rgba(239,68,68,0.1))",
            border:"1px solid rgba(239,68,68,0.4)",borderRadius:20,padding:"3px 10px"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#ef4444",
              boxShadow:"0 0 6px #ef4444",animation:"livePulse 1s infinite"}}/>
            <span style={{fontSize:10,fontWeight:900,color:"#fca5a5",letterSpacing:2}}>LIVE</span>
          </div>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",letterSpacing:1}}>2 PLAYERS</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
          <TimerRing seconds={timeLeft}/>
          <div style={{fontSize:8,color:"rgba(255,255,255,0.3)",letterSpacing:1,fontWeight:700}}>REMAINING</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,
        padding:"6px 0",borderTop:"1px solid rgba(255,255,255,0.05)",marginBottom:2}}>
        {[{icon:"🎯",label:"Capture",val:"+20 pts"},{icon:"🎲",label:"Per Roll",val:"+dice pts"},{icon:"🏁",label:"Finish",val:"+10 pts"}].map(item=>(
          <div key={item.label} style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:11}}>{item.icon}</span>
            <div>
              <div style={{fontSize:7,color:"rgba(255,255,255,0.3)",letterSpacing:1,lineHeight:1}}>{item.label}</div>
              <div style={{fontSize:9,fontWeight:800,color:"#fbbf24",lineHeight:1}}>{item.val}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  MAIN GAME
// ═══════════════════════════════════════════════
export default function LudoGame() {
  const { tableId } = useParams();
  const navigate     = useNavigate();
  const { firebaseUser, user } = useAuth();
  const uid     = firebaseUser?.uid;
  const myName  = user?.name || "You";
  const myPhoto = firebaseUser?.photoURL || undefined;

  const [myColor,setMyColor]     = useState<PlayerColor|null>(null);
  const [oppName,setOppName]     = useState("Opponent");
  const [roomReady,setRoomReady] = useState(false);

  const [gameState,setGameState] = useState<GameState>({
    turn:"you",diceVal:null,diceRolled:false,
    scores:{you:0,opp:0},gameOver:false,
    pawns:{you:[],opp:[]},
  });
  
  const [diceDisplay,setDiceDisplay]     = useState(1);
  const [diceRolling,setDiceRolling]     = useState(false);
  const [statusMsg,setStatusMsg]         = useState("Connecting...");
  const [toast,setToast]                 = useState({visible:false,msg:""});
  const [winOverlay,setWinOverlay]       = useState({show:false,winner:"",reason:""});
  const [selectablePawns,setSelectablePawns] = useState<string[]>([]);
  const [timeLeft,setTimeLeft]           = useState(GAME_DURATION);
  // Game clock is anchored to the SERVER's gameStartedAtMs (from the game doc),
  // so a page reload mid-game doesn't restart the visual timer from 5:00 and
  // both players see the same countdown.
  const [endAtMs,setEndAtMs]             = useState<number|null>(null);
  const [gameStarted,setGameStarted]     = useState(false);
  const [prizePool,setPrizePool]         = useState(0);
  const [busy,setBusy]                   = useState(false); // prevents double API calls mid-request

  const myColorRef       = useRef<PlayerColor|null>(null);
  const oppNameRef       = useRef("Opponent");
  const toastTimerRef    = useRef<ReturnType<typeof setTimeout>|null>(null);
  const timerRef         = useRef<ReturnType<typeof setInterval>|null>(null);
  const timeoutFiredRef  = useRef(false); // ensures we only start the timeout-call sequence once
  const joinAttemptedRef = useRef(false); // join/start should fire once per mount, not on name/photo changes
  const prevDiceRolled   = useRef(false);

  useEffect(() => { oppNameRef.current = oppName; }, [oppName]);

  // ── Join table (idempotent) + start game if both players present ──
  useEffect(() => {
    if (!tableId || !uid || joinAttemptedRef.current) return;
    joinAttemptedRef.current = true;
    (async () => {
      try {
        await ludoApi.join(tableId, myName, myPhoto || "");
      } catch (e: any) {
        // "Game already started" / "alreadyJoined" just mean this player is
        // already seated at a table that's already in progress (e.g. they
        // reloaded mid-game). Not a real failure — continue below.
        const msg = e?.message || "";
        const benign = msg.includes("Game already started") || msg.includes("already joined");
        if (!benign) {
          setStatusMsg(msg || "Could not join table");
          return;
        }
      }
      // start is a no-op / "alreadyStarted" if game already exists
      await ludoApi.start(tableId).catch(() => {});
      setRoomReady(true);
    })();
  }, [tableId, uid, myName, myPhoto]);

  // ── Listen to ludoGames/{tableId} for realtime state ──
  useEffect(() => {
    if (!tableId || !uid) return;
    const gameRef = doc(db, "ludoGames", tableId);

    const unsub = onSnapshot(gameRef, (snap) => {
      const data = snap.data();
      if (!data) return; // doc deleted post-cleanup — keep last rendered state

      const myC: PlayerColor | undefined = data.colorOf?.[uid];
      if (!myC) { setStatusMsg("You are not part of this game"); return; }
      myColorRef.current = myC;
      setMyColor(myC);

      const oppUid = Object.entries(data.colorOf || {}).find(([u]) => u !== uid)?.[0];
      setOppName(oppUid ? (data.playerNames?.[oppUid] || "Opponent") : "Opponent");

      if (!data.pawns) return;

      const local = remoteToLocal(data, myC);
      setGameState(local);
      if (typeof data.prizePool === "number") setPrizePool(data.prizePool);
      if (data.status === "playing") setGameStarted(true);

      // Anchor the game clock to the server's start time
      if (typeof data.gameStartedAtMs === "number") {
        setEndAtMs(data.gameStartedAtMs + (data.gameDuration || GAME_DURATION) * 1000);
      }

      // Dice-roll → animate locally to match the server-rolled value
      if (data.diceRolled && !prevDiceRolled.current && data.diceValue) {
        setDiceDisplay(data.diceValue);
      }
      prevDiceRolled.current = !!data.diceRolled;

      // If the turn moved on (opponent acted, or a timeout landed), any stale
      // pawn highlights from our last roll must go
      if (data.currentTurn !== myC || !data.diceRolled) setSelectablePawns([]);

      if (local.gameOver) {
        // The SERVER decides the winner (winnerId / isDraw) — never infer it
        // from scores here: on a forfeit ("player_left") the remaining player
        // wins even with a lower score.
        const winner = data.isDraw ? "draw"
          : data.winnerId ? (data.winnerId === uid ? "you" : "opp")
          : "draw";
        const reason = data.finishReason === "player_left" ? "🚪 Opponent left"
          : data.finishReason === "timeout" ? "⏱ Time's up!"
          : "🏆 Game Over!";
        setWinOverlay(prev => {
          if (prev.show) return prev;
          haptic(winner === "you" ? [50,50,50,50,150] : [150,80,150]);
          return {show:true, winner, reason};
        });
        // Payout is handled entirely server-side — no client action needed.
      } else {
        if (local.turn==="you" && !local.diceRolled) setStatusMsg("🎲 Tap dice to roll!");
        else if (local.turn==="opp") setStatusMsg(`⏳ ${oppNameRef.current}'s turn...`);
      }
    });
    return () => unsub();
  }, [tableId, uid]);

  // ── Recompute pawn visuals ──
  
const stackIndicesRef = useRef<Record<string, number>>({});

useEffect(() => {
  if (!myColor) return;
  stackIndicesRef.current = computeStackIndices(gameState);
}, [gameState, myColor]);

  // ── Game clock — derived from server end time, ticks locally ──
  useEffect(() => {
    if (!gameStarted || gameState.gameOver || !endAtMs) return;
    const tick = () => setTimeLeft(Math.max(0, Math.ceil((endAtMs - Date.now()) / 1000)));
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameStarted, gameState.gameOver, endAtMs]);

  // ── Time's up: ask the server to close the game (winner = higher score,
  // equal = draw). Both clients race to call this; the server verifies the
  // real elapsed time and is idempotent, so whichever call lands first wins.
  // Retries a few times with backoff so one network hiccup doesn't leave the
  // game stuck at 0:00 forever.
  useEffect(() => {
    if (!roomReady || !tableId || gameState.gameOver) return;
    if (timeLeft > 0) return;
    if (timeoutFiredRef.current) return;
    timeoutFiredRef.current = true;

    let cancelled = false;
    const attempt = async (n: number) => {
      try {
        await ludoApi.timeout(tableId);
        // onSnapshot picks up the server's "finished" update; the overlay
        // fires from there. Nothing else to do.
      } catch (e: any) {
        console.warn("[Ludo] timeout call failed:", e?.message);
        if (!cancelled && n < 4) setTimeout(() => attempt(n + 1), 2500 * (n + 1));
      }
    };
    attempt(0);
    return () => { cancelled = true; };
  }, [timeLeft, roomReady, tableId, gameState.gameOver]);

  const showToastFn = useCallback((msg:string, duration=1100) => {
    setToast({visible:true,msg});
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast({visible:false,msg:""}), duration);
  }, []);

  // Local heuristic only — the server ('roll' movable list + 'move'
  // validation) is authoritative
  const handleMove = useCallback(async (pawnId: number) => {
  if (!tableId) return;
  setBusy(true);
  try {
    const res: any = await ludoApi.move(tableId, pawnId);
    setSelectablePawns([]);

    // 🆕 Optimistic patch — smooth animation, snapshot latency hide ho jayegi
    if (res.pawns && myColorRef.current) {
      const myC = myColorRef.current;
      const oppC = myC === "blue" ? "green" : "blue";
      setGameState(prev => ({
        ...prev,
        pawns: {
          you: res.pawns[myC] || prev.pawns.you,
          opp: res.pawns[oppC] || prev.pawns.opp,
        },
        scores: {
          you: res.scores?.[myC] ?? prev.scores.you,
          opp: res.scores?.[oppC] ?? prev.scores.opp,
        },
        diceRolled: false,
        diceVal: null,
      }));
    }

    if (res.captured)  { haptic([30,40,60]); showToastFn("💥 Captured! +20", 1300); }
    if (res.pawnJustFinished) { haptic([20,30,20,30,50]); showToastFn("🏁 Pawn Home! +10", 1500); }  // 🆕
    if (res.gameOver)  {
      haptic(res.winnerColor === myColorRef.current ? [50,50,50,50,120] : 200);
      showToastFn(res.winnerColor === myColorRef.current ? "🎉 You Win!" : "Game Over", 1500);
    }
  } catch (e: any) {
    showToastFn(e.message || "Move failed", 1200);
  } finally {
    setBusy(false);
  }
}, [tableId, showToastFn]);

  // ── Roll: server rolls the dice (crypto-secure) — client just calls & displays ──
  const handleRoll = useCallback(async () => {
    if (!tableId || busy || gameState.turn!=="you" || gameState.diceRolled || gameState.gameOver || !roomReady) return;
    setBusy(true);
    setDiceRolling(true);
    haptic(15); // dice tap feedback
    try {
      const res: any = await ludoApi.roll(tableId);
      setDiceDisplay(res.diceValue);
      setDiceRolling(false);
      haptic(res.diceValue === 6 ? [40,50,80] : 25); // 6 = special buzz
      if (res.turnPassed) {
        setStatusMsg("😔 No moves! Turn skipped");
      } else if (res.movable?.length === 1) {
        // auto-play the only legal move
        setStatusMsg(`🎲 You rolled ${res.diceValue}!`);
        await handleMove(res.movable[0]);
      } else if (res.movable?.length > 1) {
        setStatusMsg("👆 Tap a pawn to move");
        setSelectablePawns(res.movable.map((id: number) => `you${id}`));
      }
    } catch (e: any) {
      setDiceRolling(false);
      showToastFn(e.message || "Roll failed", 1200);
    } finally {
      setBusy(false);
    }
  }, [tableId, busy, gameState, roomReady, showToastFn, handleMove]);

  const handlePawnClick = useCallback(async (player:"you"|"opp", pawnKey:string) => {
    if (busy) return;
    if (gameState.gameOver) return;
    if (player!=="you") { showToastFn("That's not your pawn!",800); return; }
    if (gameState.turn!=="you") { showToastFn("Not your turn!",800); return; }
    if (!gameState.diceRolled) { showToastFn("Tap dice first!",800); return; }
    // If the server told us which pawns are movable this roll, trust that list
    if (selectablePawns.length > 0 && !selectablePawns.includes(pawnKey)) {
      showToastFn("Can't move that one!",800); return;
    }
    const pawnId = Number(pawnKey.replace("you",""));
    const pawn = gameState.pawns.you.find(p => p.id===pawnId);
    if (!pawn||!canMovePawn(pawn,gameState.diceVal)) { showToastFn("Can't move!",800); return; }
    await handleMove(pawnId);
  }, [gameState, busy, selectablePawns, showToastFn, handleMove]);

  // ── Leave / go back to lobby ──
  const handleRestart = useCallback(async () => {
    if (tableId) {
      try { await ludoApi.leave(tableId); } catch { /* ignore — table may already be finished */ }
    }
    navigate("/games/realludolobby");
  }, [tableId, navigate]);

  const isYourTurn  = gameState.turn === "you";
  const rollDisabled = !isYourTurn||gameState.diceRolled||gameState.gameOver||!roomReady||busy;
  // Matches backend exactly: winner gets prizePool - floor(prizePool * 0.10)
  const winnerAmount = prizePool - Math.floor(prizePool * COMMISSION_RATE);
  const drawAmount   = Math.floor(prizePool / 2);

  return (
    <div style={{background:"#020617",fontFamily:"'Segoe UI',sans-serif",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",overflowX:"hidden",color:"#fff"}}>
      <style>{`
        @keyframes shimmer{0%{background-position:0%}100%{background-position:200%}}
        @keyframes shimmerLine{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @keyframes spinRing{to{transform:rotate(360deg)}}
       @keyframes diceRoll {
          0%   { transform: rotate(0deg) scale(1); }
          15%  { transform: rotate(90deg) scale(1.15); }
          30%  { transform: rotate(180deg) scale(0.92); }
          45%  { transform: rotate(270deg) scale(1.08); }
          60%  { transform: rotate(360deg) scale(0.96); }
          75%  { transform: rotate(390deg) scale(1.03); }
          100% { transform: rotate(360deg) scale(1); }}
        @keyframes pawnPulse{from{opacity:0.35}to{opacity:1}}
        @keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.8)}}
        @keyframes urgentBlink{0%,100%{opacity:1}50%{opacity:0.2}}
        .dice-rolling{animation:diceRoll 0.52s ease-in-out;}
      `}</style>

      <PrizePoolBanner timeLeft={timeLeft} prizePool={prizePool}/>

      <div style={{width:"100%",maxWidth:480,display:"flex",flexDirection:"column",alignItems:"center",padding:8,gap:8}}>

        {/* OPP BAR */}
        <div style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:16,background:"#0f172a",border:`1.5px solid ${!isYourTurn?"#34d399":"#1e293b"}`,boxShadow:!isYourTurn?"0 0 18px rgba(52,211,153,0.3)":"none",transition:"all 0.3s"}}>
          <ScoreAvatar playerKey="opp" name={oppName} active={!isYourTurn}/>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,letterSpacing:1,color:"#34d399",display:"flex",alignItems:"center",gap:6,textTransform:"uppercase"}}>
              {oppName}
              {!isYourTurn&&<span style={{fontSize:8,padding:"2px 7px",borderRadius:10,fontWeight:800,background:"rgba(5,95,70,0.5)",color:"#a7f3d0",border:"1px solid #065f46"}}>THEIR TURN</span>}
            </div>
            <div style={{display:"flex",gap:5,marginTop:5}}>
              {gameState.pawns.opp.map(p=>(
                <div key={p.id} style={{width:11,height:11,borderRadius:"50%",border:"1.5px solid #34d399",background:p.isFinished?"#34d399":"#065f46",transition:"all 0.3s",boxShadow:p.isFinished?"0 0 6px #34d399":"none"}}/>
              ))}
            </div>
          </div>
          {!isYourTurn&&gameState.diceVal&&(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <div style={{width:36,height:36,background:"linear-gradient(145deg,#064e3b,#065f46)",border:"1.5px solid #34d399",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{position:"relative",width:24,height:24}}>
                  {(DOT_POSITIONS[gameState.diceVal]||[]).map(([px,py],i)=>(
                    <div key={i} style={{position:"absolute",width:5,height:5,borderRadius:"50%",background:"#34d399",left:px*0.22,top:py*0.22}}/>
                  ))}
                </div>
              </div>
              <div style={{fontSize:8,color:"#34d399",fontWeight:700}}>+{gameState.diceVal}</div>
            </div>
          )}
        </div>

        {/* BOARD — no rotation; path offset handles perspective */}
        <div style={{width:"100%",position:"relative"}}>
          <svg viewBox="0 0 900 900" xmlns="http://www.w3.org/2000/svg"
  style={{width:"100%",height:"auto",display:"block",borderRadius:20}}>
  <defs>
    <linearGradient id="g-red"    x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#EF4444"/><stop offset="100%" stopColor="#B91C1C"/>
    </linearGradient>
    <linearGradient id="g-green"  x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#22C55E"/><stop offset="100%" stopColor="#15803D"/>
    </linearGradient>
    <linearGradient id="g-yellow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#FBBF24"/><stop offset="100%" stopColor="#D97706"/>
    </linearGradient>
    <linearGradient id="g-blue"   x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#3B82F6"/><stop offset="100%" stopColor="#1D4ED8"/>
    </linearGradient>
    <linearGradient id="g-trophy" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#FBBF24"/><stop offset="100%" stopColor="#EA580C"/>
    </linearGradient>
    {/* Pawn body — LEFT→RIGHT gradient = cylindrical 3D shading */}
    <linearGradient id="pawn-body-you" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"  stopColor="#0F1E4C"/>
      <stop offset="28%" stopColor="#3B82F6"/>
      <stop offset="45%" stopColor="#93C5FD"/>
      <stop offset="62%" stopColor="#3B82F6"/>
      <stop offset="100%" stopColor="#0F1E4C"/>
     </linearGradient>
    <linearGradient id="pawn-body-opp" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"  stopColor="#022C22"/>
      <stop offset="28%" stopColor="#10B981"/>
      <stop offset="45%" stopColor="#6EE7B7"/>
      <stop offset="62%" stopColor="#10B981"/>
      <stop offset="100%" stopColor="#022C22"/>
    </linearGradient>
    <linearGradient id="pawn-base-you" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"  stopColor="#1E3A8A"/>
      <stop offset="45%" stopColor="#60A5FA"/>
      <stop offset="100%" stopColor="#0F1E4C"/>
    </linearGradient>
    <linearGradient id="pawn-base-opp" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"  stopColor="#065F46"/>
      <stop offset="45%" stopColor="#34D399"/>
      <stop offset="100%" stopColor="#022C22"/>
    </linearGradient>
    <radialGradient id="pawn-head-you" cx="32%" cy="28%" r="75%">
      <stop offset="0%"  stopColor="#FFFFFF"/>
      <stop offset="20%" stopColor="#BFDBFE"/>
      <stop offset="55%" stopColor="#3B82F6"/>
      <stop offset="100%" stopColor="#0F1E4C"/>
     </radialGradient>
    <radialGradient id="pawn-head-opp" cx="32%" cy="28%" r="75%">
      <stop offset="0%"  stopColor="#FFFFFF"/>
      <stop offset="20%" stopColor="#A7F3D0"/>
      <stop offset="55%" stopColor="#10B981"/>
      <stop offset="100%" stopColor="#022C22"/>
    </radialGradient>
    <filter id="yardShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.35"/>
    </filter>
  </defs>

  {/* Black board background */}
  <rect width="900" height="900" fill="#0A0A0A" rx="40"/>
  <rect x="8" y="8" width="884" height="884" rx="34"
    fill="none" stroke="#1E293B" strokeWidth="1.5"/>

  {/* ── CORNER YARDS ── */}
  {/* Top-left RED (decorative in 2-player mode) */}
  <g filter="url(#yardShadow)">
    <rect x="20" y="20" width="320" height="320" rx="28" fill="url(#g-red)"/>
    <rect x="30" y="30" width="300" height="300" rx="22"
      fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5"/>
    <circle cx="180" cy="180" r="110" fill="#F5EBC9"
      stroke="#7F1D1D" strokeWidth="10"/>
    <circle cx="180" cy="180" r="100" fill="none"
      stroke="rgba(127,29,29,0.35)" strokeWidth="1.5"/>
  </g>

  {/* Top-right GREEN (OPP) */}
  <g filter="url(#yardShadow)">
    <rect x="560" y="20" width="320" height="320" rx="28" fill="url(#g-green)"/>
    <rect x="570" y="30" width="300" height="300" rx="22"
      fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5"/>
    <circle cx="720" cy="180" r="110" fill="#F5EBC9"
      stroke="#14532D" strokeWidth="10"/>
    <circle cx="720" cy="180" r="100" fill="none"
      stroke="rgba(20,83,45,0.35)" strokeWidth="1.5"/>
    <text x="720" y="152" fontSize="22" fontWeight="800"
      fill="#065F46" textAnchor="middle" opacity="0.65"
      fontFamily="sans-serif">OPP</text>
    <text x="720" y="222" fontSize="56" fontWeight="900"
      fill="#14532D" textAnchor="middle" fontFamily="sans-serif">
      {gameState.scores.opp}
    </text>
  </g>

  {/* Bottom-left BLUE (YOU) */}
  <g filter="url(#yardShadow)">
    <rect x="20" y="560" width="320" height="320" rx="28" fill="url(#g-blue)"/>
    <rect x="30" y="570" width="300" height="300" rx="22"
      fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5"/>
    <circle cx="180" cy="720" r="110" fill="#F5EBC9"
      stroke="#1E3A8A" strokeWidth="10"/>
    <circle cx="180" cy="720" r="100" fill="none"
      stroke="rgba(30,58,138,0.35)" strokeWidth="1.5"/>
    <text x="180" y="692" fontSize="22" fontWeight="800"
      fill="#1E40AF" textAnchor="middle" opacity="0.65"
      fontFamily="sans-serif">YOU</text>
    <text x="180" y="762" fontSize="56" fontWeight="900"
      fill="#1E3A8A" textAnchor="middle" fontFamily="sans-serif">
      {gameState.scores.you}
    </text>
  </g>

  {/* Bottom-right YELLOW (decorative) */}
  <g filter="url(#yardShadow)">
    <rect x="560" y="560" width="320" height="320" rx="28" fill="url(#g-yellow)"/>
    <rect x="570" y="570" width="300" height="300" rx="22"
      fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5"/>
    <circle cx="720" cy="720" r="110" fill="#F5EBC9"
      stroke="#78350F" strokeWidth="10"/>
    <circle cx="720" cy="720" r="100" fill="none"
      stroke="rgba(120,53,15,0.35)" strokeWidth="1.5"/>
  </g>

  {/* ── PATH CELLS ── */}
  <BoardCells/>

  {/* ── CENTER: 4 triangles + trophy diamond ── */}
  <g>
    <polygon points="360,360 450,450 360,540" fill="url(#g-red)"    stroke="#0A0A0A" strokeWidth="2"/>
    <polygon points="360,360 540,360 450,450" fill="url(#g-green)"  stroke="#0A0A0A" strokeWidth="2"/>
    <polygon points="540,360 540,540 450,450" fill="url(#g-yellow)" stroke="#0A0A0A" strokeWidth="2"/>
    <polygon points="360,540 450,450 540,540" fill="url(#g-blue)"   stroke="#0A0A0A" strokeWidth="2"/>

    <g transform="translate(450,450) rotate(45)">
      <rect x="-42" y="-42" width="84" height="84" rx="12"
        fill="#0A0A0A" stroke="#1E293B" strokeWidth="2"/>
      <rect x="-34" y="-34" width="68" height="68" rx="10"
        fill="url(#g-trophy)" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5"/>
    </g>
    <text x="450" y="466" fontSize="40" textAnchor="middle"
      fill="#fff" fontWeight="900" pointerEvents="none">🏆</text>
  </g>

  {/* ── PAWNS (existing, unchanged) ── */}
<g>
  {(["you","opp"] as const).flatMap(playerKey =>
    (gameState.pawns[playerKey] || []).map(pawn => {
      const uidKey = `${playerKey}${pawn.id}`;
      const stackIndex = stackIndicesRef.current[uidKey] || 0;
      return (
        <AnimatedPawn
          key={uidKey}
          pawnId={uidKey}
          position={pawn.isFinished ? TOTAL_STEPS : pawn.position}
          colorKey={playerKey}
          stackIndex={stackIndex}
          selectable={selectablePawns.includes(uidKey)}
          finished={pawn.isFinished}
          onClick={handlePawnClick}
        />
      );
    })
  )}
</g>
</svg>
        </div>

        {/* DICE ROW */}
        <div style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"linear-gradient(135deg,#0f172a,#0a0f1e)",borderRadius:16,border:`1.5px solid ${isYourTurn?"rgba(59,130,246,0.3)":"#1e293b"}`,boxShadow:isYourTurn?"0 0 20px rgba(59,130,246,0.1)":"none",transition:"all 0.3s"}}>
          <ScoreAvatar playerKey="you" name={myName} active={isYourTurn} photoURL={myPhoto}/>
          <DiceFace value={diceDisplay} rolling={diceRolling} onClick={handleRoll} disabled={rollDisabled}/>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700,color:isYourTurn?"#60a5fa":"#64748b",letterSpacing:0.3,lineHeight:1.3}}>{statusMsg}</div>
            <div style={{display:"flex",gap:4,marginTop:5}}>
              {gameState.pawns.you.map(p=>(
                <div key={p.id} style={{width:10,height:10,borderRadius:"50%",border:"1.5px solid #60a5fa",background:p.isFinished?"#60a5fa":"#1d4ed8",transition:"all 0.3s",transform:gameState.diceRolled&&isYourTurn&&canMovePawn(p,gameState.diceVal)?"scale(1.5)":"scale(1)",boxShadow:p.isFinished?"0 0 6px #60a5fa":"none"}}/>
              ))}
            </div>
          </div>
          {isYourTurn&&gameState.diceVal&&(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <div style={{width:36,height:36,background:"linear-gradient(145deg,#1e3a8a,#1d4ed8)",border:"1.5px solid #60a5fa",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{position:"relative",width:24,height:24}}>
                  {(DOT_POSITIONS[gameState.diceVal]||[]).map(([px,py],i)=>(
                    <div key={i} style={{position:"absolute",width:5,height:5,borderRadius:"50%",background:"#fff",left:px*0.22,top:py*0.22}}/>
                  ))}
                </div>
              </div>
              <div style={{fontSize:8,color:"#60a5fa",fontWeight:800}}>+{gameState.diceVal}</div>
            </div>
          )}
        </div>
      </div>

      {/* TOAST */}
      <div style={{position:"fixed",top:"50%",left:"50%",transform:`translate(-50%,-50%) scale(${toast.visible?1:0.8})`,background:"linear-gradient(135deg,#1e293b,#0f172a)",border:"2px solid #334155",padding:"16px 28px",borderRadius:20,fontSize:17,fontWeight:800,textAlign:"center",pointerEvents:"none",opacity:toast.visible?1:0,transition:"all 0.28s",zIndex:999,boxShadow:"0 20px 50px rgba(0,0,0,0.85)",color:"#fff"}}>
        {toast.msg}
      </div>

      {/* WIN OVERLAY */}
      {winOverlay.show && (
        <div style={{position:"fixed",inset:0,background:"rgba(2,6,23,0.97)",zIndex:1000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
          <div style={{background:"linear-gradient(145deg,#0a0f1e,#0d1933)",border:`2px solid ${winOverlay.winner==="you"?"rgba(251,191,36,0.4)":"rgba(255,255,255,0.1)"}`,borderRadius:28,padding:"32px 40px",display:"flex",flexDirection:"column",alignItems:"center",gap:14,maxWidth:320,width:"90%",boxShadow:winOverlay.winner==="you"?"0 0 60px rgba(251,191,36,0.15)":"none"}}>
            <div style={{fontSize:54}}>{winOverlay.winner==="you"?"🏆":winOverlay.winner==="draw"?"🤝":"😔"}</div>
            <div style={{fontSize:10,fontWeight:800,letterSpacing:3,color:"rgba(255,255,255,0.3)",textTransform:"uppercase"}}>{winOverlay.reason}</div>
            <div style={{fontSize:32,fontWeight:900,textAlign:"center",color:winOverlay.winner==="you"?"#fbbf24":winOverlay.winner==="draw"?"#94a3b8":"#64748b"}}>
              {winOverlay.winner==="you"?"YOU WIN!":winOverlay.winner==="draw"?"DRAW!":`${oppName.toUpperCase()} WINS`}
            </div>
            <div style={{display:"flex",gap:0,width:"100%",borderRadius:16,overflow:"hidden",border:"1px solid #1e293b"}}>
              <div style={{flex:1,background:"linear-gradient(145deg,#1e3a8a22,#1d4ed811)",padding:"12px 8px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#60a5fa",fontWeight:700,letterSpacing:1,marginBottom:4}}>{myName.toUpperCase()}</div>
                <div style={{fontSize:28,fontWeight:900,color:"#60a5fa"}}>{gameState.scores.you}</div>
                <div style={{fontSize:8,color:"rgba(255,255,255,0.3)"}}>points</div>
              </div>
              <div style={{width:1,background:"#1e293b"}}/>
              <div style={{flex:1,background:"linear-gradient(145deg,#06503611,#05953611)",padding:"12px 8px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#34d399",fontWeight:700,letterSpacing:1,marginBottom:4}}>{oppName.toUpperCase()}</div>
                <div style={{fontSize:28,fontWeight:900,color:"#34d399"}}>{gameState.scores.opp}</div>
                <div style={{fontSize:8,color:"rgba(255,255,255,0.3)"}}>points</div>
              </div>
            </div>
            {winOverlay.winner==="you" && (
              <div style={{background:"linear-gradient(135deg,rgba(251,191,36,0.15),rgba(245,158,11,0.08))",border:"1px solid rgba(251,191,36,0.3)",borderRadius:12,padding:"10px 20px",textAlign:"center"}}>
                <div style={{fontSize:11,color:"rgba(251,191,36,0.6)",letterSpacing:1}}>YOU EARNED</div>
                <div style={{fontSize:24,fontWeight:900,background:"linear-gradient(90deg,#fde68a,#fbbf24)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>₹{winnerAmount}</div>
              </div>
            )}
            {winOverlay.winner==="draw" && (
              <div style={{background:"linear-gradient(135deg,rgba(148,163,184,0.15),rgba(148,163,184,0.08))",border:"1px solid rgba(148,163,184,0.3)",borderRadius:12,padding:"10px 20px",textAlign:"center"}}>
                <div style={{fontSize:11,color:"rgba(148,163,184,0.7)",letterSpacing:1}}>REFUNDED</div>
                <div style={{fontSize:24,fontWeight:900,color:"#94a3b8"}}>₹{drawAmount}</div>
              </div>
            )}
            <button onClick={handleRestart} style={{width:"100%",padding:"14px",border:"none",borderRadius:14,fontSize:15,fontWeight:800,cursor:"pointer",background:"linear-gradient(135deg,#1d4ed8,#1e3a8a)",color:"#fff",boxShadow:"0 8px 25px rgba(29,78,216,0.4)",letterSpacing:1,marginTop:4}}>
              BACK TO LOBBY
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
