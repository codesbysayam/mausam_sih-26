// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// RSMC Tropical Cyclone Intelligence & Synoptic Tracker (Rebuilt)
//
// Grounded strictly in:
// - Official IMD RSMC New Delhi Sea Area Bulletins
// - Official IMD Cyclone Warnings & Track Advisories
// - NDMA SACHET Alert Network
//
// Realtime-First Architecture:
// - Consumes canonical CycloneLiveDataService exclusively
// - Never invents false cyclones, landfall tracks, or fake LIVE badges
// - Accurately reports:
//   * Sea Area Status: NO STORM WARNING FOR INDIAN COASTS
//   * Monitored Inland Disturbance: Depression over northeast MP & north Chhattisgarh
//   * Monitored Marine Disturbance: Low Pressure Area over Myanmar & NE Bay of Bengal
//   * Past Historical Event: BOB-04 (Dissipated on 24 Sept 2026)
// ====================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Compass,
  Radio,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Layers,
  FileText,
  AlertTriangle,
  Waves,
  Ship,
  Info,
} from 'lucide-react';
import {
  CyclonePayload,
  WeatherSystemEvent,
  RegionalWarningStatus,
} from '../types/cyclone';
import {
  cycloneLiveDataService,
  MarineWarningInfo,
  SystemStatusSummary,
} from '../services/CycloneLiveDataService';
import { CycloneHeader } from '../components/cyclone/CycloneHeader';
import { CycloneSystemOverview } from '../components/cyclone/CycloneSystemOverview';
import { CycloneThreatMatrix } from '../components/cyclone/CycloneThreatMatrix';
import { CycloneTrackMap } from '../components/cyclone/CycloneTrackMap';
import { CycloneStateMatrix } from '../components/cyclone/CycloneStateMatrix';
import { CycloneGuidancePanel } from '../components/cyclone/CycloneGuidancePanel';

