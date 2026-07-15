import type { VercelRequest, VercelResponse } from "@vercel/node";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../lib/firebaseAdmin";
import { verifyToken } from "../lib/middleware";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Method not allowed",
      });
    }

    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { referredBy } = body || {};

    // Middleware body se uid nikal kar return karega
    const uid = await verifyToken(req);

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const walletRef = db.collection("wallets").doc(uid);

    // create() = atomic "sirf agar exist nahi karta" — pehle get()+set() tha
    // jisme do parallel requests dono set() kar deti thin (referral bonus
    // dobara ya wallet reset ho sakta tha)
    try {
      await walletRef.create({
        uid,
        winningBalance: 0,
        depositBalance: 0,
        bonusBalance: referredBy ? 50 : 0,
        referralBalance: 0,
        totalBalance: referredBy ? 50 : 0,
        referredBy: referredBy || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (createErr: any) {
      if (createErr?.code === 6 /* ALREADY_EXISTS */) {
        return res.status(200).json({
          success: true,
          message: "Wallet already exists",
        });
      }
      throw createErr;
    }

    return res.status(200).json({
      success: true,
      message: "Wallet created",
    });
  } catch (error: any) {
    console.error("Wallet create error:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Internal Server Error",
    });
  }
}
