// src/pages/games/PokerLobby.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, ChevronRight, Loader2, X, Lock, Clock,
  Shield, AlertCircle, Eye, Wallet, Table2, Coins, Crown, Flame,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { pokerApi } from '../../utils/pokerApi';
import type { PokerTable, SpectatorEntry } from '../../utils/pokerApi';
import { subscribePokerTables } from '../../firebase/poker-subscription';
import { formatCurrency, calculateUsableBalance } from '../../utils/helpers';
import {
  ActionButton, EmptyLobby, InfoChip, LobbyCard,
  LobbyHero, LobbyStats, LoadingScreen, PremiumLobbyPage, lobbyAnim,
} from '../../components/lobby/LobbyTheme';

// ── Spade icon (lucide helper) ──────────────────
const SpadeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
    <path d="M12 2C12 2 3 8.5 3 14a5 5 0 0 0 7.5 4.33V20H9v2h6v-2h-1.5v-1.67A5 5 0 0 0 21 14C21 8.5 12 2 12 2z" />
  </svg>
);

// ── Types & Status Helpers ──────────────────────────────────────────────────
type JoinStatus = 'rejoin' | 'spectating' | 'watch' | 'join';

const getJoinStatus = (table: PokerTable, uid?: string): JoinStatus => {
  if (!uid) return 'join';

  const isSeatedActive = table.players.some(
    (p) => p.uid === uid && p.seatStatus !== 'LEFT_SEAT'
  );
  if (isSeatedActive) return 'rejoin';

  const isSpectating = (table.spectatorQueue || []).some(
    (s: SpectatorEntry) => s.uid === uid && !s.isSpectator
  );
  if (isSpectating) return 'spectating';

  const activePlayersCount = table.players.filter((p) => p.seatStatus !== 'LEFT_SEAT').length;
  if (activePlayersCount >= 6 || table.status === 'playing') return 'watch';

  return 'join';
};

