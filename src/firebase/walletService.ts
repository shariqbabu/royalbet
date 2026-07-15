// src/lib/walletService.ts
import { walletApi } from '../lib/apiClient';

// crypto.randomUUID — Math.random se collision-safe idempotency keys
const newKey = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export const walletService = {
  withdraw: async (
    amount: number,
    upiId: string,
    displayName: string,
    email: string
    ) => {
    return await walletApi.withdraw(amount, upiId, displayName, email, newKey('withdraw'));
  },

  addFund: async (
    amount: number,
    screenshot: string,
    utrNumber: string,
    displayName: string,
  ) => {
    return await walletApi.addFund(amount, screenshot, utrNumber, displayName, newKey('addfund'));
  },
};
