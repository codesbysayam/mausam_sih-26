import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import {
  clearTransientMausamCaches,
  isStorageAvailable,
  safeStorageGet,
  safeStorageRemove,
  safeStorageSet,
} from '../../utils/safeStorage';
import { isChunkLoadError } from '../../utils/lazyWithRetry';

const EB_RELOAD_GUARD_KEY = 'mausam_eb_reloaded_ts';
const EB_RELOAD_COOLDOWN_MS = 60_000;

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  scope?: 'root' | 'workspace' | 'widget';
  onReset?: () => void;
  onNavigateHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private clearGuardTimer: ReturnType<typeof setTimeout> | null = null;

  public state: State = {
    hasError: false,
    error: null,
    componentStack: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const stack = errorInfo?.componentStack || null;
    this.setState({ componentStack: stack });
    console.error('[MAUSAM ErrorBoundary] Caught component error:', {
      scope: this.props.scope || (this.props.fallbackTitle ? 'widget' : 'root'),
      title: this.props.fallbackTitle,
      error,
      componentStack: stack,
    });

    // Only auto-reload once on genuine stale-chunk load failures, and ONLY if sessionStorage
    // is writable so we can enforce the single-reload cooldown without looping.
    if (
      typeof window !== 'undefined' &&
      isChunkLoadError(error) &&
      isStorageAvailable('session')
    ) {
      const prevTs = Number(safeStorageGet('session', EB_RELOAD_GUARD_KEY) || '0');
      const recentlyReloaded = Number.isFinite(prevTs) && Date.now() - prevTs < EB_RELOAD_COOLDOWN_MS;
      if (!recentlyReloaded) {
        safeStorageSet('session', EB_RELOAD_GUARD_KEY, String(Date.now()));
        try {
          window.location.reload();
        } catch {
          // Stay on fallback UI
        }
      }
    }
  }

  public componentDidMount() {
    if (typeof window !== 'undefined') {
      this.clearGuardTimer = setTimeout(() => {
        safeStorageRemove('session', EB_RELOAD_GUARD_KEY);
      }, 3000);
    }
  }

  public componentWillUnmount() {
    if (this.clearGuardTimer) {
      clearTimeout(this.clearGuardTimer);
      this.clearGuardTimer = null;
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, componentStack: null, showDetails: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  /**
   * Non-destructive transient cache reset: clears ONLY disposable weather/provider/retry caches.
   * Preserves user saved locations, language, surface theme, and saved report bookmarks.
   */
  private handleResetTransientCache = () => {
    clearTransientMausamCaches();
    if (this.props.scope === 'workspace' || this.props.scope === 'widget' || this.props.fallbackTitle) {
      this.handleReset();
      return;
    }
    if (typeof window !== 'undefined') {
      try {
        window.location.reload();
      } catch {
        this.handleReset();
      }
    } else {
      this.handleReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      const scope = this.props.scope || (this.props.fallbackTitle ? 'widget' : 'root');
      const isModuleLoadError = isChunkLoadError(this.state.error);
      const diagnosticText = [
        this.state.error ? `${this.state.error.name}: ${this.state.error.message}` : null,
        this.state.error?.stack ? `\n--- Error Stack ---\n${this.state.error.stack}` : null,
        this.state.componentStack ? `\n--- Component Stack ---${this.state.componentStack}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      // Inline widget fallback (for individual panels, maps, or charts)
      if (scope === 'widget') {
        return (
          <div
            role="alert"
            className="w-full p-4 rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border-strong)] my-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-[var(--m-watch)] min-w-0">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[var(--m-text-primary)]">
                    {this.props.fallbackTitle || 'Telemetry Module'} Temporarily Unavailable
                  </h4>
                  <p className="text-[11px] text-[var(--m-text-muted)]">
                    This panel isolated a rendering fault. Other atmospheric tools remain operational.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={this.handleReset}
                className="px-3 min-h-[36px] rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] text-xs font-semibold text-[var(--m-accent)] flex items-center gap-1.5 transition-colors cursor-pointer m-focus-ring"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        );
      }

      // Workspace / route-level isolated recovery (keeps global brand bar & navigation mounted)
      if (scope === 'workspace') {
        return (
          <div
            role="alert"
            className="w-full min-h-[60dvh] flex items-center justify-center p-4 sm:p-6 bg-[var(--m-canvas)] text-[var(--m-text-primary)]"
          >
            <div className="w-full max-w-lg bg-[var(--m-surface-1)] border border-[var(--m-border-strong)] rounded-2xl p-5 sm:p-7 shadow-xl flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--m-danger-soft)] border border-[var(--m-danger)]/40 flex items-center justify-center text-[var(--m-danger)] shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-[var(--m-text-primary)] tracking-tight">
                    {isModuleLoadError
                      ? 'Module Update Available'
                      : `${this.props.fallbackTitle || 'Workspace'} Recovery`}
                  </h2>
                  <p className="text-xs text-[var(--m-text-muted)]">
                    Fault isolated to this view — navigation and saved preferences remain intact.
                  </p>
                </div>
              </div>

              <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">
                {isModuleLoadError
                  ? 'A newer module build is available. Retry or reload to fetch the latest bundle.'
                  : 'An unexpected rendering condition occurred inside this workspace. You can retry immediately, clear transient telemetry cache, or switch to another view.'}
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="flex-1 min-w-[140px] min-h-[42px] px-4 rounded-xl bg-[var(--m-accent)] hover:opacity-95 text-[var(--m-on-accent)] text-xs font-bold flex items-center justify-center gap-2 transition-opacity cursor-pointer m-focus-ring"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry View</span>
                </button>
                <button
                  type="button"
                  onClick={this.handleResetTransientCache}
                  className="min-h-[42px] px-4 rounded-xl bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer m-focus-ring"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Telemetry Cache</span>
                </button>
                {this.props.onNavigateHome && (
                  <button
                    type="button"
                    onClick={() => {
                      this.handleReset();
                      this.props.onNavigateHome?.();
                    }}
                    className="min-h-[42px] px-4 rounded-xl border border-[var(--m-border-strong)] bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] text-[var(--m-text-primary)] text-xs font-medium transition-colors cursor-pointer m-focus-ring"
                  >
                    Return to Overview
                  </button>
                )}
              </div>

              {diagnosticText && (
                <div className="border-t border-[var(--m-border)] pt-3">
                  <button
                    type="button"
                    onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                    aria-expanded={this.state.showDetails}
                    className="flex items-center justify-between w-full text-[11px] text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] py-1 cursor-pointer m-focus-ring rounded"
                  >
                    <span>Diagnostic Information</span>
                    {this.state.showDetails ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {this.state.showDetails && (
                    <pre className="mt-2 p-3 rounded-lg bg-[var(--m-surface-inset)] text-[10px] font-mono text-[var(--m-danger)] overflow-x-auto whitespace-pre-wrap max-h-44">
                      {diagnosticText}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      }

      // Root application fallback (last line of defense if an unhandled crash occurs outside workspaces)
      return (
        <div
          role="alert"
          className="min-h-[100dvh] bg-[var(--m-surface-inset)] text-[var(--m-text-primary)] flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg bg-[var(--m-surface-1)] border border-[var(--m-border-strong)] rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--m-danger-soft)] border border-[var(--m-danger)]/40 flex items-center justify-center text-[var(--m-danger)] shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-[var(--m-text-primary)] tracking-wide">
                  {isModuleLoadError ? 'Application Update Available' : 'MAUSAM Atmospheric Shell'}
                </h1>
                <p className="text-xs text-[var(--m-text-muted)]">
                  {isModuleLoadError
                    ? 'New module release detected'
                    : 'Autonomous Fail-Safe Recovery Active'}
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">
              {isModuleLoadError
                ? 'A fresh meteorological build was deployed. Reloading will sync your browser with the latest live components.'
                : 'The interface encountered an unexpected rendering condition on this device. Your saved locations, language, and display settings are preserved.'}
            </p>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (isModuleLoadError && typeof window !== 'undefined') {
                    window.location.reload();
                  } else {
                    this.handleReset();
                  }
                }}
                className="flex-1 min-w-[150px] min-h-[44px] py-2.5 px-4 rounded-xl bg-[var(--m-accent)] hover:opacity-95 text-[var(--m-on-accent)] text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-opacity cursor-pointer m-focus-ring"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{isModuleLoadError ? 'Reload Application' : 'Resume Interface'}</span>
              </button>
              {!isModuleLoadError && (
                <button
                  type="button"
                  onClick={this.handleResetTransientCache}
                  className="min-h-[44px] py-2.5 px-4 rounded-xl bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer m-focus-ring"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Telemetry Cache</span>
                </button>
              )}
            </div>

            {diagnosticText && (
              <div className="border-t border-[var(--m-border)] pt-3">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  aria-expanded={this.state.showDetails}
                  className="flex items-center justify-between w-full text-[11px] text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] py-1 cursor-pointer m-focus-ring rounded"
                >
                  <span>Diagnostic Information</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
                {this.state.showDetails && (
                  <pre className="mt-2 p-3 rounded-lg bg-[var(--m-surface-inset)] text-[10px] font-mono text-[var(--m-danger)] overflow-x-auto whitespace-pre-wrap max-h-48">
                    {diagnosticText}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
