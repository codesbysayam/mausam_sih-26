import { StrictMode, useEffect, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './i18n/LanguageContext';
import { LocationProvider } from './context/LocationContext';
import { ProviderStoreProvider } from './store/providerStore';
import { ExperienceMode, ExperienceProvider } from './context/ExperienceContext';
import { MotionProvider } from './motion';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

export const REACT_MOUNTED_EVENT = 'mausam:react-mounted';
export const STARTUP_WATCHDOG_TIMEOUT_MS = 12_000;

declare global {
  interface Window {
    __MAUSAM_REACT_MOUNTED__?: boolean;
    __mausamClearCacheAndReload?: () => Promise<void> | void;
    __mausamShowBootRecovery?: (reason?: string) => void;
  }
}

/**
 * Unregisters active Service Workers, purges CacheStorage entries, and forces
 * a cache-busted reload to recover cleanly from stale chunk or module failures.
 */
export async function clearObservatoryCacheAndReload(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (typeof window.__mausamClearCacheAndReload === 'function') {
    await window.__mausamClearCacheAndReload();
    return;
  }

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister().catch(() => false)));
    }
  } catch {
    // Ignore restricted iframe SW errors
  }

  try {
    if ('caches' in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map((name) => window.caches.delete(name).catch(() => false)));
    }
  } catch {
    // Ignore restricted CacheStorage errors
  }

  try {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('_mausam_reload', String(Date.now()));
    window.location.replace(nextUrl.toString());
  } catch {
    window.location.reload();
  }
}

/**
 * Updates the static boot screen with a clear diagnostic message and a
 * Clear Cache & Reload recovery action if React fails to mount within 12s.
 */
export function renderStartupRecoveryMessage(reason?: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (typeof window.__mausamShowBootRecovery === 'function') {
    window.__mausamShowBootRecovery(reason);
    return;
  }

  const statusEl = document.getElementById('mausam-boot-status');
  const actionsEl = document.getElementById('mausam-boot-actions');
  if (statusEl) {
    statusEl.textContent =
      reason ||
      'Observatory startup timed out after 12 seconds. Clear cached bundles and reload to recover.';
    statusEl.style.color = '#F0EEE7';
  }
  if (actionsEl && actionsEl.childElementCount === 0) {
    actionsEl.style.display = 'flex';
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.id = 'mausam-boot-clear-cache-btn';
    clearBtn.textContent = 'Clear Cache & Reload';
    clearBtn.style.cssText =
      'min-height:42px;padding:10px 18px;border-radius:8px;border:none;background:#C5A46D;color:#0B0C0D;font-weight:700;font-size:12px;cursor:pointer;';
    clearBtn.onclick = () => {
      void clearObservatoryCacheAndReload();
    };
    actionsEl.appendChild(clearBtn);
  }
}

/**
 * Startup watchdog that monitors the `mausam:react-mounted` event and updates
 * the boot initialization screen if React fails to mount within `timeoutMs`
 * (default: 12 seconds).
 */
export function startStartupWatchdog(
  timeoutMs: number = STARTUP_WATCHDOG_TIMEOUT_MS,
  onTimeout: (reason: string) => void = renderStartupRecoveryMessage
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (window.__MAUSAM_REACT_MOUNTED__) {
    return () => {};
  }

  let settled = false;

  const handleMounted = () => {
    settled = true;
    window.__MAUSAM_REACT_MOUNTED__ = true;
    window.clearTimeout(timerId);
  };

  const timerId = window.setTimeout(() => {
    if (settled || window.__MAUSAM_REACT_MOUNTED__) return;
    settled = true;
    window.removeEventListener(REACT_MOUNTED_EVENT, handleMounted);
    onTimeout(
      'Observatory startup took longer than 12 seconds. Cached application modules may be out of date.'
    );
  }, timeoutMs);

  window.addEventListener(REACT_MOUNTED_EVENT, handleMounted, { once: true });

  return () => {
    settled = true;
    window.clearTimeout(timerId);
    window.removeEventListener(REACT_MOUNTED_EVENT, handleMounted);
  };
}

/**
 * Emits the `mausam:react-mounted` lifecycle event as soon as React commits
 * the root application tree, disarming both HTML and JS startup watchdogs.
 */
function ReactMountBeacon({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__MAUSAM_REACT_MOUNTED__ = true;
      window.dispatchEvent(new CustomEvent(REACT_MOUNTED_EVENT));
    }
  }, []);

  return <>{children}</>;
}

