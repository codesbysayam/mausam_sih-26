import React, { useState, useEffect, useMemo } from 'react';
import {
  Volume2,
  PhoneCall,
  Play,
  Square,
  Info,
  Loader2,
  FileText,
  ChevronDown,
  ChevronUp,
  Radio,
} from 'lucide-react';
import { WeatherSystemEvent } from '../../types/cyclone';
import {
  warningReadoutService,
  ReadoutLanguage,
  WarningReadoutStatus,
  ChunkProgressInfo,
  ReadoutEngineMeta,
} from '../../services/WarningReadoutService';
import {
  DataPanel,
  SectionHeading,
  SourceStatus,
} from '../ui/ObservatoryPrimitives';

interface CycloneGuidancePanelProps {
  activeSystem: WeatherSystemEvent | null;
  marineBulletinText?: string;
}

const HELPLINES = [
  { label: 'National Disaster (NDRF)', number: '1078' },
  { label: 'Indian Coast Guard', number: '1554' },
  { label: 'State Emergency Ops (SEOC)', number: '1070' },
  { label: 'National Emergency Line', number: '112' },
];

export const CycloneGuidancePanel: React.FC<CycloneGuidancePanelProps> = ({
  activeSystem,
  marineBulletinText,
}) => {
  const [ttsStatus, setTtsStatus] = useState<WarningReadoutStatus>(
    warningReadoutService.getStatus()
  );
  const [chunkInfo, setChunkInfo] = useState<ChunkProgressInfo | null>(
    warningReadoutService.getCurrentChunkInfo()
  );
  const [engineMeta, setEngineMeta] = useState<ReadoutEngineMeta>(
    warningReadoutService.getEngineMeta()
  );
  const [selectedLanguage, setSelectedLanguage] = useState<ReadoutLanguage>('en');
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [selectedBrowserVoiceUri, setSelectedBrowserVoiceUri] = useState<string>('');

  const fallbackSubject = useMemo(
    () =>
      activeSystem || {
        id: 'synoptic-routine',
        classification: 'Synoptic Surveillance',
        name: 'North Indian Ocean Synoptic Watch',
        currentLocation: 'North Indian Ocean (Bay of Bengal & Arabian Sea)',
        affectedStates: ['Coastal India'],
        rainfallThreat: 'NO_WARNING',
        maxSustainedWind: 'Normal coastal winds (15-25 km/h)',
        source: 'IMD RSMC New Delhi & NDMA SACHET',
      },
    [activeSystem]
  );

  const previewTranscript = useMemo(
    () => warningReadoutService.getPreviewTranscript(fallbackSubject, selectedLanguage),
    [fallbackSubject, selectedLanguage]
  );

  const browserVoices = useMemo(
    () => warningReadoutService.getVoices(selectedLanguage),
    [selectedLanguage, ttsStatus]
  );

  useEffect(() => {
    const unsub = warningReadoutService.subscribe((newStatus, info, errorMsg, meta) => {
      setTtsStatus(newStatus);
      setChunkInfo(info || null);
      if (meta) setEngineMeta(meta);
      if (errorMsg) {
        setVoiceNote(errorMsg);
      } else if (newStatus === 'SPEAKING' || newStatus === 'IDLE') {
        setVoiceNote(null);
      }
    });

    return () => {
      unsub();
      warningReadoutService.stop();
    };
  }, []);

  useEffect(() => {
    const capability = warningReadoutService.getVoiceCapability(selectedLanguage);
    setVoiceNote(capability.warningNote);
    setSelectedBrowserVoiceUri('');
    warningReadoutService.setPreferredBrowserVoice(null);
  }, [selectedLanguage]);

  useEffect(() => {
    return () => {
      if (warningReadoutService.getStatus() !== 'IDLE') {
        warningReadoutService.stop();
      }
    };
  }, [activeSystem?.id, activeSystem?.updatedAt]);

  const isBusy = ttsStatus === 'SPEAKING' || ttsStatus === 'PREPARING';

  const handleToggleVoice = () => {
    if (isBusy) {
      warningReadoutService.stop();
      return;
    }
    warningReadoutService.play(fallbackSubject, selectedLanguage);
  };

  const engineLabel =
    engineMeta.engine === 'gemini-neural-tts'
      ? 'NEURAL BROADCAST'
      : engineMeta.engine === 'browser-fallback'
      ? 'BROWSER FALLBACK'
      : 'NEURAL TTS READY';

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. MAUSAM Broadcast Warning Readout */}
      <DataPanel className="flex flex-col justify-between gap-4">
        <div className="flex flex-col gap-3">
          <SectionHeading
            title="MAUSAM Warning Readout"
            subtitle="AIR / IMD broadcast-style neural audio bulletin (English & Hindi)"
            icon={<Volume2 className="w-4 h-4" />}
            badge={
              <SourceStatus
                status={
                  ttsStatus === 'SPEAKING'
                    ? 'LIVE'
                    : ttsStatus === 'PREPARING'
                    ? 'LOADING'
                    : ttsStatus === 'ERROR'
                    ? 'UNAVAILABLE'
                    : 'REFERENCE'
                }
                labelOverride={engineLabel}
              />
            }
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--m-text-muted)]">
            <span>BROADCAST LANGUAGE</span>
            <span className="text-[var(--m-accent)] font-semibold">
              {ttsStatus === 'SPEAKING'
                ? `On Air (${selectedLanguage === 'en' ? 'ENGLISH' : 'हिन्दी'})`
                : ttsStatus === 'PREPARING'
                ? 'Preparing Broadcast...'
                : 'Standby'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                if (isBusy) warningReadoutService.stop();
                setSelectedLanguage('en');
              }}
              className={`py-2 px-3 min-h-[40px] rounded-lg border text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 m-focus-ring ${
                selectedLanguage === 'en'
                  ? 'bg-[var(--m-accent)] border-[var(--m-accent)] text-[var(--m-on-accent)] font-semibold'
                  : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)]'
              }`}
            >
              <span>ENGLISH (IN)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isBusy) warningReadoutService.stop();
                setSelectedLanguage('hi');
              }}
              className={`py-2 px-3 min-h-[40px] rounded-lg border text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 m-focus-ring ${
                selectedLanguage === 'hi'
                  ? 'bg-[var(--m-accent)] border-[var(--m-accent)] text-[var(--m-on-accent)] font-semibold'
                  : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)]'
              }`}
            >
              <span>हिन्दी प्रसारण</span>
            </button>
          </div>

          {/* Active Voice / Fallback Voice Picker */}
          <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-[var(--m-text-muted)] bg-[var(--m-surface-inset)] px-2.5 py-1.5 rounded-lg border border-[var(--m-border)]">
            <span className="inline-flex items-center gap-1.5 truncate">
              <Radio className="w-3 h-3 text-[var(--m-accent)] shrink-0" />
              <span className="truncate">
                {engineMeta.voiceName ||
                  (selectedLanguage === 'hi'
                    ? 'Neural Hindi Broadcaster (Kore)'
                    : 'Neural Indian English Broadcaster (Charon)')}
              </span>
            </span>
          </div>

          {engineMeta.engine === 'browser-fallback' && browserVoices.length > 0 && (
            <select
              aria-label="Select Fallback Browser Voice"
              value={selectedBrowserVoiceUri}
              onChange={(e) => {
                setSelectedBrowserVoiceUri(e.target.value);
                warningReadoutService.setPreferredBrowserVoice(e.target.value || null);
              }}
              className="w-full min-h-[34px] px-2.5 py-1 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-[11px] font-mono text-[var(--m-text-secondary)] focus:outline-none focus:border-[var(--m-accent)]"
            >
              <option value="">Auto-Select Fallback Voice ({browserVoices.length})</option>
              {browserVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          )}

          {voiceNote && (
            <div className="flex items-start gap-2 text-[11px] text-[var(--m-watch)] bg-[var(--m-watch-soft)] px-3 py-2 rounded-lg border border-[var(--m-watch)]/30 font-mono">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{voiceNote}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`w-full py-2.5 px-4 min-h-[42px] rounded-lg flex items-center justify-center gap-2 font-mono text-xs font-semibold transition-colors cursor-pointer border m-focus-ring ${
              ttsStatus === 'SPEAKING'
                ? 'bg-[#C94F4B] hover:bg-[#B2423E] border-[#E07A76] text-[#F0EEE7]'
                : ttsStatus === 'PREPARING'
                ? 'bg-[#D98548] border-[#E59D69] text-[#0B0C0D]'
                : 'bg-[var(--m-accent)] hover:bg-[var(--m-accent-hover)] border-[var(--m-accent)]/60 text-[var(--m-on-accent)]'
            }`}
          >
            {ttsStatus === 'SPEAKING' ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>Stop Warning Readout</span>
              </>
            ) : ttsStatus === 'PREPARING' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Broadcast Audio...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Play Broadcast Bulletin</span>
              </>
            )}
          </button>

          {ttsStatus === 'SPEAKING' && chunkInfo && (
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--m-accent)] bg-[var(--m-surface-inset)] px-3 py-2 rounded-lg border border-[var(--m-border)] tabular-nums">
              <div className="flex items-center gap-1.5 truncate">
                <Volume2 className="w-3.5 h-3.5 shrink-0 text-[var(--m-accent)]" />
                <span className="truncate">
                  {chunkInfo.total > 1
                    ? `Section ${chunkInfo.current}/${chunkInfo.total} (${chunkInfo.label})`
                    : chunkInfo.label}
                </span>
              </div>
              <span className="text-[10px] text-[var(--m-text-secondary)] shrink-0 ml-1 font-semibold">
                {engineMeta.engine === 'gemini-neural-tts' ? 'HD WAV' : `${Math.round((chunkInfo.current / chunkInfo.total) * 100)}%`}
              </span>
            </div>
          )}

          {/* Exact Spoken Transcript Toggle */}
          <button
            type="button"
            onClick={() => setShowTranscript((prev) => !prev)}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] bg-[var(--m-surface-inset)] border border-[var(--m-border)] cursor-pointer transition-colors"
          >
            <span>{showTranscript ? 'Hide Broadcast Script' : 'Inspect Broadcast Script'}</span>
            {showTranscript ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showTranscript && (
            <div className="p-3 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-[11px] text-[var(--m-text-secondary)] leading-relaxed max-h-44 overflow-y-auto whitespace-pre-line font-sans">
              {previewTranscript}
            </div>
          )}
        </div>
      </DataPanel>

      {/* 2. Official Marine Advisory & Sea Area Bulletin */}
      <DataPanel className="flex flex-col justify-between gap-4">
        <div className="flex flex-col gap-3">
          <SectionHeading
            title="IMD Marine Bulletin"
            subtitle="Sea Area Bulletin · Bay of Bengal & Arabian Sea"
            icon={<FileText className="w-4 h-4" />}
            badge={<SourceStatus status="REFERENCE" labelOverride="RSMC VERIFIED" />}
          />
          <p className="text-xs sm:text-sm text-[var(--m-text-secondary)] leading-relaxed">
            {marineBulletinText ||
              'No active cyclone bulletin summary is loaded for this coastal sector. Refer to IMD RSMC New Delhi synoptic cycle bulletins.'}
          </p>
        </div>

        <div className="pt-3 border-t border-[var(--m-border)] flex items-center justify-between text-[11px] font-mono text-[var(--m-text-muted)]">
          <span>Grounded in IMD RSMC New Delhi</span>
          <span>Synoptic cycle</span>
        </div>
      </DataPanel>

      {/* 3. Emergency Helplines Directory */}
      <DataPanel className="flex flex-col justify-between gap-4">
        <div className="flex flex-col gap-3">
          <SectionHeading
            title="Emergency Control Rooms"
            subtitle="Verified Indian Civil Defence & Maritime Helplines"
            icon={<PhoneCall className="w-4 h-4 text-[var(--m-alert)]" />}
            badge={<SourceStatus status="REFERENCE" labelOverride="24x7 TOLL FREE" />}
          />

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            {HELPLINES.map((item) => (
              <div key={item.number} className="m-panel-inset p-3 flex flex-col gap-0.5">
                <span className="text-[10px] text-[var(--m-text-muted)] truncate" title={item.label}>
                  {item.label}
                </span>
                <strong className="text-[var(--m-text-primary)] text-base font-mono font-bold tabular-nums">
                  {item.number}
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-[var(--m-border)] text-[11px] font-mono text-[var(--m-text-muted)]">
          Verified Government Emergency Contacts (India)
        </div>
      </DataPanel>
    </div>
  );
};
