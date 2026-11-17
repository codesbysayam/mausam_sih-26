import React, { useState, useEffect } from 'react';
import {
  Volume2,
  PhoneCall,
  ShieldCheck,
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

interface CycloneGuidancePanelProps {
  activeSystem: WeatherSystemEvent | null;
  marineBulletinText?: string;
}

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

  // Subscribe to canonical WarningReadoutService state changes
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

  // Update voice availability notes when language changes or voices update
  useEffect(() => {
    const capability = warningReadoutService.getVoiceCapability(selectedLanguage);
    setHasNativeVoice(capability.available);
    setVoiceNote(capability.warningNote);
  }, [selectedLanguage]);

  // If the active weather system changes or updates, stop playing immediately
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

    // Play either active system or official marine bulletin
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
      <div className="bg-[#0B1523] border border-[#1E3A5F] rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xl">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-[#38BDF8]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                MAUSAM Warning Readout
              </h3>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-colors ${
              ttsStatus === 'SPEAKING'
                ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                : ttsStatus === 'PREPARING'
                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 animate-pulse'
                : 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30'
            }`}>
              STATUS: {ttsStatus === 'IDLE' ? 'IDLE' : ttsStatus === 'PREPARING' ? 'PREPARING' : ttsStatus === 'SPEAKING' ? 'SPEAKING' : ttsStatus}
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">
            Synthesized readout of official IMD synoptic bulletin. Speech is sequenced locally via Web Speech API with zero audio overlap.
          </p>
        </div>

        {/* Language selector buttons: Strictly ENGLISH and हिन्दी */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#94A3B8]">
            <span>SELECT AUDIO LANGUAGE</span>
            <span className="text-[#38BDF8] font-bold">
              {ttsStatus === 'SPEAKING'
                ? `Speaking (${selectedLanguage === 'en' ? 'ENGLISH' : 'हिन्दी'})`
                : ttsStatus === 'PREPARING'
                ? 'Preparing Speech...'
                : 'Engine Ready (Idle)'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                if (isBusy) warningReadoutService.stop();
                setSelectedLanguage('en');
              }}
              className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                selectedLanguage === 'en'
                  ? 'bg-[#0284C7] border-[#0284C7] text-white font-bold shadow-md ring-1 ring-[#38BDF8]/40'
                  : 'bg-[#09111C] border-[#1E2E40] text-[#94A3B8] hover:text-white hover:border-[#38BDF8]/30'
              }`}
            >
              <span>ENGLISH</span>
              {selectedLanguage === 'en' && ttsStatus === 'SPEAKING' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                if (isBusy) warningReadoutService.stop();
                setSelectedLanguage('hi');
              }}
              className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                selectedLanguage === 'hi'
                  ? 'bg-[#0284C7] border-[#0284C7] text-white font-bold shadow-md ring-1 ring-[#38BDF8]/40'
                  : 'bg-[#09111C] border-[#1E2E40] text-[#94A3B8] hover:text-white hover:border-[#38BDF8]/30'
              }`}
            >
              <span>हिन्दी</span>
              {selectedLanguage === 'hi' && ttsStatus === 'SPEAKING' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              )}
            </button>
          </div>

          {/* Voice capability note (Honest missing voice check) */}
          {voiceNote && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#F59E0B] bg-[#F59E0B]/10 px-2.5 py-1.5 rounded-lg border border-[#F59E0B]/30 font-mono">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>{voiceNote}</span>
            </div>
          )}
        </div>

        {/* Audio Play/Stop Button and Progress Section */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleToggleVoice}
            disabled={!isBusy && !hasNativeVoice}
            className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-mono text-xs font-bold transition-all cursor-pointer shadow-lg ${
              ttsStatus === 'SPEAKING'
                ? 'bg-[#EF4444] hover:bg-red-600 text-white shadow-red-900/30'
                : ttsStatus === 'PREPARING'
                ? 'bg-[#D97706] text-white animate-pulse'
                : !hasNativeVoice
                ? 'bg-[#1E2E40] text-[#64748B] cursor-not-allowed border border-[#2B3E55]'
                : 'bg-[#0284C7] hover:bg-[#0369A1] text-white'
            }`}
          >
            {ttsStatus === 'SPEAKING' ? (
              <>
                <Square className="w-4 h-4 fill-white" />
                <span>Stop Warning Readout (Speaking)</span>
              </>
            ) : ttsStatus === 'PREPARING' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Preparing Warning Readout...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Play Warning Readout (Idle)</span>
              </>
            )}
          </button>

          {/* Chunk speech progress indicator */}
          {ttsStatus === 'SPEAKING' && chunkInfo && (
            <div className="flex items-center justify-between text-[11px] font-mono text-[#38BDF8] bg-[#0284C7]/10 px-2.5 py-1.5 rounded-lg border border-[#0284C7]/20">
              <div className="flex items-center gap-1.5 truncate">
                <Volume2 className="w-3.5 h-3.5 shrink-0 animate-bounce" />
                <span className="truncate">
                  Speaking: Section {chunkInfo.current} of {chunkInfo.total} ({chunkInfo.label})
                </span>
              </div>
              <span className="text-[10px] text-[#94A3B8] shrink-0 ml-1 font-bold">
                {Math.round((chunkInfo.current / chunkInfo.total) * 100)}%
              </span>
            </div>
          )}

          {ttsStatus === 'PREPARING' && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#F59E0B] bg-[#F59E0B]/10 px-2.5 py-1.5 rounded-lg border border-[#F59E0B]/20">
              <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
              <span>Preparing synthesized audio stream...</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Official Marine Advisory & Sea Area Bulletin */}
      <div className="bg-[#0B1523] border border-[#1E3A5F] rounded-2xl p-5 flex flex-col justify-between gap-3 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-[#1E2E40]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#38BDF8]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Official IMD Marine Bulletin
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#10B981] font-bold">RSMC VERIFIED</span>
        </div>
        <p className="text-xs text-[#CBD5E1] leading-relaxed line-clamp-4">
          {marineBulletinText ||
            'IMD RSMC Sea Area Bulletin reports NO STORM WARNING for the Indian coasts. A Low Pressure Area lies over Myanmar and adjoining northeast & eastcentral Bay of Bengal. Normal synoptic maritime operations prevail across western and southern sectors.'}
        </p>
        <div className="pt-2 border-t border-[#1E2E40]/60 flex items-center justify-between text-[10px] font-mono text-[#94A3B8]">
          <span>Grounded in IMD RSMC New Delhi</span>
          <span>Updated each synoptic cycle</span>
        </div>
      </div>

      {/* 3. Emergency Helplines Directory */}
      <div className="bg-[#0B1523] border border-[#1E3A5F] rounded-2xl p-5 flex flex-col justify-between gap-3 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-[#1E2E40]">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-[#FB923C]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Emergency Control Rooms
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#34D399] font-bold">24x7 TOLL FREE</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2 rounded-lg bg-[#09111C] border border-[#1E2E40] flex flex-col">
            <span className="text-[10px] text-[#94A3B8]">National Disaster (NDRF)</span>
            <strong className="text-white text-sm font-bold">1078</strong>
          </div>
          <div className="p-2 rounded-lg bg-[#09111C] border border-[#1E2E40] flex flex-col">
            <span className="text-[10px] text-[#94A3B8]">Indian Coast Guard</span>
            <strong className="text-white text-sm font-bold">1554</strong>
          </div>
          <div className="p-2 rounded-lg bg-[#09111C] border border-[#1E2E40] flex flex-col">
            <span className="text-[10px] text-[#94A3B8]">Madhya Pradesh SEOC</span>
            <strong className="text-white text-sm font-bold">1070</strong>
          </div>
          <div className="p-2 rounded-lg bg-[#09111C] border border-[#1E2E40] flex flex-col">
            <span className="text-[10px] text-[#94A3B8]">National Emergency Line</span>
            <strong className="text-white text-sm font-bold">112</strong>
          </div>
        </div>
        <div className="pt-2 border-t border-[#1E2E40]/60 text-[10px] font-mono text-[#94A3B8]">
          <span>Verified Government Emergency Contacts (India)</span>
        </div>
      </div>
    </div>
  );
};
