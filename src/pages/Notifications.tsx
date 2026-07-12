import { motion } from 'framer-motion';
import { Bell, Flame, MessageCircle, UserPlus, AtSign, AlertTriangle, Check, Trash2 } from 'lucide-react';
import { useNotifications, type Notification } from '@/context/NotificationContext';

/* ─── Time ago helper ─── */
function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];

const iconMap: Record<Notification['type'], typeof Flame> = {
  like: Flame,
  comment: MessageCircle,
  follow: UserPlus,
  mention: AtSign,
  report: AlertTriangle,
  message: MessageCircle,
  system: AlertTriangle,
};

const colorMap: Record<Notification['type'], string> = {
  like: '#d93a3a',
  comment: '#4a80ff',
  follow: '#39ff14',
  mention: '#f5a623',
  report: '#ef4444',
  message: '#4a80ff',
  system: '#ef4444',
};

export default function Notifications() {
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification, clearAll } = useNotifications();

  return (
    <div className="px-6 lg:px-12 pt-8 pb-10" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOutExpo }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <Bell size={24} style={{ color: 'var(--accent-primary)' }} />
            <h1 className="font-display text-3xl" style={{ color: 'var(--text-primary)' }}>
              NOTIFICATIONS
            </h1>
            {unreadCount > 0 && (
              <span
                className="font-body text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 font-body text-xs px-3 py-1.5 rounded transition-colors"
                style={{
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <Check size={12} /> Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 font-body text-xs px-3 py-1.5 rounded transition-colors"
                style={{
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <Trash2 size={12} /> Clear
              </button>
            )}
          </div>
        </motion.div>

        {/* Notification List */}
        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center py-20 rounded-lg"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px dashed var(--border-subtle)',
            }}
          >
            <Bell size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
            <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
              No notifications yet
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n, i) => {
              const Icon = iconMap[n.type];
              const accent = colorMap[n.type];
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05, ease: easeOutExpo }}
                  className="flex items-start gap-3 p-4 rounded-lg transition-colors duration-200 cursor-pointer"
                  style={{
                    backgroundColor: n.read ? 'var(--bg-surface)' : 'var(--bg-surface)',
                    border: `1px solid ${n.read ? 'var(--border-subtle)' : `${accent}30`}`,
                    opacity: n.read ? 0.7 : 1,
                  }}
                  onClick={() => markRead(n.id)}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={n.fromAvatar}
                      alt={n.fromUser}
                      className="w-10 h-10 rounded-full object-cover"
                      style={{ border: `2px solid ${accent}40` }}
                    />
                    <div
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: accent }}
                    >
                      <Icon size={10} style={{ color: '#fff' }} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-body text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {n.title}
                      </span>
                      {!n.read && (
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: accent }}
                        />
                      )}
                    </div>
                    <p className="font-body text-xs leading-relaxed mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {n.message}
                    </p>
                    <span className="font-body text-[10px] mt-1 block" style={{ color: 'var(--text-muted)' }}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n.id);
                    }}
                    className="flex-shrink-0 p-1.5 rounded transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
