import React, { useState, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Wallet, PlusCircle, ArrowUpCircle, Clock,
  History, Users, User, Bell, X, ChevronRight, Trophy, Ticket,
  LogOut, Swords, Grid3x3, Zap, Dice5, Club, Spade,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { logOut } from '../../firebase/auth';
import { useAppStore } from '../../store/useStore';
import { formatCurrency, calculateTotalBalance } from '../../utils/helpers';
import toast from 'react-hot-toast';

// ─── Data ─────────────────────────────────────────────────
const navItems = [
  { path: '/dashboard',          icon: LayoutDashboard, label: 'Dashboard',          glow: '59,130,246'  },
  { path: '/wallet',             icon: Wallet,          label: 'Wallet',             glow: '234,179,8'   },
  { path: '/redeem-code',        icon: Ticket,          label: 'Redeem Code',        glow: '99,102,241'  },
  { path: '/add-money',          icon: PlusCircle,      label: 'Add Money',          glow: '34,197,94'   },
  { path: '/withdrawal',         icon: ArrowUpCircle,   label: 'Withdraw',           glow: '249,115,22'  },
  { path: '/bet-history',        icon: Clock,           label: 'Bet History',        glow: '168,85,247'  },
  { path: '/transactions',       icon: History,         label: 'Transactions',       glow: '6,182,212'   },
  { path: '/referral',           icon: Users,           label: 'Referral',           glow: '236,72,153'  },
  { path: '/profile',            icon: User,            label: 'Profile',            glow: '99,102,241'  },
  { path: '/notifications',      icon: Bell,            label: 'Notifications',      glow: '251,191,36'  },
];

const gameItems = [
  { path: '/games/tictactoe',  icon: Grid3x3, label: 'Tic Tac Toe', glow: '244,114,182', tag: 'VS'   },
  { path: '/matchmaking',      icon: Swords,  label: 'Card Battle', glow: '74,222,128',  tag: 'OFF'  },
  { path: '/games/realludolobby',      icon: Dice5,  label: 'Real Ludo', glow: '74,222,128',  tag: 'OFF'  },
  { path: '/games/poker',      icon: Zap,     label: 'Poker',       glow: '168,85,247',  tag: 'HOT'  },
  { path: '/games/nine-card',  icon: Spade,    label: 'Nine Card',   glow: '96,165,250',  tag: 'LIVE'  },
  { path: '/games/joker-pair', icon: Club,    label: '3 Pair Card', glow: '251,146,60',  tag: 'PAIR' },
];

const tagColors: Record<string, string> = {
  VS: '#f472b6', PVP: '#4ade80', HOT: '#a855f7',
  LIVE: '#ef4444', OFF: '#a855f7' ,NEW: '#fbbf24', ACE: '#60a5fa', PAIR: '#fb923c',
};

// ─── useTapHandlers — scroll vs tap detect ────────────────
const useTapHandlers = (onClose: () => void) => {
  const touchStartY = useRef(0);
  return {
    onTouchStart: (e: React.TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const diff = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
      if (diff < 10) onClose(); // sirf tap, scroll nahi
    },
  };
};

// ─── NavItem ───────────────────────────────────────────────
interface NavItemProps {
  item: typeof navItems[0];
  active: boolean;
  onClose: () => void;
  unreadCount?: number;
}

const NavItem: React.FC<NavItemProps> = React.memo(({ item, active, onClose, unreadCount = 0 }) => {
  const tapHandlers = useTapHandlers(onClose);
  return (
    <Link
      to={item.path}
      onClick={onClose}
      {...tapHandlers}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div
        className="sidebar-nav-item"
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 12px', borderRadius: 12, marginBottom: 2,
          position: 'relative', overflow: 'hidden',
          background: active ? `rgba(${item.glow},0.12)` : 'transparent',
          border: active ? `1px solid rgba(${item.glow},0.3)` : '1px solid transparent',
          transition: 'all 0.2s ease', cursor: 'pointer',
        }}
      >
        {active && (
          <div style={{
            position: 'absolute', left: 0, top: '20%', bottom: '20%',
            width: 3, borderRadius: '0 3px 3px 0',
            background: `linear-gradient(180deg, rgba(${item.glow},0.9), rgba(${item.glow},0.4))`,
            boxShadow: `0 0 8px rgba(${item.glow},0.6)`,
          }} />
        )}
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: active
            ? `linear-gradient(135deg, rgba(${item.glow},0.8), rgba(${item.glow},0.4))`
            : `rgba(${item.glow},0.12)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: active ? `0 4px 12px rgba(${item.glow},0.4)` : 'none',
          transition: 'all 0.2s ease',
        }}>
          <item.icon style={{ width: 16, height: 16, color: active ? '#fff' : `rgba(${item.glow},0.9)` }} />
        </div>
        <span style={{
          fontSize: 13, fontWeight: active ? 600 : 500, flex: 1,
          color: active ? '#fff' : 'rgba(255,255,255,0.55)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          fontFamily: 'Inter, sans-serif', transition: 'color 0.2s',
        }}>
          {item.label}
        </span>
        {item.label === 'Notifications' && unreadCount > 0 && (
          <span style={{
            background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
            fontSize: 10, fontWeight: 700, borderRadius: 10,
            minWidth: 20, height: 20, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '0 5px',
          }}>
            {unreadCount}
          </span>
        )}
        {active && (
          <ChevronRight style={{ width: 14, height: 14, color: `rgba(${item.glow},0.8)`, flexShrink: 0 }} />
        )}
      </div>
    </Link>
  );
});

// ─── GameItem ──────────────────────────────────────────────
interface GameItemProps {
  item: typeof gameItems[0];
  active: boolean;
  onClose: () => void;
}

const GameItem: React.FC<GameItemProps> = React.memo(({ item, active, onClose }) => {
  const tagColor = tagColors[item.tag] || '#fff';
  const tapHandlers = useTapHandlers(onClose);
  return (
    <Link
      to={item.path}
      onClick={onClose}
      {...tapHandlers}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div
        className="sidebar-nav-item"
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px', borderRadius: 12, marginBottom: 2,
          position: 'relative', overflow: 'hidden',
          background: active ? `rgba(${item.glow},0.12)` : 'transparent',
          border: active ? `1px solid rgba(${item.glow},0.3)` : '1px solid transparent',
          transition: 'all 0.2s ease', cursor: 'pointer',
        }}
      >
        {active && (
          <div style={{
            position: 'absolute', left: 0, top: '20%', bottom: '20%',
            width: 3, borderRadius: '0 3px 3px 0',
            background: `linear-gradient(180deg, rgba(${item.glow},0.9), rgba(${item.glow},0.4))`,
          }} />
        )}
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: active
            ? `linear-gradient(135deg, rgba(${item.glow},0.8), rgba(${item.glow},0.4))`
            : `rgba(${item.glow},0.1)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}>
          <item.icon style={{ width: 15, height: 15, color: active ? '#fff' : `rgba(${item.glow},0.9)` }} />
        </div>
        <span style={{
          fontSize: 13, fontWeight: active ? 600 : 400, flex: 1,
          color: active ? '#fff' : 'rgba(255,255,255,0.5)',
          fontFamily: 'Inter, sans-serif', transition: 'color 0.2s',
        }}>
          {item.label}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, color: tagColor,
          background: `rgba(${item.glow},0.12)`,
          border: `1px solid rgba(${item.glow},0.25)`,
          padding: '2px 6px', borderRadius: 6, letterSpacing: '0.5px',
          fontFamily: 'Rajdhani, Inter, sans-serif', flexShrink: 0,
        }}>
          {item.tag}
        </span>
      </div>
    </Link>
  );
});

