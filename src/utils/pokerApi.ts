// src/utils/pokerApi.ts
import { apiCall } from "../lib/apiClient.ts";

// ─── Core Type Definitions ────────────────────────────────────────────────────
export type PokerStatus  = 'waiting' | 'playing' | 'finished';
export type PokerPhase   = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type SeatStatus   = 'ACTIVE' | 'SITTING_OUT' | 'AFK_WARNING' | 'LEFT_SEAT' | 'DISCONNECTED';
export type PlayerStatus = 'waiting' | 'active' | 'folded' | 'allin' | 'left' | 'disconnected';

export interface Card {
  suit:         string;
  value:        string;
  numericValue: number;
}

export interface HandResult {
  rank:    number;
  name:    string;
  kickers: number[];
}

export interface PokerPlayer {
  uid:               string;
  name:              string;
  avatar:            string;
  photoURL?:         string;
  chips:             number;
  holeCards:         Card[];
  bet:               number;
  totalBet:          number;
  status:            PlayerStatus;
  seatStatus:        SeatStatus;
  missedTurns:       number;
  isDealer:          boolean;
  isSmallBlind:      boolean;
  isBigBlind:        boolean;
  isTurn:            boolean;
  hasActedThisRound: boolean;
  handRank?:         string;
  seatIndex:         number;
  joinedAt:          any;
  disconnectedAt?:   any;
  lastSeen?:         any;
  turnStartedAt?:    any;
  afkWarningAt?:     any;
  leaveRequested?:   boolean;
}

export interface SpectatorEntry {
  uid:         string;
  name:        string;
  avatar:      string;
  buyIn:       number;
  seatIndex?:  number | null;
  joinedAt:    any;
  isSpectator: boolean; // true = watching, false = waiting for a seat with buyIn
}

export interface SidePot {
  amount:       number;
  eligibleUids: string[];
}

export interface PokerTable {
  id:                string;
  name:              string;
  status:            PokerStatus;
  phase:             PokerPhase;
  minBuyIn:          number;
  maxBuyIn:          number;
  smallBlind:        number;
  bigBlind:          number;
  maxPlayers:        6;
  players:           PokerPlayer[];
  spectatorQueue:    SpectatorEntry[];
  communityCards:    Card[];
  pot:               number;
  sidePots:          SidePot[];
  currentBet:        number;
  dealerSeat:        number;
  activePlayerUid:   string | null;
  turnExpiresAt:     any;
  afkWarningUid?:    string | null;
  afkWarningEndsAt?: any;
  deck:              Card[];
  handNumber:        number;
  createdBy:         string;
  lastBrokePlayers:  Array<{ uid: string; name: string }>;
  lastHandWins?:     Record<string, number>;
  lastHandAllIn?:    boolean;
  lastWinner?:       string;
  nextHandAt?:       any;
  reservedSeats?:    Record<number, { uid: string; until: number }>;
  createdAt:         any;
  updatedAt:         any;
  lastActionAt:      any;
}

// ─── Response Types ───────────────────────────────────────────────────────────
export interface JoinResponse   { role: 'player' | 'spectator'; }
export interface ActionResponse { ok: boolean; action?: string; }
export interface RebuyResponse  { ok: boolean; newChips?: number; }
export interface SeatResponse   { ok: boolean; role?: string; reservedUntil?: number; }

// ─── Frontend Hand Evaluator ──────────────────────────────────────────────────
const getCombinations = (arr: Card[], k: number): Card[][] => {
  const result: Card[][] = [];
  const combo = (start: number, cur: Card[]) => {
    if (cur.length === k) { result.push([...cur]); return; }
    for (let i = start; i < arr.length; i++) combo(i + 1, [...cur, arr[i]]);
  };
  combo(0, []);
  return result;
};

const evalFive = (cards: Card[]): HandResult => {
  const sorted = [...cards].sort((a, b) => b.numericValue - a.numericValue);
  const suits  = sorted.map(c => c.suit);
  const vals   = sorted.map(c => c.numericValue);

  const isFlush          = suits.every(s => s === suits[0]);
  const isNormalStraight = vals.every((v, i) => i === 0 || v === vals[i - 1] - 1);
  const isWheelStraight  = vals[0] === 14 && vals[1] === 5 && vals[2] === 4 && vals[3] === 3 && vals[4] === 2;
  const isStraight       = isNormalStraight || isWheelStraight;
  const highVal          = isWheelStraight ? 5 : vals[0];

  const freq: Record<number, number> = {};
  vals.forEach(v => (freq[v] = (freq[v] || 0) + 1));

  const kickers = Object.entries(freq)
    .map(([v, c]) => ({ v: Number(v), c }))
    .sort((a, b) => b.c - a.c || b.v - a.v)
    .map(x => x.v);

  const counts = Object.values(freq).sort((a, b) => b - a);

  if (isFlush && isStraight && highVal === 14 && vals[1] === 13)
    return { rank: 9, name: 'Royal Flush 👑', kickers: [14, 13, 12, 11, 10] };
  if (isFlush && isStraight)              return { rank: 8, name: 'Straight Flush',   kickers: [highVal] };
  if (counts[0] === 4)                    return { rank: 7, name: 'Four of a Kind',   kickers };
  if (counts[0] === 3 && counts[1] === 2) return { rank: 6, name: 'Full House',       kickers };
  if (isFlush)                            return { rank: 5, name: 'Flush',            kickers: vals };
  if (isStraight)                         return { rank: 4, name: 'Straight',         kickers: [highVal] };
  if (counts[0] === 3)                    return { rank: 3, name: 'Three of a Kind',  kickers };
  if (counts[0] === 2 && counts[1] === 2) return { rank: 2, name: 'Two Pair',         kickers };
  if (counts[0] === 2)                    return { rank: 1, name: 'One Pair',         kickers };
  return { rank: 0, name: 'High Card', kickers: vals };
};

