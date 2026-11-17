import React from 'react';
import { WeatherMapMetric } from './MapLayerControl';

export interface MapLegendBarProps {
  viewMode: 'synoptic' | 'radar';
  activeMetric: WeatherMapMetric;
  sourceName?: string;
  observationTime?: string;
  dataStatus?: 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE';
}

export const MapLegendBar: React.FC<MapLegendBarProps> = ({
  viewMode,
  activeMetric,
  sourceName = 'RainViewer Composite / Regional Reference',
  observationTime = 'Awaiting telemetry sync',
  dataStatus = 'RECENT',
}) => {
  // Metric color steps
  const renderMetricScale = () => {
    if (viewMode === 'radar') {
      return (
        <div className="flex items-center gap-2 text-[10px] flex-wrap">
          <span className="text-[#B6C7D8] font-semibold">Reflectivity (dBZ):</span>
          <div className="flex items-center gap-1 flex-wrap font-mono tabular-nums">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#0284C7] text-white">5 Light</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#1565C0] text-white">20 Mod</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F59E0B] text-slate-950">35 Heavy</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EF4444] text-white">50+ Intense</span>
          </div>
        </div>
      );
    }

    switch (activeMetric) {
      case 'temperature':
        return (
          <div className="flex items-center gap-2 text-[10px] flex-wrap">
            <span className="text-[#B6C7D8] font-semibold">Temperature (°C):</span>
            <div className="flex items-center gap-1 font-mono tabular-nums">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#0EA5E9] text-white">&lt;20</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#22C7A0] text-slate-950">20–28</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F59E0B] text-slate-950">28–35</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EF4444] text-white">&gt;35</span>
            </div>
          </div>
        );
      case 'rainfall':
        return (
          <div className="flex items-center gap-2 text-[10px] flex-wrap">
            <span className="text-[#B6C7D8] font-semibold">Rainfall (24h mm):</span>
            <div className="flex items-center gap-1 font-mono tabular-nums">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#334155] text-white">0</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#0284C7] text-white">1–15</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#1565C0] text-white">16–50</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#8B5CF6] text-white">&gt;50</span>
            </div>
          </div>
        );
      case 'aqi':
        return (
          <div className="flex items-center gap-2 text-[10px] flex-wrap">
            <span className="text-[#B6C7D8] font-semibold">Air Quality Index:</span>
            <div className="flex items-center gap-1 font-mono tabular-nums">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#22C7A0] text-slate-950">0–50 Good</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F59E0B] text-slate-950">51–100 Mod</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F97316] text-white">101–200 Poor</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EF4444] text-white">&gt;200 Severe</span>
            </div>
          </div>
        );
      case 'humidity':
        return (
          <div className="flex items-center gap-2 text-[10px] flex-wrap">
            <span className="text-[#B6C7D8] font-semibold">Humidity (%):</span>
            <div className="flex items-center gap-1 font-mono tabular-nums">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#14B8A6] text-slate-950">&lt;40</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#0EA5E9] text-white">40–60</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#0284C7] text-white">60–80</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#1D4ED8] text-white">&gt;80</span>
            </div>
          </div>
        );
      case 'wind':
        return (
          <div className="flex items-center gap-2 text-[10px] flex-wrap">
            <span className="text-[#B6C7D8] font-semibold">Wind (km/h):</span>
            <div className="flex items-center gap-1 font-mono tabular-nums">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#0EA5E9] text-white">&lt;15 Gentle</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F59E0B] text-slate-950">15–30 Mod</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EF4444] text-white">&gt;30 Strong</span>
            </div>
          </div>
        );
      case 'warnings':
        return (
          <div className="flex items-center gap-2 text-[10px] flex-wrap">
            <span className="text-[#B6C7D8] font-semibold">Hazard Tier:</span>
            <div className="flex items-center gap-1 font-mono">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#22C7A0] text-slate-950">Normal</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F59E0B] text-slate-950">Watch</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F97316] text-white">Alert</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EF4444] text-white">Severe</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    switch (dataStatus) {
      case 'LIVE':
        return (
          <span className="flex items-center gap-1.5 font-semibold text-[#22C7A0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C7A0]" />
            LIVE
          </span>
        );
      case 'RECENT':
        return (
          <span className="flex items-center gap-1.5 font-semibold text-[#38BDF8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
            RECENT
          </span>
        );
      case 'STALE':
        return (
          <span className="flex items-center gap-1.5 font-semibold text-[#F59E0B]">
            STALE
          </span>
        );
      case 'UNAVAILABLE':
      default:
        return (
          <span className="flex items-center gap-1.5 font-semibold text-[#EF4444]">
            UNAVAILABLE
          </span>
        );
    }
  };

  return (
    <div className="bg-[#101B26] border border-white/12 rounded-xl px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs text-[#B6C7D8]">
      <div>{renderMetricScale()}</div>

      <div className="flex items-center gap-3 flex-wrap text-[11px] text-[#8EA3B8]">
        <div>
          <span>Source: </span>
          <strong className="text-[#F4F7FA] font-medium">{sourceName}</strong>
        </div>
        <span className="hidden sm:inline">•</span>
        <div>
          <span>Timestamp: </span>
          <span className="font-mono tabular-nums text-[#B6C7D8]">{observationTime}</span>
        </div>
        <span className="hidden sm:inline">•</span>
        <div className="flex items-center gap-1.5 font-mono">
          <span>Status:</span>
          {getStatusBadge()}
        </div>
      </div>
    </div>
  );
};

export default MapLegendBar;
