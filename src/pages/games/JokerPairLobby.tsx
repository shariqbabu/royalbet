import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  Play,
  Users,
  Loader2,
  Coins,
  Swords,
  Trophy,
  Table2,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../context/AuthContext';
import { joinTable, JokerPairTable } from '../../firebase/JokerPair';
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

const JokerPairLobby: React.FC = () => {
  const { user, wallet } = useAuth();
  const navigate = useNavigate();

  const [tables, setTables] = useState<JokerPairTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'jokerPairTables'),
      where('status', '==', 'waiting')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as JokerPairTable)
      );
      setTables(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const myBalance = wallet
    ? (wallet.depositBalance || 0) + (wallet.winningBalance || 0)
    : 0;

  const handleJoin = async (table: JokerPairTable) => {
    if (!user) return toast.error('Login required');
    if (!wallet) return toast.error('Wallet not loaded');

    if (myBalance < table.entryFee) {
      return toast.error(
        `Need ₹${table.entryFee} · Balance: ₹${myBalance}`
      );
    }

    if (table.players?.includes(user.uid)) {
      navigate(`/games/joker-pair/${table.id}`);
      return;
    }

    setJoining(table.id);

    try {
      await joinTable(
        table.id,
        user.name || 'Player',
        user.avatar || '',
        myBalance
      );

      toast.success(`Joined · Entry ₹${table.entryFee} deducted`);
      navigate(`/games/joker-pair/${table.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to join');
    } finally {
      setJoining(null);
    }
  };

  if (loading) {
    return <LoadingScreen accent="violet" label="Loading Joker Pair tables..." />;
  }

  const available = tables.filter(
    (t) => (t.players?.length || 0) < (t.maxPlayers || 4)
  ).length;

  const totalPlayers = tables.reduce(
    (sum, t) => sum + (t.players?.length || 0),
    0
  );

  return (
    <PremiumLobbyPage>
      <motion.div
        variants={lobbyAnim.container}
        initial="hidden"
        animate="show"
      >
        <LobbyHero
          title="Joker Pair"
          icon={Swords}
          accent="violet"
          subtitle={
            <>
              Make 3 pairs to win · Balance:{' '}
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
            { label: 'Tables', value: tables.length, icon: Table2, accent: 'violet' },
            { label: 'Available', value: available, icon: Trophy, accent: 'emerald' },
            { label: 'Players', value: totalPlayers, icon: Users, accent: 'yellow' },
          ]}
        />

        {tables.length === 0 ? (
          <EmptyLobby
            title="No tables available"
            subtitle="Admin hasn't created any Joker Pair tables yet"
            icon={Users}
          />
        ) : (
          <div className="space-y-3">
            {tables.map((table) => {
              const playerCount = table.players?.length || 0;
              const maxPlayers = table.maxPlayers || 4;
              const isFull = playerCount >= maxPlayers;
              const myTable = table.players?.includes(user?.uid || '');
              const isJoining = joining === table.id;
              const prizePool = table.entryFee * maxPlayers;
              const winAmount = Math.floor(prizePool * 0.9);

              return (
                <LobbyCard
                  key={table.id}
                  accent="violet"
                  active={myTable}
                  disabled={isFull && !myTable}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-violet-500/25 bg-violet-500/10">
                        <Swords className="h-6 w-6 text-violet-400" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-base font-black text-white">
                            Joker Pair Table
                          </h3>

                          {myTable && (
                            <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-400">
                              YOURS
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 text-xs text-gray-500">
                          Match 3 pairs before opponents
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                      <InfoChip icon={Coins} accent="yellow">
                        ₹{table.entryFee}
                      </InfoChip>

                      <InfoChip icon={Trophy} accent="emerald">
                        Win ₹{winAmount}
                      </InfoChip>

                      <InfoChip icon={Users} accent={isFull ? 'red' : 'blue'}>
                        {playerCount}/{maxPlayers}
                      </InfoChip>
                    </div>

                    <div className="w-full sm:w-[145px]">
                      {myTable ? (
                        <ActionButton
                          variant="violet"
                          onClick={() => navigate(`/games/joker-pair/${table.id}`)}
                        >
                          <Play className="h-4 w-4" />
                          Rejoin
                        </ActionButton>
                      ) : isFull ? (
                        <ActionButton variant="disabled" disabled>
                          Full
                        </ActionButton>
                      ) : (
                        <ActionButton
                          variant="violet"
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

export default JokerPairLobby;
