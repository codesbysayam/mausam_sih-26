// ====================================================================
// MAUSAM - Production PWA Service Worker Update Prompt
// Subscribes to offlineCacheService and presents a calm, non-intrusive
// observatory notice whenever a new production build is waiting to
// activate, preventing mid-session stale-chunk HTML fallback errors.
// ====================================================================

import React, { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import {
  applyPendingServiceWorkerUpdate,
  subscribeOfflineCacheState,
  type OfflineCacheState,
} from '../../services/offlineCacheService';

export const PWAUpdatePrompt: React.FC = () => {
  const [cacheState, setCacheState] = useState<OfflineCacheState | null>(null);
  const [dismissedForSession, setDismissedForSession] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    return subscribeOfflineCacheState((next) => {
      setCacheState(next);
    });
  }, []);

  if (!cacheState?.updateAvailable || dismissedForSession) {
    return null;
  }

  const handleReloadToUpdate = async () => {
    if (isApplying) return;
    setIsApplying(true);
    try {
      await applyPendingServiceWorkerUpdate();
    } catch {
      // Fallback hard reload if SW update bridge encounters a browser restriction
      window.location.reload();
    }
  };

  return (
    <aside
      id="pwa-update-available-prompt"
      role="status"
      aria-live="polite"
      aria-label="Application update available"
      className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 sm:w-[360px] max-w-[calc(100vw-32px)] bg-[#141718] border border-[#C5A46D]/35 text-[#F0EEE7] rounded-xl p-4 shadow-2xl transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#F0EEE7] leading-snug">
            New MAUSAM build ready
          </p>
          <p className="mt-1 text-xs text-[#A9A69D] leading-relaxed">
            Reload to activate the latest observatory modules and weather layers cleanly.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissedForSession(true)}
          disabled={isApplying}
          aria-label="Dismiss update prompt"
          className="min-w-[40px] min-h-[40px] -mt-1.5 -mr-1.5 flex items-center justify-center rounded-lg text-[#898B83] hover:text-[#F0EEE7] hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A46D] transition-colors cursor-pointer disabled:opacity-40"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3.5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setDismissedForSession(true)}
          disabled={isApplying}
          className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-[#A9A69D] hover:text-[#F0EEE7] hover:bg-white/5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A46D] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
        >
          Later
        </button>
        <button
          type="button"
          id="pwa-reload-update-btn"
          onClick={handleReloadToUpdate}
          disabled={isApplying}
          className="min-h-[40px] px-4 py-2 flex items-center gap-2 bg-[#C5A46D] hover:bg-[#D5B57D] text-[#0B0C0D] text-xs font-semibold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6B96B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141718] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isApplying ? 'animate-spin' : ''}`} />
          <span>{isApplying ? 'Updating…' : 'Reload to Update'}</span>
        </button>
      </div>
    </aside>
  );
};
