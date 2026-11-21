import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  isExplore?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ isExplore = false }) => {
  const { canInstall, hasNativePrompt, isIOS, isInstalled, promptInstall } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled || !canInstall) return null;

  const handleClick = async () => {
    if (hasNativePrompt) {
      await promptInstall();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Install MAUSAM for offline read-only weather access"
        aria-label="Install MAUSAM App"
        className={`${
          isExplore
            ? 'spatial-hud-surface text-[var(--m-text-primary)]'
            : 'bg-[var(--m-surface-1)] border border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)] hover:bg-[var(--m-surface-2)]'
        } rounded-[11px] min-h-[44px] sm:min-h-[40px] px-2.5 inline-flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer m-focus-ring`}
      >
        <Download className="w-3.5 h-3.5 text-[var(--m-accent)] shrink-0" />
        <span className="hidden lg:inline whitespace-nowrap">Install App</span>
      </button>

      {showIOSGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Install MAUSAM on iOS"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border-strong)] p-5 shadow-2xl space-y-3 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--m-border)] pb-2.5">
              <h2 className="text-sm font-bold text-[var(--m-text-primary)]">Install MAUSAM</h2>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                aria-label="Close install instructions"
                className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">
              Add MAUSAM to your Home Screen for standalone access and read-only offline weather caching during network outages:
            </p>
            <ol className="text-xs text-[var(--m-text-primary)] space-y-2 list-decimal list-inside">
              <li className="leading-relaxed">
                Tap the <Share className="w-3.5 h-3.5 inline mx-1 text-[var(--m-accent)]" /> <strong>Share</strong> button in Safari.
              </li>
              <li className="leading-relaxed">
                Scroll down and select <strong>Add to Home Screen</strong>.
              </li>
              <li className="leading-relaxed">
                Tap <strong>Add</strong> in the top-right corner.
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
};
