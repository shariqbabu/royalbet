import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { Referral as ReferralType } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';
import {
  Users,
  Copy,
  Share2,
  Gift,
  Trophy,
  Loader2,
  Link as LinkIcon,
  Sparkles,
  BadgeCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

  const Referral: React.FC = () => {
  const { user, wallet } = useAuth();
  const [referrals, setReferrals] = useState<ReferralType[]>([]);
  const [loading, setLoading] = useState(true);

  const referralLink = `${window.location.origin}/signup?ref=${user?.referralCode}`;

  useEffect(() => {
    if (!user?.uid) return;

    const fetchReferrals = async () => {
      try {
        const q = query(
          collection(db, 'referrals'),
          where('referrerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        const snap = await getDocs(q);
        setReferrals(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReferralType))
        );
      } catch (_e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchReferrals();
  }, [user?.uid]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Join RoyalBet Casino',
        text: `Use my referral code ${user?.referralCode} and get ₹50 bonus!`,
        url: referralLink,
      });
    } else {
      copy(referralLink, 'Referral link');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080512] text-white">
      {/* Background Glow */}
      <div className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-pink-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-56 -left-24 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -right-24 h-72 w-72 rounded-full bg-yellow-500/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl border border-pink-500/20 bg-gradient-to-br from-pink-500/20 via-purple-500/10 to-yellow-500/10 p-4 text-center shadow-2xl sm:p-6">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-pink-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 -bottom-16 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />

            <div className="relative">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-pink-500/25 bg-pink-500/10 shadow-lg shadow-pink-500/10">
                <Gift className="h-8 w-8 text-pink-400" />
              </div>

              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-pink-500/20 bg-pink-500/10 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-pink-400" />
                <span className="text-xs font-bold uppercase tracking-wide text-pink-400">
                  Invite & Earn
                </span>
              </div>

              <h1 className="text-2xl font-black text-white sm:text-3xl">
                Refer & Earn
              </h1>

              <p className="mt-1 text-sm text-gray-400">
                Earn ₹50 for every friend you invite!
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  {
                    label: 'Referrals',
                    value: referrals.length,
                    color: 'text-pink-400',
                    bg: 'bg-pink-500/10',
                    border: 'border-pink-500/20',
                  },
                  {
                    label: 'Earned',
                    value: formatCurrency(wallet?.referralBalance || 0),
                    color: 'text-emerald-400',
                    bg: 'bg-emerald-500/10',
                    border: 'border-emerald-500/20',
                  },
                  {
                    label: 'Per Referral',
                    value: '₹50',
                    color: 'text-yellow-400',
                    bg: 'bg-yellow-500/10',
                    border: 'border-yellow-500/20',
                  },
                ].map(({ label, value, color, bg, border }) => (
                  <div
                    key={label}
                    className={`rounded-2xl border ${border} ${bg} p-3 text-center`}
                  >
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      {label}
                    </p>
                    <p className={`mt-1 text-lg font-black ${color}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            {/* Left Column */}
            <div className="space-y-5">
              {/* Referral Code */}
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl sm:p-5">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-pink-500/10 blur-3xl" />

                <div className="relative">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-pink-500/20 bg-pink-500/10">
                      <Gift className="h-5 w-5 text-pink-400" />
                    </div>

                    <div>
                      <h3 className="font-black text-white">
                        Your Referral Code
                      </h3>
                      <p className="text-xs text-gray-500">
                        Share code or referral link with friends
                      </p>
                    </div>
                  </div>

                  <div className="mb-3 flex items-center gap-3 rounded-3xl border border-pink-500/20 bg-gradient-to-r from-pink-500/10 to-purple-500/10 p-4">
                    <span className="min-w-0 flex-1 truncate font-mono text-2xl font-black tracking-wider text-yellow-400">
                      {user?.referralCode || 'Loading...'}
                    </span>

                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() =>
                        copy(user?.referralCode || '', 'Referral code')
                      }
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-pink-500/20 bg-pink-500/10 text-pink-400 transition-all hover:bg-pink-500/15"
                    >
                      <Copy className="h-5 w-5" />
                    </motion.button>
                  </div>

                  <div className="mb-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 p-3">
                    <LinkIcon className="h-4 w-4 flex-shrink-0 text-gray-500" />

                    <span className="min-w-0 flex-1 truncate text-xs text-gray-400">
                      {referralLink}
                    </span>

                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => copy(referralLink, 'Referral link')}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-400 transition-all hover:text-white"
                    >
                      <Copy className="h-4 w-4" />
                    </motion.button>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={share}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 py-3 text-sm font-black text-white transition-all hover:from-pink-400 hover:to-purple-400"
                  >
                    <Share2 className="h-5 w-5" />
                    Share with Friends
                  </motion.button>
                </div>
              </div>

              {/* Referral List */}
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl sm:p-5">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-purple-500/10 blur-3xl" />

                <div className="relative">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-pink-500/20 bg-pink-500/10">
                      <Users className="h-5 w-5 text-pink-400" />
                    </div>

                    <div>
                      <h3 className="font-black text-white">
                        Referred Friends ({referrals.length})
                      </h3>
                      <p className="text-xs text-gray-500">
                        Your referral activity
                      </p>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-7 w-7 animate-spin text-pink-400" />
                    </div>
                  ) : referrals.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-8 text-center">
                      <Users className="mx-auto mb-3 h-10 w-10 text-gray-600" />
                      <p className="text-sm font-semibold text-gray-300">
                        No referrals yet
                      </p>
                      <p className="mt-1 text-xs text-gray-600">
                        Share your code and start earning!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {referrals.map((ref, i) => (
                        <motion.div
                          key={ref.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="rounded-2xl border border-white/10 bg-black/20 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-pink-500/20 bg-pink-500/10 text-sm font-black text-pink-400">
                                {ref.referredName?.charAt(0).toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-white">
                                  {ref.referredName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatDate(ref.createdAt)}
                                </p>
                              </div>
                            </div>

                            <span className="flex-shrink-0 text-sm font-black text-emerald-400">
                              +{formatCurrency(ref.bonusAmount)}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              {/* How it works */}
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl sm:p-5">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-yellow-500/10 blur-3xl" />

                <div className="relative">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-yellow-500/20 bg-yellow-500/10">
                      <Trophy className="h-5 w-5 text-yellow-400" />
                    </div>

                    <div>
                      <h3 className="font-black text-white">How it works</h3>
                      <p className="text-xs text-gray-500">
                        Refer friends and earn bonus
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        step: 1,
                        text: 'Share your referral code or link',
                        icon: Share2,
                        color: 'text-pink-400',
                        bg: 'bg-pink-500/10',
                        border: 'border-pink-500/20',
                      },
                      {
                        step: 2,
                        text: 'Friend signs up using your code',
                        icon: Users,
                        color: 'text-blue-400',
                        bg: 'bg-blue-500/10',
                        border: 'border-blue-500/20',
                      },
                      {
                        step: 3,
                        text: 'Both of you get ₹50 bonus!',
                        icon: Gift,
                        color: 'text-yellow-400',
                        bg: 'bg-yellow-500/10',
                        border: 'border-yellow-500/20',
                      },
                    ].map(({ step, text, icon: Icon, color, bg, border }) => (
                      <div
                        key={step}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3"
                      >
                        <div
                          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border ${border} ${bg}`}
                        >
                          <Icon className={`h-5 w-5 ${color}`} />
                        </div>

                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-yellow-500 text-xs font-black text-black">
                            {step}
                          </span>

                          <p className="text-sm text-gray-300">{text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bonus Card */}
              <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 shadow-xl sm:p-5">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl" />

                <div className="relative flex items-start gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/15">
                    <BadgeCheck className="h-5 w-5 text-emerald-400" />
                  </div>

                  <div>
                    <p className="mb-1 text-sm font-black text-emerald-300">
                      Instant Referral Bonus
                    </p>
                    <p className="text-xs leading-relaxed text-gray-400">
                      Referral rewards are credited to referral balance after
                      successful signup.
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats mini */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-center shadow-xl">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    Code
                  </p>
                  <p className="mt-1 truncate font-mono text-lg font-black text-yellow-400">
                    {user?.referralCode || '--'}
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-center shadow-xl">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500">
                    Bonus
                  </p>
                  <p className="mt-1 text-lg font-black text-emerald-400">
                    ₹50
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
export default Referral;
