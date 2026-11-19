import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MAUSAM ErrorBoundary] Caught component error:', error, errorInfo);
    // If a dynamically imported module failed to fetch due to a new deployment, auto-reload once to fetch fresh assets
    if (
      typeof window !== 'undefined' &&
      (error?.message?.includes('dynamically imported module') || error?.message?.includes('Importing a module script failed')) &&
      !sessionStorage.getItem('mausam_eb_reloaded')
    ) {
      sessionStorage.setItem('mausam_eb_reloaded', 'true');
      window.location.reload();
    }
  }

  public componentDidMount() {
    if (typeof window !== 'undefined') {
      // Clear reload guard after successful mount
      setTimeout(() => {
        sessionStorage.removeItem('mausam_eb_reloaded');
      }, 3000);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleFullReset = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mausam_weather_cache_v1');
        localStorage.removeItem('mausam_saved_locations');
        sessionStorage.clear();
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      // Sub-component fallback (for widgets like radar, maps, or charts)
      if (this.props.fallbackTitle) {
        return (
          <div className="w-full p-4 rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border-strong)] my-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-[var(--m-watch)]">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-[var(--m-text-primary)]">
                    {this.props.fallbackTitle} Temporarily Unavailable
                  </h4>
                  <p className="text-[11px] text-[var(--m-text-muted)]">
                    Fallback atmospheric telemetry is active. Live widget will recover on next cycle.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={this.handleReset}
                className="px-3 py-1.5 rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] text-xs font-medium text-[var(--m-accent)] flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        );
      }

      const isModuleLoadError =
        this.state.error?.message?.includes('dynamically imported module') ||
        this.state.error?.message?.includes('Failed to fetch');

      // Root application fallback (if an unhandled crash threatens the entire page)
      return (
        <div className="min-h-screen bg-[var(--m-surface-inset)] text-[var(--m-text-primary)] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--m-danger-soft)] border border-[var(--m-danger)]/40 flex items-center justify-center text-[var(--m-danger)]">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-wide">
                  {isModuleLoadError ? 'Application Update Available' : 'MAUSAM Atmospheric Shell'}
                </h1>
                <p className="text-xs text-[var(--m-text-muted)]">
                  {isModuleLoadError ? 'New module release detected' : 'Autonomous Fail-Safe Recovery Active'}
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">
              {isModuleLoadError
                ? 'A fresh meteorological build was deployed. Reloading will sync your browser with the latest live components.'
                : 'The interface encountered an unexpected rendering condition on this device. Your weather monitoring data and settings are preserved.'}
            </p>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.reload();
                  } else {
                    this.handleReset();
                  }
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{isModuleLoadError ? 'Reload Application' : 'Resume Interface'}</span>
              </button>
              {!isModuleLoadError && (
                <button
                  type="button"
                  onClick={this.handleFullReset}
                  className="py-2.5 px-4 rounded-xl bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Cache</span>
                </button>
              )}
            </div>

            {this.state.error && (
              <div className="border-t border-[var(--m-border)] pt-3">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="flex items-center justify-between w-full text-[11px] text-[var(--m-text-muted)] hover:text-[var(--m-text-muted)] py-1"
                >
                  <span>Diagnostic Information</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
                {this.state.showDetails && (
                  <pre className="mt-2 p-3 rounded-lg bg-[var(--m-surface-inset)] text-[10px] font-mono text-[var(--m-danger)] overflow-x-auto whitespace-pre-wrap max-h-36">
                    {this.state.error.toString()}
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
