import React from 'react';
import {
  Compass,
  Wind,
  Gauge,
  MapPin,
  Anchor,
  Calendar,
  AlertOctagon,
  ShieldCheck,
  Radio,
  Clock,
  Info,
} from 'lucide-react';
import { WeatherSystemEvent } from '../../types/cyclone';

interface CycloneSystemOverviewProps {
  activeSystem: WeatherSystemEvent;
  hasActiveMarineCyclone: boolean;
}

export const CycloneSystemOverview: React.FC<CycloneSystemOverviewProps> = ({
  activeSystem,
  hasActiveMarineCyclone,
}) => {
  const isDissipated = activeSystem.status === 'DISSIPATED';
  const isInland = activeSystem.basin === 'Inland Central India';

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 4-Stage Cyclone Warning Protocol Banner */}
      <div className="bg-[#0D1826] border border-[#1E3A5F] rounded-xl p-3.5 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#38BDF8]" />
            <span className="text-xs font-bold uppercase tracking-wider font-mono text-[#E2E8F0]">
              IMD 4-Stage Cyclone Warning Protocol
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#94A3B8]">
            National Weather Forecasting Centre (NWFC) • Standard Protocol
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Stage 1 */}
          <div className="p-2.5 rounded-lg border border-[#1E2E40] bg-[#0A1018]/60 flex flex-col">
            <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase">Stage 1 (T-72h)</span>
            <span className="text-xs font-semibold text-[#94A3B8]">Pre-Cyclone Watch</span>
            <span className="text-[10px] text-[#64748B] font-mono mt-1">
              {hasActiveMarineCyclone ? '● Active' : '○ Standby'}
            </span>
          </div>

          {/* Stage 2 */}
          <div className="p-2.5 rounded-lg border border-[#1E2E40] bg-[#0A1018]/60 flex flex-col">
            <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase">Stage 2 (T-48h)</span>
            <span className="text-xs font-semibold text-[#94A3B8]">Cyclone Alert (Yellow)</span>
            <span className="text-[10px] text-[#64748B] font-mono mt-1">
              {hasActiveMarineCyclone ? '● Active' : '○ Standby'}
            </span>
          </div>

          {/* Stage 3 */}
          <div className={`p-2.5 rounded-lg border flex flex-col ${
            hasActiveMarineCyclone
              ? 'border-[#E74C3C]/60 bg-[#E74C3C]/10 text-white shadow-sm'
              : 'border-[#1E2E40] bg-[#0A1018]/60 opacity-80'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase">Stage 3 (T-24h)</span>
              {hasActiveMarineCyclone && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
            </div>
            <span className="text-xs font-bold text-[#94A3B8]">Cyclone Warning (Orange)</span>
            <span className={`text-[10px] font-mono mt-1 ${hasActiveMarineCyclone ? 'text-[#FF6B6B] font-bold' : 'text-[#64748B]'}`}>
              {hasActiveMarineCyclone ? '● ACTIVE' : '○ Standby'}
            </span>
          </div>

          {/* Stage 4 */}
          <div className="p-2.5 rounded-lg border border-[#1E2E40] bg-[#0A1018]/60 flex flex-col opacity-60">
            <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase">Stage 4 (T-12h)</span>
            <span className="text-xs font-semibold text-[#94A3B8]">Post-Landfall Outlook</span>
            <span className="text-[10px] text-[#64748B] font-mono mt-1">
              {isDissipated ? '● Concluded' : '○ Standby'}
            </span>
          </div>
        </div>

        {/* Protocol Summary Status */}
        <div className="mt-3 pt-2.5 border-t border-[#1E2E40]/60 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 text-[#10B981]">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="font-bold">
              {hasActiveMarineCyclone
                ? 'CYCLONIC STORM PROTOCOL ACTIVATED'
                : 'OPERATIONAL STATUS: STAGE 0 (ALL CLEAR - NORMAL 24x7 SURVEILLANCE)'}
            </span>
          </div>
          <span className="text-[#94A3B8] hidden sm:inline-block">
            {isInland
              ? 'Tracking Inland Synoptic Disturbance'
              : isDissipated
              ? 'Past Disturbance Archive'
              : 'Marine Basin Normal'}
          </span>
        </div>
      </div>

      {/* Grid of Key Synoptic Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Metric 1: Location & Coordinates */}
        <div className="bg-[#0B1523] border border-[#1E2E40] rounded-xl p-4 flex flex-col justify-between gap-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#94A3B8]">
              Estimated Center
            </span>
            <div className="p-1.5 rounded-lg bg-[#38BDF8]/10 text-[#38BDF8]">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-white font-mono">
              {activeSystem.latitude.toFixed(1)}°N, {activeSystem.longitude.toFixed(1)}°E
            </div>
            <p className="text-xs text-[#94A3B8] mt-1 leading-snug">
              {activeSystem.currentLocation}
            </p>
          </div>
        </div>

        {/* Metric 2: Max Sustained Wind & Gusts */}
        <div className="bg-[#0B1523] border border-[#1E2E40] rounded-xl p-4 flex flex-col justify-between gap-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#94A3B8]">
              Sustained Wind Speed
            </span>
            <div className="p-1.5 rounded-lg bg-[#FB923C]/10 text-[#FB923C]">
              <Wind className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-white font-mono">
              {activeSystem.maxSustainedWind}
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">
              Peak gusts: <strong className="text-white font-mono">{activeSystem.windGust || 'N/A'}</strong>
            </p>
          </div>
        </div>

        {/* Metric 3: Central Pressure */}
        <div className="bg-[#0B1523] border border-[#1E2E40] rounded-xl p-4 flex flex-col justify-between gap-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#94A3B8]">
              Central Pressure
            </span>
            <div className="p-1.5 rounded-lg bg-[#A78BFA]/10 text-[#A78BFA]">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-white font-mono">
              {activeSystem.pressure}
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">
              Movement: <strong className="text-white font-mono">{activeSystem.movementDirection} at {activeSystem.movementSpeed}</strong>
            </p>
          </div>
        </div>

        {/* Metric 4: System Status & Outlook */}
        <div className="bg-[#0B1523] border border-[#1E2E40] rounded-xl p-4 flex flex-col justify-between gap-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#94A3B8]">
              System Classification
            </span>
            <div className="p-1.5 rounded-lg bg-[#10B981]/10 text-[#10B981]">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-base font-bold text-white font-mono truncate">
              {activeSystem.classification}
            </div>
            <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2">
              {activeSystem.expectedLandfall}
            </p>
          </div>
        </div>
      </div>

      {/* Advisory Text if present */}
      {activeSystem.advisoryText && (
        <div className="bg-[#09111C] border border-[#1E2E40] rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-[#CBD5E1]">
          <Info className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white font-mono uppercase mr-1">Official IMD Advisory:</strong>
            {activeSystem.advisoryText}
          </p>
        </div>
      )}
    </div>
  );
};
