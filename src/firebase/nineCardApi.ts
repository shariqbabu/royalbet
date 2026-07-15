// src/utils/nineCardApi.ts — Thin client, never touches wallet directly
// ✅ apiCall se — token auto-refresh, uid kabhi body mein nahi
import { apiCall }         from '../lib/apiClient';
import { db }              from './config';
import { doc, collection, query, onSnapshot } from 'firebase/firestore';

const BASE = '/api/nine-card/action';

// ─── Types (backend se exact match) ──────────────────────────────────────────

export type Suit         = '♠' | '♥' | '♦' | '♣';
export type Rank         = 'A' | 'K' | 'Q' | 'J' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type PlayerStatus = 'waiting' | 'blind' | 'seen' | 'packed' | 'show';
export type TableStatus  = 'waiting' | 'booting' | 'playing' | 'showdown' | 'finished' | 'disabled';

export interface Card { rank: Rank; suit: Suit; id: string; }

export interface NineCardPlayer {
  uid: string;
  displayName: string;
  photoURL?: string;
  status: PlayerStatus;
  hasPaidBoot: boolean;
  currentBet: number;
  totalBet: number;
  cardIds: string[];
  isMyTurn: boolean;
  seenCards: boolean;
  connected: boolean;
  joinedAt: any;
  turnStartedAt: any;
  autoCallAt: any;
  timeoutCount: number;
}

export interface NineCardTable {
  id: string;
  name: string;
  bootAmount: number;
  status: TableStatus;
  locked: boolean;
  createdBy: string;
  players: Record<string, NineCardPlayer>;
  playerOrder: string[];
  pot: number;
  currentCallAmount: number;
  currentTurn: string | null;
  round: number;
  deck: string[];
  deckIndex: number;
  winnerId: string | null;
  winnerReason: string | null;
  isDraw: boolean;
  history: any[];
  minPlayers: number;
  maxPlayers: number;
  lastRaiseBy: string | null;
  lastRaiseAmount: number;
  createdAt: any;
  updatedAt: any;
}

// ─── Firestore Subscription ───────────────────────────────────────────────────

export function subscribeNineCardTable(
  tableId: string,
  onData: (table: NineCardTable) => void,
): () => void {
  const ref = doc(db, 'nineCardTables', tableId);
  return onSnapshot(ref, snap => {
    if (!snap.exists()) return;
    onData({ id: snap.id, ...snap.data() } as NineCardTable);
  });
}

export function subscribeLobby(
  onData: (tables: NineCardTable[]) => void,
): () => void {
  const ref = query(collection(db, 'nineCardTables'));
  return onSnapshot(ref, snap => {
    onData(snap.docs.map(d => ({ id: d.id, ...d.data() } as NineCardTable)));
  });
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const nineCardApi = {
  join: (tableId: string, displayName: string, photoURL?: string, amount: number) =>
    apiCall(BASE, { type: 'join', tableId, displayName, photoURL: photoURL || '', amount }),

  autoStart: (tableId: string) =>
    apiCall(BASE, { type: 'auto-start', tableId }),

  seeCards: (tableId: string) =>
    apiCall(BASE, { type: 'see-cards', tableId }),

  call: (tableId: string) =>
    apiCall(BASE, { type: 'call', tableId }),

  raise: (tableId: string, raiseAmount: number) =>
    apiCall(BASE, { type: 'raise', tableId, raiseAmount }),

  pack: (tableId: string) =>
    apiCall(BASE, { type: 'pack', tableId }),

  show: (tableId: string) =>
    apiCall(BASE, { type: 'show', tableId }),

  leave: (tableId: string) =>
    apiCall(BASE, { type: 'leave', tableId }),

  reset: (tableId: string) =>
    apiCall(BASE, { type: 'reset', tableId }),
};
