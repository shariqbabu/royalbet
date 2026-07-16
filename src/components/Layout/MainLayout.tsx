import React, { useEffect } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../context/AuthContext';
import { useAppStore } from '../../store/useStore';
import { subscribeNotifications } from '../../firebase/games';

// Chhota inline loader — tab switch pe poora layout nahi udta, sirf content area mein spinner
const PageLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="h-9 w-9 animate-spin rounded-full border-2 border-yellow-500/20 border-t-yellow-400" />
  </div>
);

export const MainLayout: React.FC = () => {
  const { firebaseUser } = useAuth();
  const { setNotifications, setSidebarOpen } = useAppStore();
  const location = useLocation();
  // useOutlet() se current page ka snapshot milta hai — isse exit animation
  // ke dauran purana page dikhta rehta hai (direct <Outlet /> se yeh break hota hai)
  const outlet = useOutlet();

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
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-full"
            >
              {/* Suspense yahan andar hai — lazy chunk load hote waqt layout
                  apni jagah rehta hai, sirf content area mein loader aata hai */}
              <React.Suspense fallback={<PageLoader />}>
                {outlet}
              </React.Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
