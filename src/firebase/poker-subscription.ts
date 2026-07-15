// src/firebase/poker-subscription.ts
import { doc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './config';
import type { PokerTable } from '../utils/pokerApi';

// ── Single table subscribe ────────────────────────────────────────────────────
export const subscribePokerTable = (
  tableId: string,
  callback: (table: PokerTable) => void
): (() => void) => {
  return onSnapshot(doc(db, 'pokerTables', tableId), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() } as PokerTable);
  });
};

// ── All tables subscribe (lobby ke liye) ─────────────────────────────────────
export const subscribePokerTables = (
  callback: (tables: PokerTable[]) => void
): (() => void) => {
  const q = query(
    collection(db, 'pokerTables'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const tables = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as PokerTable)
    );
    callback(tables);
  });
};
