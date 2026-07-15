// src/pages/games/TambolaLobby.tsx — Tambola (Housie) lobby
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  Play,
  Users,
  Loader2,
  Coins,
  Grid3X3,
  Trophy,
  Table2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../context/AuthContext';
import { tambolaApi } from '../../lib/apiClient';
import { db } from '../../firebase/config';
import { formatCurrency } from '../../utils/helpers';

import {
  ActionButton,
  EmptyLobby,
  InfoChip,
  LobbyCard,
  LobbyHero,
  LobbyStats,
  LoadingScreen,
  PremiumLobbyPage,
  lobbyAnim,
} from '../../components/lobby/LobbyTheme';

import { motion } from 'framer-motion';

interface TambolaTable {
  id: string;
  entryFee: number;
  maxPlayers: number;
  players: string[];
  playerNames: Record<string, string>;
  prizePool: number;
  status: 'waiting' | 'playing';
  round?: number;
}

const TambolaLobby: React.FC = () => {
  const { user, wallet } = useAuth();
  const navigate = useNavigate();

  const [tables, setTables] = useState<TambolaTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'tambolaTables'),
      where('status', 'in', ['waiting', 'playing'])
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as TambolaTable)
      );
      data.sort((a, b) => (a.entryFee || 0) - (b.entryFee || 0));
      setTables(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const myBalance = wallet
    ? (wallet.depositBalance || 0) + (wallet.winningBalance || 0)
    : 0;

  const handleJoin = async (table: TambolaTable) => {
    if (!user) return toast.error('Login required');
    if (!wallet) return toast.error('Wallet not loaded');

    if (table.players?.includes(user.uid)) {
      navigate(`/games/tambola/${table.id}`);
      return;
    }

    if (table.status !== 'waiting')
      return toast.error('Game already started');

    if (myBalance < table.entryFee) {
      return toast.error(`Need ₹${table.entryFee} · Balance: ₹${myBalance}`);
    }

    setJoining(table.id);
    try {
      await tambolaApi.join(table.id, user.name || 'Player', user.photoURL || '');
      toast.success(`Joined · Entry ₹${table.entryFee} deducted`);
      navigate(`/games/tambola/${table.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to join');
    } finally {
      setJoining(null);
    }
  };

  if (loading) {
    return <LoadingScreen accent="emerald" label="Loading Tambola tables..." />;
  }

  const available = tables.filter(
    (t) => t.status === 'waiting' && (t.players?.length || 0) < (t.maxPlayers || 10)
  ).length;

  const totalPlayers = tables.reduce(
    (sum, t) => sum + (t.players?.length || 0),
    0
  );

  return (
    <PremiumLobbyPage>
      <motion.div variants={lobbyAnim.container} initial="hidden" animate="show">
        <LobbyHero
          title="Tambola"
          icon={Grid3X3}
          accent="emerald"
          subtitle={
            <>
              Housie · 5 prizes per game · Balance:{' '}
              <span className="font-bold text-yellow-400">
                {formatCurrency(myBalance)}
              </span>
            </>
          }
          right={
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">
                Balance
              </p>
              <p className="text-lg font-black text-yellow-400">
                {formatCurrency(myBalance)}
              </p>
            </div>
          }
        />

        <LobbyStats
          stats={[
            { label: 'Tables', value: tables.length, icon: Table2, accent: 'emerald' },
            { label: 'Available', value: available, icon: Trophy, accent: 'yellow' },
            { label: 'Players', value: totalPlayers, icon: Users, accent: 'blue' },
          ]}
        />

        {tables.length === 0 ? (
          <EmptyLobby
            title="No tables available"
            subtitle="Admin hasn't created any Tambola tables yet"
            icon={Users}
          />
        ) : (
          <div className="space-y-3">
            {tables.map((table) => {
              const playerCount = table.players?.length || 0;
              const maxPlayers = table.maxPlayers || 10;
              const isFull = playerCount >= maxPlayers;
              const isPlaying = table.status === 'playing';
              const myTable = table.players?.includes(user?.uid || '');
              const isJoining = joining === table.id;

              return (
                <LobbyCard
                  key={table.id}
                  accent="emerald"
                  active={myTable}
                  disabled={(isFull || isPlaying) && !myTable}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10">
                        <Grid3X3 className="h-6 w-6 text-emerald-400" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-base font-black text-white">
                            Tambola Table
                          </h3>

                          {myTable && (
                            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                              YOURS
                            </span>
                          )}

                          {isPlaying && (
                            <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">
                              LIVE
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 text-xs text-gray-500">
                          Early 5 · 3 Lines · Full House
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                      <InfoChip icon={Coins} accent="yellow">
                        ₹{table.entryFee}
                      </InfoChip>

                      <InfoChip icon={Trophy} accent="emerald">
                        Pool ₹{table.prizePool || 0}
                      </InfoChip>

                      <InfoChip icon={Users} accent={isFull ? 'red' : 'blue'}>
                        {playerCount}/{maxPlayers}
                      </InfoChip>
                    </div>

                    <div className="w-full sm:w-[145px]">
                      {myTable ? (
                        <ActionButton
                          variant="emerald"
                          onClick={() => navigate(`/games/tambola/${table.id}`)}
                        >
                          <Play className="h-4 w-4" />
                          Rejoin
                        </ActionButton>
                      ) : isPlaying ? (
                        <ActionButton variant="disabled" disabled>
                          Live
                        </ActionButton>
                      ) : isFull ? (
                        <ActionButton variant="disabled" disabled>
                          Full
                        </ActionButton>
                      ) : (
                        <ActionButton
                          variant="emerald"
                          onClick={() => handleJoin(table)}
                          disabled={isJoining}
                        >
                          {isJoining ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="h-4 w-4" />
                              Join ₹{table.entryFee}
                            </>
                          )}
                        </ActionButton>
                      )}
                    </div>
                  </div>
                </LobbyCard>
              );
            })}
          </div>
        )}
      </motion.div>
    </PremiumLobbyPage>
  );
};

export default TambolaLobby;
