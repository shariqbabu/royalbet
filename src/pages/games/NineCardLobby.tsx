import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table2, Plus, Lock, Users, Coins, Play, Loader2, ShieldCheck, Eye,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { useAuth }              from '../../context/AuthContext';
import type { NineCardTable }   from '../../firebase/nineCardApi';
import { nineCardApi, subscribeLobby } from '../../firebase/nineCardApi';
import {
  ActionButton, EmptyLobby, InfoChip, LobbyCard,
  LobbyHero, LoadingScreen, PremiumLobbyPage, lobbyAnim,
} from '../../components/lobby/LobbyTheme';
import { haptic } from '../../utils/haptics';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: NineCardTable['status']): string {
  switch (status) {
    case 'waiting':  return 'text-emerald-400';
    case 'booting':  return 'text-yellow-400';
    case 'playing':  return 'text-blue-400';
    case 'finished': return 'text-purple-400';
    case 'showdown': return 'text-orange-400';
    case 'disabled': return 'text-red-400';
    default:         return 'text-gray-400';
  }
}

function statusLabel(status: NineCardTable['status']): string {
  switch (status) {
    case 'waiting':  return 'Open';
    case 'booting':  return 'Starting';
    case 'playing':  return 'In Play';
    case 'finished': return 'Finished';
    case 'showdown': return 'Showdown';
    case 'disabled': return 'Disabled';
    default:         return status;
  }
}

function playerCount(table: NineCardTable): number {
  return Object.keys(table.players).length;
}

// ─── Table Card ───────────────────────────────────────────────────────────────

interface TableCardProps {
  table: NineCardTable;
  currentUid: string;
  joining: boolean;
  onJoin: (id: string) => void;
}

