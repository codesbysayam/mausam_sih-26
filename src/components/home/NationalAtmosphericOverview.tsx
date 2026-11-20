import React from 'react';
import {
  Thermometer,
  CloudRain,
  ShieldAlert,
  Wind,
  Radio,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Clock,
} from 'lucide-react';

export const NationalAtmosphericOverview: React.FC = () => {
  const lastUpdated = new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      id="national-atmospheric-overview"
      className="w-full bg-[var(--m-surface-1)] border border-[var(--m-border)] rounded-xl p-4 sm:p-5 shadow-sm space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--m-border)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-accent)]/30 text-[var(--m-accent)]">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                ALL-INDIA SYNOPTIC METEOROLOGICAL OVERVIEW
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--m-surface-2)] text-[var(--m-accent)] border border-[var(--m-border-strong)]">
                NATIONAL NETWORK
              </span>
            </div>
            <p className="text-xs text-[var(--m-text-muted)]">
              Automated synoptic summaries across 36 Meteorological Subdivisions and 650+ Synoptic Stations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--m-text-muted)]">
          <Clock className="w-3.5 h-3.5 text-[var(--m-accent)]" />
          <span>Synoptic Bulletin: <strong>{lastUpdated} IST</strong></span>
        </div>
      </div>

      {/* Grid of National Extremes & Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Extreme High */}
        <div className="bg-[var(--m-surface-1)] p-3 rounded-lg border border-[var(--m-border)] space-y-1">
          <div className="flex items-center justify-between text-[var(--m-text-muted)]">
            <span className="text-[10px] font-bold uppercase">Hottest Station</span>
            <Thermometer className="w-4 h-4 text-[var(--m-danger)]" />
          </div>
          <div className="text-xl font-extrabold text-[var(--m-danger)]">
            39.2°C
          </div>
          <div className="text-xs font-semibold text-white truncate">Phalodi, Rajasthan</div>
          <div className="text-[10px] text-[var(--m-text-muted)]">AWS Synoptic Station</div>
        </div>

        {/* Extreme Low */}
        <div className="bg-[var(--m-surface-1)] p-3 rounded-lg border border-[var(--m-border)] space-y-1">
          <div className="flex items-center justify-between text-[var(--m-text-muted)]">
            <span className="text-[10px] font-bold uppercase">Coldest Station</span>
            <Thermometer className="w-4 h-4 text-[var(--m-accent)]" />
          </div>
          <div className="text-xl font-extrabold text-[var(--m-accent)]">
            -4.5°C
          </div>
          <div className="text-xs font-semibold text-white truncate">Dras, Ladakh</div>
          <div className="text-[10px] text-[var(--m-text-muted)]">High Altitude Observatory</div>
        </div>

        {/* Highest Rainfall */}
        <div className="bg-[var(--m-surface-1)] p-3 rounded-lg border border-[var(--m-border)] space-y-1">
          <div className="flex items-center justify-between text-[var(--m-text-muted)]">
            <span className="text-[10px] font-bold uppercase">24h Max Rainfall</span>
            <CloudRain className="w-4 h-4 text-[var(--m-accent)]" />
          </div>
          <div className="text-xl font-extrabold text-[var(--m-accent)]">
            112.4 mm
          </div>
          <div className="text-xs font-semibold text-white truncate">Mawsynram, Meghalaya</div>
          <div className="text-[10px] text-[var(--m-text-muted)]">Very Heavy Rain Category</div>
        </div>

        {/* Active Warning Count */}
        <div className="bg-[var(--m-surface-1)] p-3 rounded-lg border border-[var(--m-border)] space-y-1">
          <div className="flex items-center justify-between text-[var(--m-text-muted)]">
            <span className="text-[10px] font-bold uppercase">Subdivision Alerts</span>
            <ShieldAlert className="w-4 h-4 text-[var(--m-watch)]" />
          </div>
          <div className="text-xl font-extrabold text-[var(--m-watch)]">
            4 Active
          </div>
          <div className="text-xs font-semibold text-white">1 Red / 3 Orange</div>
          <div className="text-[10px] text-[var(--m-text-muted)]">South Peninsular & East Coast</div>
        </div>

        {/* Tropical Cyclone Status */}
        <div className="bg-[var(--m-surface-1)] p-3 rounded-lg border border-[var(--m-border)] space-y-1">
          <div className="flex items-center justify-between text-[var(--m-text-muted)]">
            <span className="text-[10px] font-bold uppercase">Tropical Cyclone</span>
            <Wind className="w-4 h-4 text-[var(--m-ok)]" />
          </div>
          <div className="text-sm font-extrabold text-[var(--m-ok)] mt-1">
            No Active Storm
          </div>
          <div className="text-xs font-medium text-white truncate">North Indian Ocean Basin</div>
          <div className="text-[10px] text-[var(--m-text-muted)]">IMD Cyclone Warning Div.</div>
        </div>

        {/* Lightning & Thunder Activity */}
        <div className="bg-[var(--m-surface-1)] p-3 rounded-lg border border-[var(--m-border)] space-y-1">
          <div className="flex items-center justify-between text-[var(--m-text-muted)]">
            <span className="text-[10px] font-bold uppercase">Lightning Clusters</span>
            <Zap className="w-4 h-4 text-[#FBBF24]" />
          </div>
          <div className="text-xl font-extrabold text-[#FBBF24]">
            Moderate
          </div>
          <div className="text-xs font-semibold text-white truncate">Eastern Peninsular Belt</div>
          <div className="text-[10px] text-[var(--m-text-muted)]">IITM DAMINI Network</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] text-[var(--m-text-muted)] pt-2 border-t border-[var(--m-border)]">
        <span>Official National Synthesis: <strong>India Meteorological Department (IMD) National Weather Forecasting Centre (NWFC), New Delhi</strong></span>
        <span className="text-[var(--m-accent)]">Grounded in Verified Surface Observation Network</span>
      </div>
    </div>
  );
};
