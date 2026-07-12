import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, PlusSquare, MessageCircle, User, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMessages } from '@/context/MessageContext';
import { useFriendRequestCount } from '@/hooks/useFriends';

const baseNavItems = [
  { path: '/', label: 'Feed', icon: Home },
  { path: '/explore', label: 'Explore', icon: Compass },
  { path: '/create-post', label: 'Create', icon: PlusSquare },
  { path: '/messages', label: 'Chats', icon: MessageCircle },
  { path: '/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  const location = useLocation();
  const { totalUnread } = useMessages();
  const { user } = useAuth();
  const friendRequestCount = useFriendRequestCount(user?.id);

  const isAdmin = user?.email?.toLowerCase() === 'roninonedigital@gmail.com';
  const navItems = isAdmin
    ? [...baseNavItems, { path: '/admin', label: 'Admin', icon: Shield }]
    : baseNavItems;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
      style={{
        backgroundColor: 'rgba(15, 17, 21, 0.92)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border-subtle)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === '/'
              ? location.pathname === '/' || location.pathname === '/#'
              : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center gap-0.5 w-16 h-full relative"
            >
              <div className="relative">
                <Icon
                  size={22}
                  style={{
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                    transition: 'color 0.2s',
                  }}
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                {/* Message unread badge */}
                {item.path === '/messages' && totalUnread > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold" style={{ backgroundColor: '#ef4444', color: '#fff' }}>
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </span>
                )}
                {/* Friend request badge */}
                {item.path === '/profile' && friendRequestCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold animate-pulse" style={{ backgroundColor: '#d93a3a', color: '#fff', border: '1.5px solid rgba(15,17,21,0.92)' }}>
                    {friendRequestCount > 9 ? '9+' : friendRequestCount}
                  </span>
                )}
              </div>
              <span
                className="font-body text-[10px]"
                style={{
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
