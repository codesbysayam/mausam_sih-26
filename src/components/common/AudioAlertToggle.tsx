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
              ? 'bg-[#F59E0B]/10 border-[#F59E0B]/40 text-[#FCD34D]'
              : isAudioAlertEnabled
              ? 'bg-[#EF4444]/12 border-[#EF4444]/45 text-[#FCA5A5]'
              : 'bg-[#08131F] border-[#26394B] text-[#B5C3D1] hover:text-[#F3F6FA] hover:border-[#38536A]'
          }`}
        >
          {isAudioAlertEnabled ? (
            <BellRing className="w-3.5 h-3.5 text-[#FCA5A5] shrink-0" />
          ) : (
            <BellOff className="w-3.5 h-3.5 text-[#8295A8] shrink-0" />
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
            className="px-2.5 py-1.5 min-h-[36px] sm:min-h-[32px] rounded-lg bg-[#101F2E] hover:bg-[#172A3B] text-[#35C7E8] border border-[#38536A] text-[11px] font-mono font-semibold inline-flex items-center gap-1 cursor-pointer m-focus-ring"
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
              ? 'bg-[#F59E0B]/10 border-[#F59E0B]/40 text-[#FCD34D]'
              : isAudioAlertEnabled
              ? 'bg-[#EF4444]/12 border-[#EF4444]/50 text-[#F3F6FA] hover:bg-[#EF4444]/20'
              : 'bg-[#08131F] border-[#26394B] text-[#B5C3D1] hover:text-[#F3F6FA] hover:border-[#38536A]'
          }`}
        >
          <div className="flex items-center justify-center shrink-0">
            {status === 'unavailable' ? (
              <AlertTriangle className="w-4 h-4 text-[#FCD34D]" />
            ) : isAudioAlertEnabled ? (
              <BellRing className="w-4 h-4 text-[#FCA5A5]" />
            ) : (
              <BellOff className="w-4 h-4 text-[#8295A8]" />
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
                    ? 'bg-[#22C7A0]/15 text-[#6EE7B7]'
                    : 'bg-[#101F2E] text-[#8295A8]'
                }`}
              >
                {statusLabel}
              </span>
            </div>
            <span className="text-[10px] text-[#8295A8] mt-0.5">
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
              ? 'bg-[#EF4444]/20 border-[#EF4444]/50 text-[#FCA5A5]'
              : 'bg-[#08131F] border-[#26394B] hover:bg-[#101F2E] hover:border-[#38536A] text-[#35C7E8]'
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
              ? 'bg-[#0B72B9] border-[#35C7E8] text-white'
              : 'bg-[#08131F] border-[#26394B] hover:bg-[#101F2E] text-[#8295A8] hover:text-[#F3F6FA]'
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
              ? 'bg-[#EF4444]/15 border-[#EF4444]/50 text-[#F3F6FA]'
              : 'bg-[#F59E0B]/12 border-[#F59E0B]/40 text-[#FCD34D]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold uppercase tracking-wider block text-[11px]">
                New Official Warning
              </span>
              <span className="text-[#F3F6FA] font-medium truncate block">
                {activeWarningBanner.severity.toUpperCase()} ALERT — {activeWarningBanner.hazard}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-[#08131F] px-2 py-0.5 rounded text-[#B5C3D1] border border-[#26394B] shrink-0">
            {isAudioAlertEnabled ? 'Audio played' : 'Muted'}
          </span>
        </div>
      )}

      {isSettingsOpen && (
        <div
          id="audio-alert-settings-popover"
          className="absolute top-full right-0 mt-2 w-72 sm:w-80 m-panel-elevated p-4 z-50 flex flex-col gap-3.5 text-[#F3F6FA] shadow-2xl"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#26394B]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#F3F6FA]">
              <ShieldAlert className="w-4 h-4 text-[#35C7E8]" />
              <span>Alert Audio Configuration</span>
            </div>
            <span className="text-[10px] font-mono text-[#6EE7B7] bg-[#22C7A0]/12 border border-[#22C7A0]/30 px-1.5 py-0.5 rounded">
              WebAudio
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#B5C3D1] flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-[#35C7E8]" />
                Alert Volume
              </span>
              <span className="font-mono font-bold text-[#F3F6FA] tabular-nums">{volumePercent}%</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="1.0"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              aria-label="Alert audio volume"
              className="w-full accent-[#35C7E8] bg-[#08131F] h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#8295A8] font-mono">
              <span>10% (Soft)</span>
              <span>70% (Standard)</span>
              <span>100% (Max)</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 pt-2 border-t border-[#26394B]">
            <span className="text-xs text-[#B5C3D1]">Audio Trigger Threshold</span>
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
                          : 'bg-[#EAB308] text-[#07111D] border-[#FDE047]'
                        : 'bg-[#08131F] text-[#B5C3D1] border-[#26394B] hover:bg-[#101F2E]'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-[#8295A8] mt-0.5 leading-normal">
              {minSeverity === 'red'
                ? 'Only urgent Red Alerts (Cyclone, Extreme Rain) chime.'
                : minSeverity === 'orange'
                ? 'Orange and Red warnings trigger audible tone.'
                : 'Yellow, Orange, and Red warnings trigger audio.'}
            </p>
          </div>

          <div className="pt-2 border-t border-[#26394B] flex items-center justify-between text-[10px] text-[#8295A8] font-mono">
            <span>Tone: 853Hz + 960Hz</span>
            <button
              type="button"
              onClick={handleTestAudio}
              className="text-[#35C7E8] hover:underline cursor-pointer"
            >
              Test tone
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
