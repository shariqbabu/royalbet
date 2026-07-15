// src/context/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User as FirebaseUser, getAuth } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { onAuthChange } from '../firebase/auth';
import { User, Wallet } from '../types';
import { walletApi } from '../lib/apiClient';

// ── LocalStorage cache keys ──────────────────────────────────────────────────
const CACHE_USER_KEY   = 'rb_user_cache';
const CACHE_WALLET_KEY = 'rb_wallet_cache';

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

function writeCache(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_USER_KEY);
    localStorage.removeItem(CACHE_WALLET_KEY);
  } catch {}
}
// ─────────────────────────────────────────────────────────────────────────────

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  wallet: Wallet | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  user: null,
  wallet: null,
  loading: true,
  isAdmin: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ── Pre-populate from cache so first render is never blank ────────────────
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser]                 = useState<User | null>(() => readCache<User>(CACHE_USER_KEY));
  const [wallet, setWallet]             = useState<Wallet | null>(() => readCache<Wallet>(CACHE_WALLET_KEY));
  // If we have a cached user, skip the loading spinner entirely
  const [loading, setLoading]           = useState<boolean>(() => readCache<User>(CACHE_USER_KEY) === null);

  const unsubUserRef       = useRef<(() => void) | null>(null);
  const unsubWalletRef     = useRef<(() => void) | null>(null);
  const unsubAuthRef       = useRef<(() => void) | null>(null);
  const hasResolvedOnceRef = useRef(false);

  const cleanupSnapshots = () => {
    unsubUserRef.current?.();   unsubUserRef.current   = null;
    unsubWalletRef.current?.(); unsubWalletRef.current = null;
  };

  const setupAuthListener = useCallback(() => {
    unsubAuthRef.current?.();
    unsubAuthRef.current = null;

    const unsubAuth = onAuthChange(async (fbUser) => {
      cleanupSnapshots();

      if (!fbUser) {
        setFirebaseUser(null);
        setUser(null);
        setWallet(null);
        clearCache(); // user logged out — wipe cache
        setLoading(false);
        hasResolvedOnceRef.current = true;
        return;
      }

      setFirebaseUser(fbUser);

      // ── User snapshot ──────────────────────────────────────────────────────
      const userRef = doc(db, 'users', fbUser.uid);
      unsubUserRef.current = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const u: User = {
              id:           snap.id,
              uid:          data.uid          || fbUser.uid,
              name:         data.name         || data.displayName || fbUser.displayName || 'Player',
              displayName:  data.name         || data.displayName || fbUser.displayName || 'Player',
              email:        data.email        || fbUser.email,
              phone:        data.phone,
              photoURL:     data.photoURL     || fbUser.photoURL || '',
              isAdmin:      data.isAdmin      || false,
              isBanned:     data.isBanned     || false,
              role:         data.role         || 'user',
              referralCode: data.referralCode,
              referredBy:   data.referredBy,
              isOnline:     data.isOnline     || false,
              createdAt:    data.createdAt,
              updatedAt:    data.updatedAt,
            } as User;
            setUser(u);
            writeCache(CACHE_USER_KEY, u); // save to cache
          } else {
            setDoc(userRef, {
              uid:          fbUser.uid,
              email:        fbUser.email,
              name:         fbUser.displayName || 'Player',
              displayName:  fbUser.displayName || 'Player',
              photoURL:     fbUser.photoURL    || '',
              phone:        fbUser.phoneNumber || '',
              isAdmin:      false,
              isBanned:     false,
              isOnline:     true,
              role:         'user',
              referralCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
              referredBy:   null,
              createdAt:    serverTimestamp(),
              updatedAt:    serverTimestamp(),
            });
            const u: User = {
              id:          fbUser.uid,
              uid:         fbUser.uid,
              name:        fbUser.displayName || 'Player',
              displayName: fbUser.displayName || 'Player',
              email:       fbUser.email,
              photoURL:    fbUser.photoURL    || '',
              isAdmin:     false,
              isBanned:    false,
              role:        'user',
            } as User;
            setUser(u);
            writeCache(CACHE_USER_KEY, u);
          }
          setLoading(false);
          hasResolvedOnceRef.current = true;
        },
        (error) => {
          console.warn('[Auth] User snapshot error:', error.code);
          setLoading(false);
          hasResolvedOnceRef.current = true;
        }
      );

      // ── Wallet snapshot ────────────────────────────────────────────────────
    
    const walletRef = doc(db, 'wallets', fbUser.uid);
    unsubWalletRef.current = onSnapshot(
    walletRef,
    (snap) => {
     if (!snap.exists()) {
      console.warn("[Auth] Wallet does not exist");
      setWallet(null);
      return;
 }
    const data = snap.data();
    const w: Wallet = {
      uid: data.uid || fbUser.uid,
      depositBalance: data.depositBalance || 0,
      winningBalance: data.winningBalance || 0,
      referralBalance: data.referralBalance || 0,
      bonusBalance: data.bonusBalance || 0,
      totalBalance: data.totalBalance || 0,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as Wallet;

    setWallet(w);
    writeCache(CACHE_WALLET_KEY, w);
  },
  (error) => {
    console.warn("[Auth] Wallet snapshot error:", error.code);
  }
);
}); // <-- onAuthChange close
unsubAuthRef.current = unsubAuth;
}, []); // useCallback close
      
  useEffect(() => {
    setupAuthListener();

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        console.log('[Auth] bfcache restore — restarting auth listener');
        hasResolvedOnceRef.current = false;
        setLoading(true);
        setupAuthListener();
      }
    };

    let hiddenAt: number | null = null;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      const wasHiddenFor = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = null;
      if (wasHiddenFor > 20_000 && !hasResolvedOnceRef.current) {
        console.log('[Auth] Long background + never resolved — restarting');
        setLoading(true);
        setupAuthListener();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubAuthRef.current?.();
      cleanupSnapshots();
    };
  }, [setupAuthListener]);

  // ── Fail-safe timeout ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      if (!hasResolvedOnceRef.current) {
        console.warn(
          '[Auth] Firebase never resolved after 15s.\n' +
          'Check: 1) VITE_FIREBASE_* env vars in Vercel Dashboard\n' +
          '       2) betadda.vercel.app in Firebase Console → Auth → Authorised Domains'
        );
        setLoading(false);
      }
    }, 15_000);
    return () => clearTimeout(t);
  }, [loading]);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        wallet,
        loading,
        isAdmin: user?.isAdmin || false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);
          
