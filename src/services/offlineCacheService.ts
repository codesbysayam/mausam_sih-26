// ====================================================================
// MAUSAM - Offline Service Worker Registration & Cache Inspector
// Registers the vite-plugin-pwa Workbox Service Worker so meteorological
// GET responses remain readable during network outages while keeping
// /api/system diagnostics strictly NetworkOnly.
// ====================================================================

export interface OfflineCacheState {
  supported: boolean;
  registered: boolean;
  offlineReady: boolean;
  updateAvailable: boolean;
  cachedMeteorologyEntries: number;
}

type Listener = (state: OfflineCacheState) => void;

const listeners = new Set<Listener>();
let initialized = false;
let triggerSwUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null;

let currentState: OfflineCacheState = {
  supported: typeof window !== 'undefined' && 'serviceWorker' in navigator,
  registered: false,
  offlineReady: false,
  updateAvailable: false,
  cachedMeteorologyEntries: 0,
};

function emit(patch: Partial<OfflineCacheState>) {
  currentState = { ...currentState, ...patch };
  for (const listener of listeners) {
    try {
      listener(currentState);
    } catch {
      // isolate listener errors
    }
  }
}

export function getOfflineCacheState(): OfflineCacheState {
  return currentState;
}

export function subscribeOfflineCacheState(listener: Listener): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}

export async function refreshCachedMeteorologyCount(): Promise<number> {
  if (typeof window === 'undefined' || !('caches' in window)) return 0;
  try {
    const cache = await window.caches.open('mausam-meteorology-api-v1');
    const keys = await cache.keys();
    emit({ cachedMeteorologyEntries: keys.length });
    return keys.length;
  } catch {
    return 0;
  }
}

export async function applyPendingServiceWorkerUpdate(): Promise<void> {
  if (triggerSwUpdate) {
    await triggerSwUpdate(true);
  }
}

export async function registerOfflineServiceWorker(): Promise<void> {
  if (initialized || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  initialized = true;

  // In development mode, unregister any previously installed dev Service Workers
  // and clear stale Workbox precaches so Vite module requests never receive cached HTML.
  const isDevRuntime = Boolean((import.meta as unknown as { env?: { DEV?: boolean } })?.env?.DEV);
  if (isDevRuntime) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister().catch(() => false)));
      if ('caches' in window) {
        const cacheNames = await window.caches.keys();
        await Promise.all(
          cacheNames
            .filter((name) => name.includes('workbox-precache'))
            .map((name) => window.caches.delete(name).catch(() => false))
        );
      }
    } catch {
      // Ignore cleanup failures in restricted iframe contexts
    }
    emit({ registered: false, offlineReady: false });
    return;
  }

  try {
    const { registerSW } = await import('virtual:pwa-register');
    triggerSwUpdate = registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        emit({ registered: Boolean(registration) });
        refreshCachedMeteorologyCount().catch(() => {});
      },
      onOfflineReady() {
        emit({ offlineReady: true, registered: true });
        refreshCachedMeteorologyCount().catch(() => {});
      },
      onNeedRefresh() {
        emit({ updateAvailable: true });
      },
      onRegisterError(err) {
        console.warn('[MAUSAM SW] Registration skipped/failed:', err);
      },
    });
  } catch (err) {
    // Expected in non-Vite unit test environments where virtual:pwa-register does not exist
    console.warn('[MAUSAM SW] Service worker registration unavailable in this runtime:', err);
  }
}
