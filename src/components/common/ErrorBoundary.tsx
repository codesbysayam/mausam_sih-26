import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { safeStorageRemove, safeStorageRemoveByPrefix } from '../../utils/safeStorage';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
  componentStack: string | null;
}

function isModuleLoadError(error: Error | null): boolean {
  const message = error?.message?.toLowerCase() || '';
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('chunkloaderror') ||
    message.includes('loading chunk')
  );
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    showDetails: false,
    componentStack: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, showDetails: false, componentStack: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Never access browser storage directly from an error lifecycle.
    // A blocked storage API must not cause the recovery UI to fail too.
    console.error('[MAUSAM ErrorBoundary] Caught component error:', error, errorInfo);
    this.setState({ componentStack: errorInfo.componentStack || null });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      showDetails: false,
      componentStack: null,
    });
    this.props.onReset?.();
  };

  private handleTemporaryCacheReset = () => {
    // Clear only disposable app cache entries. Preserve saved locations,
    // language, theme, user preferences and unrelated site storage.
    safeStorageRemove('local', 'mausam_weather_cache_v1');
    safeStorageRemoveByPrefix('session', 'provider:');
    safeStorageRemove('session', 'mausam_retry_lazy_reload_until');
    window.location.reload();
  };

  public render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallbackTitle) {
      return (
        <section
          role="alert"
          aria-live="assertive"
          className="w-full min-w-0 p-4 rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border-strong)] my-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-[var(--m-watch)] min-w-0">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[var(--m-text-primary)]">
                  {this.props.fallbackTitle} temporarily unavailable
                </h2>
                <p className="text-xs text-[var(--m-text-muted)] mt-1">
                  This section failed independently. Other MAUSAM navigation and data remain available.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="min-h-[40px] px-3 py-2 rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] text-xs font-semibold text-[var(--m-accent)] inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry section
            </button>
          </div>
          {this.state.error && (
            <details className="mt-3 border-t border-[var(--m-border)] pt-2">
              <summary className="cursor-pointer text-[11px] text-[var(--m-text-muted)]">
                Diagnostic information
              </summary>
              <pre className="mt-2 text-[10px] whitespace-pre-wrap break-words overflow-auto max-h-32 text-[var(--m-danger)]">
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </section>
      );
    }

    const moduleError = isModuleLoadError(this.state.error);
    return (
      <main
        role="alert"
        aria-live="assertive"
        className="min-h-[100svh] min-h-[100dvh] w-full bg-[#0B0C0D] text-[#F0EEE7] flex items-center justify-center p-4"
      >
        <section className="w-full max-w-xl bg-[#191C1D] border border-[#343A38] rounded-2xl p-5 sm:p-8 shadow-2xl flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.16em] text-[#C5A46D] font-semibold">MAUSAM recovery</p>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {moduleError ? 'Application update required' : 'A section could not be rendered'}
              </h1>
              <p className="text-xs text-[#A7ADA8] mt-1">
                {moduleError ? 'A page asset could not be loaded.' : 'The application caught an unexpected rendering error.'}
              </p>
            </div>
          </div>

          <p className="text-sm text-[#C2C8C3] leading-relaxed">
            MAUSAM has isolated the failure. Your saved locations and preferences will not be cleared.
            You can retry the interface or reload the current page.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex-1 min-h-[44px] px-4 py-3 rounded-xl bg-[#C5A46D] hover:bg-[#D6B77F] text-[#111513] text-sm font-bold inline-flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[44px] px-4 py-3 rounded-xl bg-[#252B29] hover:bg-[#303734] text-[#E5E7E3] text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reload page
            </button>
          </div>

          <details className="border-t border-[#343A38] pt-3">
            <summary className="cursor-pointer text-xs text-[#A7ADA8] flex items-center justify-between">
              Diagnostic information
              {this.state.showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </summary>
            <pre className="mt-3 p-3 rounded-lg bg-[#101312] text-[10px] leading-relaxed font-mono text-[#FCA5A5] overflow-auto whitespace-pre-wrap break-words max-h-56">
              {this.state.error?.toString()}
              {this.state.error?.stack ? `\n\n${this.state.error.stack}` : ''}
              {this.state.componentStack ? `\n\nReact component stack:${this.state.componentStack}` : ''}
            </pre>
          </details>

          <button
            type="button"
            onClick={this.handleTemporaryCacheReset}
            className="self-start text-xs text-[#A7ADA8] hover:text-[#E5E7E3] underline underline-offset-4"
          >
            Clear temporary MAUSAM cache only
          </button>
        </section>
      </main>
    );
  }
}
