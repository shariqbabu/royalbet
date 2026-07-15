import { AppLoader } from './components/AppLoader';
import { SplashScreen } from './components/SplashScreen';
import React, { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute, AdminRoute, PublicRoute } from './components/ProtectedRoute';
import { MainLayout } from './components/Layout/MainLayout';
import { lazyRetry } from './lib/lazyRetry';

const PokerGamePage = lazy(() => lazyRetry(() => import('./pages/games/PokerGame')));
const PokerLobbyPage = lazy(() => lazyRetry(() => import('./pages/games/PokerLobby')));
const JokerPairLobby = lazy(() => lazyRetry(() => import('./pages/games/JokerPairLobby')));
const JokerPairGame = lazy(() => lazyRetry(() => import('./pages/games/JokerPairGame')));
const NineCardGame = lazy(() => lazyRetry(() => import('./pages/games/NineCardGame')));
const NineCardLobby = lazy(() => lazyRetry(() => import('./pages/games/NineCardLobby')));
const TicTacToe = lazy(() => lazyRetry(() => import('./pages/games/TicTacToe')));
const RealLudoGame = lazy(() => lazyRetry(() => import('./pages/games/RealLudo')));
const RealLudoLobby = lazy(() => lazyRetry(() => import('./pages/games/RealLudoLobby')));
const TambolaLobby = lazy(() => lazyRetry(() => import('./pages/games/TambolaLobby')));
const TambolaGame = lazy(() => lazyRetry(() => import('./pages/games/TambolaGame')));

const Login = lazy(() => lazyRetry(() => import('./pages/Login').then(m => ({ default: m.Login }))));
const Signup = lazy(() => lazyRetry(() => import('./pages/Signup').then(m => ({ default: m.Signup }))));
const Dashboard = lazy(() => lazyRetry(() => import('./pages/Dashboard')));
const Wallet = lazy(() => lazyRetry(() => import('./pages/Wallet').then(m => ({ default: m.Wallet }))));
const TransactionHistory = lazy(() => lazyRetry(() => import('./pages/TransactionHistory').then(m => ({ default: m.TransactionHistory }))));
const AddMoney = lazy(() => lazyRetry(() => import('./pages/AddMoney')));
const Withdrawal = lazy(() => lazyRetry(() => import('./pages/Withdrawal')));
const BetHistory = lazy(() => lazyRetry(() => import('./pages/BetHistory')));
const Referral = lazy(() => lazyRetry(() => import('./pages/Referral')));
const Profile = lazy(() => lazyRetry(() => import('./pages/Profile')));
const DownloadApp = lazy(() => lazyRetry(() => import('./pages/Download')));
const Notifications = lazy(() => lazyRetry(() => import('./pages/Notifications').then(m => ({ default: m.Notifications }))));
const Matchmaking = lazy(() => lazyRetry(() => import('./pages/Matchmaking').then(m => ({ default: m.Matchmaking }))));
const GameRoom = lazy(() => lazyRetry(() => import('./pages/GameRoom').then(m => ({ default: m.GameRoom }))));
const RedeemCode = lazy(() => lazyRetry(() => import('./pages/redeemCode')));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

function AppContent({ splashDone, setSplashDone }: { splashDone: boolean; setSplashDone: (v: boolean) => void }) {
  const { loading } = useAuth();

  // Splash tab tak dikhao jab tak animation khatam na ho AUR auth check bhi resolve na ho
  if (!splashDone || loading) {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<AppLoader />}>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/download" element={<DownloadApp />} />
          </Route>

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/add-money" element={<AddMoney />} />
              <Route path="/withdrawal" element={<Withdrawal />} />
              <Route path="/bet-history" element={<BetHistory />} />
              <Route path="/transactions" element={<TransactionHistory />} />
              <Route path="/referral" element={<Referral />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/matchmaking" element={<Matchmaking />} />
              <Route path="/games/poker" element={<PokerLobbyPage />} />
              <Route path="/games/nine-card" element={<NineCardLobby />} />
              <Route path="/games/joker-pair" element={<JokerPairLobby />} />
              <Route path="/games/tictactoe" element={<TicTacToe />} />
              <Route path="/games/realludolobby" element={<RealLudoLobby />} />
              <Route path="/games/tambola" element={<TambolaLobby />} />
              <Route path="/redeem-code" element={<RedeemCode />} />
            </Route>

            {/* Without Header */}
            <Route path="/game-room/:roomId" element={<GameRoom />} />
            <Route path="/games/poker/:tableId" element={<PokerGamePage />} />
            <Route path="/games/joker-pair/:tableId" element={<JokerPairGame />} />
            <Route path="/games/nine-card/:tableId" element={<NineCardGame />} />
            <Route path="/games/realludogame/:tableId" element={<RealLudoGame />} />
            <Route path="/games/tambola/:tableId" element={<TambolaGame />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1a1327',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
            },
          }}
        />
        <AppContent splashDone={splashDone} setSplashDone={setSplashDone} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
