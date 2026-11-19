import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { WeatherDataBundle } from '../services/weatherService';
import { LocationRecord } from '../types';
import { LocatingPhase } from '../services/geolocationService';
import { AQISection } from '../components/environment/AQISection';
import { PollenSection } from '../components/environment/PollenSection';
import { IndiaWeatherMap, StateWeatherData } from '../components/map/IndiaWeatherMap';
import { WeatherMapMetric } from '../components/map/MapLayerControl';
import { INDIA_WEATHER_DATA } from '../data/indiaWeatherData';
import { DataTable, ColumnDef } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import DateCalendar from '../components/DateCalendar';
import { formatDateShort, formatDateISO } from '../utils/dateUtils';
import { formatCoordinatePair } from '../../shared/weatherContract';
import { useProvider } from '../store/providerStore';
import {
  DataPanel,
  MetricValue,
  PageHeader,
  ProvenanceStatus,
  SectionHeading,
  SourceStatus,
  UnavailableState,
} from '../components/ui/ObservatoryPrimitives';
import {
  Activity,
  Flower2,
  MapPin,
  Calendar,
  Sparkles,
  ChevronDown,
  X,
  Download,
  Loader2,
  Map as MapIcon,
  LocateFixed,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface AirQualityPageProps {
  weatherBundle: WeatherDataBundle;
  selectedLocation: LocationRecord;
  onStateSelect?: (state: StateWeatherData) => void;
  onSelectLocation?: (loc: LocationRecord) => void;
  onDetectLocation?: (forceRefresh?: boolean) => Promise<any>;
  isLocating?: boolean;
  locatePhase?: LocatingPhase;
  locationSource?: 'DEVICE_GPS' | 'MANUAL_SEARCH';
  onOpenLocationCenter?: () => void;
}

const CustomTrendTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const pm25 = data.pm25;
  const pollen = data.pollen;
  const aqi = data.aqi;
  const isAboveStandard = typeof pm25 === 'number' && pm25 > 60;

  const aqiCategory =
    aqi === undefined || aqi === null
      ? { name: '—', color: '#8295A8' }
      : aqi <= 50
      ? { name: 'Good', color: '#22C7A0' }
      : aqi <= 100
      ? { name: 'Satisfactory', color: '#22C7A0' }
      : aqi <= 200
      ? { name: 'Moderate', color: '#F59E0B' }
      : aqi <= 300
      ? { name: 'Poor', color: '#F97316' }
      : { name: 'Very Poor', color: '#EF4444' };

  const pollenRisk =
    pollen === undefined || pollen === null
      ? { label: 'Unavailable', color: '#8295A8' }
      : pollen <= 2
      ? { label: 'Low', color: '#22C7A0' }
      : pollen <= 3.5
      ? { label: 'Moderate', color: '#F59E0B' }
      : { label: 'High Allergen Risk', color: '#EF4444' };

  return (
    <div className="rounded-xl bg-[#08131F] border border-[#38536A] p-3.5 min-w-[235px] text-xs flex flex-col gap-2.5 shadow-xl">
      <div className="flex items-center justify-between pb-2 border-b border-[#26394B]">
        <div className="flex items-center gap-1.5 text-[#F3F6FA] font-semibold">
          <Calendar className="w-3.5 h-3.5 text-[#35C7E8]" />
          <span>{label || data.day || data.date}</span>
        </div>
        {aqi !== undefined && aqi !== null && (
          <span
            className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border"
            style={{
              color: aqiCategory.color,
              backgroundColor: `${aqiCategory.color}15`,
              borderColor: `${aqiCategory.color}40`,
            }}
          >
            AQI {aqi} · {aqiCategory.name}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 font-mono tabular-nums">
        {pm25 !== undefined && pm25 !== null && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[#8295A8]">PM2.5 Fine Dust</span>
              <span className="font-bold text-[#F3F6FA]">
                {pm25} <span className="text-[10px] text-[#8295A8] font-normal">µg/m³</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-[#07111D] border border-[#26394B]">
              <span className="text-[#8295A8]">CPCB 24h Limit (60)</span>
              <span className={isAboveStandard ? 'text-[#FCA5A5] font-semibold' : 'text-[#6EE7B7] font-semibold'}>
                {isAboveStandard
                  ? `+${Math.round(pm25 - 60)} µg/m³ over`
                  : `${Math.round(60 - pm25)} µg/m³ under`}
              </span>
            </div>
          </>
        )}

        {pollen !== undefined && pollen !== null && (
          <div className="flex items-center justify-between pt-1 border-t border-[#26394B]">
            <span className="text-[#8295A8]">Bio-Pollen Index</span>
            <div className="text-right">
              <span className="font-bold text-[#F3F6FA]">Level {pollen} / 5</span>
              <span className="text-[10px] block" style={{ color: pollenRisk.color }}>
                {pollenRisk.label}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const AirQualityPage: React.FC<AirQualityPageProps> = ({
  weatherBundle,
  selectedLocation,
  onStateSelect,
  onDetectLocation,
  isLocating = false,
  onOpenLocationCenter,
}) => {
  const { current } = weatherBundle;
  const { state: aqiState } = useProvider<any>('AQI');
  const aqiData = aqiState.data;

  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateISO(new Date()));
  const [mapMetric, setMapMetric] = useState<WeatherMapMetric>('aqi');
  const [activeStateName, setActiveStateName] = useState<string>(selectedLocation.state || 'Odisha');
  const [trendView, setTrendView] = useState<'both' | 'pm25' | 'pollen'>('both');
  const [showDateCalendar, setShowDateCalendar] = useState<boolean>(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const [historicalData, setHistoricalData] = useState<any>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const historyCacheRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setShowDateCalendar(false);
      }
    };
    if (showDateCalendar) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showDateCalendar]);

  useEffect(() => {
    if (selectedLocation?.state) {
      setActiveStateName(selectedLocation.state);
    }
  }, [selectedLocation?.state]);

  const activeStateRecord = useMemo(() => {
    return (
      INDIA_WEATHER_DATA.find(
        (s) =>
          s.name.toLowerCase() === activeStateName.toLowerCase() ||
          s.city?.toLowerCase() === activeStateName.toLowerCase()
      ) || INDIA_WEATHER_DATA[0]
    );
  }, [activeStateName]);

  const handleStateSelect = (state: StateWeatherData) => {
    setActiveStateName(state.name);
    if (onStateSelect) {
      onStateSelect(state);
    }
  };

  useEffect(() => {
    if (!selectedDate) return;

    const activeLoc =
      activeStateRecord.city ||
      activeStateRecord.name ||
      selectedLocation.city ||
      selectedLocation.state ||
      'Odisha';
    const rawLat = selectedLocation.lat;
    const rawLon = selectedLocation.lng;
    const lat = typeof rawLat === 'number' && Number.isFinite(rawLat) ? rawLat : 20.2961;
    const lon = typeof rawLon === 'number' && Number.isFinite(rawLon) ? rawLon : 85.8245;
    const stationId =
      selectedLocation.stationId ||
      selectedLocation.id ||
      `CAAQMS-${Math.round(lat * 100)}-${Math.round(lon * 100)}`;
    const cacheKey = `air-quality-${stationId}-${activeLoc}-${selectedDate}-${lat.toFixed(2)}-${lon.toFixed(2)}`;

    if (historyCacheRef.current.has(cacheKey)) {
      setHistoricalData(historyCacheRef.current.get(cacheKey));
      setIsLoadingHistory(false);
      setHistoryError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoadingHistory(true);
    setHistoryError(null);

    const fetchHistory = async () => {
      try {
        const response = await fetch(
          `/api/weather?mode=air&stationId=${encodeURIComponent(stationId)}&location=${encodeURIComponent(activeLoc)}&lat=${lat}&lon=${lon}&date=${selectedDate}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error('Historical data request failed');
        }

        const result = await response.json();
        if (result.status === 'success') {
          historyCacheRef.current.set(cacheKey, result);
          setHistoricalData(result);
        } else {
          throw new Error(result.message || 'Unable to retrieve verified data');
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed to load air quality history:', err);
          setHistoryError('No verified historical telemetry available for this date.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingHistory(false);
        }
      }
    };

    fetchHistory();

    return () => {
      controller.abort();
    };
  }, [selectedDate, activeStateRecord, selectedLocation]);

  const chartData = useMemo(() => {
    if (!historicalData?.observations || !historicalData.observations.length) {
      return [];
    }

    return historicalData.observations.map((item: any) => ({
      date: item.date,
      day: item.day,
      pm25: item.pm25,
      pm10: item.pm10,
      pollen: item.pollen,
      totalPollenGrains: item.totalPollenGrains,
      aqi: item.aqi,
      aqiCategory: item.aqiCategory,
    }));
  }, [historicalData]);

  const visibleChartData = useMemo(() => {
    if (!chartData.length) return [];
    if (trendView === 'pm25') return chartData.map((x: any) => ({ ...x, pollen: undefined }));
    if (trendView === 'pollen') return chartData.map((x: any) => ({ ...x, pm25: undefined }));
    return chartData;
  }, [chartData, trendView]);

  const handleExportCSV = useCallback(() => {
    if (!historicalData?.observations?.length) return;
    const locationStr = activeStateRecord.name.replace(/\s+/g, '_');
    const fileName = `MAUSAM_AirQuality_${locationStr}_${selectedDate}.csv`;

    const headers = [
      'Date',
      'Day_Label',
      'PM2.5_ug_m3',
      'PM10_ug_m3',
      'AQI_Index',
      'Category',
      'Bio_Pollen_Level',
      'Total_Pollen_Grains',
      'NO2_ug_m3',
      'SO2_ug_m3',
      'CO_ug_m3',
      'O3_ug_m3',
    ];
    const rows = historicalData.observations.map((o: any) => [
      o.date,
      `"${o.day}"`,
      o.pm25 ?? '',
      o.pm10 ?? '',
      o.aqi ?? '',
      `"${o.aqiCategory || ''}"`,
      o.pollen ?? '',
      o.totalPollenGrains ?? '',
      o.no2 ?? '',
      o.so2 ?? '',
      o.co ?? '',
      o.o3 ?? '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [historicalData, activeStateRecord, selectedDate]);

  const activeAqi: number | null =
    typeof current.aqi === 'number' && !Number.isNaN(current.aqi) && current.aqi > 0
      ? Math.round(current.aqi)
      : typeof current.aqiIndex === 'number' && !Number.isNaN(current.aqiIndex) && current.aqiIndex > 0
      ? Math.round(current.aqiIndex)
      : typeof aqiData?.aqi === 'number' && !Number.isNaN(aqiData.aqi) && aqiData.aqi > 0
      ? Math.round(aqiData.aqi)
      : null;

  const activePm25: number | null =
    typeof current.aqiPm25 === 'number' && !Number.isNaN(current.aqiPm25) && current.aqiPm25 >= 0
      ? Math.round(current.aqiPm25)
      : typeof aqiData?.pm25 === 'number' && !Number.isNaN(aqiData.pm25)
      ? Math.round(aqiData.pm25)
      : null;

  const activePm10: number | null =
    typeof current.aqiPm10 === 'number' && !Number.isNaN(current.aqiPm10) && current.aqiPm10 >= 0
      ? Math.round(current.aqiPm10)
      : typeof aqiData?.pm10 === 'number' && !Number.isNaN(aqiData.pm10)
      ? Math.round(aqiData.pm10)
      : null;

  const getAqiCategory = (val: number | null) => {
    if (val === null || Number.isNaN(val)) return 'Unavailable';
    if (val <= 50) return 'Good';
    if (val <= 100) return 'Satisfactory';
    if (val <= 200) return 'Moderate';
    if (val <= 300) return 'Poor';
    if (val <= 400) return 'Very Poor';
    return 'Severe';
  };

  const cityAqiData = [
    {
      city: `${selectedLocation.city || 'Selected Location'} (Active)`,
      state: selectedLocation.state || 'Odisha',
      aqi: activeAqi,
      category: getAqiCategory(activeAqi),
      pm25: activePm25,
      pm10: activePm10,
      isLiveSelected: true,
    },
    { city: 'Cuttack (Ref)', state: 'Odisha', aqi: 112, category: 'Moderate', pm25: 52, pm10: 94 },
    { city: 'Rourkela (Ref)', state: 'Odisha', aqi: 145, category: 'Moderate', pm25: 64, pm10: 120 },
    { city: 'Puri (Ref)', state: 'Odisha', aqi: 45, category: 'Good', pm25: 18, pm10: 42 },
    { city: 'New Delhi (Ref)', state: 'Delhi', aqi: 240, category: 'Poor', pm25: 110, pm10: 215 },
    { city: 'Mumbai (Ref)', state: 'Maharashtra', aqi: 92, category: 'Satisfactory', pm25: 38, pm10: 76 },
    { city: 'Kolkata (Ref)', state: 'West Bengal', aqi: 135, category: 'Moderate', pm25: 58, pm10: 110 },
    { city: 'Bengaluru (Ref)', state: 'Karnataka', aqi: 62, category: 'Satisfactory', pm25: 26, pm10: 54 },
  ];

  const cityColumns: ColumnDef<any>[] = [
    {
      header: 'Station / City',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveStateName(item.state)}
            className="text-left font-semibold text-[#F3F6FA] hover:text-[#35C7E8] transition-colors text-xs cursor-pointer"
          >
            {item.city}
          </button>
          <span className="text-[11px] text-[#8295A8]">({item.state})</span>
        </div>
      ),
      width: '210px',
    },
    {
      header: 'NAQI Index',
      render: (item) => (
        <span className="font-mono font-bold text-[#F3F6FA] text-sm tabular-nums">
          {item.aqi !== null && item.aqi !== undefined ? item.aqi : '—'}
        </span>
      ),
      width: '110px',
    },
    {
      header: 'Category',
      render: (item) => (
        <StatusBadge
          label={item.category}
          variant={
            item.aqi === null || item.aqi === undefined
              ? 'info'
              : item.aqi <= 100
              ? 'good'
              : item.aqi <= 200
              ? 'warning'
              : item.aqi <= 300
              ? 'alert'
              : 'danger'
          }
        />
      ),
      width: '140px',
    },
    {
      header: 'PM2.5 (µg/m³)',
      render: (item) => (
        <span className="font-mono text-xs text-[#B5C3D1] tabular-nums">
          {item.pm25 !== null && item.pm25 !== undefined ? item.pm25 : '—'}
        </span>
      ),
      width: '130px',
    },
    {
      header: 'PM10 (µg/m³)',
      render: (item) => (
        <span className="font-mono text-xs text-[#B5C3D1] tabular-nums">
          {item.pm10 !== null && item.pm10 !== undefined ? item.pm10 : '—'}
        </span>
      ),
      width: '130px',
    },
    {
      header: 'Map Focus',
      render: (item) => (
        <button
          type="button"
          onClick={() => setActiveStateName(item.state)}
          className="px-2.5 py-1.5 min-h-[34px] bg-[#08131F] hover:bg-[#0B72B9] text-[#B5C3D1] hover:text-white border border-[#26394B] rounded-lg text-[11px] font-mono font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>Focus</span>
        </button>
      ),
    },
  ];

  const currentPm25Value: number | null = historicalData?.current?.pm25 ?? activePm25 ?? null;
  const currentPollenValue: number | null =
    historicalData?.current?.pollen ?? (typeof current.pollenCount === 'number' ? current.pollenCount : null);
  const sevenDayAvgPm25: number | null = historicalData?.sevenDayAveragePm25 ?? currentPm25Value;
  const trendStatus = historicalData?.trendStatus ?? (isLoadingHistory ? 'Syncing' : 'Unavailable');

  const headerStatus: ProvenanceStatus =
    aqiState.status === 'LOADING'
      ? 'LOADING'
      : activeAqi !== null || activePm25 !== null
      ? 'LIVE'
      : 'UNAVAILABLE';

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto pb-12">
      {/* Unified Observatory Page Header */}
      <PageHeader
        eyebrow="CPCB NAQI · OPEN-METEO ATMOSPHERIC CHEMISTRY"
        title={`Air Quality & Bio-Aerosol Telemetry — ${selectedLocation.city || 'Station'}`}
        description={`Real-time particulate matter, gaseous pollutants, and 7-day dispersion history for ${selectedLocation.city || 'Station'}, ${selectedLocation.state || 'India'}.`}
        coordinates={formatCoordinatePair(selectedLocation.lat, selectedLocation.lng, 2)}
        status={headerStatus}
        source={aqiState.source || 'Open-Meteo Air Quality'}
        updatedAt={current.observationTimeFormatted || current.lastUpdated || null}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {onDetectLocation && (
              <button
                type="button"
                onClick={() => onDetectLocation(true)}
                disabled={isLocating}
                className="px-3 py-2 min-h-[40px] rounded-lg bg-[#08131F] hover:bg-[#101F2E] border border-[#26394B] text-xs font-semibold text-[#F3F6FA] flex items-center gap-1.5 transition-colors cursor-pointer m-focus-ring"
              >
                <LocateFixed className={`w-3.5 h-3.5 text-[#35C7E8] ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Locating...' : 'Detect GPS'}</span>
              </button>
            )}
            {onOpenLocationCenter && (
              <button
                type="button"
                onClick={onOpenLocationCenter}
                className="px-3 py-2 min-h-[40px] rounded-lg bg-[#0B72B9] hover:bg-[#095C96] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer m-focus-ring"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Change Station</span>
              </button>
            )}
          </div>
        }
      />

      {/* Primary AQI Section */}
      <AQISection weather={current} />

      {/* Pollen Section */}
      <PollenSection weather={current} />

      {/* 7-Day Trend History Visualization */}
      <DataPanel id="aqi-pollen-trend-card" className="flex flex-col gap-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#26394B]">
          <SectionHeading
            title={`7-Day Historical Trend: PM2.5 & Bio-Pollen (${activeStateRecord.name})`}
            subtitle={`Observation Baseline: ${formatDateShort(new Date(`${selectedDate}T00:00:00`))}${
              historicalData?.startDate
                ? ` · Window: ${formatDateShort(new Date(`${historicalData.startDate}T00:00:00`))} – ${formatDateShort(new Date(`${selectedDate}T00:00:00`))}`
                : ''
            }`}
            icon={<Activity className="w-4 h-4" />}
            badge={
              isLoadingHistory ? (
                <SourceStatus status="LOADING" labelOverride="SYNCING ARCHIVE" />
              ) : visibleChartData.length > 0 ? (
                <SourceStatus status="RECENT" labelOverride="VERIFIED ARCHIVE" />
              ) : (
                <SourceStatus status="UNAVAILABLE" />
              )
            }
            className="border-b-0 pb-0"
          />

          <div className="flex items-center gap-2 self-start lg:self-auto shrink-0 flex-wrap">
            <div className="relative" ref={calendarRef}>
              <button
                type="button"
                onClick={() => setShowDateCalendar(!showDateCalendar)}
                className="px-3 py-2 min-h-[38px] bg-[#08131F] hover:bg-[#101F2E] text-[#F3F6FA] rounded-lg border border-[#26394B] text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-[#35C7E8]" />
                <span>{formatDateShort(new Date(`${selectedDate}T00:00:00`))}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#8295A8] transition-transform ${showDateCalendar ? 'rotate-180' : ''}`} />
              </button>

              {showDateCalendar && (
                <div className="absolute right-0 top-full mt-2 z-50 p-2 bg-[#0B1927] border border-[#38536A] rounded-xl shadow-2xl">
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#26394B] mb-2 text-xs">
                    <span className="text-[#F3F6FA] font-semibold">Observation Baseline Date</span>
                    <button
                      type="button"
                      onClick={() => setShowDateCalendar(false)}
                      className="text-[#8295A8] hover:text-[#F3F6FA] p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <DateCalendar
                    value={new Date(`${selectedDate}T00:00:00`)}
                    onChange={(d) => {
                      const isoStr = d.toISOString().split('T')[0];
                      setSelectedDate(isoStr);
                      setShowDateCalendar(false);
                    }}
                    maxDate={new Date()}
                    showToday={true}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#08131F] border border-[#26394B] rounded-lg">
              <button
                id="btn-trend-filter-both"
                type="button"
                onClick={() => setTrendView('both')}
                className={`px-3 py-1.5 min-h-[34px] rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  trendView === 'both' ? 'bg-[#0B72B9] text-white' : 'text-[#B5C3D1] hover:text-[#F3F6FA]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Both</span>
              </button>
              <button
                id="btn-trend-filter-pm25"
                type="button"
                onClick={() => setTrendView('pm25')}
                className={`px-3 py-1.5 min-h-[34px] rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  trendView === 'pm25' ? 'bg-[#F59E0B] text-[#07111D]' : 'text-[#B5C3D1] hover:text-[#F3F6FA]'
                }`}
              >
                PM2.5
              </button>
              <button
                id="btn-trend-filter-pollen"
                type="button"
                onClick={() => setTrendView('pollen')}
                className={`px-3 py-1.5 min-h-[34px] rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  trendView === 'pollen' ? 'bg-[#22C7A0] text-[#07111D]' : 'text-[#B5C3D1] hover:text-[#F3F6FA]'
                }`}
              >
                <Flower2 className="w-3.5 h-3.5" />
                <span>Pollen</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={!historicalData?.observations?.length || isLoadingHistory}
              className="w-9 h-9 bg-[#08131F] hover:bg-[#101F2E] text-[#B5C3D1] hover:text-[#F3F6FA] rounded-lg border border-[#26394B] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Export 7-Day Trend CSV"
              aria-label="Export 7-Day Trend CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="m-panel-inset p-3.5 flex flex-col justify-between gap-2">
            <span className="text-[10px] font-mono text-[#8295A8] uppercase font-semibold tracking-wider">
              Observatory Region
            </span>
            <div>
              <span className="text-base font-bold text-[#F3F6FA] block leading-tight">
                {activeStateRecord.name}
              </span>
              <span className="text-xs text-[#35C7E8] flex items-center gap-1 mt-1 font-mono">
                <MapPin className="w-3 h-3 shrink-0" />
                {historicalData?.stationId || activeStateRecord.city || 'Regional Observatory'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#8295A8]">
              Baseline: {formatDateShort(new Date(`${selectedDate}T00:00:00`))}
            </span>
          </div>

          <div className="m-panel-inset p-3.5 flex flex-col justify-between gap-2">
            <MetricValue
              label="Baseline PM2.5"
              value={isLoadingHistory ? null : currentPm25Value}
              unit="µg/m³"
              hint="CPCB 24h Std: 60 µg/m³"
              unavailableLabel="Awaiting archive"
              valueClassName="text-2xl font-bold text-[#FCD34D]"
            />
            <div className="w-full bg-[#07111D] h-1.5 rounded-full overflow-hidden border border-[#26394B]">
              <div
                className={`h-full transition-all ${
                  (currentPm25Value ?? 0) > 60 ? 'bg-[#EF4444]' : 'bg-[#22C7A0]'
                }`}
                style={{
                  width: `${currentPm25Value !== null ? Math.min(100, (currentPm25Value / 60) * 100) : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="m-panel-inset p-3.5">
            <MetricValue
              label="Bio-Pollen Index"
              value={isLoadingHistory || currentPollenValue === null ? null : `Level ${currentPollenValue}`}
              unit="/ 5"
              hint={
                historicalData?.current?.totalPollenGrains
                  ? `${historicalData.current.totalPollenGrains} grains/m³ load`
                  : 'Aero-allergen scale'
              }
              unavailableLabel="Pollen index unavailable"
              valueClassName="text-2xl font-bold text-[#6EE7B7]"
            />
          </div>

          <div className="m-panel-inset p-3.5">
            <MetricValue
              label={`7-Day Average (${trendStatus})`}
              value={sevenDayAvgPm25}
              unit="µg/m³"
              hint={
                historicalData?.peakConcentration !== undefined && historicalData?.peakConcentration !== null
                  ? `Peak: ${historicalData.peakConcentration} µg/m³ (${historicalData?.peakTime || 'Archive'})`
                  : 'Rolling PM2.5 archive'
              }
              unavailableLabel="Awaiting 7-day series"
              valueClassName="text-2xl font-bold text-[#35C7E8]"
            />
          </div>
        </div>

        {/* Chart Area */}
        <div className="h-[320px] w-full bg-[#08131F] p-4 rounded-xl border border-[#26394B] relative overflow-hidden flex items-center justify-center">
          {isLoadingHistory ? (
            <div className="flex flex-col items-center gap-2 text-[#B5C3D1] text-xs font-mono">
              <Loader2 className="w-6 h-6 animate-spin text-[#35C7E8]" />
              <span>Loading verified observations...</span>
            </div>
          ) : historyError || !visibleChartData.length ? (
            <UnavailableState
              title="No Verified Historical Telemetry"
              reason={historyError || 'No archival measurements exist for the selected coordinate and baseline date.'}
              source="Open-Meteo Air Quality Archive"
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={visibleChartData}
                margin={{ top: 20, right: trendView === 'pm25' ? 15 : 35, bottom: 10, left: 10 }}
              >
                <defs>
                  <linearGradient id="pm25GlowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#26394B" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#8295A8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#26394B' }}
                  dy={8}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#FCD34D"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#26394B' }}
                  domain={[0, (dataMax: number) => Math.max(80, Math.ceil(dataMax * 1.3))]}
                  ticks={[0, 20, 40, 60, 80]}
                  dx={-4}
                />

                {(trendView === 'both' || trendView === 'pollen') && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 6]}
                    ticks={[1, 2, 3, 4, 5]}
                    tickFormatter={(v) => `L${v}`}
                    stroke="#6EE7B7"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#26394B' }}
                    dx={4}
                  />
                )}

                <Tooltip
                  content={<CustomTrendTooltip />}
                  cursor={{ stroke: '#35C7E8', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                />

                {(trendView === 'both' || trendView === 'pm25') && (
                  <ReferenceLine
                    yAxisId="left"
                    y={60}
                    stroke="#EF4444"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: 'CPCB Limit: 60 µg/m³',
                      fill: '#FCA5A5',
                      fontSize: 10,
                      position: 'top',
                    }}
                  />
                )}

                {(trendView === 'both' || trendView === 'pm25') && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="pm25"
                    name="PM2.5"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#pm25GlowGradient)"
                    dot={{ r: 4, fill: '#08131F', stroke: '#F59E0B', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#F59E0B', stroke: '#F3F6FA', strokeWidth: 2 }}
                  />
                )}

                {(trendView === 'both' || trendView === 'pollen') && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="pollen"
                    name="Bio-Pollen Level"
                    stroke="#22C7A0"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#08131F', stroke: '#22C7A0', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#22C7A0', stroke: '#F3F6FA', strokeWidth: 2 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </DataPanel>

      {/* India Synoptic Weather & AQI Map */}
      <IndiaWeatherMap
        data={INDIA_WEATHER_DATA}
        metric={mapMetric}
        onMetricChange={setMapMetric}
        selectedState={activeStateName}
        onStateSelect={handleStateSelect}
      />

      {/* Regional Reference Table */}
      <DataPanel className="flex flex-col gap-4">
        <SectionHeading
          title="Selected Location & Regional CAAQMS Reference Benchmarks"
          subtitle="First row reflects live telemetry for your active location; remaining rows display CPCB/SPCB reference benchmarks"
          icon={<MapPin className="w-4 h-4" />}
          badge={<SourceStatus status="REFERENCE" labelOverride="LIVE + BENCHMARK" />}
        />

        <div className="table-wrapper">
          <DataTable
            data={cityAqiData}
            columns={cityColumns}
            keyExtractor={(item) => item.city}
          />
        </div>
      </DataPanel>
    </div>
  );
};
