import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { recordActivity } from '@/lib/activityTracker';
import Navbar from './Navbar';
import Footer from './Footer';
import BottomNav from './BottomNav';

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Record activity on route change — debounced so it never blocks navigation
  useEffect(() => {
    if (!user?.id) return;
    // Clear any pending activity record
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Debounce: wait 2 seconds of inactivity before recording
    timeoutRef.current = setTimeout(() => {
      recordActivity(user.id, user.name || user.username, user.avatar);
    }, 2000);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [location.pathname, user?.id, user?.name, user?.avatar]);

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ backgroundColor: 'var(--bg-base)' }}>
      <Navbar />
      <main className="flex-1 pt-[72px] pb-14 sm:pb-0">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
