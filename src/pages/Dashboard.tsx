import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, TrendingUp, Trophy, Star, PlusCircle, ArrowUpCircle, Users,
  Bell, ChevronRight, Zap, Crown, Rocket,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, calculateTotalBalance } from '../utils/helpers';
import { useAppStore } from '../store/useStore';
import BannerSlider from '../components/BannerSlider'; // ✅ Sirf ek import

const BANNERS = [
  {
    id: '1',
    title: 'BetAdda is Launching!',
    subtitle: "We're going live on 1st July 2026",
    gradient: 'linear-gradient(135deg, #7c3aed, #2563eb)',
    cta: 'Visit Now',
    ctaLink: 'https://betadda.vercel.app',
  },
  {
    id: '2',
    title: 'Welcome Bonus',
    subtitle: 'Get 100% up to ₹500 on your first deposit!',
    gradient: 'linear-gradient(135deg, #d97706, #ea580c)',
    cta: 'Claim Now',
    ctaLink: '/wallet',
  },
  {
    id: '3',
    title: 'Refer Friends',
    subtitle: 'Earn ₹50 bonus for every friend you invite.',
    gradient: 'linear-gradient(135deg, #db2777, #be123c)',
    cta: 'Invite',
    ctaLink: '/referral',
  },
];

const quickActions = [
  { path: '/add-money', label: 'Add Money', icon: PlusCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
  { path: '/withdrawal', label: 'Withdraw', icon: ArrowUpCircle, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  { path: '/referral', label: 'Referral', icon: Users, color: 'text-pink-400', bg: 'bg-pink-500/20' },
  { path: '/notifications', label: 'Alerts', icon: Bell, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
];

  const Dashboard: React.FC = () => {
  const { wallet } = useAuth();
  const { unreadCount } = useAppStore();

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 },
  };

  return ( // ✅ return add kiya
    <motion.div>

      {/* ─── Banner Slider ─── */}
      <BannerSlider banners={BANNERS} /> {/* ✅ Actually use kiya */}

      {/* ─── Desktop Grid: Wallet (Left) & Actions (Right) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

        {/* ─── 2. Wallet Overview ─── */}
        <motion.div variants={item} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden h-full flex flex-col justify-between">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl" />

          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
              <span className="text-gray-300 font-medium text-sm sm:text-base">Wallet Balance</span>
            </div>
            <Link to="/wallet" className="text-yellow-400/70 text-xs sm:text-sm hover:text-yellow-400 flex items-center gap-1 transition-colors">
              View All <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </div>

          <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6 tracking-tight">
            {formatCurrency(calculateTotalBalance(wallet))}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mt-auto">
            {[
              { label: 'Winning', value: wallet?.winningBalance || 0, icon: Trophy, color: 'text-yellow-400' },
              { label: 'Deposit', value: wallet?.depositBalance || 0, icon: TrendingUp, color: 'text-blue-400' },
              { label: 'Bonus', value: wallet?.bonusBalance || 0, icon: Star, color: 'text-purple-400' },
              { label: 'Referral', value: wallet?.referralBalance || 0, icon: Users, color: 'text-pink-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white/5 rounded-xl p-2 sm:p-3 text-center border border-white/5 transition-colors">
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 ${color} mx-auto mb-1 sm:mb-1.5`} />
                <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                <p className={`text-xs sm:text-sm md:text-base font-bold ${color}`}>{formatCurrency(value)}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─── 3. Quick Actions ─── */}
        <motion.div variants={item} className="flex flex-col h-full justify-center bg-slate-900/30 p-4 sm:p-5 rounded-2xl border border-white/5">
          <h3 className="text-xs sm:text-sm font-bold text-gray-400 mb-3 sm:mb-4 pl-1 flex items-center gap-1.5 sm:gap-2 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {quickActions.map(({ path, label, icon: Icon, color, bg }) => (
              <Link key={path} to={path} className="relative block">
                <div className="bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl p-1.5 py-2.5 sm:p-3 text-center hover:bg-white/10 transition-colors flex flex-col items-center justify-center h-full active:bg-white/15">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 ${bg} rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-1.5 sm:mb-2 shadow-inner shrink-0`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${color}`} />
                  </div>
                  <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-300 font-medium leading-tight whitespace-nowrap tracking-wide">
                    {label}
                  </span>
                </div>
                {label === 'Alerts' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 sm:top-0 sm:right-0 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center shadow-sm ring-2 ring-[#0f0a1a]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ─── 4. Referral Banner ─── */}
      <motion.div variants={item}>
        <Link to="/referral" className="block">
          <div className="bg-gradient-to-r from-violet-900/50 via-fuchsia-900/40 to-pink-900/50 border border-pink-500/20 rounded-2xl p-3.5 sm:p-4 md:p-6 flex items-center justify-between hover:border-pink-500/40 transition-colors relative overflow-hidden active:opacity-90">
            <div className="absolute -right-12 top-0 bottom-0 w-32 bg-pink-500/10 blur-2xl" />
            <div className="flex items-center gap-3 sm:gap-4 relative z-10">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-tr from-pink-500 to-rose-500 rounded-xl flex items-center justify-center text-xl sm:text-2xl shadow-lg shadow-pink-900/20 shrink-0">
                🎁
              </div>
              <div>
                <h4 className="font-bold text-white text-base sm:text-lg md:text-xl leading-tight">Refer & Earn</h4>
                <p className="text-[10px] sm:text-xs md:text-sm text-pink-200 mt-0.5 sm:mt-1">Invite friends to get ₹50 instantly!</p>
              </div>
            </div>
            <div className="bg-white/10 p-1.5 sm:p-2 md:p-3 rounded-full backdrop-blur-md relative z-10 text-pink-200">
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </div>
          </div>
        </Link>
      </motion.div>

      <style>{`
        .pattern-grid-lg {
          background-image: linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 24px 24px;
        }
      `}</style>
    </motion.div>
  ); // ✅ return close
};
export default Dashboard;