/** Compare two evaluated hands. Returns 1 if a > b, -1 if a < b, 0 if equal. */
const compareHandValues = (a: HandResult, b: HandResult): number => {
  if (a.rank !== b.rank) return a.rank > b.rank ? 1 : -1;
  const len = Math.max(a.kickers.length, b.kickers.length);
  for (let i = 0; i < len; i++) {
    const av = a.kickers[i] ?? 0;
    const bv = b.kickers[i] ?? 0;
    if (av !== bv) return av > bv ? 1 : -1;
  }
  return 0;
};

export const evalBestHand = (cards: Card[]): HandResult => {
  if (cards.length < 2) return { rank: -1, name: 'No Cards', kickers: [] };
  const combos = cards.length <= 5 ? [cards] : getCombinations(cards, 5);
  let best: HandResult = { rank: -1, name: 'High Card', kickers: [] };

  for (const c of combos) {
    const r = evalFive(c);
    if (compareHandValues(r, best) > 0) best = r;
  }
  return best;
};

/// ─── API Methods ──────────────────────────────────────────────────────────────
export const pokerApi = {
  /** Join a table as a player (buyIn = 0 means watch/spectate) */
  join: (tableId: string, name: string, avatar: string, buyIn: number, seatIndex?: number) =>
    apiCall<JoinResponse>('/api/poker/action', {
      type: 'join', tableId, name, avatar, buyIn, seatIndex,
    }),

  /**
   * Deal a new hand (auto-triggered by clients when ready).
   * Multiple clients/effects can race to call this at the same time
   * (e.g. auto-restart-after-showdown + auto-start both firing).
   * The server correctly rejects the losing call with a known,
   * expected error — we swallow those here so they never surface
   * as uncaught errors or noisy console logs.
   */
  startHand: async (tableId: string) => {
    try {
      return await apiCall<ActionResponse>('/api/poker/action', {
        type: 'start-hand', tableId,
      });
    } catch (e: any) {
      const msg: string = e?.message || '';
      const isExpectedRace =
        msg.includes('already in progress') ||
        msg.includes('2 players') ||
        msg.includes('Showdown');
      if (isExpectedRace) {
        return undefined; // no-op — someone else already started the hand
      }
      throw e; // real error, let it propagate
    }
  },

  /** Perform a betting action */
  action: (tableId: string, action: string, raiseAmount?: number) =>
    apiCall<ActionResponse>('/api/poker/action', {
      type: 'action', tableId, action, raiseAmount,
    }),
  /** Client-triggered auto-fold when turn timer expires */
  autoFold: (tableId: string) =>
    apiCall<ActionResponse>('/api/poker/action', { type: 'auto-fold', tableId }),
  /** Start the AFK warning countdown for the active player */
  startAfkWarning: (tableId: string) =>
    apiCall<ActionResponse>('/api/poker/action', { type: 'start-afk-warning', tableId }),
  /** Spectator claims an empty seat */
  takeSeat: (tableId: string, buyIn: number, seatIndex?: number) =>
    apiCall<SeatResponse>('/api/poker/action', {
      type: 'take-seat', tableId, buyIn, seatIndex,
    }),
  /** Reserve an empty seat temporarily */
  reserveSeat: (tableId: string, seatIndex: number) =>
    apiCall<SeatResponse>('/api/poker/action', {
      type: 'reserve-seat', tableId, seatIndex,
    }),
  /** Release a seat reservation */
  releaseSeat: (tableId: string, seatIndex: number) =>
    apiCall<ActionResponse>('/api/poker/action', {
      type: 'release-seat', tableId, seatIndex,
    }),
  /** Leave the table (chips returned to wallet) */
  leave: (tableId: string) =>
    apiCall<ActionResponse>('/api/poker/action', { type: 'leave', tableId }),
  /**
   * Rebuy chips after busting.
   * NOTE: Signature is (tableId, uid, amount) to match the game component caller.
   * The backend derives uid from the auth token; it is sent here only for logging clarity.
   */
  rebuy: (tableId: string, uid: string, amount: number) =>
    apiCall<RebuyResponse>('/api/poker/action', {
      type: 'rebuy', tableId, uid, amount,
    }),
  /** Mark player as disconnected (tab hidden) */
  markDisconnect: (tableId: string) =>
    apiCall<ActionResponse>('/api/poker/action', { type: 'disconnect', tableId }),
  /** Mark player as reconnected (tab visible) */
  markReconnect: (tableId: string) =>
    apiCall<ActionResponse>('/api/poker/action', { type: 'reconnect', tableId }),
  /** Heartbeat ping to update lastSeen */
  ping: (tableId: string) =>
    apiCall<ActionResponse>('/api/poker/action', { type: 'ping', tableId }),
  /** Fetch full table state (initial load / fallback) */
  getState: (tableId: string) =>
    apiCall<PokerTable>('/api/poker/action', { type: 'get-state', tableId }),
};
