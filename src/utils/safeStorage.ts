// ====================================================================
// MAUSAM Safe Browser Storage Utility
// Isolates all optional localStorage / sessionStorage access from:
// - Restricted / private browsing SecurityError (including property getter throws)
// - QuotaExceededError during cache writes
// - Corrupted / non-JSON / wrong-shape cached values
// - SSR / Node.js test environments where window is undefined
// ====================================================================

export type StorageKind = 'local' | 'session';

/**
 * Safely resolves the requested Storage object without throwing if
 * accessing `window.localStorage` or `window.sessionStorage` throws SecurityError.
 */
function resolveStorage(kind: StorageKind): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const store = kind === 'local' ? window.localStorage : window.sessionStorage;
    return store ?? null;
  } catch {
    return null;
  }
}

/**
 * Probes whether the given storage backend is both readable and writable.
 */
export function isStorageAvailable(kind: StorageKind): boolean {
  const store = resolveStorage(kind);
  if (!store) return false;
  const probeKey = '__mausam_storage_probe__';
  try {
    store.setItem(probeKey, '1');
    store.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

export function safeStorageGet(kind: StorageKind, key: string): string | null {
  const store = resolveStorage(kind);
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

export function safeStorageSet(kind: StorageKind, key: string, value: string): boolean {
  const store = resolveStorage(kind);
  if (!store) return false;
  try {
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeStorageRemove(kind: StorageKind, key: string): boolean {
  const store = resolveStorage(kind);
  if (!store) return false;
  try {
    store.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes all keys starting with any of the provided prefixes from the target storage.
 * Never calls `.clear()`, preserving unrelated keys and user preferences.
 */
export function safeStorageRemoveByPrefix(kind: StorageKind, prefixes: string[]): number {
  const store = resolveStorage(kind);
  if (!store || prefixes.length === 0) return 0;
  let removed = 0;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key && prefixes.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      try {
        store.removeItem(key);
        removed++;
      } catch {
        // Ignore single-key removal failure
      }
    }
  } catch {
    // Ignore enumeration error in restricted storage environments
  }
  return removed;
}

export function safeStorageGetJson<T>(
  kind: StorageKind,
  key: string,
  validator?: (value: unknown) => value is T
): T | null {
  const raw = safeStorageGet(kind, key);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (validator && !validator(parsed)) {
      // Discard corrupted or schema-mismatched cached value safely
      safeStorageRemove(kind, key);
      return null;
    }
    return parsed as T;
  } catch {
    safeStorageRemove(kind, key);
    return null;
  }
}

export function safeStorageSetJson(kind: StorageKind, key: string, value: unknown): boolean {
  try {
    const serialized = JSON.stringify(value);
    return safeStorageSet(kind, key, serialized);
  } catch {
    return false;
  }
}

/**
 * Non-destructive transient cache reset used by ErrorBoundary recovery.
 * Clears ONLY disposable telemetry/provider/chunk-retry caches.
 * NEVER deletes user preferences or saved data:
 *   - mausam_saved_locations / mausam_saved_destinations
 *   - mausam_selected_location_id / mausam_detected_location
 *   - mausam_language / mausam_alert_language_mode
 *   - mausam_surface_theme_v3
 *   - mausam_saved_reports_v1 / mausam_recent_reports_v1 / mausam_recent_pins_v1
 */
export function clearTransientMausamCaches(): void {
  safeStorageRemove('local', 'mausam_weather_cache_v1');
  safeStorageRemoveByPrefix('session', [
    'provider:',
    'mausam_retry_',
    'mausam_lazy_retry',
    'mausam_eb_reloaded',
  ]);
}
