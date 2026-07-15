import { db } from "../lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyToken } from "../lib/middleware";

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    // SECURITY: pehle koi auth nahi tha — koi bhi live tables reset kar
    // sakta tha (players/pot wipe). Ab login + admin dono chahiye.
    const uid = await verifyToken(req);
    const adminSnap = await db.collection("admins").doc(uid).get();
    if (!adminSnap.exists) {
      return res.status(403).json({ success: false, error: "Admin only" });
    }

    const tables = [
      {
        id: "table_001",
        name: "Beginner Table",
        minBuyIn: 100,
        maxBuyIn: 1000,
        smallBlind: 5,
        bigBlind: 10,
      },
      {
        id: "table_002",
        name: "Intermediate Table",
        minBuyIn: 500,
        maxBuyIn: 5000,
        smallBlind: 25,
        bigBlind: 50,
      },
      {
        id: "table_003",
        name: "High Roller",
        minBuyIn: 5000,
        maxBuyIn: 50000,
        smallBlind: 100,
        bigBlind: 200,
      },
    ];

    for (const t of tables) {
      // Live table overwrite mat karo — sirf missing tables create ho
      const ref = db.collection("pokerTables").doc(t.id);
      const existing = await ref.get();
      if (existing.exists) continue;

      await ref.set({
        id: t.id,
        name: t.name,

        status: "waiting",
        phase: "waiting",

        minBuyIn: t.minBuyIn,
        maxBuyIn: t.maxBuyIn,

        smallBlind: t.smallBlind,
        bigBlind: t.bigBlind,

        maxPlayers: 6,

        players: [],
        spectatorQueue: [],
        communityCards: [],
        deck: [],

        pot: 0,
        sidePots: [],
        currentBet: 0,

        dealerSeat: -1,
        activePlayerUid: null,

        turnExpiresAt: null,
        afkWarningUid: null,
        afkWarningEndsAt: null,

        handNumber: 0,

        createdBy: "system",

        lastBrokePlayers: [],
        lastHandWins: {},
        lastHandAllIn: false,
        lastWinner: null,

        nextHandAt: null,

        reservedSeats: {},

        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastActionAt: FieldValue.serverTimestamp(),
      });
    }

    return res.status(200).json({
      success: true,
      message: "Poker tables created",
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
