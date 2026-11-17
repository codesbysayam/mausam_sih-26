import React from 'react';

/**
 * Robust lazy loading with automatic retries for Vite dynamically imported modules.
 * Prevents "Failed to fetch dynamically imported module" errors caused by network
 * blips, dev server restarts, or rolling deployments.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  retries = 3,
  interval = 800
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const pageAlreadyRefreshed = Boolean(
      typeof window !== 'undefined' &&
        window.sessionStorage.getItem('mausam_retry_lazy_reload')
    );

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const module = await componentImport();
        // Clear refresh flag on successful import
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem('mausam_retry_lazy_reload');
        }
        return module;
      } catch (error: any) {
        console.warn(`[MAUSAM Lazy Loader] Attempt ${attempt + 1} of ${retries} failed:`, error?.message);

        // If not last attempt, wait and retry with backoff
        if (attempt < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, interval * Math.pow(1.5, attempt)));
          continue;
        }

        // If all retries failed and error is a dynamic import failure, try a clean page reload once
        const isDynamicImportError =
          error?.message?.includes('Failed to fetch dynamically imported module') ||
          error?.message?.includes('dynamically imported module') ||
          error?.name === 'TypeError' ||
          error?.message?.includes('Importing a module script failed');

        if (isDynamicImportError && !pageAlreadyRefreshed && typeof window !== 'undefined') {
          console.log('[MAUSAM Lazy Loader] Refreshing page to resolve stale chunk...');
          window.sessionStorage.setItem('mausam_retry_lazy_reload', 'true');
          window.location.reload();
          // Return a pending promise so React doesn't crash while reloading
          return new Promise(() => {});
        }

        // Clear flag if we already refreshed
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem('mausam_retry_lazy_reload');
        }
        throw error;
      }
    }

    return componentImport();
  });
}
