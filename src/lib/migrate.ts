/**
 * One-time migration that runs on app startup.
 * Migrates old flat-format data to per-user storage.
 */
import { loadSync } from './durableStorage';
import { saveUserJoinsLocal, loadUserJoinsLocal } from './membershipRegistry';

const MIGRATION_KEY = 'hobbyhub_migration_v2_done';
const OLD_JOINS_KEY = 'hobbyhub_joined_subcommittees';

function safeGet<T>(key: string, fallback: T): T {
  return loadSync<T>(key, fallback);
}

function safeSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

function safeRemove(key: string) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

/** Get all registered users */
function getAllUsers(): { id: string }[] {
  try {
    // Try v2 first, then v1
    let raw = localStorage.getItem('hobbyhub_users_v2');
    if (!raw) raw = localStorage.getItem('hobbyhub_users');
    if (raw) {
      const users = JSON.parse(raw);
      if (Array.isArray(users)) {
        return users
          .filter((u: any) => u && u.id)
          .map((u: any) => ({ id: u.id }));
      }
    }
  } catch { /* ignore */ }
  return [];
}

/**
 * Run the migration once.
 * - Migrates old flat `hobbyhub_joined_subcommittees` to per-user `hobbyhub_joins_{userId}`
 * - Copies old joins to EVERY user who doesn't have per-user joins
 * - Runs once per device
 */
export function runMigration() {
  // Only run once per device
  try {
    if (localStorage.getItem(MIGRATION_KEY) === 'true') return;
  } catch { return; }

  const users = getAllUsers();
  if (users.length === 0) return;

  // Check old flat join storage
  const oldJoins = safeGet<string[]>(OLD_JOINS_KEY, []);

  if (oldJoins.length > 0) {
    // The old key had ALL joins from whoever was logged in at the time.
    // Give these joins to EVERY user who doesn't already have per-user joins.
    // This is the best we can do without knowing whose joins they were.
    let anyUserGotMigrated = false;

    for (const user of users) {
      const existing = loadUserJoinsLocal(user.id);
      if (existing.length === 0) {
        // This user has no per-user joins — give them the old data
        saveUserJoinsLocal(user.id, [...oldJoins]);
        anyUserGotMigrated = true;
      }
    }

    // Only clear the old key after ALL users have been processed
    if (anyUserGotMigrated) {
      safeRemove(OLD_JOINS_KEY);
    }
  }

  // Also migrate old v1 users key to v2 if needed
  const oldUsers = localStorage.getItem('hobbyhub_users');
  if (oldUsers && !localStorage.getItem('hobbyhub_users_v2')) {
    try {
      const parsed = JSON.parse(oldUsers);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem('hobbyhub_users_v2', oldUsers);
        localStorage.setItem('hobbyhub_users_backup', oldUsers);
      }
    } catch { /* ignore */ }
  }

  // Also migrate old v1 session to v2 if needed
  const oldSession = localStorage.getItem('hobbyhub_session');
  if (oldSession && !localStorage.getItem('hobbyhub_session_v2')) {
    try {
      const parsed = JSON.parse(oldSession);
      if (parsed && parsed.id && parsed.email) {
        localStorage.setItem('hobbyhub_session_v2', oldSession);
      }
    } catch { /* ignore */ }
  }

  // Mark migration as done
  safeSet(MIGRATION_KEY, 'true');
}
