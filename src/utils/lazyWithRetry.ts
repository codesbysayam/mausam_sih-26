import React from 'react';
import { safeStorageGet, safeStorageRemove, safeStorageSet } from './safeStorage';

const LAZY_RELOAD_GUARD = 'mausam_retry_lazy_reload_until';
const RELOAD_GUARD_MS = 60_000;

/**
 * Retry transient dynamic-import failures without creating an infinite
 * reload loop. Storage is optional; if session storage is blocked, do not
 * auto-reload because a cross-reload guard cannot be persisted safely.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  retries = 3,
  interval = 800
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const guardValue = Number(safeStorageGet('session', LAZY_RELOAD_GUARD) || 0);
    const reloadAlreadyAttempted = Number.isFinite(guardValue) && guardValue > Date.now();
    let lastError: unknown;

    for (let attempt = 0; attempt < retries; attempt += 1) {
      try {
        const module = await componentImport();
        safeStorageRemove('session', LAZY_RELOAD_GUARD);
        return module;
      } catch (error: unknown) {
        lastError = error;
        const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
        const isChunkError =
          message.includes('failed to fetch dynamically imported module') ||
          message.includes('dynamically imported module') ||
          message.includes('importing a module script failed') ||
          message.includes('chunkloaderror') ||
          message.includes('loading chunk');

        console.warn(`[MAUSAM Lazy Loader] Attempt ${attempt + 1} of ${retries} failed:`, message);

        if (!isChunkError || attempt === retries - 1) break;
        await new Promise((resolve) => setTimeout(resolve, interval * Math.pow(1.5, attempt)));
      }
    }

    const finalMessage = lastError instanceof Error ? lastError.message.toLowerCase() : String(lastError).toLowerCase();
    const isFinalChunkError =
      finalMessage.includes('failed to fetch dynamically imported module') ||
      finalMessage.includes('dynamically imported module') ||
      finalMessage.includes('importing a module script failed') ||
      finalMessage.includes('chunkloaderror') ||
      finalMessage.includes('loading chunk');

    if (isFinalChunkError && !reloadAlreadyAttempted && typeof window !== 'undefined') {
      const guardSaved = safeStorageSet('session', LAZY_RELOAD_GUARD, String(Date.now() + RELOAD_GUARD_MS));
      if (guardSaved) {
        window.location.reload();
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError || 'Unable to load this MAUSAM section.'));
  });
}
