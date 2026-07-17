// src/lib/apiClient.ts

import { getAuth } from 'firebase/auth';

async function getToken(): Promise<string> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Not logged in');
  return user.getIdToken();
}



// ─── API Servers ──────────────────────────────────────────────────────────────
// Cloudflare Workers API
const CF_API = "https://betadda-api.betadda.workers.dev";
const CFF_API = "https://betadda-api.shrq.workers.dev";

// Dusra Vercel API server (agar kuch games wahan hain)
const VERCEL_API = "https://shrq.vercel.app";

function getUrl(url: string) {
  // ── CLOUDFLARE pe jo games shift karne hain — line uncomment karo ─────────
     if (url.startsWith("/api/poker/"))      return `${CF_API}${url}`;
     if (url.startsWith("/api/realludo/"))   return `${CF_API}${url}`;
     if (url.startsWith("/api/tictactoe/"))  return `${CF_API}${url}`;
     if (url.startsWith("/api/tambola/"))    return `${CF_API}${url}`;
 //  if (url.startsWith("/api/nine-card/"))  return `${CF_API}${url}`;
 //  if (url.startsWith("/api/joker-pair/")) return `${CF_API}${url}`;
  
 // ── CLOUDFLARE Second Server pe jo games shift karne hain — line uncomment karo ─────────
    // if (url.startsWith("/api/poker/"))      return `${CFG_API}${url}`;
   //  if (url.startsWith("/api/realludo/"))   return `${CFF_API}${url}`;
   //  if (url.startsWith("/api/tictactoe/"))  return `${CFF_API}${url}`;
   //  if (url.startsWith("/api/tambola/"))    return `${CFF_API}${url}`;
       if (url.startsWith("/api/nine-card/"))  return `${CFF_API}${url}`;
       if (url.startsWith("/api/joker-pair/")) return `${CFF_API}${url}`;

  // ── VERCEL (shrq.vercel.app) pe jo games hain — line uncomment karo ───────
  // if (url.startsWith("/api/poker/"))      return `${VERCEL_API}${url}`;
  // if (url.startsWith("/api/realludo/"))   return `${VERCEL_API}${url}`;
  // if (url.startsWith("/api/tictactoe/"))  return `${VERCEL_API}${url}`;
  // if (url.startsWith("/api/nine-card/"))  return `${VERCEL_API}${url}`;
  // if (url.startsWith("/api/joker-pair/")) return `${VERCEL_API}${url}`;

  // Baaki sab (wallet, voucher, etc.) current project (same-origin) par
  return url;
}

