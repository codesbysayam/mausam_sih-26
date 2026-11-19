import React, { useState, useEffect } from 'react';
import {
  Volume2,
  PhoneCall,
  Play,
  Square,
  Info,
  Loader2,
  FileText,
} from 'lucide-react';
import { WeatherSystemEvent } from '../../types/cyclone';
import {
  warningReadoutService,
  ReadoutLanguage,
  WarningReadoutStatus,
  ChunkProgressInfo,
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
  const [selectedLanguage, setSelectedLanguage] = useState<ReadoutLanguage>('en');
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [hasNativeVoice, setHasNativeVoice] = useState<boolean>(true);

  useEffect(() => {
    const unsub = warningReadoutService.subscribe((newStatus, info, errorMsg) => {
      setTtsStatus(newStatus);
      setChunkInfo(info || null);
      if (errorMsg) {
        setVoiceNote(errorMsg);
      }
    });

    return () => {
      unsub();
      warningReadoutService.stop();
    };
  }, []);

  useEffect(() => {
    const capability = warningReadoutService.getVoiceCapability(selectedLanguage);
    setHasNativeVoice(capability.available);
    setVoiceNote(capability.warningNote);
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

    if (!hasNativeVoice) {
      setVoiceNote(
        selectedLanguage === 'hi'
          ? 'Hindi voice is unavailable in this browser.'
          : 'English voice is unavailable in this browser.'
      );
      return;
    }

    if (activeSystem) {
      warningReadoutService.play(activeSystem, selectedLanguage);
    } else {
      const fallbackWarning = {
        classification: 'Synoptic Surveillance',
        currentLocation: 'North Indian Ocean (Bay of Bengal & Arabian Sea)',
        affectedStates: ['Coastal India'],
        rainfallThreat: 'NO_WARNING',
        maxSustainedWind: 'Normal coastal winds (15-25 km/h)',
        nextBulletinAt: '08:30 IST',
      };
      warningReadoutService.play(fallbackWarning, selectedLanguage);
    }
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. MAUSAM Warning Readout (TTS) */}
      <DataPanel className="flex flex-col justify-between gap-4">
        <div className="flex flex-col gap-3">
          <SectionHeading
            title="MAUSAM Warning Readout"
            subtitle="Local Web Speech synthesis of IMD synoptic bulletin"
            icon={<Volume2 className="w-4 h-4" />}
            badge={
              <SourceStatus
                status={
                  ttsStatus === 'SPEAKING'
                    ? 'LIVE'
                    : ttsStatus === 'PREPARING'
                    ? 'LOADING'
                    : 'REFERENCE'
                }
                labelOverride={ttsStatus}
              />
            }
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--m-text-muted)]">
            <span>AUDIO LANGUAGE</span>
            <span className="text-[var(--m-accent)] font-semibold">
              {ttsStatus === 'SPEAKING'
                ? `Speaking (${selectedLanguage === 'en' ? 'ENGLISH' : 'हिन्दी'})`
                : ttsStatus === 'PREPARING'
                ? 'Preparing Speech...'
                : 'Ready (Idle)'}
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
                  ? 'bg-[var(--m-accent)] border-[var(--m-accent)] text-white font-semibold'
                  : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)]'
              }`}
            >
              <span>ENGLISH</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isBusy) warningReadoutService.stop();
                setSelectedLanguage('hi');
              }}
              className={`py-2 px-3 min-h-[40px] rounded-lg border text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 m-focus-ring ${
                selectedLanguage === 'hi'
                  ? 'bg-[var(--m-accent)] border-[var(--m-accent)] text-white font-semibold'
                  : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)]'
              }`}
            >
              <span>हिन्दी</span>
            </button>
          </div>

          {voiceNote && (
            <div className="flex items-center gap-2 text-[11px] text-[var(--m-watch)] bg-[var(--m-watch-soft)] px-3 py-2 rounded-lg border border-[var(--m-watch)]/30 font-mono">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>{voiceNote}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleToggleVoice}
            disabled={!isBusy && !hasNativeVoice}
            className={`w-full py-2.5 px-4 min-h-[42px] rounded-lg flex items-center justify-center gap-2 font-mono text-xs font-semibold transition-colors cursor-pointer border m-focus-ring ${
              ttsStatus === 'SPEAKING'
                ? 'bg-[#EF4444] hover:bg-[#DC2626] border-[#F87171] text-white'
                : ttsStatus === 'PREPARING'
                ? 'bg-[#D97706] border-[#F59E0B] text-white'
                : !hasNativeVoice
                ? 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] cursor-not-allowed border-[var(--m-border)]'
                : 'bg-[var(--m-accent)] hover:bg-[var(--m-accent-hover)] border-[var(--m-accent)]/50 text-white'
            }`}
          >
            {ttsStatus === 'SPEAKING' ? (
              <>
                <Square className="w-4 h-4 fill-white" />
                <span>Stop Warning Readout</span>
              </>
            ) : ttsStatus === 'PREPARING' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Preparing Warning Readout...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Play Warning Readout</span>
              </>
            )}
          </button>

          {ttsStatus === 'SPEAKING' && chunkInfo && (
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--m-accent)] bg-[var(--m-surface-inset)] px-3 py-2 rounded-lg border border-[var(--m-border)] tabular-nums">
              <div className="flex items-center gap-1.5 truncate">
                <Volume2 className="w-3.5 h-3.5 shrink-0 text-[var(--m-accent)]" />
                <span className="truncate">
                  Section {chunkInfo.current}/{chunkInfo.total} ({chunkInfo.label})
                </span>
              </div>
              <span className="text-[10px] text-[var(--m-text-secondary)] shrink-0 ml-1 font-semibold">
                {Math.round((chunkInfo.current / chunkInfo.total) * 100)}%
              </span>
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
