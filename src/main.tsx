import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './i18n/LanguageContext';
import { LocationProvider } from './context/LocationContext';
import { ProviderStoreProvider } from './store/providerStore';
import { ExperienceMode, ExperienceProvider } from './context/ExperienceContext';
import { MotionProvider } from './motion';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

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

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('[MAUSAM FATAL]: #root element not found in DOM!');
} else {
  try {
    const initialMode = resolveInitialExperienceMode();
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ErrorBoundary scope="root">
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
        </ErrorBoundary>
      </StrictMode>
    );
  } catch (err) {
    console.error('[MAUSAM FATAL]: Exception during createRoot / render initialization:', err);
  }
}