export async function apiCall<T = any>(
  url: string,
  body: object,
): Promise<T> {
  const token = await getToken();
  
  const res = await fetch(getUrl(url), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API error: ${res.status}`);
  return data as T;
}

export async function apiGet<T = any>(
  url: string,
  params: Record<string, string> = {},
): Promise<T> {
  const token = await getToken();

  const query = new URLSearchParams(params).toString();
  const fullUrl = query ? `${url}?${query}` : url;

  const res = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `API error: ${res.status}`);
  }

  return data as T;
}

// ─── Wallet ───────────────────────────────────────────────────────────────────
export const walletApi = {
  withdraw:(
    amount: number,
    upiId: string,
    displayName: string,
    email: string,
    idempotencyKey: string,
    ) =>
    apiCall('/api/wallet/transaction', {
      action: 'WITHDRAW', amount, upiId, displayName, email, idempotencyKey}),

  addFund:(
    amount: number,
    screenshot: string,
    utrNumber: string,
    displayName: string,
    idempotencyKey: string,
  ) =>
    apiCall('/api/wallet/transaction', {
      action: 'ADDFUND', amount, screenshot, utrNumber, displayName, idempotencyKey }),

   // NOTE: 'ADD'/'DEDUCT' server se hata diye gaye hain (security) —
   // wallet credit sirf server-side game APIs se hota hai

  createWallet: (data?: { referredBy?: string }) =>
  apiCall("/api/wallet/create", data ?? {}),
};

// ─── Poker ────────────────────────────────────────────────────────────────────
export const pokerApi = {
  join: (tableId: string, name: string, avatar: string, buyIn: number) =>
    apiCall('/api/poker/action', { type: 'join', tableId, name, avatar, buyIn }),

  startHand: (tableId: string) =>
    apiCall('/api/poker/action', { type: 'start-hand', tableId }),

  action: (tableId: string, action: string, raiseAmount?: number) =>
    apiCall('/api/poker/action', { type: 'action', tableId, action, raiseAmount }),

  leave: (tableId: string) =>
    apiCall('/api/poker/action', { type: 'leave', tableId }),

  rebuy: (tableId: string, amount: number) =>
    apiCall('/api/poker/action', { type: 'rebuy', tableId, amount }),

  autoFold: (tableId: string) =>
    apiCall('/api/poker/action', { type: 'auto-fold', tableId }),

  takeSeat: (tableId: string, buyIn: number) =>
    apiCall('/api/poker/action', { type: 'take-seat', tableId, buyIn }),

  startAfkWarning: (tableId: string) =>
    apiCall('/api/poker/action', { type: 'start-afk-warning', tableId }),

  markDisconnect: (tableId: string) =>
    apiCall('/api/poker/action', { type: 'disconnect', tableId }),

  markReconnect: (tableId: string) =>
    apiCall('/api/poker/action', { type: 'reconnect', tableId }),

  reserveSeat: (tableId: string, seatIndex: number) =>
    apiCall('/api/poker/action', { type: 'reserve-seat', tableId, seatIndex }),

  releaseSeat: (tableId: string, seatIndex: number) =>
    apiCall('/api/poker/action', { type: 'release-seat', tableId, seatIndex }),

  ping: (tableId: string) =>
    apiCall('/api/poker/action', { type: 'ping', tableId }),

  getState: (tableId: string) =>
    apiCall('/api/poker/action', { type: 'get-state', tableId }),
};

// ─── Joker Pair ───────────────────────────────────────────────────────────────
export const jokerPairApi = {
  join: (tableId: string, name: string, avatar: string) =>
    apiCall('/api/joker-pair/join', { tableId, name, avatar }),

  start: (tableId: string) =>
    apiCall('/api/joker-pair/start', { tableId }),

  action: (tableId: string, action: string, payload?: any) =>
    apiCall('/api/joker-pair/action', { tableId, action, payload }),

  leave: (tableId: string) =>
    apiCall('/api/joker-pair/leave', { tableId }),

  autoDiscard: (tableId: string) =>
    apiCall('/api/joker-pair/auto-discard', { tableId }),
};

// ─── Tic Tac Toe ──────────────────────────────────────────────────────────────
export const tttApi = {
  getMyTable: () =>
    apiCall('/api/tictactoe/action', { type: 'my-table' }),

  create: (selectedFee: number) =>
    apiCall('/api/tictactoe/action', { type: 'create', selectedFee }),

  join: (tableId: string) =>
    apiCall('/api/tictactoe/action', { type: 'join', tableId }),

  leave: (tableId: string) =>
    apiCall('/api/tictactoe/action', { type: 'leave', tableId }),

  move: (tableId: string, cellIndex: number) =>
    apiCall('/api/tictactoe/action', { type: 'move', tableId, cellIndex }),

  forfeit: (tableId: string) =>
    apiCall('/api/tictactoe/action', { type: 'forfeit', tableId }),
};



// ─── Nine Card ────────────────────────────────────────────────────────────────
export const nineCardApi = {
  join: (tableId: string, displayName: string, photoURL: string, amount: number) =>
    apiCall('/api/nine-card/action', {
      type: 'join',
      tableId,
      displayName,
      photoURL: photoURL || '',
      amount,
    }),

  autoStart: (tableId: string) =>
    apiCall('/api/nine-card/action', { type: 'auto-start', tableId }),

  seeCards: (tableId: string) =>
    apiCall('/api/nine-card/action', { type: 'see-cards', tableId }),

  call: (tableId: string) =>
    apiCall('/api/nine-card/action', { type: 'call', tableId }),

  raise: (tableId: string, raiseAmount: number) =>
    apiCall('/api/nine-card/action', { type: 'raise', tableId, raiseAmount }),

  pack: (tableId: string) =>
    apiCall('/api/nine-card/action', { type: 'pack', tableId }),

  show: (tableId: string) =>
    apiCall('/api/nine-card/action', { type: 'show', tableId }),

  leave: (tableId: string) =>
    apiCall('/api/nine-card/action', { type: 'leave', tableId }),

  reset: (tableId: string) =>
    apiCall('/api/nine-card/action', { type: 'reset', tableId }),
};

// ─── redeemCode ─────────────────────────────────────────────────────────────────────
export const redeemCode = {
  checkCode: (code: string, amount: number, displayName?: string) =>
    apiCall('/api/voucher/redeem', { code, amount, displayName, }),
};

export const ludoApi = {
  getTables: () =>
    apiCall('/api/realludo/action', { type: 'getTables' }),

  join: (tableId: string, name: string, avatar: string) =>
    apiCall('/api/realludo/action', { type: 'join', tableId, name, avatar }),

  start: (tableId: string) =>
    apiCall('/api/realludo/action', { type: 'start', tableId }),

  roll: (tableId: string) =>
    apiCall('/api/realludo/action', { type: 'roll', tableId }),

  move: (tableId: string, pawnId: number) =>
    apiCall('/api/realludo/action', { type: 'move', tableId, pawnId }),

  leave: (tableId: string) =>
    apiCall('/api/realludo/action', { type: 'leave', tableId }),

  timeout: (tableId: string) =>
    apiCall('/api/realludo/action', { type: 'timeout', tableId }),
};

// ─── Tambola (Housie) ─────────────────────────────────────────────────────────
export const tambolaApi = {
  getTables: () =>
    apiCall('/api/tambola/action', { type: 'getTables' }),

  join: (tableId: string, name: string, avatar: string) =>
    apiCall('/api/tambola/action', { type: 'join', tableId, name, avatar }),

  start: (tableId: string) =>
    apiCall('/api/tambola/action', { type: 'start', tableId }),

  call: (tableId: string) =>
    apiCall('/api/tambola/action', { type: 'call', tableId }),

  claim: (tableId: string, claimType: string) =>
    apiCall('/api/tambola/action', { type: 'claim', tableId, claimType }),

  leave: (tableId: string) =>
    apiCall('/api/tambola/action', { type: 'leave', tableId }),
};