// ── Main Component ──────────────────────────────────────────────────────────
const PokerLobbyPage: React.FC = () => {
  const { user, wallet } = useAuth();
  const navigate = useNavigate();

  const [tables, setTables] = useState<PokerTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [selectedTable, setSelectedTable] = useState<PokerTable | null>(null);
  const [joining, setJoining] = useState(false);
  const [buyIn, setBuyIn] = useState(0);
  const [error, setError] = useState('');

  const usable = wallet ? calculateUsableBalance(wallet) : 0;

  // ── Real-time subscription ────────────────────────────────────────────────
  useEffect(() => {
    return subscribePokerTables((data) => {
      setTables(data);
      setLoading(false);
    });
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleOpenJoin = (table: PokerTable) => {
    const status = getJoinStatus(table, user?.uid);
    if (status === 'rejoin' || status === 'spectating') {
      navigate(`/games/poker/${table.id}`);
      return;
    }
    setSelectedTable(table);
    setBuyIn(table.minBuyIn);
    setError('');
    setShowJoin(true);
  };

  const handleWatch = async (table: PokerTable) => {
    if (!user) return;
    setJoining(true);
    try {
      await pokerApi.join(
        table.id,
        user.name || 'Player',
        (user as any).photoURL || (user as any).avatar || '',
        0
      );
    } catch (e) {
      console.error('[WATCH ERROR]', e);
    }
    navigate(`/games/poker/${table.id}`);
    setJoining(false);
  };

  const handleJoin = async () => {
    if (!user || !selectedTable) return;
    setError('');

    if (buyIn < selectedTable.minBuyIn) {
      setError(`Minimum buy-in is ${formatCurrency(selectedTable.minBuyIn)}`);
      return;
    }
    if (buyIn > selectedTable.maxBuyIn) {
      setError(`Maximum buy-in is ${formatCurrency(selectedTable.maxBuyIn)}`);
      return;
    }
    if (usable < buyIn) {
      setError('Insufficient balance');
      return;
    }

    setJoining(true);
    try {
      await pokerApi.join(
        selectedTable.id,
        user.name || 'Player',
        (user as any).photoURL || (user as any).avatar || '',
        buyIn
      );
      setShowJoin(false);
      navigate(`/games/poker/${selectedTable.id}`);
    } catch (e: any) {
      setError(e.message || 'Failed to join table');
    } finally {
      setJoining(false);
    }
  };

  const getStakeLabel = (table: PokerTable) => {
    const bb = table.bigBlind;
    if (bb <= 10) return { label: 'Micro', accent: 'blue' as const };
    if (bb <= 20) return { label: 'Low', accent: 'emerald' as const };
    if (bb <= 50) return { label: 'Medium', accent: 'purple' as const };
    if (bb <= 100) return { label: 'High', accent: 'violet' as const };
    return { label: 'VIP', accent: 'yellow' as const };
  };

  if (loading) {
    return <LoadingScreen accent="purple" label="Loading Poker tables..." />;
  }

  const totalPlayers = tables.reduce(
    (s, t) => s + t.players.filter((p) => p.seatStatus !== 'LEFT_SEAT').length,
    0
  );

  return (
    <PremiumLobbyPage className="w-full max-w-full overflow-x-hidden pb-6">
      <motion.div
        variants={lobbyAnim.container}
        initial="hidden"
        animate="show"
        className="w-full max-w-full overflow-x-hidden px-2 sm:px-4"
      >

        <LobbyHero
          title="Texas Hold'em Poker"
          icon={SpadeIcon}
          accent="purple"
          subtitle={
            <>
              Join a premium poker table · Balance:{' '}
              <span className="font-bold text-yellow-400">
                {formatCurrency(usable)}
              </span>
            </>
          }
        />

        <LobbyStats
          stats={[
            { label: 'Tables', value: tables.length, icon: Table2, accent: 'purple' },
            { label: 'Players', value: totalPlayers, icon: Users, accent: 'blue' },
            { label: 'Balance', value: formatCurrency(usable), icon: Wallet, accent: 'yellow' },
          ]}
        />

        {tables.length === 0 ? (
          <EmptyLobby
            title="No Tables Available"
            subtitle="Admin will add poker tables soon."
            icon={SpadeIcon}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            {tables.map((table) => {
              const stakeInfo = getStakeLabel(table);
              const joinStatus = getJoinStatus(table, user?.uid);
              const spectators = (table.spectatorQueue || []).length;

              const activePlayers = table.players.filter((p) => p.seatStatus !== 'LEFT_SEAT');
              const isFull = activePlayers.length >= 6;
              const isPlaying = table.status === 'playing';
              const fillPct = Math.min(100, (activePlayers.length / 6) * 100);
              const isVip = stakeInfo.label === 'VIP';

              return (
                <LobbyCard key={table.id} accent="purple" className="relative overflow-hidden">
                  {/* Decorative glow corner — game-card feel */}
                  <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-purple-600/20 blur-2xl" />

                  {/* Header */}
                  <div className="relative mb-3 flex w-full min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {isVip && <Crown className="h-4 w-4 flex-shrink-0 text-yellow-400" />}
                        <h3 className="truncate text-sm font-black text-white sm:text-base">
                          {table.name}
                        </h3>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <InfoChip accent={stakeInfo.accent}>{stakeInfo.label}</InfoChip>
                        <InfoChip accent={isPlaying ? 'orange' : activePlayers.length >= 2 ? 'emerald' : 'blue'}>
                          {isPlaying ? (
                            <span className="flex items-center gap-1">
                              <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                              </span>
                              Live
                            </span>
                          ) : activePlayers.length >= 2 ? 'Ready' : 'Waiting'}
                        </InfoChip>
                        {isPlaying && (table.pot || 0) > 0 && (
                          <InfoChip icon={Coins} accent="yellow">
                            <span className="whitespace-nowrap">Pot {formatCurrency(table.pot)}</span>
                          </InfoChip>
                        )}
                        {spectators > 0 && (
                          <InfoChip icon={Eye} accent="blue">{spectators} watching</InfoChip>
                        )}
                      </div>
                    </div>

                    {/* Seat avatar stack — game lobby style */}
                    <div className="flex w-full flex-shrink-0 flex-col items-end gap-1.5 sm:w-auto">
                      <div className="flex flex-wrap justify-end gap-1">
                        {[...Array(6)].map((_, i) => {
                          const player = table.players.find((p) => p.seatIndex === i && p.seatStatus !== 'LEFT_SEAT');
                          const isMe = player?.uid === user?.uid;
                          return (
                            <div
                              key={i}
                              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-[9px] font-bold sm:h-7 sm:w-7 sm:text-[11px] ${
                                player
                                  ? isMe
                                    ? 'border-purple-400 bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-md shadow-purple-500/50 ring-2 ring-purple-400/40'
                                    : 'border-white/15 bg-gradient-to-b from-white/15 to-white/5 text-white'
                                  : 'border-dashed border-white/10 bg-black/30 text-gray-700'
                              }`}
                            >
                              {player ? player.name.charAt(0).toUpperCase() : ''}
                            </div>
                          );
                        })}
                      </div>
                      {/* Fill bar — health/XP bar feel */}
                      <div className="h-1.5 w-full max-w-[168px] overflow-hidden rounded-full bg-white/10 sm:w-[168px]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFull ? 'bg-red-500' : fillPct >= 50 ? 'bg-yellow-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stats — mobile pe compact 4-col strip */}
                  <div className="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
                    {([
                      ['Blinds', `${formatCurrency(table.smallBlind)}/${formatCurrency(table.bigBlind)}`],
                      ['Seats', `${activePlayers.length}/6`],
                      ['Min Buy', formatCurrency(table.minBuyIn)],
                      ['Max Buy', formatCurrency(table.maxBuyIn)],
                    ] as [string, string][]).map(([label, value]) => (
                      <div key={label} className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-1.5 py-2 text-center sm:rounded-2xl sm:p-3 sm:text-left">
                        <p className="mb-0.5 truncate text-[9px] text-gray-500 sm:mb-1 sm:text-[11px]">{label}</p>
                        <p className="truncate text-[10px] font-bold text-white sm:text-xs">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Active Player tags — mobile pe max 3 + counter */}
                  {activePlayers.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {activePlayers.slice(0, 3).map((p) => (
                        <span
                          key={p.uid}
                          className={`max-w-[86px] truncate rounded-full border px-2 py-1 text-[10px] sm:max-w-[110px] sm:text-[11px] ${
                            p.uid === user?.uid
                              ? 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                              : 'border-white/10 bg-white/[0.03] text-gray-400'
                          }`}
                        >
                          {p.uid === user?.uid ? 'You' : p.name}
                        </span>
                      ))}
                      {activePlayers.length > 3 && (
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-gray-500 sm:text-[11px]">
                          +{activePlayers.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Dynamic action buttons based on real status */}
                  {joinStatus === 'rejoin' && (
                    <ActionButton variant="purple" onClick={() => navigate(`/games/poker/${table.id}`)}>
                      Return to Table <ChevronRight className="h-4 w-4" />
                    </ActionButton>
                  )}
                  {joinStatus === 'spectating' && (
                    <ActionButton variant="watch" onClick={() => navigate(`/games/poker/${table.id}`)}>
                      <Eye className="h-4 w-4" /> Back to Watching
                    </ActionButton>
                  )}
                  {joinStatus === 'watch' && (
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        variant="watch"
                        onClick={() => handleWatch(table)}
                        disabled={joining}
                        className="min-w-0 flex-1"
                      >
                        {joining
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <><Eye className="h-4 w-4" /> Watch</>}
                      </ActionButton>
                      <div className="flex flex-shrink-0 items-center gap-1 rounded-2xl border border-white/10 bg-black/30 px-3 text-xs text-gray-500">
                        {isFull
                          ? <><Lock className="h-3.5 w-3.5" /> Full</>
                          : <><Clock className="h-3.5 w-3.5 text-orange-400" /> Live</>}
                      </div>
                    </div>
                  )}
                                    {joinStatus === 'join' && (
                    <ActionButton variant="purple" onClick={() => handleOpenJoin(table)}>
                      Join Table <ChevronRight className="h-4 w-4" />
                    </ActionButton>
                  )}
                </LobbyCard>
              );
            })}
          </div>
        )}

        {/* Informative Security Footer */}
        <motion.div variants={lobbyAnim.item} className="mt-5 w-full max-w-full rounded-3xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-purple-400" />
            <div className="min-w-0 space-y-1 text-xs leading-relaxed text-gray-500">
              <p><span className="font-medium text-gray-300">How to play:</span> Join admin-created table. 2+ active players are required to deal a hand.</p>
              <p>Uses combined <span className="text-yellow-400">deposit</span> + <span className="text-emerald-400">winning balance</span> safely with transaction isolation.</p>
              <p><span className="font-medium text-blue-400">Watch mode:</span> Full tables can be observed in real-time with automatic card masking.</p>
            </div>
          </div>
        </motion.div>

      </motion.div>

      {/* JOIN MODAL */}
      {showJoin && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/80 px-0 backdrop-blur-sm md:items-center md:px-4">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative max-h-[92dvh] w-full max-w-full overflow-y-auto overflow-x-hidden rounded-t-3xl border border-white/10 bg-[#0b0716] p-4 shadow-2xl sm:p-5 md:max-w-md md:rounded-3xl"
            style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 md:hidden" />

            <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-black text-white">Join Table</h3>
                <p className="truncate text-xs text-gray-500">{selectedTable.name}</p>
              </div>
              <button
                onClick={() => setShowJoin(false)}
                className="flex-shrink-0 rounded-xl border border-white/10 bg-white/[0.04] p-2 text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-xs sm:text-sm text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span className="min-w-0 break-words">{error}</span>
              </div>
            )}

            {/* Table Details list */}
            <div className="mb-4 space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
              {([
                ['Blinds', `${formatCurrency(selectedTable.smallBlind)}/${formatCurrency(selectedTable.bigBlind)}`],
                ['Players', `${selectedTable.players.filter(p => p.seatStatus !== 'LEFT_SEAT').length}/6`],
                ['Min Buy-in', formatCurrency(selectedTable.minBuyIn)],
                ['Max Buy-in', formatCurrency(selectedTable.maxBuyIn)],
                ['Your Balance', formatCurrency(usable)],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                  <span className="flex-shrink-0 text-gray-500">{label}</span>
                  <span className={`truncate text-right ${label === 'Your Balance' ? 'font-bold text-yellow-400' : 'font-medium text-white'}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Buy-In Selector slider limits */}
            <div className="mb-4">
              <label className="mb-2 block text-[10px] uppercase tracking-wider text-gray-400 sm:text-xs">
                Buy-in Amount
              </label>
              <div className="mb-2 grid grid-cols-3 gap-1.5 sm:gap-2">
                {[
                  selectedTable.minBuyIn,
                  Math.round((selectedTable.minBuyIn + selectedTable.maxBuyIn) / 2),
                  selectedTable.maxBuyIn,
                ].map((amount) => (
                  <button
                    key={amount}
                    disabled={usable < amount}
                    onClick={() => setBuyIn(Math.min(amount, usable))}
                    className={`min-w-0 truncate rounded-xl border py-2 text-[10px] font-bold transition sm:text-xs ${
                      buyIn === Math.min(amount, usable)
                        ? 'border-purple-500 bg-purple-600 text-white'
                        : 'border-white/10 bg-white/[0.04] text-gray-400 hover:border-purple-500/40 disabled:opacity-30 disabled:hover:border-white/10'
                    }`}
                  >
                    {formatCurrency(amount)}
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500 sm:left-4">₹</span>
                <input
                  type="number"
                  value={buyIn}
                  onChange={(e) => setBuyIn(Number(e.target.value))}
                  min={selectedTable.minBuyIn}
                  max={Math.min(selectedTable.maxBuyIn, usable)}
                  className="w-full min-w-0 rounded-2xl border border-white/10 bg-black/30 py-3 pl-8 pr-3 text-sm font-bold text-white outline-none transition focus:border-purple-500 sm:pl-9 sm:pr-4"
                />
              </div>
              {/* Slider — mobile pe amount adjust karna easy */}
              <input
                type="range"
                min={selectedTable.minBuyIn}
                max={Math.max(selectedTable.minBuyIn, Math.min(selectedTable.maxBuyIn, usable))}
                step={selectedTable.bigBlind || 10}
                value={Math.min(buyIn, Math.min(selectedTable.maxBuyIn, usable))}
                onChange={(e) => setBuyIn(Number(e.target.value))}
                className="mt-3 w-full accent-purple-500"
              />
              <div className="mt-1 flex justify-between text-[10px] text-gray-600">
                <span className="truncate">{formatCurrency(selectedTable.minBuyIn)}</span>
                <span className="truncate">{formatCurrency(Math.min(selectedTable.maxBuyIn, usable))}</span>
              </div>
            </div>

            <ActionButton
              variant="purple"
              onClick={handleJoin}
              disabled={joining || buyIn < selectedTable.minBuyIn || buyIn > usable}
              className="w-full py-3.5"
            >
              {joining ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Entering Table...</>
              ) : (
                <><Coins className="h-4 w-4" /> Join with {formatCurrency(buyIn)}</>
              )}
            </ActionButton>
          </motion.div>
        </div>
      )}
    </PremiumLobbyPage>
  );
};

export default PokerLobbyPage;