// Determine initial workspace mode synchronously from pathname so direct sub-route
// loads (e.g. /warnings, /forecast, /radar) mount directly in Analyze mode without
// transiently mounting and tearing down the 3D WebGL stage.
function resolveInitialExperienceMode(): ExperienceMode {
  if (typeof window === 'undefined') return 'explore';
  const cleanPath = (window.location.pathname || '/').toLowerCase().replace(/\/+$/, '');
  if (cleanPath === '' || cleanPath === '/' || cleanPath === '/index.html' || cleanPath.endsWith('/index.html')) {
    return 'explore';
  }
  return 'analyze';
}

// Helper to classify development-only Vite HMR socket errors
function isDevelopmentHMRSocketError(error: any): boolean {
  if (!error) return false;
  const message = typeof error === 'string'
    ? error
    : (error.message || error.reason || error.error?.message || '');

  if (
    message.includes('WebSocket closed without opened') ||
    message.includes('failed to connect to websocket') ||
    message.includes('[vite] failed to connect to websocket') ||
    (message.includes('WebSocket') && message.includes('closed')) ||
    (message.includes('vite') && message.includes('websocket'))
  ) {
    return true;
  }

  const target = error.target;
  if (target && (target instanceof WebSocket || Object.prototype.toString.call(target) === '[object WebSocket]')) {
    const url = target.url || '';
    if (url.includes('vite') || url.includes(':3000') || url.includes('/vite-hmr') || !url) {
      return true;
    }
  }

  return false;
}

// Global runtime error monitor for diagnostics (suppresses ONLY benign HMR/ResizeObserver/Abort noise)
if (typeof window !== 'undefined') {
  // Arm the 12-second startup watchdog monitoring `mausam:react-mounted`
  startStartupWatchdog(STARTUP_WATCHDOG_TIMEOUT_MS);

  // Surface recovery UI immediately if Vite detects a stale dynamic chunk load error before mount
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    if (!window.__MAUSAM_REACT_MOUNTED__) {
      renderStartupRecoveryMessage(
        'A cached module chunk could not be loaded. Clear cache and reload to load the latest MAUSAM build.'
      );
    }
  });

  window.addEventListener('error', (e) => {
    if (isDevelopmentHMRSocketError(e) || isDevelopmentHMRSocketError(e.error)) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }

    if (
      e.message &&
      (e.message.includes('ResizeObserver loop completed with undelivered notifications') ||
        e.message.includes('ResizeObserver loop limit exceeded'))
    ) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }
    console.error('[MAUSAM Global Error]:', e.message, 'at', e.filename, ':', e.lineno, e.error);
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;

    if (isDevelopmentHMRSocketError(reason)) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }

    const isAbort =
      reason?.name === 'AbortError' ||
      reason?.message?.includes?.('aborted') ||
      reason?.message?.includes?.('The user aborted a request') ||
      reason === 'AbortError';

    const isAudioPermission =
      reason?.name === 'NotAllowedError' ||
      reason?.message?.includes?.("user didn't interact with the document first");

    if (isAbort || isAudioPermission) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }

    // Do NOT silently swallow real unhandled rejections — log diagnostic context clearly
    console.error('[MAUSAM Unhandled Promise Rejection]:', reason);
  });
}

const rootElement = typeof document !== 'undefined' ? document.getElementById('root') : null;

if (typeof document !== 'undefined') {
  if (!rootElement) {
    console.error('[MAUSAM FATAL]: #root element not found in DOM!');
    renderStartupRecoveryMessage('Observatory root container was not found. Clear cache and reload.');
  } else {
    try {
      const initialMode = resolveInitialExperienceMode();
      const root = createRoot(rootElement);
      root.render(
        <StrictMode>
          <ErrorBoundary scope="root">
            <ReactMountBeacon>
              <LanguageProvider>
                <LocationProvider>
                  <ProviderStoreProvider>
                    <ExperienceProvider initialMode={initialMode}>
                      <MotionProvider>
                        <App />
                      </MotionProvider>
                    </ExperienceProvider>
                  </ProviderStoreProvider>
                </LocationProvider>
              </LanguageProvider>
            </ReactMountBeacon>
          </ErrorBoundary>
        </StrictMode>
      );
    } catch (err) {
      console.error('[MAUSAM FATAL]: Exception during createRoot / render initialization:', err);
      renderStartupRecoveryMessage(
        'Observatory failed to initialize due to a startup error. Clear cache and reload to recover.'
      );
    }
  }
}
