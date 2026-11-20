// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Official Meteorological Warning Alert Audio Control
// Professional operational console with real AudioService bindings
// ====================================================================

import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  BellRing,
  BellOff,
  AlertTriangle,
  Play,
  Square,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { useAlertAudio } from '../../hooks/useAlertAudio';
import { AlertSeverityThreshold } from '../../services/alertAudioService';

interface AudioAlertToggleProps {
  variant?: 'header' | 'compact' | 'ticker' | 'pill';
  showLabel?: boolean;
  className?: string;
}

export const AudioAlertToggle: React.FC<AudioAlertToggleProps> = ({
  variant = 'header',
  showLabel = true,
  className = '',
}) => {
  const {
    isAudioAlertEnabled,
    isPlaying,
    status,
    volume,
    minSeverity,
    activeWarningBanner,
    toggleAudioAlert,
    setVolume,
    setMinSeverity,
    playTestSound,
    stopSound,
  } = useAlertAudio();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [testButtonState, setTestButtonState] = useState<'idle' | 'playing' | 'error'>('idle');
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPlaying) {
      setTestButtonState('playing');
    } else {
      setTestButtonState('idle');
    }
  }, [isPlaying]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleAudioAlert();
  };

  const handleTestAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      stopSound();
      setTestButtonState('idle');
    } else {
      setTestButtonState('playing');
      const success = await playTestSound();
      if (!success) {
        setTestButtonState('error');
        setTimeout(() => setTestButtonState('idle'), 2500);
      }
    }
  };

  const volumePercent = Math.round(volume * 100);

  const statusLabel =
    status === 'unavailable'
      ? 'Unavailable'
      : status === 'playing'
      ? 'Playing'
      : isAudioAlertEnabled
      ? 'Ready'
      : 'Muted';

  if (variant === 'ticker' || variant === 'compact' || variant === 'pill') {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <button
          type="button"
          role="switch"
          aria-checked={isAudioAlertEnabled}
          onClick={handleToggle}
          title={`Severe Audio Alert: ${isAudioAlertEnabled ? 'ON' : 'OFF'} (${statusLabel})`}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] sm:min-h-[32px] rounded-lg border text-xs font-semibold transition-colors cursor-pointer m-focus-ring ${
            status === 'unavailable'
              ? 'bg-[var(--m-watch-soft)] border-[var(--m-watch)]/40 text-[var(--m-watch)]'
              : isAudioAlertEnabled
              ? 'bg-[var(--m-danger-soft)] border-[var(--m-danger)]/45 text-[var(--m-danger)]'
              : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)]'
          }`}
        >
          {isAudioAlertEnabled ? (
            <BellRing className="w-3.5 h-3.5 text-[var(--m-danger)] shrink-0" />
          ) : (
            <BellOff className="w-3.5 h-3.5 text-[var(--m-text-muted)] shrink-0" />
          )}
          {showLabel && (
            <span className="font-mono text-[11px] tabular-nums">
              {status === 'unavailable'
                ? 'Audio: Unavailable'
                : isAudioAlertEnabled
                ? 'Audio: ON'
                : 'Audio: OFF'}
            </span>
          )}
        </button>

        {isAudioAlertEnabled && (
          <button
            type="button"
            onClick={handleTestAudio}
            className="px-2.5 py-1.5 min-h-[36px] sm:min-h-[32px] rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] text-[var(--m-accent)] border border-[var(--m-border-strong)] text-[11px] font-mono font-semibold inline-flex items-center gap-1 cursor-pointer m-focus-ring"
          >
            {isPlaying ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{isPlaying ? 'Stop' : 'Test'}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col gap-2 ${className}`} ref={settingsRef}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          id="audio-alert-toggle-header"
          type="button"
          role="switch"
          aria-checked={isAudioAlertEnabled}
          onClick={handleToggle}
          title={
            status === 'unavailable'
              ? 'Audio alert unavailable in this browser environment'
              : isAudioAlertEnabled
              ? 'Audio Alert: ON (Click to mute)'
              : 'Audio Alert: OFF (Click to activate real emergency alert audio)'
          }
          className={`flex items-center gap-2.5 px-3 py-2 min-h-[42px] rounded-lg border text-xs font-semibold transition-colors cursor-pointer select-none m-focus-ring ${
            status === 'unavailable'
              ? 'bg-[var(--m-watch-soft)] border-[var(--m-watch)]/40 text-[var(--m-watch)]'
              : isAudioAlertEnabled
              ? 'bg-[var(--m-danger-soft)] border-[var(--m-danger)]/50 text-[var(--m-text-primary)] hover:bg-[var(--m-danger-soft)]'
              : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)]'
          }`}
        >
          <div className="flex items-center justify-center shrink-0">
            {status === 'unavailable' ? (
              <AlertTriangle className="w-4 h-4 text-[var(--m-watch)]" />
            ) : isAudioAlertEnabled ? (
              <BellRing className="w-4 h-4 text-[var(--m-danger)]" />
            ) : (
              <BellOff className="w-4 h-4 text-[var(--m-text-muted)]" />
            )}
          </div>

          <div className="flex flex-col items-start text-left leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold tracking-wide uppercase">
                {status === 'unavailable'
                  ? 'Audio: Unavailable'
                  : isAudioAlertEnabled
                  ? 'Audio Alert: ON'
                  : 'Audio Alert: OFF'}
              </span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                  status === 'playing'
                    ? 'bg-[#EF4444] text-white'
                    : isAudioAlertEnabled
                    ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)]'
                    : 'bg-[var(--m-surface-2)] text-[var(--m-text-muted)]'
                }`}
              >
                {statusLabel}
              </span>
            </div>
            <span className="text-[10px] text-[var(--m-text-muted)] mt-0.5">
              {status === 'unavailable'
                ? 'Device audio not initialized'
                : isAudioAlertEnabled
                ? 'Severe alert tone active'
                : 'Muted • Click to arm audio'}
            </span>
          </div>
        </button>

        <button
          id="btn-test-alert-audio"
          type="button"
          onClick={handleTestAudio}
          disabled={status === 'unavailable'}
          title="Test Alert Audio (Invokes the real production alert audio pipeline)"
          className={`flex items-center gap-1.5 px-3 py-2 min-h-[42px] rounded-lg border text-xs font-semibold transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed m-focus-ring ${
            testButtonState === 'playing'
              ? 'bg-[#EF4444] border-[#FCA5A5] text-white'
              : testButtonState === 'error'
              ? 'bg-[var(--m-danger-soft)] border-[var(--m-danger)]/50 text-[var(--m-danger)]'
              : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] hover:bg-[var(--m-surface-2)] hover:border-[var(--m-border-strong)] text-[var(--m-accent)]'
          }`}
        >
          {testButtonState === 'playing' ? (
            <>
              <Square className="w-3.5 h-3.5 fill-white" />
              <span className="font-mono text-[11px] font-bold">Stop</span>
            </>
          ) : testButtonState === 'error' ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="font-mono text-[11px]">Blocked</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="font-mono text-[11px] tabular-nums">Test · {volumePercent}%</span>
            </>
          )}
        </button>

        <button
          id="btn-audio-alert-settings"
          type="button"
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          title="Configure Alert Threshold and Volume"
          aria-expanded={isSettingsOpen}
          aria-label="Alert audio settings"
          className={`w-[42px] h-[42px] rounded-lg border flex items-center justify-center transition-colors cursor-pointer m-focus-ring ${
            isSettingsOpen
              ? 'bg-[var(--m-accent)] border-[var(--m-accent)] text-[var(--m-on-accent)]'
              : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] hover:bg-[var(--m-surface-2)] text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
          }`}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {activeWarningBanner && (
        <div
          id="official-live-audio-alert-toast"
          className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border text-xs font-semibold ${
            activeWarningBanner.severity === 'red'
              ? 'bg-[var(--m-danger-soft)] border-[var(--m-danger)]/50 text-[var(--m-text-primary)]'
              : 'bg-[var(--m-watch-soft)] border-[var(--m-watch)]/40 text-[var(--m-watch)]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold uppercase tracking-wider block text-[11px]">
                New Official Warning
              </span>
              <span className="text-[var(--m-text-primary)] font-medium truncate block">
                {activeWarningBanner.severity.toUpperCase()} ALERT — {activeWarningBanner.hazard}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-[var(--m-surface-inset)] px-2 py-0.5 rounded text-[var(--m-text-secondary)] border border-[var(--m-border)] shrink-0">
            {isAudioAlertEnabled ? 'Audio played' : 'Muted'}
          </span>
        </div>
      )}

      {isSettingsOpen && (
        <div
          id="audio-alert-settings-popover"
          className="absolute top-full right-0 mt-2 w-72 sm:w-80 m-panel-elevated p-4 z-50 flex flex-col gap-3.5 text-[var(--m-text-primary)] shadow-2xl"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[var(--m-border)]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--m-text-primary)]">
              <ShieldAlert className="w-4 h-4 text-[var(--m-accent)]" />
              <span>Alert Audio Configuration</span>
            </div>
            <span className="text-[10px] font-mono text-[var(--m-ok)] bg-[var(--m-ok-soft)] border border-[var(--m-ok)]/30 px-1.5 py-0.5 rounded">
              WebAudio
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--m-text-secondary)] flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-[var(--m-accent)]" />
                Alert Volume
              </span>
              <span className="font-mono font-bold text-[var(--m-text-primary)] tabular-nums">{volumePercent}%</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="1.0"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              aria-label="Alert audio volume"
              className="w-full accent-[var(--m-accent)] bg-[var(--m-surface-inset)] h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[var(--m-text-muted)] font-mono">
              <span>10% (Soft)</span>
              <span>70% (Standard)</span>
              <span>100% (Max)</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--m-border)]">
            <span className="text-xs text-[var(--m-text-secondary)]">Audio Trigger Threshold</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['yellow', 'orange', 'red'] as AlertSeverityThreshold[]).map((level) => {
                const isSelected = minSeverity === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setMinSeverity(level)}
                    className={`px-2 py-2 min-h-[36px] rounded-lg text-[11px] font-bold uppercase transition-colors cursor-pointer border ${
                      isSelected
                        ? level === 'red'
                          ? 'bg-[#EF4444] text-white border-[#FCA5A5]'
                          : level === 'orange'
                          ? 'bg-[#F97316] text-white border-[#FDBA74]'
                          : 'bg-[#EAB308] text-[var(--m-on-accent)] border-[#FDE047]'
                        : 'bg-[var(--m-surface-inset)] text-[var(--m-text-secondary)] border-[var(--m-border)] hover:bg-[var(--m-surface-2)]'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-[var(--m-text-muted)] mt-0.5 leading-normal">
              {minSeverity === 'red'
                ? 'Only urgent Red Alerts (Cyclone, Extreme Rain) chime.'
                : minSeverity === 'orange'
                ? 'Orange and Red warnings trigger audible tone.'
                : 'Yellow, Orange, and Red warnings trigger audio.'}
            </p>
          </div>

          <div className="pt-2 border-t border-[var(--m-border)] flex items-center justify-between text-[10px] text-[var(--m-text-muted)] font-mono">
            <span>Tone: 853Hz + 960Hz</span>
            <button
              type="button"
              onClick={handleTestAudio}
              className="text-[var(--m-accent)] hover:underline cursor-pointer"
            >
              Test tone
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
