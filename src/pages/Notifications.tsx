import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  Loader2,
  Trophy,
  TrendingDown,
  TrendingUp,
  Gift,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeNotifications, markNotificationRead } from '../firebase/games';
import { formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

const getNotifIcon = (type: string) => {
  switch (type) {
    case 'GAME_WIN':
      return {
        icon: Trophy,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/20',
        glow: 'bg-yellow-500/20',
      };
    case 'GAME_LOSS':
      return {
        icon: TrendingDown,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        glow: 'bg-red-500/20',
      };
    case 'DEPOSIT_APPROVED':
      return {
        icon: TrendingUp,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        glow: 'bg-emerald-500/20',
      };
    case 'DEPOSIT_REJECTED':
      return {
        icon: AlertCircle,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        glow: 'bg-red-500/20',
      };
    case 'WITHDRAWAL_APPROVED':
      return {
        icon: TrendingUp,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        glow: 'bg-emerald-500/20',
      };
    case 'WITHDRAWAL_REJECTED':
      return {
        icon: AlertCircle,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/20',
        glow: 'bg-orange-500/20',
      };
    case 'REFERRAL_BONUS':
      return {
        icon: Gift,
        color: 'text-pink-400',
        bg: 'bg-pink-500/10',
        border: 'border-pink-500/20',
        glow: 'bg-pink-500/20',
      };
    default:
      return {
        icon: Bell,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        glow: 'bg-blue-500/20',
      };
  }
};

export const Notifications: React.FC = () => {
  const { firebaseUser } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;

    const unsub = subscribeNotifications(firebaseUser.uid, (notifs) => {
      setNotifications(notifs);
      setLoading(false);
    });

    return () => unsub();
  }, [firebaseUser]);

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => markNotificationRead(n.id)));
    toast.success('All marked as read');
  };

  const markRead = async (id: string) => {
    await markNotificationRead(id);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080512] text-white">
      {/* Background Glow */}
      <div className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-yellow-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-56 -left-24 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -right-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-3xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/20 via-orange-500/10 to-transparent p-4 shadow-2xl sm:p-6">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-yellow-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 -bottom-16 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-yellow-500/25 bg-yellow-500/10">
                  <Bell className="h-7 w-7 text-yellow-400" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white shadow-lg shadow-red-500/30">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>

                <div>
                  <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1">
                    <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                    <span className="text-xs font-bold uppercase tracking-wide text-yellow-400">
                      Alerts Center
                    </span>
                  </div>

                  <h1 className="text-2xl font-black text-white sm:text-3xl">
                    Notifications
                  </h1>

                  <p className="mt-1 text-xs text-gray-400 sm:text-sm">
                    Game, wallet and account updates
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    Total
                  </p>
                  <p className="text-lg font-black text-white">
                    {notifications.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    Unread
                  </p>
                  <p className="text-lg font-black text-red-400">
                    {unreadCount}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-white">
                Latest Updates
              </p>
              <p className="text-xs text-gray-500">
                Tap unread notification to mark as read
              </p>
            </div>

            {notifications.some((n) => !n.read) && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={markAllRead}
                className="flex items-center gap-2 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-400 transition-all hover:bg-yellow-500/15"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </motion.button>
            )}
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] py-16 shadow-xl">
              <Loader2 className="mb-3 h-9 w-9 animate-spin text-yellow-400" />
              <p className="text-sm text-gray-400">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] py-16 text-center shadow-xl">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.05]">
                <Bell className="h-8 w-8 text-gray-600" />
              </div>
              <p className="text-base font-semibold text-gray-300 sm:text-lg">
                No notifications yet
              </p>
              <p className="mt-1 text-xs text-gray-600">
                Your alerts and updates will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {notifications.map((notif, i) => {
                  const { icon: Icon, color, bg, border, glow } =
                    getNotifIcon(notif.type);

                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => !notif.read && markRead(notif.id)}
                      className={`group relative overflow-hidden rounded-3xl border p-4 shadow-xl transition-all ${
                        notif.read
                          ? 'border-white/10 bg-white/[0.035] opacity-70'
                          : 'border-yellow-500/20 bg-white/[0.05] cursor-pointer hover:-translate-y-0.5 hover:border-yellow-500/40'
                      }`}
                    >
                      <div
                        className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full ${glow} blur-3xl opacity-0 transition-opacity group-hover:opacity-100`}
                      />

                      {!notif.read && (
                        <span className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-yellow-400 shadow-lg shadow-yellow-400/40" />
                      )}

                      <div className="relative flex items-start gap-3 pr-5">
                        <div
                          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border ${border} ${bg}`}
                        >
                          <Icon className={`h-5 w-5 ${color}`} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black text-white">
                              {notif.title}
                            </p>

                            {!notif.read && (
                              <span className="rounded-full border border-yellow-500/25 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
                                New
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-xs leading-relaxed text-gray-400">
                            {notif.message}
                          </p>

                          <p className="mt-2 text-[10px] text-gray-600">
                            {formatDate(notif.createdAt)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