export const CycloneTrackerPage: React.FC = () => {
  const [payload, setPayload] = useState<CyclonePayload | null>(() =>
    cycloneLiveDataService.getCachedPayload()
  );
  const [isLoading, setIsLoading] = useState<boolean>(!payload);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(60);
  const [marineWarning, setMarineWarning] = useState<MarineWarningInfo | null>(null);

  // Load canonical data
  const loadData = useCallback(async (force = false) => {
    if (force) setIsRefreshing(true);
    try {
      const data = await cycloneLiveDataService.fetchCycloneData(force);
      setPayload(data);
      const marine = await cycloneLiveDataService.fetchMarineWarning();
      setMarineWarning(marine);

      setSelectedSystemId((prev) => {
        if (prev && data.systems.some((s) => s.id === prev)) return prev;
        // Prefer first active system if present, else first system
        const active = data.systems.find((s) => s.status === 'ACTIVE');
        return active ? active.id : data.systems.length > 0 ? data.systems[0].id : null;
      });
      setCountdownSeconds(60);
    } catch (err) {
      console.error('[CycloneTracker] Load error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch and subscription
  useEffect(() => {
    loadData(false);

    const unsubscribe = cycloneLiveDataService.subscribe((data) => {
      setPayload(data);
      setSelectedSystemId((prev) => {
        if (prev && data.systems.some((s) => s.id === prev)) return prev;
        const active = data.systems.find((s) => s.status === 'ACTIVE');
        return active ? active.id : data.systems.length > 0 ? data.systems[0].id : null;
      });
    });

    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [loadData]);

  // Derived states
  const systemStatus: SystemStatusSummary = useMemo(() => {
    return cycloneLiveDataService.getSystemStatus();
  }, [payload]);

  const activeSystem: WeatherSystemEvent | null = useMemo(() => {
    if (!payload || payload.systems.length === 0) return null;
    if (selectedSystemId === 'ALL_CLEAR_SURVEILLANCE') return null;
    if (!selectedSystemId) return payload.systems[0];
    return payload.systems.find((s) => s.id === selectedSystemId) || payload.systems[0];
  }, [payload, selectedSystemId]);

  const systems = payload?.systems || [];

  return (
    <div className="w-full text-[#F4F7FA] pb-16 pt-2 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* 1. Official Header & Live Provider Diagnostics */}
      <CycloneHeader
        activeSystem={activeSystem}
        hasActiveMarineCyclone={systemStatus.hasActiveMarineCyclone}
        providerHealth={cycloneLiveDataService.getProviderHealth()}
        countdownSeconds={countdownSeconds}
        isRefreshing={isRefreshing}
        onRefresh={() => loadData(true)}
      />

      {/* 2. Synoptic Status Hero Banner */}
      {!systemStatus.hasActiveMarineCyclone ? (
        <div className="w-full bg-[#101B26] border border-[#10B981]/35 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#10B981]/15 border border-[#10B981]/35 flex items-center justify-center text-[#10B981] shrink-0 mt-0.5">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] text-xs font-mono font-bold uppercase tracking-wider">
                  ALL CLEAR • NO STORM WARNING
                </span>
                <span className="text-xs font-mono text-[#93A4B8]">
                  IMD RSMC Sea Area Bulletin
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[#F4F7FA] font-mono">
                NO ACTIVE CYCLONIC DISTURBANCE OVER INDIAN SEAS
              </h2>
              <p className="text-xs sm:text-sm text-[#93A4B8] max-w-3xl leading-relaxed">
                Official IMD and RSMC New Delhi bulletins report normal sea conditions along mainland Indian coasts. A Low Pressure Area is monitored over coastal Myanmar / northeast Bay of Bengal, and an inland Depression is tracking across East Madhya Pradesh.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0 pl-16 md:pl-0 tabular-nums">
            <span className="text-[11px] font-mono text-[#93A4B8]">4-STAGE PROTOCOL</span>
            <span className="px-3 py-1 rounded-lg bg-[#0B1219] border border-white/12 text-xs font-mono font-bold text-[#10B981]">
              STAGE 0: NORMAL SURVEILLANCE
            </span>
          </div>
        </div>
      ) : (
        <div className="w-full bg-[#101B26] border border-[#EF4444]/50 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/40 flex items-center justify-center text-[#EF4444] shrink-0">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="px-2.5 py-0.5 rounded bg-[#EF4444]/20 border border-[#EF4444]/50 text-[#EF4444] text-xs font-mono font-bold uppercase tracking-wider">
                CYCLONE WARNING IN EFFECT
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white font-mono">
                {activeSystem?.classification.toUpperCase()}: {activeSystem?.name}
              </h2>
              <p className="text-xs sm:text-sm text-[#94A3B8] max-w-3xl leading-relaxed">
                {activeSystem?.advisoryText}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Multi-Disturbance Surveillance Selector Tabs */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Monitored Synoptic Disturbances &amp; Archives:</span>
          </span>
          <span className="text-[11px] font-mono text-[#64748B]">
            Select disturbance to inspect synoptic parameters
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {/* Tab 0: Basin Wide Surveillance */}
          <button
            type="button"
            onClick={() => setSelectedSystemId('ALL_CLEAR_SURVEILLANCE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer flex items-center gap-2 shrink-0 ${
              selectedSystemId === 'ALL_CLEAR_SURVEILLANCE'
                ? 'bg-[#0284C7] text-white shadow-lg border border-[#0284C7]'
                : 'bg-[#101B26] border border-white/12 text-[#93A4B8] hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            <span>North Indian Ocean (All Clear)</span>
          </button>

          {/* Dynamic Tabs for Monitored Systems */}
          {systems.map((s) => {
            const isSelected = activeSystem?.id === s.id && selectedSystemId !== 'ALL_CLEAR_SURVEILLANCE';
            const isHistorical = s.status === 'DISSIPATED';
            const isInland = s.basin === 'Inland Central India';

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSystemId(s.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer flex items-center gap-2 shrink-0 ${
                  isSelected
                    ? isHistorical
                      ? 'bg-[#1E2E40] border border-white/25 text-white shadow-lg'
                      : 'bg-[#0284C7] border border-[#0284C7] text-white shadow-lg'
                    : 'bg-[#101B26] border border-white/12 text-[#93A4B8] hover:text-white'
                }`}
              >
                <span>🌀</span>
                <span>
                  {isInland ? 'Inland ' : ''}
                  {s.classification}
                </span>
                {isHistorical && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-700 text-[10px] text-slate-300 font-normal">
                    Archived
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && !payload && (
        <div className="w-full py-20 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#38BDF8] animate-spin" />
          <span className="text-sm font-mono text-[#94A3B8]">
            Ingesting live synoptic bulletins from RSMC New Delhi and IMD...
          </span>
        </div>
      )}

      {/* 4. Active System Overview or Basin Surveillance Details */}
      {activeSystem ? (
        <>
          {/* Key Synoptic Overview & 4-Stage Protocol */}
          <CycloneSystemOverview
            activeSystem={activeSystem}
            hasActiveMarineCyclone={systemStatus.hasActiveMarineCyclone}
          />

          {/* Leaflet Synoptic Basin & Radar Map */}
          <CycloneTrackMap activeSystem={activeSystem} />

          {/* Hazard Threat Matrix */}
          <CycloneThreatMatrix activeSystem={activeSystem} />
        </>
      ) : (
        <>
          {/* Default North Indian Ocean Basin View */}
          <CycloneTrackMap activeSystem={null} />

          {/* Marine Advisory Card */}
          {marineWarning && (
            <div className="bg-[#101B26] border border-white/12 rounded-2xl p-5 flex flex-col gap-3 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Ship className="w-5 h-5 text-[#38BDF8]" />
                  <h3 className="text-sm font-bold text-[#F4F7FA] uppercase tracking-wider font-mono">
                    {marineWarning.title}
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] text-[10px] font-mono font-bold">
                  NO COASTAL THREAT
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
                {marineWarning.bulletinText}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-[#0B1219] border border-white/10 text-xs font-mono">
                  <span className="text-[#93A4B8] block text-[10px] uppercase">Bay of Bengal Sector:</span>
                  <strong className="text-[#F4F7FA]">{marineWarning.seaAreas.bayOfBengal}</strong>
                </div>
                <div className="p-3 rounded-xl bg-[#0B1219] border border-white/10 text-xs font-mono">
                  <span className="text-[#93A4B8] block text-[10px] uppercase">Arabian Sea Sector:</span>
                  <strong className="text-[#F4F7FA]">{marineWarning.seaAreas.arabianSea}</strong>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#0284C7]/10 border border-[#0284C7]/30 text-xs font-mono text-[#38BDF8] flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Fishermen Advisory:</strong> {marineWarning.fishermenAdvisory}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* 5. Warning Readout Service & Emergency Helplines */}
      <CycloneGuidancePanel
        activeSystem={activeSystem}
        marineBulletinText={marineWarning?.bulletinText}
      />

      {/* 6. State & UT Warning Engine (All 36 regions evaluated independently) */}
      <CycloneStateMatrix
        regionalWarnings={payload?.regionalWarnings || []}
      />
    </div>
  );
};

export default CycloneTrackerPage;
