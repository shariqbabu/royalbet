import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../lib/middleware';
import { internalWalletTransaction } from '../lib/walletInternal';
import { FieldValue } from "firebase-admin/firestore";
import { db } from '../lib/firebaseAdmin';

export function generateRedeemCode(): string {
  const random = Math.floor(100000 + Math.random() * 900000); // 100000-999999
  return `BET${random}ADDA`;
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const uid = await verifyToken(req);
    const { action, amount, screenshot, displayName, upiId, utrNumber, idempotencyKey, email } = req.body;

    if (!action || !amount) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }
    if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.length > 100) {
      return res.status(400).json({ ok: false, error: 'Invalid idempotencyKey' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid amount' });
    }

    let result;

    if (action === 'WITHDRAW') {
      if (!upiId) {
        return res.status(400).json({ ok: false, error: 'UPI ID is required for withdrawal' });
      }
      // SECURITY: key mein uid zaroori hai — warna koi doosre user ki used key
      // bhej ke deduction skip karwa sakta hai (duplicate) aur withdrawal record
      // phir bhi ban jata
      const withdrawKey = `withdraw_${uid}_${idempotencyKey}`;
      result = await internalWalletTransaction({
        action: 'WITHDRAW',
        uid,
        amount: numAmount,
        type: 'WITHDRAWAL',
        status: 'PENDING',
        description: `Wait for Approved Send To UPI: ${upiId}`,
        idempotencyKey: withdrawKey,
      });

      // Duplicate request pe record dobara mat banao — deduction hua hi nahi
      if (!result.duplicate) {
        // Doc ID = idempotency key (uid nahi) — ek user ki multiple PENDING
        // withdrawals ek doosre ko overwrite na karein
        await db.collection("withdrawals").doc(withdrawKey).set({
          amount: numAmount,
          status: 'PENDING',
          uid,
          upiId: upiId,
          userEmail: email ?? '',
          userName: displayName ?? '',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          idempotencyKey: withdrawKey,
        });
      }

    } else if (action === 'ADDFUND') {
      if (!screenshot || !utrNumber || !displayName) {
        return res.status(400).json({ ok: false, error: 'Screenshot, UTR number and name are required' });
      }
      const addfundKey = `addfund_${uid}_${idempotencyKey}`;
      result = await internalWalletTransaction({
        action: 'ADDFUND',
        uid,
        amount: numAmount,
        type: 'ADD_MONEY',
        status: 'PENDING',
        description: `Wait for Approved UTR: ${utrNumber}`,
        idempotencyKey: addfundKey,
      });

      if (!result.duplicate) {
        // SECURITY: code INACTIVE banta hai — admin payment verify karke
        // ACTIVE karega, tabhi redeem hoga. Pehle ACTIVE banta tha jisse
        // user bina payment approve hue turant redeem kar sakta tha.
        // create() use kiya hai (set() nahi) — random code collision pe
        // kisi existing/used code ko overwrite na kare.
        const redeemCode = generateRedeemCode();
        await db.collection("redeemCode").doc(redeemCode).create({
          code: redeemCode,
          uid,
          amount: numAmount,
          used: false,
          usedBy: "",
          asignBy: displayName,
          status: "INACTIVE",
          createdAt: FieldValue.serverTimestamp(),
        });

        await db.collection("deposits").doc(addfundKey).set({
          adminNote: "",
          amount: numAmount,
          createdAt: FieldValue.serverTimestamp(),
          screenshotUrl: screenshot,
          status: 'PENDING',
          uid,
          updatedAt: FieldValue.serverTimestamp(),
          userName: displayName,
          utrNumber,
          redeemCode,
        });
      }

    } else {
      // SECURITY: pehle yahan ADD/DEDUCT bhi the — koi bhi user arbitrary
      // amount se apna wallet credit kar sakta tha. Game payouts sirf
      // server-side game APIs se hote hain (internalWalletTransaction direct),
      // is public endpoint se kabhi nahi.
      return res.status(400).json({ ok: false, error: 'Invalid action. Use WITHDRAW or ADDFUND' });
    }

    return res.status(200).json({ ok: true, result });

  } catch (error: any) {
    console.error('[wallet/transaction]', error);
    return res.status(500).json({
      ok: false,
      error: error?.message || 'Internal server error',
    });
  }
}
