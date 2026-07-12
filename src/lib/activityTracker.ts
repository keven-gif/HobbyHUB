/**
 * Activity Tracker — uses Supabase to track active users across all devices.
 */

import { recordActivity as recordActivityDb, fetchActiveUsers } from './supabaseQueries';

export interface UserActivity {
  userId: string;
  name: string;
  avatar: string;
  lastSeen: number;
}

/** Record that a user is currently active */
export async function recordActivity(userId: string, name: string, avatar: string) {
  try {
    await recordActivityDb(userId, name, avatar);
  } catch (e) { /* ignore */ }
}

/** Get users who are currently active (seen in last 15 minutes) */
export async function getActiveUsers(excludeUserId?: string): Promise<UserActivity[]> {
  try {
    const rows = await fetchActiveUsers();
    return rows
      .filter((r: any) => r.user_id !== excludeUserId)
      .map((r: any) => ({
        userId: r.user_id,
        name: r.user_name,
        avatar: r.user_avatar || '/avatar-1.jpg',
        lastSeen: new Date(r.last_seen).getTime(),
      }));
  } catch (e) {
    return [];
  }
}

/** Format last seen into a human-readable string */
export function formatLastSeen(lastSeen: number): string {
  const secs = Math.floor((Date.now() - lastSeen) / 1000);
  if (secs < 60) return 'Active now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}
