// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Master Ask MAUSAM Meteorological Assistant Panel
// Canonical Orchestrator Integration with Zero-Discrepancy UI
// ====================================================================

import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, X, Send, Loader2 } from 'lucide-react';
import {
  AskMausamContext,
  AskMausamMessage,
  LanguageCode,
} from '../../types/askMausam';
import { AskMausamOrchestrator } from '../../services/askMausam/askMausamOrchestrator';
import { routeIntent, getIntentLoadingMessage } from '../../services/askMausam/intentRouter';
import { INDIA_STATES_UTS } from '../../data/indiaRegions';
import { QuickActions } from './QuickActions';
import { MessageBubble } from './MessageBubble';

interface AskMausamPanelProps {
  currentLocation?: {
    name: string;
    city?: string;
    state?: string;
    district?: string;
    lat: number;
    lng: number;
  };
  onClose?: () => void;
  onSelectLocation?: (locationName: string) => void;
}

const isValidNum = (v: unknown): v is number =>
  typeof v === 'number' && !Number.isNaN(v) && Number.isFinite(v);

export const AskMausamPanel: React.FC<AskMausamPanelProps> = ({
  currentLocation,
  onClose,
  onSelectLocation,
}) => {
  const [messages, setMessages] = useState<AskMausamMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Checking atmospheric observations…');
  const [preferredLanguage, setPreferredLanguage] = useState<LanguageCode>('English');
  const [activeTab, setActiveTab] = useState<'CHAT' | 'REGIONS' | 'ABOUT'>('CHAT');

  // Authoritative Canonical Context (drives Header, Context Strip, and Answer Cards)
  const [canonicalContext, setCanonicalContext] = useState<AskMausamContext | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const activeAbortController = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Initialize canonical context and initial briefing on mount
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const initialLocQuery = currentLocation?.name
          ? `Current weather in ${currentLocation.name}`
          : 'Current weather in Bhubaneswar, Odisha';

        const result = await AskMausamOrchestrator.execute({
          query: initialLocQuery,
          selectedAppLocation: currentLocation,
          preferredLanguage,
        });

        if (isMounted) {
          setCanonicalContext(result.context);
        }
      } catch (err) {
        console.error('Failed to pre-fetch Ask MAUSAM context:', err);
      }

      if (isMounted) {
        const welcomeMsg: AskMausamMessage = {
          id: `msg-welcome`,
          sender: 'assistant',
          text: `### Welcome to Ask MAUSAM

I am your **National Meteorological Assistant**, providing verified atmospheric, marine, and disaster intelligence directly from official providers including the **India Meteorological Department (IMD)**, **SACHET / NDMA**, **Central Pollution Control Board (CPCB)**, and **INCOIS**.

**You can ask me about:**
- **What is MAUSAM?** (*platform architecture & verified datasets*)
- **Active Weather Warnings** (*e.g., "any rainfall warnings in Odisha?", "active alerts"*)
- **Current Temperature & Sky** (*e.g., "what is the weather in Odisha?", "temperature in Delhi"*)
- **Forecasts** (*e.g., "will it rain tomorrow?", "7-day forecast for Odisha"*)
- **Air Quality (AQI)** (*e.g., "what is AQI?", "AQI in Bhubaneswar"*)
- **Doppler Radar** (*e.g., "show radar for Odisha", "how does radar work?"*)`,
          timestamp: Date.now(),
          structured: {
            answer: '',
            location: currentLocation?.name || 'India',
            intent: 'GREETING',
            responseType: 'knowledge',
            sourceStatus: 'LIVE',
            facts: [
              { label: 'Coverage', value: 'All 28 States & 8 Union Territories' },
              { label: 'Alerts', value: 'Live SACHET / NDMA Bulletins' },
              { label: 'Telemetry', value: 'IMD Station Grounding' },
            ],
            suggestedFollowUps: [
              'What is MAUSAM?',
              `Show current weather for ${currentLocation?.name || 'Odisha'}`,
              `Any rainfall warnings in ${currentLocation?.state || 'Odisha'}?`,
              'What is AQI?',
            ],
            debug: {
              query: 'WELCOME_INIT',
              intent: 'GREETING',
              location: `${currentLocation?.name || 'India'} (context only)`,
              locationIsContextOnly: true,
              providers: [],
              fastPath: 'LOCAL_KNOWLEDGE',
              latencyMs: 0,
            },
          },
        };

        setMessages([welcomeMsg]);
      }
    }

    init();

    return () => {
      isMounted = false;
      if (activeAbortController.current) {
        activeAbortController.current.abort();
      }
    };
  }, [currentLocation]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || isLoading) return;

    if (activeAbortController.current) {
      activeAbortController.current.abort();
    }
    const controller = new AbortController();
    activeAbortController.current = controller;

    setInputText('');

    const userMsg: AskMausamMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);

    const routing = routeIntent(textToSend);
    const isInstantKnowledge =
      routing.isGeneralKnowledge ||
      routing.intent === 'GENERAL_KNOWLEDGE' ||
      routing.intent === 'ABOUT_MAUSAM' ||
      routing.intent === 'HELP' ||
      routing.intent === 'GREETING' ||
      routing.requiredTools.length === 0;

    if (!isInstantKnowledge) {
      setLoadingMessage(getIntentLoadingMessage(routing.intent));
      setIsLoading(true);
    }

    try {
      const result = await AskMausamOrchestrator.execute({
        query: textToSend,
        selectedAppLocation: currentLocation,
        preferredLanguage,
        signal: controller.signal,
      });

      setCanonicalContext(result.context);

      const assistantMsg: AskMausamMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: result.response.answer,
        timestamp: Date.now(),
        structured: result.response,
        contextSnapshot: result.context,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;

      const errorMsg: AskMausamMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'Atmospheric telemetry stream temporarily interrupted. Station observations are being refreshed.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    if (canonicalContext) {
      handleSendMessage(`What is the current weather update for ${canonicalContext.location.name}?`);
    }
  };

  const curWeather = canonicalContext?.currentWeather;
  const loc = canonicalContext?.location;
  const activeWarnings = canonicalContext?.warnings || [];
  const topWarning = activeWarnings[0];
  const aqiVal = canonicalContext?.aqi?.index;
  const aqiCat = canonicalContext?.aqi?.category;

  const hasTemp = isValidNum(curWeather?.temperatureC);
  const hasHumidity = isValidNum(curWeather?.humidity);
  const hasWind = isValidNum(curWeather?.windSpeedKmh);
  const hasAqi = isValidNum(aqiVal);

  return (
    <div className="flex flex-col h-full bg-[var(--m-surface-inset)] text-[var(--m-text-secondary)] font-sans">
      {/* 1. MASTER METEOROLOGICAL HEADER */}
      <div className="p-3.5 sm:p-4 bg-[var(--m-surface-1)] border-b border-[var(--m-border)] flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex items-center justify-center text-[var(--m-accent)] font-bold font-mono text-sm shrink-0">
              M
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="ask-mausam-title"
                  className="text-sm sm:text-base font-bold text-[var(--m-text-primary)] tracking-tight"
                >
                  Ask MAUSAM
                </h2>
                {loc?.name && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[var(--m-surface-inset)] text-[var(--m-accent)] border border-[var(--m-border)] truncate max-w-[180px]">
                    {loc.name}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[var(--m-text-muted)] block truncate">
                India Meteorological &amp; Atmospheric Intelligence
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value as LanguageCode)}
              aria-label="Select Assistant Language"
              className="min-h-[44px] sm:min-h-[40px] bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-xs font-mono text-[var(--m-text-primary)] rounded-lg px-2.5 outline-none cursor-pointer focus:border-[var(--m-accent)]"
            >
              <option value="English">EN</option>
              <option value="Hindi">HI</option>
              <option value="Odia">OD</option>
              <option value="Bengali">BN</option>
              <option value="Tamil">TA</option>
              <option value="Telugu">TE</option>
              <option value="Marathi">MR</option>
            </select>

            <button
              type="button"
              onClick={handleClearChat}
              title="Reset conversation"
              aria-label="Reset conversation"
              className="min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-lg bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] border border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] transition-colors cursor-pointer m-focus-ring"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="Close panel"
                aria-label="Close panel"
                className="min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-lg bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] border border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] transition-colors cursor-pointer m-focus-ring"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 2. CANONICAL CONTEXT STRIP */}
        {canonicalContext && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-2.5 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-[11px] tabular-nums">
            <div className="flex flex-col px-1 min-w-0">
              <span className="text-[10px] text-[var(--m-text-muted)] uppercase font-mono">Temp</span>
              <span className="font-bold text-[var(--m-text-primary)] font-mono text-xs truncate">
                {hasTemp ? `${curWeather!.temperatureC}°C` : '—'}
              </span>
            </div>

            <div className="flex flex-col px-1 min-w-0">
              <span className="text-[10px] text-[var(--m-text-muted)] uppercase font-mono">Sky</span>
              <span className="font-medium text-[var(--m-accent)] truncate text-xs">
                {curWeather?.condition || '—'}
              </span>
            </div>

            <div className="flex flex-col px-1 min-w-0">
              <span className="text-[10px] text-[var(--m-text-muted)] uppercase font-mono">Humidity</span>
              <span className="font-medium font-mono text-[var(--m-text-primary)] text-xs truncate">
                {hasHumidity ? `${curWeather!.humidity}%` : '—'}
              </span>
            </div>

            <div className="flex flex-col px-1 min-w-0">
              <span className="text-[10px] text-[var(--m-text-muted)] uppercase font-mono">Wind</span>
              <span className="font-medium font-mono text-[var(--m-text-primary)] truncate text-xs">
                {hasWind ? `${curWeather!.windSpeedKmh} km/h` : '—'}
              </span>
            </div>

            <div className="flex flex-col px-1 min-w-0">
              <span className="text-[10px] text-[var(--m-text-muted)] uppercase font-mono">AQI</span>
              <span
                className="font-medium font-mono text-xs truncate"
                style={{
                  color: hasAqi
                    ? aqiVal! > 200
                      ? '#FCA5A5'
                      : aqiVal! > 100
                      ? '#FCD34D'
                      : '#6EE7B7'
                    : '#898B83',
                }}
              >
                {hasAqi ? `${aqiVal} (${aqiCat || 'AQI'})` : '—'}
              </span>
            </div>

            <div className="flex flex-col px-1 min-w-0">
              <span className="text-[10px] text-[var(--m-text-muted)] uppercase font-mono">Warning</span>
              {topWarning ? (
                <span className="font-bold text-[10px] font-mono uppercase text-[var(--m-danger)] truncate">
                  {topWarning.severity} Alert
                </span>
              ) : (
                <span className="font-medium text-[10px] font-mono text-[var(--m-ok)] truncate">
                  No Alert
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. NAVIGATION TABS */}
      <div className="flex items-center border-b border-[var(--m-border)] bg-[var(--m-surface-inset)] px-3 sm:px-4 text-xs font-mono font-medium overflow-x-auto scrollbar-none">
        {(
          [
            { id: 'CHAT', label: 'Assistant Chat' },
            { id: 'REGIONS', label: 'All 36 States & UTs' },
            { id: 'ABOUT', label: 'Grounding Truth' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-[44px] sm:min-h-[40px] py-2 px-3 border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === tab.id
                ? 'border-[var(--m-accent)] text-[var(--m-accent)] font-bold'
                : 'border-transparent text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. BODY CONTENT */}
      {activeTab === 'CHAT' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
            <QuickActions
              onSelectPrompt={(p) => handleSendMessage(p)}
              currentLocationName={loc?.name}
            />

            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onSelectPrompt={(p) => handleSendMessage(p)}
                onSelectLocation={onSelectLocation}
              />
            ))}

            {isLoading && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] text-xs text-[var(--m-text-secondary)]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Loader2 className="w-4 h-4 text-[var(--m-accent)] animate-spin shrink-0" />
                  <span className="text-[var(--m-accent)] font-medium truncate">{loadingMessage}</span>
                </div>
                <span className="text-[10px] text-[var(--m-text-muted)] font-mono uppercase shrink-0 ml-2">
                  Querying Providers
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input field */}
          <div className="p-3 sm:p-4 bg-[var(--m-surface-1)] border-t border-[var(--m-border)] flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about weather, rainfall, warnings, AQI, agriculture..."
                disabled={isLoading}
                className="flex-1 min-h-[44px] sm:min-h-[40px] px-3.5 py-2 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-sm text-[var(--m-text-primary)] placeholder-[var(--m-text-muted)] focus:outline-none focus:border-[var(--m-accent)] transition-colors"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoading}
                className="min-h-[44px] sm:min-h-[40px] px-4 py-2 rounded-lg bg-[var(--m-accent)] hover:bg-[var(--m-accent-hover)] disabled:opacity-40 text-[var(--m-on-accent)] hover:text-[var(--m-on-accent)] text-xs font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer m-focus-ring shrink-0"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[var(--m-text-muted)] px-0.5 font-mono">
              <span>Grounding: IMD, SACHET, CPCB &amp; Open-Meteo Telemetry</span>
              <span>Zero-Discrepancy Enforcement</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'REGIONS' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--m-text-primary)] mb-1">
              All 36 Indian States &amp; Union Territories
            </h3>
            <p className="text-xs text-[var(--m-text-muted)]">
              Select any state or union territory to query live meteorological observations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {INDIA_STATES_UTS.map((reg) => (
              <button
                key={reg.id}
                type="button"
                onClick={() => {
                  setActiveTab('CHAT');
                  handleSendMessage(`What is the current weather in ${reg.name}?`);
                }}
                className="min-h-[44px] p-2.5 rounded-lg bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-2)] border border-[var(--m-border)] hover:border-[var(--m-accent)]/45 transition-colors text-left flex items-center justify-between cursor-pointer m-focus-ring"
              >
                <div>
                  <span className="font-semibold text-[var(--m-text-primary)] text-xs block">{reg.name}</span>
                  <span className="text-[10px] text-[var(--m-text-muted)]">
                    {reg.capital} · {reg.type === 'STATE' ? 'State' : 'Union Territory'}
                  </span>
                </div>
                <span className="text-[11px] text-[var(--m-accent)] font-mono tabular-nums">
                  {reg.code}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'ABOUT' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs text-[var(--m-text-secondary)] leading-relaxed">
          <div className="m-panel p-4 space-y-1.5">
            <h4 className="font-bold text-[var(--m-text-primary)] text-sm">
              Truthful Meteorological Grounding
            </h4>
            <p>
              Ask MAUSAM operates as a tool-grounded meteorological system. Answers are synthesized from active station feeds, SACHET CAP bulletins, and calibrated atmospheric model data.
            </p>
          </div>

          <div className="m-panel p-4 space-y-1.5">
            <h4 className="font-bold text-[var(--m-text-primary)] text-sm">Official IMD Data Connector</h4>
            <p>
              Direct IMD API access uses registered server credentials when provisioned. When direct IMD access is unconfigured, the system discloses the active provider and serves calibrated Open-Meteo telemetry.
            </p>
          </div>

          <div className="m-panel p-4 space-y-1.5">
            <h4 className="font-bold text-[var(--m-text-primary)] text-sm">Zero Data Discrepancy Protocol</h4>
            <p>
              The header, context strip, answer cards, and message bubbles share a single synchronized canonical context so readings remain consistent across the assistant session.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
