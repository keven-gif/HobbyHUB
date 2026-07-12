import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

/* ─── Types ─── */
export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'report' | 'message' | 'system';
  title: string;
  message: string;
  fromUser: string;
  fromAvatar: string;
  link: string;
  read: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notif: Omit<Notification, 'id' | 'createdAt'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications(): NotificationContextType {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within <NotificationProvider>');
  return ctx;
}

/* ─── DB row shape ─── */
interface DBNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  from_user_id: string;
  from_user_name: string;
  from_user_avatar: string;
  to_user_id: string;
  link: string;
  read: boolean;
  created_at: string;
}

function dbToNotification(n: DBNotification): Notification {
  return {
    id: n.id,
    type: n.type as Notification['type'],
    title: n.title,
    message: n.message,
    fromUser: n.from_user_name,
    fromAvatar: n.from_user_avatar,
    link: n.link,
    read: n.read,
    createdAt: n.created_at,
  };
}

/* ─── Provider ─── */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  /* ── Load from Supabase & subscribe to realtime ── */
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    // Initial load
    supabase!
      .from('notifications')
      .select('*')
      .eq('to_user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setNotifications(data.map((n) => dbToNotification(n as DBNotification)));
        }
      });

    // Realtime: INSERT
    const channel = supabase!
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `to_user_id=eq.${user.id}`,
        },
        (payload) => {
          const inserted = dbToNotification(payload.new as DBNotification);
          setNotifications((prev) => {
            if (prev.some((n) => n.id === inserted.id)) return prev;
            return [inserted, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `to_user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = dbToNotification(payload.new as DBNotification);
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const deletedId = (payload.old as DBNotification)?.id;
          if (deletedId) {
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  /* ── Actions (Supabase-backed) ── */
  const addNotification = useCallback(
    async (notif: Omit<Notification, 'id' | 'createdAt'>) => {
      if (!user) return;

      const { data } = await supabase!
        .from('notifications')
        .insert({
          type: notif.type,
          title: notif.title,
          message: notif.message,
          from_user_id: user.id,
          from_user_name: notif.fromUser,
          from_user_avatar: notif.fromAvatar,
          to_user_id: user.id,
          link: notif.link,
          read: false,
        })
        .select()
        .single();

      if (data) {
        setNotifications((prev) => {
          const inserted = dbToNotification(data as DBNotification);
          if (prev.some((n) => n.id === inserted.id)) return prev;
          return [inserted, ...prev];
        });
      }
    },
    [user]
  );

  const markRead = useCallback(
    async (id: string) => {
      await supabase!.from('notifications').update({ read: true }).eq('id', id);
      // State syncs via realtime UPDATE; also optimistically update
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    },
    []
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;

    await supabase!
      .from('notifications')
      .update({ read: true })
      .eq('to_user_id', user.id);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [user]);

  const deleteNotification = useCallback(
    async (id: string) => {
      await supabase!.from('notifications').delete().eq('id', id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    },
    []
  );

  const clearAll = useCallback(async () => {
    if (!user) return;

    await supabase!.from('notifications').delete().eq('to_user_id', user.id);
    setNotifications([]);
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markRead, markAllRead, deleteNotification, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}
