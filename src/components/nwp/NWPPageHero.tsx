import React from 'react';
import { LocationRecord } from '../../types';
import { Cpu, Clock, Compass, Calendar, ArrowUpRight } from 'lucide-react';

interface NWPPageHeroProps {
  location: LocationRecord;
  lastUpdated?: string;
  forecastHorizon?: string;
  onOpenCompare?: () => void;
  isCompareMode?: boolean;
}

export const NWPPageHero: React.FC<NWPPageHeroProps> = ({
  location,
  lastUpdated,
  forecastHorizon = '0–15 Days (360h)',
  onOpenCompare,
  isCompareMode = false,
}) => {
  const lat = typeof location.lat === 'number' ? location.lat : 20.36;
  const lon = typeof location.lng === 'number' ? location.lng : 85.81;

  return (
    <div
      id="nwp-page-hero"
      className="w-full flex flex-col md:flex-row md:items-end justify-between gap-4 pt-1 pb-3 border-b border-[#1D5278]/60"
    >
      {/* Left: Titles & Subtitles */}
      <div className="flex flex-col gap-1.5 max-w-3xl">
        {/* Eyebrow */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1565C0]/20 border border-[#1565C0]/40 text-[#29B6F6] text-[11px] font-mono font-bold tracking-wider uppercase">
            <Cpu className="w-3 h-3 text-[#29B6F6]" />
            NUMERICAL WEATHER PREDICTION
          </span>
          <span className="text-[11px] text-[#AFC4D8] font-sans">
            Operational Multi-Model Analysis Suite
          </span>
        </div>

        {/* Main Title: 38–46px desktop, 32–38px tablet, 26–32px mobile */}
        <h1 className="text-[26px] sm:text-[34px] lg:text-[40px] font-extrabold text-[#F5F9FC] tracking-tight leading-tight">
          Atmospheric Model Forecast
          <span className="text-[#29B6F6] font-normal text-xl sm:text-2xl lg:text-3xl block sm:inline sm:ml-3">
            — {location.city || 'Chandaka'}, {location.state || 'Odisha'}
          </span>
        </h1>

        {/* Description subhead */}
        <p className="text-xs sm:text-sm text-[#AFC4D8] leading-relaxed font-sans">
          Compare numerical weather models for temperature, rainfall, wind, pressure and forecast uncertainty.
        </p>

        {/* Metadata Chips: Latitude, Longitude, Horizon, Last Updated */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--m-surface-1)] border border-[var(--m-border)] text-[11px] text-[#AFC4D8] font-mono">
            <Compass className="w-3 h-3 text-[#29B6F6]" />
            <span className="text-slate-400">Lat:</span>
            <span className="text-white font-medium">{Math.abs(lat).toFixed(4)}°{lat >= 0 ? 'N' : 'S'}</span>
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--m-surface-1)] border border-[var(--m-border)] text-[11px] text-[#AFC4D8] font-mono">
            <Compass className="w-3 h-3 text-[#29B6F6]" />
            <span className="text-slate-400">Lon:</span>
            <span className="text-white font-medium">{Math.abs(lon).toFixed(4)}°{lon >= 0 ? 'E' : 'W'}</span>
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--m-surface-1)] border border-[var(--m-border)] text-[11px] text-[#AFC4D8] font-mono">
            <Calendar className="w-3 h-3 text-[#00E676]" />
            <span className="text-slate-400">Horizon:</span>
            <span className="text-white font-medium">{forecastHorizon}</span>
          </div>

          {lastUpdated && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--m-surface-1)] border border-[var(--m-border)] text-[11px] text-[#AFC4D8] font-mono">
              <Clock className="w-3 h-3 text-amber-400" />
              <span className="text-slate-400">Updated:</span>
              <span className="text-white font-medium">{lastUpdated}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Quick Compare Toggle button if provided */}
      {onOpenCompare && (
        <div className="shrink-0 self-start md:self-end">
          <button
            type="button"
            onClick={onOpenCompare}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-sm ${
              isCompareMode
                ? 'bg-[#1565C0] border-[#29B6F6] text-white'
                : 'bg-[var(--m-surface-1)] border-[var(--m-border)] text-[#AFC4D8] hover:text-[var(--m-text-primary)] hover:border-[#29B6F6]'
            }`}
          >
            <span>{isCompareMode ? 'Exit Comparison' : 'Compare All Models'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
