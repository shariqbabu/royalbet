// api/redeem-code.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../lib/firebaseAdmin';
import { internalWalletTransaction } from '../lib/walletInternal';
import { verifyToken } from '../lib/middleware';

const REDEEM_CODES = 'redeemCode';
const USERS = 'users';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let uid = '';
  try {
    uid = await verifyToken(req);
  } catch (e: any) {
    return res.status(e.status || 401).json({ error: e.message });
  }

  const { code, amount, displayName } = req.body ?? {};
  if (!code) return res.status(400).json({ error: 'code is required' });

  const sanitizedCode = String(code).trim().toUpperCase();
  const codeRef = db.collection(REDEEM_CODES).doc(sanitizedCode);

  try {
  
    const result = await db.runTransaction(async (tx) => {
       const snap = await tx.get(codeRef);

  if (!snap.exists) {
    throw new Error("Invalid or expired code");
  }

  const data = snap.data() as any;

  if (data.status === "INACTIVE") {
    throw new Error("Wait for approval before using this code");
  }

      
  if (data.used) {
    throw new Error("Code already used");
  }

  if (data.uid !== uid) {
  throw new Error("This code is not assigned to you");
}

  if (Number(amount) !== Number(data.amount)) {
    throw new Error("Invalid amount");
  }

  tx.update(codeRef, {
    used: true,
    usedBy: displayName ?? "",
    usedAt: FieldValue.serverTimestamp(),
  });

  return {
    amount: data.amount,
    description: `Redeem Code: ${sanitizedCode}`,
  };
});

    // Credit amount to wallet — fail ho to code wapas unused karo,
    // warna user ka code bhi jala aur paisa bhi nahi mila
    try {
      await internalWalletTransaction({
        action: 'ADD',
        uid,
        amount: result.amount,
        type: 'REDEEM_CODE',
        description: result.description,
        idempotencyKey: `redeem_${sanitizedCode}_${uid}`,
        balanceType: 'depositBalance',
      });
    } catch (creditErr: any) {
      await codeRef.update({ used: false, usedBy: '', usedAt: null })
        .catch(e => console.error('CRITICAL: redeem revert failed', sanitizedCode, e));
      throw new Error('Credit failed, code released — please try again');
    }

    return res.status(200).json({
      success: true,
      amount: result.amount,
      message: 'Amount added successfully',
    });
  } catch (err: any) {
    console.error('[redeem-code]', err.message);
    const status = err.message.includes('not assigned') ? 403 : 400;
    return res.status(status).json({ error: err.message });
  }
}
