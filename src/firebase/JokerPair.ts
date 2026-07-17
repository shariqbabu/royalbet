
import {
  doc, collection, onSnapshot, query, where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db }      from './config';
import { apiCall } from '../lib/apiClient'; // ✅ Shared auth layer — duplicate nahi

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GameCard {
  id:   string;
  rank: string;
  suit: string;
}

export interface PlayerGroup {
  cards: [string, string];
}

export interface GamePlayer {
  uid:       string;
  name:      string;
  avatar:    string;
  handCount: number;   // sirf count — asli cards private/{uid} doc mein
  hasActed:  boolean;
  missedTurns?: number; // 3 missed turns = forfeit
}

export interface JokerPairTable {
  id:           string;
  status:       'waiting' | 'playing' | 'finished';
  entryFee:     number;
  maxPlayers:   number;
  players:      string[];
  playerNames:  Record<string, string>;
  playerAvatars: Record<string, string>;
  createdAt:    any;
}

export interface JokerPairGameState {
  tableId:          string;
  status:           'dealing' | 'playing' | 'finished';
  players:          string[];
  playerData:       Record<string, GamePlayer>;
  drawCount:        number;      // draw pile ka size — pile khud server-only hai
  discardPile:      string[];
  jokerCard:        GameCard | null;
  jokerRank:        string | null;
  currentTurnIndex: number;
  currentTurnUid:   string;
  turnStartedAt:    number;
  turnDuration:     number;
  prizePool:        number;
  entryFee:         number;
  winnerId:         string | null;
  loserId?:         string | null;
  winnerGroups:     PlayerGroup[] | null;
  startedAt:        any;
  finishedAt:       any;
  finishReason?:    'declare' | 'player_left' | 'turn_forfeit';
  payoutDone:       boolean;
}

// Apna private doc — sirf apna hand/groups (jokerPairGames/{id}/private/{uid})
export interface MyPrivateState {
  hand:   string[];
  groups: PlayerGroup[];
}

// ─── Full deck (client-side constant — server bhi yahi 52 cards banata hai) ──
const ALL_RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const ALL_SUITS = ['h','d','c','s'];

export function buildFullDeck(): GameCard[] {
  const deck: GameCard[] = [];
  for (const rank of ALL_RANKS)
    for (const suit of ALL_SUITS)
      deck.push({ id: `${rank}${suit}`, rank, suit });
  return deck;
}

export const FULL_DECK: GameCard[] = buildFullDeck();

// ─── Validation (pure — UI local feedback ke liye sirf) ──────────────────────
// ✅ Server pe bhi same validation hoti hai — yeh sirf UX ke liye hai

export function isValidPair(
  cardIdA:   string,
  cardIdB:   string,
  jokerRank: string | null,
  deck:      GameCard[],
): boolean {
  const map = Object.fromEntries(deck.map(c => [c.id, c]));
  const a = map[cardIdA], b = map[cardIdB];
  if (!a || !b) return false;
  if (a.rank === b.rank) return true;
  if (jokerRank && (a.rank === jokerRank || b.rank === jokerRank)) return true;
  return false;
}

export function validateDeclare(
  hand:      string[],
  groups:    PlayerGroup[],
  jokerRank: string | null,
  deck:      GameCard[],
): { valid: boolean; reason?: string } {
  if (hand.length !== 6)
    return { valid: false, reason: `Hand must have 6 cards, found ${hand.length}` };
  if (groups.length !== 3)
    return { valid: false, reason: `Need 3 pairs, found ${groups.length}` };

  const used = new Set<string>();
  for (const grp of groups) {
    if (!grp.cards || grp.cards.length !== 2)
      return { valid: false, reason: 'Each group needs exactly 2 cards' };
    const [ca, cb] = grp.cards;
    if (used.has(ca) || used.has(cb))
      return { valid: false, reason: 'Duplicate card in groups' };
    if (!hand.includes(ca) || !hand.includes(cb))
      return { valid: false, reason: 'Group card not in hand' };
    if (!isValidPair(ca, cb, jokerRank, deck))
      return { valid: false, reason: `Invalid pair: ${ca}+${cb}` };
    used.add(ca); used.add(cb);
  }
  return { valid: true };
}

// ─── Firestore Subscriptions ──────────────────────────────────────────────────

export function subscribeTable(
  tableId: string,
  cb: (table: JokerPairTable | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'jokerPairTables', tableId), snap => {
    cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as JokerPairTable) : null);
  });
}

export function subscribeGame(
  tableId: string,
  cb: (game: JokerPairGameState | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'jokerPairGames', tableId), snap => {
    cb(snap.exists() ? (snap.data() as JokerPairGameState) : null);
  });
}

// Apna hand — jokerPairGames/{id}/private/{myUid} pe subscribe
// (Firestore rules: sirf apna hi private doc readable hona chahiye)
export function subscribeMyHand(
  tableId: string,
  myUid: string,
  cb: (priv: MyPrivateState | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'jokerPairGames', tableId, 'private', myUid),
    snap => {
      cb(snap.exists() ? (snap.data() as MyPrivateState) : null);
    },
    err => {
      // Permission denied = Firestore rules private doc read block kar rahe
      // hain — pehle yeh silently fail hota tha aur player ke cards kabhi
      // nahi dikhte the
      console.error('[JokerPair] subscribeMyHand failed:', err);
      onError?.(err);
    },
  );
}

export function subscribeOpenTables(
  cb: (tables: JokerPairTable[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'jokerPairTables'),
    where('status', '==', 'waiting'),
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as JokerPairTable)));
  });
}

// ─── API Callers ──────────────────────────────────────────────────────────────
// ✅ uid kabhi body mein nahi — server Firebase token se khud nikalta hai
// ✅ apiClient se shared auth — token refresh automatic

// ✅
// ✅ Correct URLs
export const joinTable   = (tableId: string, name: string, avatar: string) =>
  apiCall('/api/joker-pair/join',         { tableId, name, avatar });

export const startGame   = (tableId: string) =>
  apiCall('/api/joker-pair/start',        { tableId });

export const leaveTable  = (tableId: string) =>
  apiCall('/api/joker-pair/leave',        { tableId });

export const autoDiscard = (tableId: string) =>
  apiCall('/api/joker-pair/auto-discard', { tableId });

// Yeh sab theek hain — /action sahi URL hai inke liye
export const pickFromDrawPile    = (tableId: string) =>
  apiCall('/api/joker-pair/action', { tableId, action: 'pickDraw' });

export const pickFromDiscardPile = (tableId: string) =>
  apiCall('/api/joker-pair/action', { tableId, action: 'pickDiscard' });

export const discardCard         = (tableId: string, cardId: string) =>
  apiCall('/api/joker-pair/action', { tableId, action: 'discard', payload: { cardId } });

export const updatePlayerGroups  = (tableId: string, groups: PlayerGroup[]) =>
  apiCall('/api/joker-pair/action', { tableId, action: 'updateGroups', payload: { groups } });

export const declareWin          = (tableId: string) =>
  apiCall('/api/joker-pair/action', { tableId, action: 'declare' });

export const cleanupTable = (_tableId: string) => Promise.resolve();