function TableCard({ table, currentUid, joining, onJoin }: TableCardProps) {
  const count      = playerCount(table);
  const isFull     = count >= table.maxPlayers;
  const isInGame   = table.status === 'playing' || table.status === 'booting';
  const isDisabled = table.status === 'disabled';
  const alreadyIn  = !!table.players[currentUid];
  const canJoin    = !isDisabled && !isFull && !isInGame && !table.locked;

  const joinLabel = () => {
    if (isFull)       return 'Full';
    if (isInGame)     return 'In Game';
    if (table.locked) return 'Locked';
    if (isDisabled)   return 'Disabled';
    return 'Join Table';
  };

  return (
    <LobbyCard accent="emerald" active={alreadyIn} disabled={isDisabled && !alreadyIn}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10">
            <Table2 className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-white">{table.name}</h3>
            <p className="mt-0.5 text-xs text-gray-500">9 Card Table</p>
          </div>
        </div>
        {table.locked && (
          <InfoChip accent={isFull ? 'red' : 'yellow'} icon={Lock}>
            {isFull ? 'Full' : 'Locked'}
          </InfoChip>
        )}
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
          <Coins className="mx-auto mb-1 h-4 w-4 text-yellow-400" />
          <p className="text-[10px] text-gray-500">Boot</p>
          <p className="text-sm font-black text-yellow-400">₹{table.bootAmount}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
          <Users className="mx-auto mb-1 h-4 w-4 text-blue-400" />
          <p className="text-[10px] text-gray-500">Players</p>
          <p className="text-sm font-black text-white">{count}<span className="text-gray-600">/{table.maxPlayers}</span></p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
          <Eye className="mx-auto mb-1 h-4 w-4 text-emerald-400" />
          <p className="text-[10px] text-gray-500">Status</p>
          <p className={`text-sm font-black ${statusColor(table.status)}`}>{statusLabel(table.status)}</p>
        </div>
      </div>

      <div className="mb-3 flex gap-1.5">
        {Array.from({ length: table.maxPlayers }).map((_, i) => {
          const uid    = table.playerOrder[i];
          const player = uid ? table.players[uid] : null;
          return (
            <div key={i} className={`flex h-9 flex-1 items-center justify-center rounded-xl border text-[10px] ${
              player
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                : 'border-dashed border-white/10 bg-black/20 text-gray-600'
            }`}>
              {player ? (<span className="truncate px-1"> 
              {String(player.displayName || "Player").replace(/\s.*/, '')} </span>) : ("Empty")}
            </div>
          );
        })}
      </div>

      {alreadyIn ? (
        <ActionButton variant="blue" onClick={() => onJoin(table.id)}>
          <Play className="h-4 w-4" />Rejoin
        </ActionButton>
      ) : (
        <ActionButton variant="emerald" onClick={() => onJoin(table.id)} disabled={!canJoin || joining}>
          {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4" />{joinLabel()}</>}
        </ActionButton>
      )}
    </LobbyCard>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NineCardGameLobby() {
  const navigate          = useNavigate();
  const { user, wallet }  = useAuth();
  const amount = wallet?.totalBalance?? 0;

  const [tables, setTables]       = useState<NineCardTable[]>([]);
  const [loading, setLoading]     = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError]         = useState('');
  const [filter, setFilter]       = useState<'all' | 'open' | 'playing'>('all');

  useEffect(() => {
    const unsub = subscribeLobby((all) => { setTables(all); setLoading(false); });
    return unsub;
  }, []);

  const handleJoin = useCallback(async (tableId: string) => {
    haptic('medium');
    if (!user) { setError('Login required'); return; }

    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    if (table.players[user.uid]) {
      navigate(`/games/nine-card/${tableId}`);
      return;
    }

    setJoiningId(tableId);
    setError('');
    try {
      await nineCardApi.join(
        tableId,
        String((user as any).displayName || (user as any).name || 'Player').slice(0,30),
        (user as any).photoURL    || (user as any).avatar || '', amount,
      );
      
      navigate(`/games/nine-card/${tableId}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setJoiningId(null);
    }
  }, [user, tables, navigate]);

  const filtered  = tables.filter(t => {
    if (filter === 'open')    return t.status === 'waiting';
    if (filter === 'playing') return t.status === 'playing' || t.status === 'booting';
    return true;
  });
  const openCount = tables.filter(t => t.status === 'waiting').length;
  const liveCount = tables.filter(t => t.status === 'playing').length;

  if (loading) return <LoadingScreen accent="emerald" label="Loading Nine Card tables..." />;

  return (
    <PremiumLobbyPage>
      <motion.div variants={lobbyAnim.container} initial="hidden" animate="show">

        <LobbyHero
          title="9 Card Table" icon={Table2} accent="emerald"
          subtitle={`${openCount} open · ${liveCount} live`}
        />

        {error && (
          <motion.div variants={lobbyAnim.item} className="mb-4 flex items-center justify-between rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={() => setError('')} className="ml-3 text-lg leading-none text-red-400">×</button>
          </motion.div>
        )}

        <motion.div variants={lobbyAnim.item} className="mb-5 flex gap-2 overflow-x-auto">
          {(['all', 'open', 'playing'] as const).map(f => (
            <button key={f} onClick={() => { haptic('light'); setFilter(f); }}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition ${
                filter === f
                  ? 'border-emerald-500 bg-emerald-600 text-white'
                  : 'border-white/10 bg-white/[0.04] text-gray-400 hover:border-emerald-500/40'
              }`}>
              {f === 'all' ? `All (${tables.length})` : f === 'open' ? `Open (${openCount})` : `Live (${liveCount})`}
            </button>
          ))}
        </motion.div>

        {filtered.length === 0 ? (
          <EmptyLobby
            title={filter === 'all' ? 'No tables yet' : `No ${filter} tables`}
            subtitle="Please check again later"
            icon={Table2}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(table => (
              <TableCard
                key={table.id} table={table}
                currentUid={user?.uid || ''}
                joining={joiningId === table.id}
                onJoin={joiningId ? () => {} : handleJoin}
              />
            ))}
          </div>
        )}

        <motion.div variants={lobbyAnim.item} className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h2 className="text-sm font-black text-white">How to Play — 9 Card Table</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 text-xs leading-relaxed text-gray-400 sm:grid-cols-2">
            <div className="space-y-2">
              <p><span className="font-medium text-white">Cards:</span> 2 cards dealt face down</p>
              <p><span className="font-medium text-white">Blind:</span> Play without seeing cards</p>
              <p><span className="font-medium text-white">Call:</span> Match opponent's bet</p>
              <p><span className="font-medium text-white">Pack:</span> Fold — opponent wins pot</p>
            </div>
            <div className="space-y-2">
              <p><span className="font-medium text-white">Number + Number:</span> Sum's last digit</p>
              <p><span className="font-medium text-white">Number + Face:</span> Only number counts</p>
              <p><span className="font-medium text-white">Face + Face:</span> Draw / compare rank</p>
              <p><span className="font-medium text-white">Show:</span> Compare hands after matching bet</p>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </PremiumLobbyPage>
  );
}
