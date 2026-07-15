// src/firebase/ticTacToe.ts — Thin client, never touches wallet directly
// ✅ apiCall se — token auto-refresh, uid kabhi body mein nahi

import { apiCall } from '../lib/apiClient';

const ACTION = '/api/tictactoe/action';

// ─── No auth needed (public GET endpoints) ────────────────────────────────────
export const getLobby = () =>
  fetch('/api/tictactoe/lobby').then(r => r.json());

export const getTable = (tableId: string) =>
  fetch(`/api/tictactoe/table?tableId=${tableId}`).then(r => r.json());

// ─── Auth required ────────────────────────────────────────────────────────────
// ✅ token parameter hataya — apiCall khud Firebase se fresh token leta hai
// ✅ uid kabhi body mein nahi — server token se nikalta hai

export const tttApi = {
  getLobby,
  getTable,

  getMyTable: () =>
    apiCall(ACTION, { type: 'my-table' }),

  create: (selectedFee: number) =>
    apiCall(ACTION, { type: 'create', selectedFee }),

  join: (tableId: string) =>
    apiCall(ACTION, { type: 'join', tableId }),

  leave: (tableId: string) =>
    apiCall(ACTION, { type: 'leave', tableId }),

  move: (tableId: string, cellIndex: number) =>
    apiCall(ACTION, { type: 'move', tableId, cellIndex }),

  forfeit: (tableId: string) =>
    apiCall(ACTION, { type: 'forfeit', tableId }),
};
