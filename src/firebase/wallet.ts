// src/firebase/wallet.ts
//
// CLEANED — this file is now READ-ONLY for the client.
//
// All money-moving operations (add / deduct / withdrawal) now go through
// the backend (Admin SDK, e.g. internalWalletTransaction via your API
// routes — see api/nine-card/action.ts for the pattern). Letting the
// browser SDK write directly to `wallets/{uid}` was the old, insecure
// path: any client could call addFunds/deductFunds themselves and credit
// their own wallet, since Firestore transactions run with the user's own
// auth token, not a trusted server.
//
// This file now only fetches/subscribes to wallet + transaction data so
// the UI can display balance and history.

import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from './config';
import { Wallet, Transaction } from '../types';

// ─── Get Wallet (one-time) ───────────────────────────────────────────────────

export const getWallet = async (uid: string): Promise<Wallet | null> => {
  const snap = await getDoc(doc(db, 'wallets', uid));
  if (!snap.exists()) return null;
  return snap.data() as Wallet;
};

// ─── Subscribe Wallet (realtime) ─────────────────────────────────────────────

export const subscribeWallet = (
  uid: string,
  callback: (wallet: Wallet | null) => void
) => {
  return onSnapshot(doc(db, 'wallets', uid), (snap) => {
    callback(snap.exists() ? (snap.data() as Wallet) : null);
  });
};

// ─── Get Transactions (one-time) ─────────────────────────────────────────────

export const getTransactions = async (
  uid: string,
  limitCount = 20
): Promise<Transaction[]> => {
  const q = query(
    collection(db, 'transactions'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
};

// ─── Subscribe Transactions (realtime) ───────────────────────────────────────

export const subscribeTransactions = (
  uid: string,
  callback: (txs: Transaction[]) => void
) => {
  const q = query(
    collection(db, 'transactions'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(q, (snap) => {
    const txs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
    callback(txs);
  });
};
