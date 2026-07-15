// src/firebase/auth.ts

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from './config';
import { generateReferralCode } from '../utils/helpers';
import { walletApi } from '../lib/apiClient';


// ─── SIGN UP ──────────────────────────────────────────────────────────────────

export const signUp = async (
  email:         string,
  password:      string,
  name:          string,
  phone:         string,
  referralCode?: string,
) => {
  // 1. Firebase Auth
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;
  await updateProfile(user, { displayName: name });

  const userReferralCode = generateReferralCode(user.uid);
  let referredBy: string | undefined;

  // 2. Referral code check
  if (referralCode) {
    try {
      const q = query(
        collection(db, 'users'),
        where('referralCode', '==', referralCode)
      );
      const snap = await getDocs(q);
      if (!snap.empty && snap.docs[0].id !== user.uid) {
        referredBy = snap.docs[0].id;
      }
    } catch (_e) {
      // ignore referral lookup errors
    }
  }

  // 3. User doc create (Firestore — no wallet data)
  await setDoc(doc(db, 'users', user.uid), {
    uid:          user.uid,
    name,
    email,
    phone,
    photoURL:     '',
    referralCode: userReferralCode,
    referredBy:   referredBy || null,
    isAdmin:      false,
    isOnline:     true,
    isBanned:     false,
    role:         'user',
    createdAt:    serverTimestamp(),
    updatedAt:    serverTimestamp(),
  });

  // 4. Wallet create via server API
  await user.getIdToken(true);
  await walletApi.createWallet({referredBy});
  if (referredBy) {
    try {
      await sendReferralReward(referredBy, user.uid, name, email);
    } catch (_e) {
      // ignore — wallet already created, don't fail signup
    }
  }

  return user;
};

// ─── SIGN IN ──────────────────────────────────────────────────────────────────

export const signIn = async (email: string, password: string) => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  try {
    await setDoc(
      doc(db, 'users', credential.user.uid),
      { isOnline: true, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (_e) {
    // ignore
  }
  return credential.user;
};

// ─── LOG OUT ──────────────────────────────────────────────────────────────────

export const logOut = async () => {
  if (auth.currentUser) {
    try {
      await setDoc(
        doc(db, 'users', auth.currentUser.uid),
        { isOnline: false, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (_e) {
      // ignore
    }
  }
  await signOut(auth);
};

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────

export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

// ─── GET USER DOC ─────────────────────────────────────────────────────────────

export const getUserDoc = async (uid: string) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};

// ─── AUTH STATE LISTENER ──────────────────────────────────────────────────────

export const onAuthChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
