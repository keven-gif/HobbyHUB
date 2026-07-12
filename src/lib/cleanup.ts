/**
 * Cleanup — removes old seed data from localStorage.
 * Only runs once when the app version changes.
 * NEVER touches user accounts (hobbyhub_users_v2, hobbyhub_session_v2).
 */
const CLEANUP_VERSION_KEY = 'hobbyhub_cleanup_version';
const CURRENT_VERSION = '3'; // bumped — now also protects posts backup

export function runDataCleanup() {
  try {
    // Only run if version changed
    const lastVersion = localStorage.getItem(CLEANUP_VERSION_KEY);
    if (lastVersion === CURRENT_VERSION) return;

    // Clean old seed data (v1 keys)
    const postsRaw = localStorage.getItem('hobbyhub_posts');
    if (postsRaw) {
      try {
        const posts = JSON.parse(postsRaw);
        if (Array.isArray(posts) && posts.some((p: any) => p.id?.startsWith('post_seed_'))) {
          const cleanPosts = posts.filter((p: any) => !p.id?.startsWith('post_seed_'));
          localStorage.setItem('hobbyhub_posts', JSON.stringify(cleanPosts));
        }
      } catch { /* ignore */ }
    }

    const convRaw = localStorage.getItem('hh_fallback_conversations');
    if (convRaw) {
      try {
        const convs = JSON.parse(convRaw);
        if (Array.isArray(convs) && convs.some((c: any) => c.id?.startsWith('conv_seed_'))) {
          localStorage.setItem('hh_fallback_conversations', '[]');
        }
      } catch { /* ignore */ }
    }

    const msgRaw = localStorage.getItem('hh_fallback_messages');
    if (msgRaw) {
      try {
        const msgs = JSON.parse(msgRaw);
        if (Array.isArray(msgs) && msgs.some((m: any) => m.id?.startsWith('msg_s'))) {
          localStorage.setItem('hh_fallback_messages', '[]');
        }
      } catch { /* ignore */ }
    }

    const notifRaw = localStorage.getItem('hh_fb_notifications');
    if (notifRaw) {
      try {
        const notifs = JSON.parse(notifRaw);
        if (Array.isArray(notifs) && notifs.some((n: any) => n.id?.startsWith('notif_seed_'))) {
          localStorage.setItem('hh_fb_notifications', '[]');
        }
      } catch { /* ignore */ }
    }

    // Migrate old user data if new keys are empty
    const newUsers = localStorage.getItem('hobbyhub_users_v2');
    if (!newUsers) {
      const oldUsers = localStorage.getItem('hobbyhub_users');
      if (oldUsers) {
        try {
          const parsed = JSON.parse(oldUsers);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localStorage.setItem('hobbyhub_users_v2', oldUsers);
            localStorage.setItem('hobbyhub_users_backup', oldUsers);
          }
        } catch { /* ignore */ }
      }
    }

    const newSession = localStorage.getItem('hobbyhub_session_v2');
    if (!newSession) {
      const oldSession = localStorage.getItem('hobbyhub_session');
      if (oldSession) {
        try {
          const parsed = JSON.parse(oldSession);
          if (parsed && parsed.id && parsed.email) {
            localStorage.setItem('hobbyhub_session_v2', oldSession);
          }
        } catch { /* ignore */ }
      }
    }

    // Mark cleanup as done for this version
    localStorage.setItem(CLEANUP_VERSION_KEY, CURRENT_VERSION);
  } catch {
    // ignore
  }
}
