/**
 * Browser storage is optional. Accessing the localStorage/sessionStorage
 * properties themselves can throw in private mode, embedded browsers,
 * restricted contexts, or when the user blocks site storage.
 * All application storage reads/writes must go through these helpers.
 */
export type StorageArea = 'local' | 'session';

function getStorage(area: StorageArea): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return area === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function safeStorageGet(area: StorageArea, key: string): string | null {
  try {
    return getStorage(area)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function safeStorageSet(area: StorageArea, key: string, value: string): boolean {
  try {
    const storage = getStorage(area);
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeStorageRemove(area: StorageArea, key: string): boolean {
  try {
    const storage = getStorage(area);
    if (!storage) return false;
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Remove only keys owned by the supplied application prefix. */
export function safeStorageRemoveByPrefix(area: StorageArea, prefix: string): number {
  try {
    const storage = getStorage(area);
    if (!storage) return 0;
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
    return keys.length;
  } catch {
    return 0;
  }
}
