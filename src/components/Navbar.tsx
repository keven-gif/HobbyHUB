import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Home, Compass, PlusSquare, User, LogOut, Menu, Bell } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Feed', icon: Home },
    { path: '/explore', label: 'Explore', icon: Compass },
    { path: '/create-post', label: 'Create', icon: PlusSquare },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <header
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="container flex h-14 items-center justify-between px-4">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div
            className="w-7 h-7 flex items-center justify-center rounded font-display text-lg"
            style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
          >
            H
          </div>
          <span
            className="font-display text-lg tracking-[2px]"
            style={{ color: 'var(--text-primary)' }}
          >
            HOBBYHUB
          </span>
        </Link>

        {/* Desktop Navigation Link Cluster */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 transition-colors hover:text-foreground/80 ${
                  isActive(item.path) ? 'text-foreground font-semibold' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop Profile Status Action Segment */}
        <div className="hidden md:flex items-center gap-4">
          {user && (
            <>
              <button
                onClick={() => navigate('/notifications')}
                className="relative p-2 rounded-full transition-colors hover:bg-muted"
                title="Notifications"
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unreadCount}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-3 border-l pl-4">
              <Avatar className="h-8 w-8 border">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold leading-none max-w-[90px] truncate">{user.name}</span>
                  {user.clanName && (
                    <span className="rounded bg-primary/10 px-1 py-0.25 text-[9px] font-black tracking-wide text-primary uppercase">
                      {user.clanName}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">@{user.username}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleSignOut} title="Sign Out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
            </>
          )}
        </div>

        {/* Mobile Navigation Drawer Shell */}
        <div className="md:hidden flex items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] flex flex-col justify-between">
              <div className="space-y-6">
                <SheetHeader className="text-left">
                  <SheetTitle className="font-bold flex items-center gap-2">
                    <div
                      className="w-6 h-6 flex items-center justify-center rounded font-display text-sm"
                      style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
                    >
                      H
                    </div>
                    <span className="font-display text-base tracking-[2px]" style={{ color: 'var(--text-primary)' }}>
                      HOBBYHUB
                    </span>
                  </SheetTitle>
                </SheetHeader>

                {/* Mobile Notification Bell */}
                {user && (
                  <button
                    onClick={() => navigate('/notifications')}
                    className="relative flex items-center gap-2 w-full p-3 rounded-lg border bg-muted/40"
                  >
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Mobile Identity Display Card */}
                {user && (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col text-left overflow-hidden">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold truncate max-w-[120px]">{user.name}</span>
                        {user.clanName && (
                          <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-bold text-primary uppercase">
                            [{user.clanName}]
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate">@{user.username}</span>
                    </div>
                  </div>
                )}

                {/* Action Links List */}
                <div className="flex flex-col gap-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.path} to={item.path}>
                        <Button variant={isActive(item.path) ? 'secondary' : 'ghost'} className="w-full justify-start gap-3 text-sm">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {item.label}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Legal Links */}
              <div className="pt-3 border-t">
                <button onClick={() => navigate('/updates')} className="block w-full text-left font-body text-[11px] py-1 text-muted-foreground">
                  From the Founder
                </button>
                <button onClick={() => navigate('/terms')} className="block w-full text-left font-body text-[11px] py-1 text-muted-foreground">
                  Terms of Service
                </button>
                <button onClick={() => navigate('/privacy')} className="block w-full text-left font-body text-[11px] py-1 text-muted-foreground">
                  Privacy Policy
                </button>
                <button onClick={() => navigate('/privacy-data')} className="block w-full text-left font-body text-[11px] py-1 text-muted-foreground">
                  My Data
                </button>
              </div>

              {/* Bottom Drawer Footer Log Out Action */}
              <div className="pt-4 border-t">
                <Button variant="destructive" className="w-full gap-2 text-sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </header>
  );
};

export default Navbar;
