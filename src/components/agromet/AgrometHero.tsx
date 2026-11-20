import React from 'react';
import { ExtendedAgrometBulletin } from '../../services/agrometService';
import {
  Sprout,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  Droplets,
  Sun,
  Wind,
  Layers,
  Sparkles,
  ArrowDownRight,
  TrendingUp,
} from 'lucide-react';

interface AgrometHeroProps {
  bulletin: ExtendedAgrometBulletin;
  selectedState: string;
  selectedDistrict: string;
  selectedCropName?: string;
  onSelectCrop?: (crop: string) => void;
  onStateChange?: (newState: string) => void;
  onDistrictChange?: (newDistrict: string) => void;
  isLoading?: boolean;
}

export const AgrometHero: React.FC<AgrometHeroProps> = ({
  bulletin,
  selectedState,
  selectedDistrict,
  selectedCropName = 'Rice (Paddy)',
  onSelectCrop,
  onStateChange,
  onDistrictChange,
  isLoading,
}) => {
  const topsoil = bulletin.soilMoisture?.topsoilPct ?? 68;
  const rootZone = bulletin.soilMoisture?.rootZonePct ?? 72;
  const subsoil = bulletin.soilMoisture?.subsoilPct ?? 78;
  const cumulativeRain = bulletin.cumulativeRainfallMm ?? 30;

  return (
    <header
      id="agromet-intelligence-hero"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--m-surface-inset)] via-[var(--m-surface-inset)] to-[var(--m-surface-inset)] border border-[var(--m-border)] shadow-2xl p-6 sm:p-8 lg:p-10"
    >
      {/* Background Subtle Coordinate & Field Grid SVG */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="agriGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#C5A46D" strokeWidth="0.5" strokeOpacity="0.3" />
              <circle cx="20" cy="20" r="0.75" fill="#10B981" fillOpacity="0.4" />
            </pattern>
            <linearGradient id="heroGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.12" />
              <stop offset="50%" stopColor="#C5A46D" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0B131D" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#agriGrid)" />
          <rect width="100%" height="100%" fill="url(#heroGlow)" />
        </svg>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* LEFT COLUMN: Authority, Location, Purpose & Core Value */}
        <div className="lg:col-span-7 space-y-5">
          {/* Top Label & Protocol Tag */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--m-ok-soft)] border border-[#10B981]/30 text-[var(--m-ok)] text-xs font-mono font-bold uppercase tracking-wider">
              <Sprout className="w-3.5 h-3.5" />
              <span>Agromet Intelligence</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/25 text-[var(--m-accent)] text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>GKMS • IMD • ICAR</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--m-surface-2)] text-[var(--m-text-muted)] text-[11px] font-mono">
              <Clock className="w-3 h-3 text-[var(--m-accent)]" />
              <span>Cycle: August 2026</span>
            </div>
          </div>

          {/* Main Title & Value Proposition */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Agricultural Weather <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--m-accent)] via-[#2ECC71] to-[#10B981]">
                Decision Intelligence
              </span>
            </h1>
            <p className="text-sm sm:text-base text-[var(--m-text-muted)] font-medium leading-relaxed max-w-xl">
              Turn real-time atmospheric telemetry, soil hydrology, and numerical weather models into timely, actionable field decisions.
            </p>
          </div>

          {/* Location & AMFU Node Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--m-surface-1)] border border-[var(--m-border)] shadow-inner space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--m-border)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/30 flex items-center justify-center text-[var(--m-accent)]">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                    {selectedDistrict}, {selectedState}
                  </h2>
                  <span className="text-xs font-mono text-[var(--m-accent)]">
                    {bulletin.amfuUnit || `AMFU ${selectedDistrict} • State Agricultural University`}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-[var(--m-text-muted)] block">
                  Bulletin Reference
                </span>
                <span className="text-xs font-mono font-bold text-[var(--m-text-primary)]">
                  {bulletin.bulletinNo || 'IMD/GKMS/2026/68'}
                </span>
              </div>
            </div>

            {/* Micro Flow: Weather -> Soil -> Crop -> Risk -> Action */}
            <div className="pt-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--m-text-muted)] block mb-2">
                Integrated Agronomic Decision Architecture
              </span>
              <div className="grid grid-cols-5 gap-1.5 text-center font-mono">
                <div className="p-1.5 rounded-lg bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/20">
                  <span className="text-[10px] font-bold text-[var(--m-accent)] block">WEATHER</span>
                  <span className="text-[9px] text-[var(--m-text-muted)]">31°C / Rain</span>
                </div>
                <div className="p-1.5 rounded-lg bg-[var(--m-ok-soft)] border border-[#10B981]/20">
                  <span className="text-[10px] font-bold text-[var(--m-ok)] block">SOIL</span>
                  <span className="text-[9px] text-[var(--m-text-muted)]">{topsoil}% Moist</span>
                </div>
                <div className="p-1.5 rounded-lg bg-[var(--m-watch-soft)] border border-[var(--m-watch)]/20">
                  <span className="text-[10px] font-bold text-[var(--m-watch)] block">CROP</span>
                  <span className="text-[9px] text-[var(--m-text-muted)] truncate">{selectedCropName.split(' ')[0]}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-[var(--m-danger-soft)] border border-[var(--m-danger)]/20">
                  <span className="text-[10px] font-bold text-[var(--m-danger)] block">RISK</span>
                  <span className="text-[9px] text-[var(--m-text-muted)]">Foliar Blast</span>
                </div>
                <div className="p-1.5 rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/20">
                  <span className="text-[10px] font-bold text-[#A78BFA] block">ACTION</span>
                  <span className="text-[9px] text-[var(--m-text-muted)]">Delay Water</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Environmental, Crop Canopy & Multi-Tier Soil Profile Visualization */}
        <div className="lg:col-span-5">
          <div className="relative rounded-2xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] p-5 shadow-xl overflow-hidden space-y-4">
            {/* Header / Field State summary */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--m-ok)]" />
                <span className="text-xs font-mono font-bold text-white">
                  Field Environment Cross-Section
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--m-ok-soft)] text-[var(--m-ok)] border border-[#10B981]/30">
                Live Sensor Feed
              </span>
            </div>

            {/* Visual Cross-Section Graphic */}
            <div className="space-y-3">
              {/* Atmospheric Canopy Layer */}
              <div className="p-3.5 rounded-xl bg-gradient-to-b from-[var(--m-accent)]/10 to-[#10B981]/5 border border-[var(--m-accent)]/20">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-1.5 text-[var(--m-accent)] font-mono font-bold">
                    <Sun className="w-3.5 h-3.5" />
                    <span>Atmospheric Boundary Layer</span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--m-text-primary)]">
                    Max 31.4°C • RH 78%
                  </span>
                </div>

                {/* SVG Silhouette of Clouds, Light Showers, Crop Heads */}
                <div className="h-16 w-full relative overflow-hidden rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex items-end justify-between px-3 pb-1">
                  {/* Rain drops simulation vector */}
                  <div className="absolute inset-0 flex justify-around opacity-40">
                    <div className="w-0.5 h-3 bg-[var(--m-accent)] animate-pulse self-start mt-2"></div>
                    <div className="w-0.5 h-4 bg-[var(--m-accent)] animate-pulse self-start mt-4 delay-100"></div>
                    <div className="w-0.5 h-3 bg-[var(--m-accent)] animate-pulse self-start mt-1 delay-200"></div>
                    <div className="w-0.5 h-4 bg-[var(--m-accent)] animate-pulse self-start mt-3 delay-300"></div>
                  </div>

                  {/* Crop Canopy Stems */}
                  <div className="relative z-10 flex items-end gap-2 w-full justify-around">
                    {[1, 2, 3, 4, 5, 6, 7].map((stem) => (
                      <div key={stem} className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-[#10B981] shadow-sm"></div>
                        <div
                          className="w-1 bg-[#2ECC71] rounded-t"
                          style={{ height: `${24 + (stem % 3) * 6}px` }}
                        ></div>
                      </div>
                    ))}
                  </div>
                  <span className="absolute bottom-1 right-2 text-[9px] font-mono text-[var(--m-text-muted)]">
                    Active Growth Stage: Tillering
                  </span>
                </div>
              </div>

              {/* Multi-Tier Soil Horizon Profile */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono font-bold text-[var(--m-text-muted)] flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-[var(--m-accent)]" />
                  <span>Soil Hydrology Profile</span>
                </span>

                {/* Layer 1: Topsoil (0-15 cm) */}
                <div className="p-2.5 rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border)] flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-white font-bold block">Topsoil (0–15 cm)</span>
                    <span className="text-[10px] text-[var(--m-text-muted)]">Seedbed &amp; Active Tiller Zone</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-[var(--m-ok)]">{topsoil}%</span>
                    <span className="text-[9px] text-[#2ECC71] block">Adequate Moisture</span>
                  </div>
                </div>

                {/* Layer 2: Root-Zone (15-45 cm) */}
                <div className="p-2.5 rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border)] flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-white font-bold block">Root-Zone (15–45 cm)</span>
                    <span className="text-[10px] text-[var(--m-text-muted)]">Primary Water Uptake Zone</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-[var(--m-accent)]">{rootZone}%</span>
                    <span className="text-[9px] text-[var(--m-accent)] block">Optimal Capacity</span>
                  </div>
                </div>

                {/* Layer 3: Subsoil (45-100 cm) */}
                <div className="p-2.5 rounded-xl bg-[var(--m-surface-1)] border border-[var(--m-border)] flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-white font-bold block">Deep Subsoil (45–100 cm)</span>
                    <span className="text-[10px] text-[var(--m-text-muted)]">Water Table &amp; Base Recharge</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-[#A78BFA]">{subsoil}%</span>
                    <span className="text-[9px] text-[var(--m-text-muted)] block">Perched Reservoir</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Micro Stat Bar */}
            <div className="pt-2 border-t border-[var(--m-border)] grid grid-cols-2 gap-2 text-center text-[10px] font-mono">
              <div className="p-1.5 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)]">
                <span className="text-[var(--m-text-muted)] block">5-Day Expected Rain</span>
                <span className="text-xs font-bold text-[var(--m-accent)]">{cumulativeRain} mm</span>
              </div>
              <div className="p-1.5 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)]">
                <span className="text-[var(--m-text-muted)] block">Daily ET₀ Loss</span>
                <span className="text-xs font-bold text-[var(--m-ok)]">4.2 mm/day</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
