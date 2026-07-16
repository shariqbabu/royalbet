import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../context/AuthContext';
import { useAppStore } from '../../store/useStore';
import { subscribeNotifications } from '../../firebase/games';

export const MainLayout: React.FC = () => {
  const { firebaseUser } = useAuth();
  const { setNotifications, setSidebarOpen } = useAppStore();
  const location = useLocation();

  const hideHeader = /^\/games\/poker\/[^/]+$/.test(location.pathname);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!firebaseUser) return;
    const unsub = subscribeNotifications(firebaseUser.uid, (notifications) => {
      setNotifications(notifications as any);
    });
    return () => unsub();
  }, [firebaseUser, setNotifications]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0612]">
      {/* Ambient glow orbs — global premium depth */}
      <div className="pointer-events-none fixed left-0 top-0 h-96 w-96 rounded-full bg-purple-600/10 blur-[100px]" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-96 w-96 rounded-full bg-yellow-500/8 blur-[100px]" />
      <div className="grain-overlay" />

      <Sidebar />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        {!hideHeader && <Header />}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="p-4 lg:p-6"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
