/**
 * Triple-redundancy post storage:
 * 1. localStorage (primary — fast reads)
 * 2. localStorage backup (same-tab fallback)
 * 3. IndexedDB (cross-session fallback — survives iOS Safari purging better)
 */

const POSTS_KEY = 'hobbyhub_posts';
const POSTS_BACKUP_KEY = 'hobbyhub_posts_backup';
const DB_NAME = 'HobbyHubPostsDB';
const DB_VERSION = 1;
const STORE_NAME = 'posts';

/* ─── IndexedDB helpers ─── */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch { return null; }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch { /* ignore */ }
}

/* ─── localStorage helpers ─── */
function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T;
    }
  } catch { /* ignore */ }
  return fallback;
}

function lsSet(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

/* ─── Load posts — try 3 layers ─── */
export async function loadPosts<T>(): Promise<T[]> {
  // Layer 1: localStorage primary
  const primary = lsGet<T[]>(POSTS_KEY, []);
  if (primary.length > 0) return primary;

  // Layer 2: localStorage backup
  const backup = lsGet<T[]>(POSTS_BACKUP_KEY, []);
  if (backup.length > 0) {
    lsSet(POSTS_KEY, backup);
    return backup;
  }

  // Layer 3: IndexedDB (most persistent, especially on iOS Safari)
  const idbPosts = await idbGet<T[]>(POSTS_KEY);
  if (idbPosts && idbPosts.length > 0) {
    lsSet(POSTS_KEY, idbPosts);
    lsSet(POSTS_BACKUP_KEY, idbPosts);
    return idbPosts;
  }

  return [];
}

/* ─── Save posts — write to all 3 layers ─── */
export async function savePosts<T>(posts: T[]): Promise<void> {
  // Layer 1 & 2: localStorage (sync)
  lsSet(POSTS_KEY, posts);
  lsSet(POSTS_BACKUP_KEY, posts);

  // Layer 3: IndexedDB (async, more persistent)
  await idbSet(POSTS_KEY, posts);
}
