import React, { useState } from 'react';
import {
  Layers,
  Download,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { downloadRadarIntensityCsv } from '../../utils/radarCsvExporter';

export type LegendMetricMode = 'all' | 'precipitation' | 'wind';
export type PrecipUnit = 'dBZ' | 'mm/h' | 'in/h';
export type WindUnit = 'km/h' | 'kt' | 'mph';
export type PrecipLevelId = 'trace' | 'light' | 'moderate' | 'heavy' | 'intense' | 'extreme';

export interface PrecipInterval {
  id: PrecipLevelId;
  dbzRange: string;
  rateRange: string;
  rateRangeIn: string;
  label: string;
  shortLabel: string;
  color: string;
  textColor: string;
  description: string;
  minDbz: number;
  maxDbz: number;
  minRateMm: number;
  maxRateMm: number;
  minRateIn: number;
  maxRateIn: number;
}

export interface WindInterval {
  id: string;
  kmhRange: string;
  ktRange: string;
  mphRange: string;
  label: string;
  color: string;
  textColor: string;
  description: string;
}

export const PRECIP_INTERVALS: PrecipInterval[] = [
  {
    id: 'trace',
    dbzRange: '< 15',
    rateRange: '< 0.5',
    rateRangeIn: '< 0.02',
    label: 'Trace / Drizzle',
    shortLabel: 'Drizzle',
    color: '#0284C7',
    textColor: '#FFFFFF',
    description: 'Very light drizzle, mist, or non-precipitating cloud echoes',
    minDbz: 0,
    maxDbz: 15,
    minRateMm: 0,
    maxRateMm: 0.5,
    minRateIn: 0,
    maxRateIn: 0.02,
  },
  {
    id: 'light',
    dbzRange: '15 – 30',
    rateRange: '0.5 – 4',
    rateRangeIn: '0.02 – 0.16',
    label: 'Light Rain',
    shortLabel: 'Light',
    color: '#10B981',
    textColor: '#FFFFFF',
    description: 'Steady light rain; wet surfaces with minimal road spray',
    minDbz: 15,
    maxDbz: 30,
    minRateMm: 0.5,
    maxRateMm: 4,
    minRateIn: 0.02,
    maxRateIn: 0.16,
  },
  {
    id: 'moderate',
    dbzRange: '30 – 40',
    rateRange: '4 – 15',
    rateRangeIn: '0.16 – 0.60',
    label: 'Moderate Rain',
    shortLabel: 'Moderate',
    color: '#FACC15',
    textColor: '#0B1E30',
    description: 'Moderate steady showers; reduced visibility on roadways',
    minDbz: 30,
    maxDbz: 40,
    minRateMm: 4,
    maxRateMm: 15,
    minRateIn: 0.16,
    maxRateIn: 0.6,
  },
  {
    id: 'heavy',
    dbzRange: '40 – 50',
    rateRange: '15 – 50',
    rateRangeIn: '0.60 – 2.0',
    label: 'Heavy Rain',
    shortLabel: 'Heavy',
    color: '#FB923C',
    textColor: '#0B1E30',
    description: 'Heavy downpour, convective thunderstorm cores, localized waterlogging',
    minDbz: 40,
    maxDbz: 50,
    minRateMm: 15,
    maxRateMm: 50,
    minRateIn: 0.6,
    maxRateIn: 2.0,
  },
  {
    id: 'intense',
    dbzRange: '50 – 60',
    rateRange: '50 – 100',
    rateRangeIn: '2.0 – 4.0',
    label: 'Very Heavy',
    shortLabel: 'Very Heavy',
    color: '#EF4444',
    textColor: '#FFFFFF',
    description: 'Intense cloudburst or squall line; severe flash-flood potential',
    minDbz: 50,
    maxDbz: 60,
    minRateMm: 50,
    maxRateMm: 100,
    minRateIn: 2.0,
    maxRateIn: 4.0,
  },
  {
    id: 'extreme',
    dbzRange: '> 60',
    rateRange: '> 100',
    rateRangeIn: '> 4.0',
    label: 'Extreme / Hail',
    shortLabel: 'Hail / Squall',
    color: '#C026D3',
    textColor: '#FFFFFF',
    description: 'Violent convective core; large hail, severe downbursts or microbursts',
    minDbz: 60,
    maxDbz: 90,
    minRateMm: 100,
    maxRateMm: 300,
    minRateIn: 4.0,
    maxRateIn: 12.0,
  },
];

export const WIND_INTERVALS: WindInterval[] = [
  {
    id: 'breeze',
    kmhRange: '< 20',
    ktRange: '< 11',
    mphRange: '< 12',
    label: 'Light Breeze',
    color: '#38BDF8',
    textColor: '#0B1E30',
    description: 'Gentle breeze; leaves rustle; normal outdoor activity',
  },
  {
    id: 'moderate',
    kmhRange: '20 – 40',
    ktRange: '11 – 21',
    mphRange: '12 – 25',
    label: 'Moderate Wind',
    color: '#00C897',
    textColor: '#0B1E30',
    description: 'Moderate to fresh breeze; dust raised; small branches move',
  },
  {
    id: 'strong',
    kmhRange: '40 – 60',
    ktRange: '22 – 33',
    mphRange: '25 – 37',
    label: 'Strong / Squall',
    color: '#F59E0B',
    textColor: '#0B1E30',
    description: 'Strong breeze to near-gale; umbrella difficult; choppy coastal waters',
  },
  {
    id: 'gale',
    kmhRange: '60 – 90',
    ktRange: '34 – 48',
    mphRange: '37 – 56',
    label: 'Gale Force (IMD Alert)',
    color: '#EA580C',
    textColor: '#FFFFFF',
    description: 'IMD Cyclonic warning threshold; structural damage, snapped tree twigs',
  },
  {
    id: 'storm',
    kmhRange: '90 – 120',
    ktRange: '49 – 64',
    mphRange: '56 – 75',
    label: 'Storm Force',
    color: '#DC2626',
    textColor: '#FFFFFF',
    description: 'Severe storm; high structural damage; fishermen advisory in full effect',
  },
  {
    id: 'violent',
    kmhRange: '> 120',
    ktRange: '> 64',
    mphRange: '> 75',
    label: 'Severe Cyclone',
    color: '#7E22CE',
    textColor: '#FFFFFF',
    description: 'Extremely Severe Cyclonic Storm / Hurricane Force; catastrophic gust risk',
  },
];

export const ALL_PRECIP_LEVEL_IDS: PrecipLevelId[] = [
  'trace',
  'light',
  'moderate',
  'heavy',
  'intense',
  'extreme',
];

export interface RadarMapLegendPanelProps {
  initialMetric?: LegendMetricMode;
  initialCollapsed?: boolean;
  className?: string;
  positionClass?: string;
  onMetricChange?: (mode: LegendMetricMode) => void;
  showToggleOnly?: boolean;
  activePrecipLevels?: PrecipLevelId[];
  onPrecipLevelsChange?: (levels: PrecipLevelId[]) => void;
  sectorName?: string;
  stationName?: string;
  timestamp?: string | number;
}

export const RadarMapLegendPanel: React.FC<RadarMapLegendPanelProps> = ({
  initialMetric = 'all',
  initialCollapsed = true,
  className = '',
  positionClass = 'bottom-3 right-3',
  onMetricChange,
  activePrecipLevels,
  onPrecipLevelsChange,
  sectorName,
  stationName,
  timestamp,
}) => {
  const [metricMode, setMetricMode] = useState<LegendMetricMode>(initialMetric);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(initialCollapsed);
  const [precipUnit, setPrecipUnit] = useState<PrecipUnit>('dBZ');
  const [windUnit, setWindUnit] = useState<WindUnit>('km/h');
  const [hoveredInterval, setHoveredInterval] = useState<string | null>(null);

  const [exportStatus, setExportStatus] = useState<'idle' | 'success'>('idle');
  const [exportedFilename, setExportedFilename] = useState<string>('');

  const [internalLevels, setInternalLevels] = useState<PrecipLevelId[]>(ALL_PRECIP_LEVEL_IDS);
  const effectiveLevels = activePrecipLevels !== undefined ? activePrecipLevels : internalLevels;

  const handleExportCsv = () => {
    try {
      const filename = downloadRadarIntensityCsv({
        activePrecipLevels: effectiveLevels,
        precipUnit,
        windUnit,
        metricMode,
        sectorName,
        stationName,
        timestamp,
      });
      setExportedFilename(filename);
      setExportStatus('success');
      setTimeout(() => {
        setExportStatus('idle');
      }, 3500);
    } catch (err) {
      console.error('Failed to export radar intensity CSV:', err);
    }
  };

  const updateLevels = (newLevels: PrecipLevelId[]) => {
    if (activePrecipLevels === undefined) {
      setInternalLevels(newLevels);
    }
    onPrecipLevelsChange?.(newLevels);
  };

  const handleToggleLevel = (id: PrecipLevelId) => {
    if (effectiveLevels.includes(id)) {
      updateLevels(effectiveLevels.filter((lvl) => lvl !== id));
    } else {
      const next = [...effectiveLevels, id];
      next.sort(
        (a, b) => ALL_PRECIP_LEVEL_IDS.indexOf(a) - ALL_PRECIP_LEVEL_IDS.indexOf(b)
      );
      updateLevels(next);
    }
  };

  const handleSelectAll = () => updateLevels(ALL_PRECIP_LEVEL_IDS);

  const handleSelectPreset = (preset: 'all' | 'modPlus' | 'severe' | 'clear') => {
    switch (preset) {
      case 'all':
        updateLevels(ALL_PRECIP_LEVEL_IDS);
        break;
      case 'modPlus':
        updateLevels(['moderate', 'heavy', 'intense', 'extreme']);
        break;
      case 'severe':
        updateLevels(['heavy', 'intense', 'extreme']);
        break;
      case 'clear':
        updateLevels([]);
        break;
    }
  };

  const isFilteringActive = effectiveLevels.length < ALL_PRECIP_LEVEL_IDS.length;

  const handleSelectMetric = (mode: LegendMetricMode) => {
    setMetricMode(mode);
    onMetricChange?.(mode);
  };

  const activeHoverInfo = (() => {
    if (!hoveredInterval) return null;
    if (hoveredInterval.startsWith('precip-')) {
      const id = hoveredInterval.replace('precip-', '') as PrecipLevelId;
      const item = PRECIP_INTERVALS.find((p) => p.id === id);
      if (!item) return null;
      const isAct = effectiveLevels.includes(id);
      const valStr =
        precipUnit === 'dBZ'
          ? `${item.dbzRange} dBZ`
          : precipUnit === 'in/h'
          ? `${item.rateRangeIn} in/hr`
          : `${item.rateRange} mm/hr`;
      return {
        title: `${item.label} (${valStr})`,
        description: `${item.description} · ${isAct ? 'Visible on map' : 'Filtered out'} (Click to toggle)`,
        color: item.color,
      };
    }
    if (hoveredInterval.startsWith('wind-')) {
      const id = hoveredInterval.replace('wind-', '');
      const item = WIND_INTERVALS.find((w) => w.id === id);
      if (!item) return null;
      const valStr =
        windUnit === 'km/h'
          ? `${item.kmhRange} km/h`
          : windUnit === 'mph'
          ? `${item.mphRange} mph`
          : `${item.ktRange} kt`;
      return {
        title: `${item.label} (${valStr})`,
        description: item.description,
        color: item.color,
      };
    }
    return null;
  })();

  return (
    <aside
      id="radar-map-persistent-legend"
      role="region"
      aria-label="Radar Reflectivity and Wind Speed Intensity Scale"
      className={`absolute z-[400] pointer-events-auto select-none transition-all duration-200 ${positionClass} ${className}`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {isCollapsed ? (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0B1927]/95 hover:bg-[#101F2E] backdrop-blur-md border text-[#F3F6FA] shadow-xl transition-colors cursor-pointer max-w-[calc(100vw-24px)] ${
            isFilteringActive
              ? 'border-[#F59E0B]'
              : 'border-[#26394B]'
          }`}
          title="Expand persistent radar intensity legend panel and filter map layers"
          aria-expanded={false}
        >
          <Layers className="w-4 h-4 text-[#35C7E8] shrink-0" />
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold tracking-wider text-[#F3F6FA]">
                RADAR LEGEND
              </span>
              {isFilteringActive && (
                <span className="text-[8px] font-bold px-1 rounded bg-[#F59E0B] text-slate-950 font-mono">
                  FILTERED ({effectiveLevels.length}/6)
                </span>
              )}
            </div>
            <span className="text-[9px] text-[#8295A8] font-mono">
              Precip ({precipUnit === 'in/h' ? 'in/hr' : precipUnit === 'mm/h' ? 'mm/hr' : 'dBZ'}) · Wind ({windUnit})
            </span>
          </div>

          <div className="flex items-center gap-0.5 ml-1">
            {PRECIP_INTERVALS.map((intv) => {
              const isAct = effectiveLevels.includes(intv.id);
              return (
                <div
                  key={intv.id}
                  className={`w-2 h-2.5 rounded-xs transition-opacity ${
                    isAct ? 'opacity-100' : 'opacity-20 grayscale'
                  }`}
                  style={{ backgroundColor: intv.color }}
                  title={`${intv.label}: ${isAct ? 'Visible' : 'Hidden'}`}
                />
              );
            })}
          </div>

          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              handleExportCsv();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                handleExportCsv();
              }
            }}
            className="w-6 h-6 rounded hover:bg-[#101F2E] text-[#35C7E8] hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-0.5"
            title="Download currently filtered radar intensity data as CSV"
            aria-label="Export filtered data as CSV"
          >
            {exportStatus === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#6EE7B7]" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
          </span>
          <ChevronDown className="w-4 h-4 text-[#35C7E8] shrink-0" />
        </button>
      ) : (
        <div className="w-[300px] sm:w-[340px] max-w-[calc(100vw-24px)] rounded-xl bg-[#0B1927]/95 backdrop-blur-md border border-[#26394B] text-[#F3F6FA] shadow-xl p-3 flex flex-col gap-2.5">
          {/* Header */}
          <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-[#26394B]">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#35C7E8] shrink-0" />
              <div className="flex flex-col">
                <span className="font-mono text-[11px] font-bold text-[#F3F6FA] tracking-wider leading-none">
                  RADAR INTENSITY
                </span>
                <span className="text-[9px] text-[#8295A8] font-mono leading-tight">
                  Layer Filter
                </span>
              </div>
            </div>

            <div className="flex items-center bg-[#08131F] p-0.5 rounded-md border border-[#26394B]">
              {(['all', 'precipitation', 'wind'] as LegendMetricMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleSelectMetric(mode)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-colors cursor-pointer uppercase ${
                    metricMode === mode
                      ? 'bg-[#0B72B9] text-white'
                      : 'text-[#8295A8] hover:text-[#F3F6FA]'
                  }`}
                >
                  {mode === 'precipitation' ? 'PRECIP' : mode}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="w-6 h-6 rounded hover:bg-[#101F2E] text-[#8295A8] hover:text-[#F3F6FA] flex items-center justify-center transition-colors cursor-pointer"
              title="Collapse legend panel"
              aria-label="Collapse legend panel"
              aria-expanded={true}
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          {/* Precipitation Filter */}
          {(metricMode === 'all' || metricMode === 'precipitation') && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-[#35C7E8]">PRECIPITATION</span>
                  <span className="text-[#8295A8] text-[9px] hidden xs:inline">
                    ({precipUnit === 'dBZ' ? 'Reflectivity' : precipUnit === 'in/h' ? 'Imperial' : 'Metric'})
                  </span>
                </div>
                <div
                  className="flex items-center bg-[#08131F] p-0.5 rounded border border-[#26394B] text-[9px] font-mono"
                  role="group"
                  aria-label="Precipitation unit toggle"
                >
                  {(['dBZ', 'mm/h', 'in/h'] as PrecipUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setPrecipUnit(u)}
                      className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer font-bold ${
                        precipUnit === u
                          ? 'bg-[#35C7E8] text-[#07111D]'
                          : 'text-[#8295A8] hover:text-[#F3F6FA]'
                      }`}
                    >
                      {u === 'dBZ' ? 'dBZ' : u === 'mm/h' ? 'mm/hr' : 'in/hr'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between bg-[#08131F] px-2 py-1 rounded-md border border-[#26394B] text-[9px] font-mono">
                <span className="text-[#8295A8] font-semibold flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3 text-[#35C7E8]" />
                  <span>Filter:</span>
                  <strong className={isFilteringActive ? 'text-[#FCD34D]' : 'text-[#6EE7B7]'}>
                    {effectiveLevels.length}/6
                  </strong>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('all')}
                    className={`px-1.5 py-0.5 rounded text-[9px] transition-colors cursor-pointer ${
                      effectiveLevels.length === 6
                        ? 'bg-[#0B72B9] text-white font-bold'
                        : 'text-[#8295A8] hover:text-[#F3F6FA] bg-[#101F2E]'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('modPlus')}
                    className="px-1.5 py-0.5 rounded text-[9px] text-[#8295A8] hover:text-[#F3F6FA] bg-[#101F2E] transition-colors cursor-pointer"
                  >
                    {precipUnit === 'in/h' ? '≥0.16 in/hr' : precipUnit === 'mm/h' ? '≥4 mm/hr' : '≥30 dBZ'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('severe')}
                    className="px-1.5 py-0.5 rounded text-[9px] text-[#8295A8] hover:text-[#F3F6FA] bg-[#101F2E] transition-colors cursor-pointer"
                  >
                    {precipUnit === 'in/h' ? '≥0.60 in/hr' : precipUnit === 'mm/h' ? '≥15 mm/hr' : '≥40 dBZ'}
                  </button>
                  {isFilteringActive && (
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-1 py-0.5 rounded text-[9px] text-[#FCD34D] hover:text-white underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-1.5 py-0.5 rounded text-[9px] text-[#35C7E8] hover:text-white bg-[#101F2E] border border-[#26394B] transition-colors cursor-pointer flex items-center gap-0.5"
                    title="Download currently filtered intensity data as CSV"
                  >
                    {exportStatus === 'success' ? (
                      <CheckCircle2 className="w-2.5 h-2.5 text-[#6EE7B7]" />
                    ) : (
                      <Download className="w-2.5 h-2.5" />
                    )}
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              <div
                className="h-2 rounded-sm border border-[#26394B]"
                style={{
                  background:
                    'linear-gradient(to right, #0284C7 0%, #10B981 20%, #FACC15 40%, #FB923C 60%, #EF4444 80%, #C026D3 100%)',
                }}
              />

              <div className="grid grid-cols-2 gap-1.5">
                {PRECIP_INTERVALS.map((interval) => {
                  const isHovered = hoveredInterval === `precip-${interval.id}`;
                  const isActive = effectiveLevels.includes(interval.id);
                  const displayValue =
                    precipUnit === 'dBZ'
                      ? `${interval.dbzRange} dBZ`
                      : precipUnit === 'in/h'
                      ? `${interval.rateRangeIn} in/hr`
                      : `${interval.rateRange} mm/hr`;

                  return (
                    <button
                      key={interval.id}
                      type="button"
                      onClick={() => handleToggleLevel(interval.id)}
                      onMouseEnter={() => setHoveredInterval(`precip-${interval.id}`)}
                      onMouseLeave={() => setHoveredInterval(null)}
                      aria-pressed={isActive}
                      aria-label={`Toggle ${interval.label} (${displayValue}) map layer`}
                      className={`p-1.5 rounded-lg border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                        isActive
                          ? isHovered
                            ? 'bg-[#101F2E] border-[#35C7E8]'
                            : 'bg-[#08131F] border-[#26394B]'
                          : 'bg-[#07111D]/60 border-[#26394B]/50 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 w-full mb-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className="w-3 h-3 rounded-xs shrink-0 flex items-center justify-center"
                            style={{
                              backgroundColor: interval.color,
                              color: interval.textColor,
                            }}
                          >
                            {isActive && <Check className="w-2.5 h-2.5" />}
                          </span>
                          <span
                            className={`font-mono font-bold text-[9.5px] truncate tabular-nums ${
                              isActive ? 'text-[#F3F6FA]' : 'text-[#8295A8] line-through'
                            }`}
                          >
                            {displayValue}
                          </span>
                        </div>

                        <span
                          className={`text-[8px] font-mono font-bold px-1 rounded shrink-0 ${
                            isActive
                              ? 'bg-[#0B72B9] text-white'
                              : 'bg-[#101F2E] text-[#8295A8]'
                          }`}
                        >
                          {isActive ? 'ON' : 'OFF'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-[#8295A8] font-medium leading-tight truncate">
                        <span className="truncate">{interval.shortLabel}</span>
                        {isActive ? (
                          <Eye className="w-3 h-3 text-[#B5C3D1] shrink-0" />
                        ) : (
                          <EyeOff className="w-3 h-3 text-[#8295A8] shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Wind Speed Section */}
          {(metricMode === 'all' || metricMode === 'wind') && (
            <div
              className={`flex flex-col gap-1.5 ${
                metricMode === 'all' ? 'pt-2 border-t border-[#26394B]' : ''
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1">
                  <span className="font-mono font-bold text-[#6EE7B7]">WIND SPEED</span>
                  <span className="text-[#8295A8] text-[9px] hidden xs:inline">
                    ({windUnit === 'km/h' ? 'Radial Vel.' : windUnit === 'mph' ? 'Statute' : 'Knots'})
                  </span>
                </div>
                <div
                  className="flex items-center bg-[#08131F] p-0.5 rounded border border-[#26394B] text-[9px] font-mono"
                  role="group"
                  aria-label="Wind speed unit toggle"
                >
                  {(['km/h', 'kt', 'mph'] as WindUnit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setWindUnit(u)}
                      className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer font-bold ${
                        windUnit === u
                          ? 'bg-[#22C7A0] text-[#07111D]'
                          : 'text-[#8295A8] hover:text-[#F3F6FA]'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="h-2 rounded-sm border border-[#26394B]"
                style={{
                  background:
                    'linear-gradient(to right, #38BDF8 0%, #00C897 20%, #F59E0B 40%, #EA580C 60%, #DC2626 80%, #7E22CE 100%)',
                }}
              />

              <div className="grid grid-cols-3 gap-1">
                {WIND_INTERVALS.map((interval) => {
                  const isHovered = hoveredInterval === `wind-${interval.id}`;
                  const displayValue =
                    windUnit === 'km/h'
                      ? `${interval.kmhRange} km/h`
                      : windUnit === 'mph'
                      ? `${interval.mphRange} mph`
                      : `${interval.ktRange} kt`;

                  return (
                    <div
                      key={interval.id}
                      onMouseEnter={() => setHoveredInterval(`wind-${interval.id}`)}
                      onMouseLeave={() => setHoveredInterval(null)}
                      className={`p-1 rounded border transition-colors cursor-default ${
                        isHovered
                          ? 'bg-[#101F2E] border-[#6EE7B7]'
                          : 'bg-[#08131F] border-[#26394B]'
                      }`}
                      title={`${interval.label} (${interval.kmhRange} km/h | ${interval.ktRange} kt | ${interval.mphRange} mph): ${interval.description}`}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: interval.color }}
                        />
                        <span className="font-mono font-bold text-[9px] text-[#F3F6FA] truncate tabular-nums">
                          {displayValue}
                        </span>
                      </div>
                      <div className="text-[8.5px] text-[#8295A8] font-medium leading-tight truncate">
                        {interval.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeHoverInfo && (
            <div className="bg-[#08131F] border border-[#35C7E8]/40 p-1.5 rounded-md text-[9.5px] text-[#B5C3D1] flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: activeHoverInfo.color }}
              />
              <div className="truncate">
                <strong className="text-[#F3F6FA] mr-1">{activeHoverInfo.title}:</strong>
                <span>{activeHoverInfo.description}</span>
              </div>
            </div>
          )}

          {/* Export Filtered Data Action */}
          <div className="pt-2 border-t border-[#26394B] flex flex-col gap-1.5">
            <button
              type="button"
              id="btn-export-radar-legend-csv"
              onClick={handleExportCsv}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-[10px] font-mono font-bold transition-colors cursor-pointer select-none ${
                exportStatus === 'success'
                  ? 'bg-[#22C7A0]/15 border-[#22C7A0]/45 text-[#6EE7B7]'
                  : 'bg-[#08131F] hover:bg-[#101F2E] border-[#26394B] hover:border-[#35C7E8] text-[#F3F6FA]'
              }`}
              title="Download currently filtered precipitation intensity, reflectivity thresholds & synoptic observations as CSV"
            >
              {exportStatus === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#6EE7B7]" />
              ) : (
                <Download className="w-3.5 h-3.5 text-[#35C7E8]" />
              )}
              <span>
                {exportStatus === 'success'
                  ? 'CSV Exported'
                  : `Export Data (CSV) · ${effectiveLevels.length} of 6 Active`}
              </span>
            </button>

            {exportStatus === 'success' && exportedFilename && (
              <div className="text-[8.5px] font-mono text-[#6EE7B7] flex items-center justify-center gap-1 bg-[#22C7A0]/10 px-2 py-0.5 rounded border border-[#22C7A0]/30">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span className="truncate">Saved as {exportedFilename}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-[8.5px] font-mono text-[#8295A8] pt-0.5">
              <span>
                {isFilteringActive ? (
                  <span className="text-[#FCD34D] font-bold">
                    Filter Active ({effectiveLevels.length}/6)
                  </span>
                ) : (
                  <span>IMD Doppler DWR Standard</span>
                )}
              </span>
              <span className="text-[#35C7E8]">Calibrated S/C-Band</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default RadarMapLegendPanel;