// ─── SidebarContent ────────────────────────────────────────
interface SidebarContentProps {
  onClose: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({ onClose }) => {
  const location = useLocation();
  const { user, wallet } = useAuth();
  const { unreadCount } = useAppStore();
  const [gamesExpanded, setGamesExpanded] = useState(true);
  const tapHandlers = useTapHandlers(onClose);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await logOut();
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'linear-gradient(180deg, #0a0614 0%, #0d0a1a 50%, #080510 100%)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 16px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
      }}>
        <Link
          to="/dashboard"
          onClick={onClose}
          {...tapHandlers}
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(245,158,11,0.4)', flexShrink: 0,
          }}>
            <Trophy style={{ width: 20, height: 20, color: '#fff' }} />
          </div>
          <div>
            <div style={{
              fontSize: 20, fontWeight: 700, fontFamily: 'Rajdhani, sans-serif',
              background: 'linear-gradient(90deg, #f59e0b, #fb923c)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', lineHeight: 1.1,
            }}>BetAdda</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Casino</div>
          </div>
        </Link>
        <button
          onClick={onClose}
          onTouchStart={(e) => { (e.currentTarget as any)._touchY = e.touches[0].clientY; }}
          onTouchEnd={(e) => {
            const diff = Math.abs(e.changedTouches[0].clientY - ((e.currentTarget as any)._touchY || 0));
            if (diff < 10) onClose();
          }}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: 6, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          <X style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* User card */}
      {user && (
        <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.06))',
            border: '1px solid rgba(245,158,11,0.18)', borderRadius: 14, padding: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0,
              }}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              </div>
            </div>
            {wallet && (
              <div style={{
                background: 'rgba(0,0,0,0.3)', borderRadius: 10,
                padding: '8px 12px', textAlign: 'center',
                border: '1px solid rgba(245,158,11,0.1)',
              }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Total Balance</div>
                <div style={{
                  fontSize: 20, fontWeight: 700, fontFamily: 'Rajdhani, sans-serif',
                  background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 40%, #f59e0b 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text', animation: 'balanceShine 3s linear infinite',
                }}>
                  {formatCurrency(calculateTotalBalance(wallet))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nav */}
      <div className="sidebar-scroll" style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '1.5px', padding: '4px 12px 8px' }}>
          Main
        </div>
        {navItems.map(item => (
          <NavItem
            key={item.path}
            item={item}
            active={isActive(item.path)}
            onClose={onClose}
            unreadCount={unreadCount}
          />
        ))}

        <button
          className="games-toggle"
          onClick={() => setGamesExpanded(prev => !prev)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '4px 12px 8px', marginTop: 8,
            background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Games</span>
          <ChevronRight style={{
            width: 12, height: 12, color: 'rgba(255,255,255,0.2)',
            transform: gamesExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }} />
        </button>

        {gamesExpanded && gameItems.map(item => (
          <GameItem
            key={item.path}
            item={item}
            active={isActive(item.path)}
            onClose={onClose}
          />
        ))}
      </div>

      {/* Logout */}
      <div style={{ padding: '10px 10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 12px', borderRadius: 12,
            border: '1px solid rgba(239,68,68,0.2)',
            background: 'rgba(239,68,68,0.08)', cursor: 'pointer',
          }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'rgba(239,68,68,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <LogOut style={{ width: 16, height: 16, color: '#ef4444' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#ef4444', fontFamily: 'Inter, sans-serif' }}>Logout</span>
        </button>
      </div>
    </div>
  );
};

// ─── Main Sidebar Export ───────────────────────────────────
export const Sidebar: React.FC = () => {
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const onClose = useCallback(() => setSidebarOpen(false), [setSidebarOpen]);
  const backdropTouchY = useRef(0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
        .sidebar-nav-item:hover { background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.08) !important; }
        .sidebar-nav-item:hover span { color: rgba(255,255,255,0.85) !important; }
        .sidebar-scroll::-webkit-scrollbar { width: 3px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        @keyframes balanceShine { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .games-toggle:hover { background: rgba(255,255,255,0.06) !important; }
      `}</style>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-64 h-screen sticky top-0 flex-shrink-0 flex-col">
        <SidebarContent onClose={onClose} />
      </div>

      {/* Mobile — backdrop + drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              onTouchStart={(e) => { backdropTouchY.current = e.touches[0].clientY; }}
              onTouchEnd={(e) => {
                const diff = Math.abs(e.changedTouches[0].clientY - backdropTouchY.current);
                if (diff < 10) onClose();
              }}
              style={{
                position: 'fixed', inset: 0, zIndex: 49,
                background: 'rgba(0,0,0,0.65)',
              }}
            />
            <motion.div
              key="drawer"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              style={{
                position: 'fixed', top: 0, left: 0, bottom: 0,
                width: 280, zIndex: 50,
              }}
            >
              <SidebarContent onClose={onClose} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
