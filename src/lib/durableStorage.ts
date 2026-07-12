/**
 * Durable storage — localStorage + IndexedDB fallback.
 * IndexedDB survives iOS Safari storage purging better than localStorage.
 */

const DB_NAME = 'HobbyHubDB';
const DB_VERSION = 1;
const STORE_NAME = 'appData';

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
      if (parsed !== null) return parsed as T;
    }
  } catch { /* ignore */ }
  return fallback;
}

function lsSet(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

/* ─── Load — try localStorage first, fallback to IndexedDB ─── */
export function loadSync<T>(key: string, fallback: T): T {
  return lsGet<T>(key, fallback);
}

export async function loadDurable<T>(key: string, fallback: T): Promise<T> {
  // Try localStorage first
  const ls = lsGet<T>(key, fallback);
  if (ls !== fallback && !(Array.isArray(ls) && ls.length === 0)) {
    return ls;
  }
  // Fallback to IndexedDB
  const idb = await idbGet<T>(key);
  if (idb !== null) {
    // Restore localStorage from IndexedDB
    lsSet(key, idb);
    return idb;
  }
  return fallback;
}

/* ─── Save — write to both localStorage and IndexedDB ─── */
export function saveDurable<T>(key: string, value: T): void {
  lsSet(key, value);
  idbSet(key, value);
}
