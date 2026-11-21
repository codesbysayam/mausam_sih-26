import React from 'react';
import {
  isStorageAvailable,
  safeStorageGet,
  safeStorageRemove,
  safeStorageSet,
} from './safeStorage';

const RELOAD_GUARD_KEY = 'mausam_retry_lazy_reload_ts';
const RELOAD_COOLDOWN_MS = 60_000;

/**
 * Classifies genuine stale-chunk / dynamic module import errors only.
 * Explicitly avoids classifying generic runtime TypeErrors as chunk errors.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const err = error as { name?: string; message?: string };
  const name = String(err?.name || '');
  const message = String(err?.message || '').toLowerCase();

  if (name === 'ChunkLoadError') return true;

  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('loading chunk') ||
    message.includes('loading css chunk') ||
    message.includes('unable to preload css')
  );
}

/**
 * Checks whether a single bounded reload was already attempted within the cooldown window.
 */
function wasRecentlyReloaded(now = Date.now()): boolean {
  const raw = safeStorageGet('session', RELOAD_GUARD_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  return now - ts < RELOAD_COOLDOWN_MS;
}

export interface LazyRetryOptions {
  exportName?: string;
  retries?: number;
  intervalMs?: number;
  allowReload?: boolean;
}

/**
 * Shared loader helper (exported for unit tests as well as React.lazy).
 */
export async function loadModuleWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<Record<string, any>>,
  options: LazyRetryOptions = {}
): Promise<{ default: T }> {
  const {
    exportName = 'default',
    retries = 3,
    intervalMs = 600,
    allowReload = true,
  } = options;

  let lastError: unknown = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const mod = await componentImport();
      const resolved =
        (exportName && mod?.[exportName]) ||
        mod?.default ||
        (mod && typeof mod === 'object' ? Object.values(mod)[0] : undefined);

      if (!resolved) {
        throw new Error(`Lazy module did not export "${exportName}" or a default component.`);
      }

      safeStorageRemove('session', RELOAD_GUARD_KEY);
      return { default: resolved as T };
    } catch (error: unknown) {
      lastError = error;
      const chunkError = isChunkLoadError(error);

      // Non-chunk errors (e.g., module runtime bug) should surface directly to ErrorBoundary
      // rather than spinning through unnecessary chunk retries or reloading the page.
      if (!chunkError) {
        throw error;
      }

      if (attempt < retries - 1) {
        const delay = Math.round(intervalMs * Math.pow(1.6, attempt));
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  // Bounded single reload ONLY for confirmed chunk errors when sessionStorage is writable
  // (skip reload if storage is blocked so we can never enter an infinite reload loop).
  if (
    allowReload &&
    typeof window !== 'undefined' &&
    isChunkLoadError(lastError) &&
    isStorageAvailable('session') &&
    !wasRecentlyReloaded()
  ) {
    safeStorageSet('session', RELOAD_GUARD_KEY, String(Date.now()));
    try {
      window.location.reload();
    } catch {
      // Fall through to throw error cleanly to ErrorBoundary
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError || 'Failed to load dynamic module'));
}

/**
 * Robust React.lazy wrapper with bounded retries for Vite dynamically imported modules.
 * Supports both default exports and named exports (e.g. `lazyWithRetry(() => import('./Alerts'), 'AlertsPage')`).
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<Record<string, any>>,
  exportNameOrRetries: string | number = 'default',
  intervalMs = 600
): React.LazyExoticComponent<T> {
  const options: LazyRetryOptions =
    typeof exportNameOrRetries === 'string'
      ? { exportName: exportNameOrRetries, retries: 3, intervalMs }
      : { exportName: 'default', retries: exportNameOrRetries, intervalMs };

  return React.lazy(() => loadModuleWithRetry<T>(componentImport, options));
}
