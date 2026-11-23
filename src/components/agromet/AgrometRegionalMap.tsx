import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Sprout,
  Droplets,
  CloudRain,
  ThermometerSnowflake,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Info,
} from 'lucide-react';
import type { WeatherDataBundle } from '../../services/weatherService';
import type { LocationRecord } from '../../types';
import { ALL_INDIA_STATES_MET_PROFILES } from '../../data/allIndiaStatesProfiles';
import { INDIA_WEATHER_DATA } from '../../data/indiaWeatherData';
import {
  resolveBasemapSpec,
  type BasemapStyleId,
} from '../../utils/mapBasemaps';
import { formatCoordinatePair } from '../../../shared/weatherContract';
import { BasemapStyleSwitcher } from '../maps';

export type AgrometMapOverlay = 'moisture' | 'rainfall' | 'thermal_stress' | 'advisory';

interface AgrometRegionalMapProps {
  weather?: WeatherDataBundle;
  selectedLocation?: LocationRecord;
  selectedState: string;
  selectedDistrict: string;
  selectedCrop: string;
  selectedStage: string;
}

interface AgroNode {
  id: string;
  name: string;
  capital: string;
  lat: number;
  lng: number;
  tempC: number | null;
  humidityPct: number | null;
  rainfallMm: number | null;
  windKmh: number | null;
  isLiveSelected: boolean;
  sourceLabel: string;
}

function classifyThermalStress(tempC: number | null): {
  label: string;
  color: string;
} {
  if (tempC === null) return { label: 'Unavailable', color: '#64748B' };
  if (tempC <= 6) return { label: 'Frost Risk', color: '#38BDF8' };
  if (tempC <= 14) return { label: 'Cold Stress Watch', color: '#7DD3FC' };
  if (tempC <= 33) return { label: 'Favorable Thermal Range', color: '#34D399' };
  if (tempC <= 38) return { label: 'Moderate Heat Stress', color: '#F59E0B' };
  return { label: 'Severe Heat Stress', color: '#EF4444' };
}

function classifyMoisture(humidityPct: number | null, rainfallMm: number | null): {
  label: string;
  color: string;
} {
  if (humidityPct === null && rainfallMm === null) {
    return { label: 'Unavailable', color: '#64748B' };
  }
  const rh = humidityPct ?? 55;
  const rain = rainfallMm ?? 0;
  if (rain >= 15 || rh >= 85) return { label: 'Saturated / High Wetness', color: '#0EA5E9' };
  if (rain >= 2 || rh >= 60) return { label: 'Adequate Moisture', color: '#34D399' };
  if (rh >= 40) return { label: 'Moderate Deficit', color: '#F59E0B' };
  return { label: 'Arid / Irrigation Priority', color: '#EF4444' };
}

function classifyRainfall(rainfallMm: number | null): {
  label: string;
  color: string;
} {
  if (rainfallMm === null) return { label: 'Unavailable', color: '#64748B' };
  if (rainfallMm === 0) return { label: 'Dry (0 mm)', color: '#64748B' };
  if (rainfallMm < 5) return { label: 'Light (<5 mm)', color: '#38BDF8' };
  if (rainfallMm < 20) return { label: 'Moderate (5–20 mm)', color: '#34D399' };
  if (rainfallMm < 50) return { label: 'Heavy (20–50 mm)', color: '#F59E0B' };
  return { label: 'Very Heavy (>50 mm)', color: '#EF4444' };
}

function classifyAdvisory(
  tempC: number | null,
  humidityPct: number | null,
  rainfallMm: number | null,
  windKmh: number | null
): { label: string; color: string } {
  if (tempC === null && rainfallMm === null) return { label: 'Telemetry Unavailable', color: '#64748B' };
  if ((rainfallMm ?? 0) >= 15) return { label: 'Defer Spraying · Drainage Check', color: '#EF4444' };
  if ((tempC ?? 25) <= 6) return { label: 'Frost Protection Advisory', color: '#38BDF8' };
  if ((tempC ?? 25) >= 38) return { label: 'Heat-Stress Light Irrigation', color: '#F59E0B' };
  if ((windKmh ?? 10) >= 22) return { label: 'High Drift · Pause Foliar Spray', color: '#F59E0B' };
  if ((humidityPct ?? 60) >= 85 && (tempC ?? 25) >= 22) {
    return { label: 'Fungal Blight Watch (High RH)', color: '#F59E0B' };
  }
  return { label: 'Favorable Field Window', color: '#34D399' };
}

export const AgrometRegionalMap: React.FC<AgrometRegionalMapProps> = ({
  weather,
  selectedLocation,
  selectedState,
  selectedDistrict,
  selectedCrop,
  selectedStage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const basemapGroupRef = useRef<L.LayerGroup | null>(null);
  const overlayGroupRef = useRef<L.LayerGroup | null>(null);

  const [basemapStyle, setBasemapStyle] = useState<BasemapStyleId>('terrain');
  const [useOsmFallback, setUseOsmFallback] = useState(false);
  const [overlay, setOverlay] = useState<AgrometMapOverlay>('moisture');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Build combined live-station + state AMFU reference nodes (zero fabricated numbers)
  const agroNodes = useMemo<AgroNode[]>(() => {
    const refMap = new Map(
      INDIA_WEATHER_DATA.map((st) => [st.name.toLowerCase(), st])
    );

    const nodes: AgroNode[] = ALL_INDIA_STATES_MET_PROFILES.map((profile) => {
      const ref = refMap.get(profile.name.toLowerCase());
      return {
        id: profile.id,
        name: profile.name,
        capital: profile.capital,
        lat: profile.lat,
        lng: profile.lng,
        tempC: typeof ref?.temperature === 'number' ? ref.temperature : null,
        humidityPct: typeof ref?.humidity === 'number' ? ref.humidity : null,
        rainfallMm: typeof ref?.rainfall === 'number' ? ref.rainfall : null,
        windKmh: typeof ref?.windSpeed === 'number' ? ref.windSpeed : null,
        isLiveSelected: false,
        sourceLabel: 'IMD Reference Network',
      };
    });

    const liveLat = selectedLocation?.lat;
    const liveLng = selectedLocation?.lng;
    if (typeof liveLat === 'number' && typeof liveLng === 'number') {
      const rain24 =
        typeof weather?.daily?.[0]?.precipMm === 'number'
          ? weather.daily[0].precipMm
          : typeof weather?.current?.rainfallLast24h === 'number'
          ? weather.current.rainfallLast24h
          : typeof weather?.current?.precipitationMm === 'number'
          ? weather.current.precipitationMm
          : typeof weather?.current?.precipitation === 'number'
          ? weather.current.precipitation
          : null;

      nodes.push({
        id: 'selected-live-agro-node',
        name: `${selectedDistrict}, ${selectedState}`,
        capital: selectedLocation?.city || selectedDistrict,
        lat: liveLat,
        lng: liveLng,
        tempC: typeof weather?.current?.temp === 'number' ? weather.current.temp : null,
        humidityPct: typeof weather?.current?.humidity === 'number' ? weather.current.humidity : null,
        rainfallMm: rain24,
        windKmh: typeof weather?.current?.windSpeed === 'number' ? weather.current.windSpeed : null,
        isLiveSelected: true,
        sourceLabel: weather?.current?.source || 'Open-Meteo Live Grid',
      });
    }

    return nodes;
  }, [weather, selectedLocation, selectedState, selectedDistrict]);

  const focusNode = useMemo(() => {
    const live = agroNodes.find((n) => n.isLiveSelected);
    if (live) return live;
    return (
      agroNodes.find((n) => n.name.toLowerCase() === selectedState.toLowerCase()) ||
      agroNodes[0]
    );
  }, [agroNodes, selectedState]);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: focusNode ? [focusNode.lat, focusNode.lng] : [22.2, 82.6],
      zoom: focusNode?.isLiveSelected ? 6.5 : 5,
      minZoom: 2,
      maxZoom: 13,
      worldCopyJump: true,
      zoomControl: false,
      attributionControl: true,
    });

    basemapGroupRef.current = L.layerGroup().addTo(map);
    overlayGroupRef.current = L.layerGroup().addTo(map);

    map.on('mousemove', (ev: L.LeafletMouseEvent) => {
      setHoverCoords({ lat: ev.latlng.lat, lng: ev.latlng.lng });
    });
    map.on('mouseout', () => setHoverCoords(null));

    mapRef.current = map;

    const ro = new ResizeObserver(() => map.invalidateSize({ pan: false, animate: false }));
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      basemapGroupRef.current = null;
      overlayGroupRef.current = null;
    };
  }, []);

  // Update basemap layer when style or fallback changes
  useEffect(() => {
    const group = basemapGroupRef.current;
    if (!group) return;
    group.clearLayers();

    const spec = resolveBasemapSpec(basemapStyle, useOsmFallback);
    let errCount = 0;

    const baseLayer = L.tileLayer(spec.baseUrl, {
      maxZoom: spec.maxZoom,
      attribution: spec.attribution,
      className: spec.className,
    });
    baseLayer.on('tileerror', () => {
      errCount += 1;
      if (errCount >= 3 && !useOsmFallback) setUseOsmFallback(true);
    });
    baseLayer.addTo(group);

    if (spec.referenceUrl) {
      L.tileLayer(spec.referenceUrl, { maxZoom: spec.maxZoom, opacity: 0.75 }).addTo(group);
    }
  }, [basemapStyle, useOsmFallback]);

  // Render agro-climatic markers & coverage radius
  useEffect(() => {
    const map = mapRef.current;
    const group = overlayGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    agroNodes.forEach((node) => {
      const classification =
        overlay === 'moisture'
          ? classifyMoisture(node.humidityPct, node.rainfallMm)
          : overlay === 'rainfall'
          ? classifyRainfall(node.rainfallMm)
          : overlay === 'thermal_stress'
          ? classifyThermalStress(node.tempC)
          : classifyAdvisory(node.tempC, node.humidityPct, node.rainfallMm, node.windKmh);

      const primaryReadout =
        overlay === 'moisture'
          ? node.humidityPct !== null
            ? `${Math.round(node.humidityPct)}% RH`
            : '—'
          : overlay === 'rainfall'
          ? node.rainfallMm !== null
            ? `${node.rainfallMm.toFixed(1)} mm`
            : '—'
          : overlay === 'thermal_stress'
          ? node.tempC !== null
            ? `${Math.round(node.tempC)}°C`
            : '—'
          : classification.label.split('·')[0].trim();

      if (node.isLiveSelected) {
        L.circle([node.lat, node.lng], {
          radius: 55000,
          color: classification.color,
          weight: 1.5,
          dashArray: '4, 4',
          fillColor: classification.color,
          fillOpacity: 0.12,
        }).addTo(group);
      }

      const icon = L.divIcon({
        className: 'mausam-agro-node-marker',
        html: node.isLiveSelected
          ? `
            <div style="display:flex;align-items:center;gap:6px;transform:translate(-9px,-50%);">
              <div style="width:18px;height:18px;border-radius:9999px;background:${classification.color};border:2.5px solid #F8FAFC;box-shadow:0 0 0 4px rgba(197,164,109,0.35);"></div>
              <div style="padding:2px 8px;border-radius:6px;background:rgba(11,12,13,0.94);border:1px solid ${classification.color};color:#F8FAFC;font-family:monospace;font-size:10px;font-weight:700;white-space:nowrap;">
                ${selectedDistrict} · ${primaryReadout}
              </div>
            </div>
          `
          : `
            <div style="width:11px;height:11px;border-radius:9999px;background:${classification.color};border:1.5px solid #0B0C0D;box-shadow:0 1px 4px rgba(0,0,0,0.6);"></div>
          `,
        iconSize: node.isLiveSelected ? [18, 18] : [11, 11],
        iconAnchor: node.isLiveSelected ? [9, 9] : [5.5, 5.5],
      });

      const marker = L.marker([node.lat, node.lng], {
        icon,
        zIndexOffset: node.isLiveSelected ? 900 : 100,
      });

      marker.bindPopup(`
        <div style="font-family:monospace;font-size:11.5px;color:#111314;min-width:215px;">
          <div style="font-weight:700;color:#0F172A;margin-bottom:2px;">${node.name}</div>
          <div style="font-size:10px;color:#475569;margin-bottom:5px;">
            ${node.isLiveSelected ? `Active Farm Zone · ${selectedCrop} (${selectedStage})` : `AMFU Regional Node (${node.capital})`}
          </div>
          <div style="padding:3px 6px;border-radius:4px;background:#F1F5F9;border-left:3px solid ${classification.color};margin-bottom:6px;font-weight:700;">
            ${classification.label}
          </div>
          <div>Temp: <strong>${node.tempC !== null ? `${node.tempC.toFixed(1)}°C` : '—'}</strong> · RH: <strong>${node.humidityPct !== null ? `${Math.round(node.humidityPct)}%` : '—'}</strong></div>
          <div>Rain (24h): <strong>${node.rainfallMm !== null ? `${node.rainfallMm.toFixed(1)} mm` : '—'}</strong> · Wind: <strong>${node.windKmh !== null ? `${Math.round(node.windKmh)} km/h` : '—'}</strong></div>
          <div style="font-size:9.5px;color:#64748B;margin-top:5px;">Source: ${node.sourceLabel}</div>
        </div>
      `);

      marker.addTo(group);
    });

    if (focusNode) {
      map.flyTo([focusNode.lat, focusNode.lng], focusNode.isLiveSelected ? 6.5 : 5.5, {
        animate: true,
        duration: 0.7,
      });
    }
  }, [agroNodes, overlay, selectedDistrict, selectedCrop, selectedStage, focusNode]);

  const activeBasemap = resolveBasemapSpec(basemapStyle, useOsmFallback);

  const legendItems = useMemo(() => {
    if (overlay === 'moisture') {
      return [
        { color: '#EF4444', label: 'Arid (<40% RH)' },
        { color: '#F59E0B', label: 'Moderate Deficit' },
        { color: '#34D399', label: 'Adequate (60–84%)' },
        { color: '#0EA5E9', label: 'Saturated (≥85% / ≥15mm)' },
      ];
    }
    if (overlay === 'rainfall') {
      return [
        { color: '#64748B', label: 'Dry (0 mm)' },
        { color: '#38BDF8', label: 'Light (<5 mm)' },
        { color: '#34D399', label: 'Moderate (5–20 mm)' },
        { color: '#F59E0B', label: 'Heavy (20–50 mm)' },
        { color: '#EF4444', label: 'Very Heavy (>50 mm)' },
      ];
    }
    if (overlay === 'thermal_stress') {
      return [
        { color: '#38BDF8', label: 'Frost Risk (≤6°C)' },
        { color: '#7DD3FC', label: 'Cold Watch (7–14°C)' },
        { color: '#34D399', label: 'Favorable (15–33°C)' },
        { color: '#F59E0B', label: 'Heat Watch (34–38°C)' },
        { color: '#EF4444', label: 'Severe Heat (>38°C)' },
      ];
    }
    return [
      { color: '#34D399', label: 'Favorable Window' },
      { color: '#F59E0B', label: 'Drift / Heat / Blight Watch' },
      { color: '#38BDF8', label: 'Frost Protection' },
      { color: '#EF4444', label: 'Defer Spraying / Heavy Rain' },
    ];
  }, [overlay]);

  return (
    <section
      id="agromet-regional-geospatial-map"
      className={`m-panel overflow-hidden flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : ''
      }`}
    >
      {/* Header & Layer Selector */}
      <div className="bg-[var(--m-surface-inset)] border-b border-[var(--m-border)] px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex items-center justify-center text-[var(--m-ok)] shrink-0">
            <Sprout className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-[var(--m-text-primary)] tracking-tight">
                Agricultural Intelligence &amp; Agro-Climatic Map
              </h2>
              <span className="px-2 py-0.5 rounded border border-[var(--m-ok)]/35 bg-[var(--m-ok-soft)] text-[var(--m-ok)] text-[10px] font-mono font-semibold whitespace-nowrap">
                LIVE GRID + AMFU NETWORK
              </span>
            </div>
            <p className="text-[11px] font-mono text-[var(--m-text-muted)] truncate">
              {selectedDistrict}, {selectedState} · {selectedCrop} ({selectedStage}) · {activeBasemap.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div
            role="group"
            aria-label="Agromet map overlay"
            className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex-wrap"
          >
            {[
              { id: 'moisture' as const, label: 'Soil & RH', icon: <Droplets className="w-3.5 h-3.5" /> },
              { id: 'rainfall' as const, label: 'Rainfall', icon: <CloudRain className="w-3.5 h-3.5" /> },
              { id: 'thermal_stress' as const, label: 'Frost / Heat', icon: <ThermometerSnowflake className="w-3.5 h-3.5" /> },
              { id: 'advisory' as const, label: 'Advisory', icon: <Sprout className="w-3.5 h-3.5" /> },
            ].map((item) => {
              const active = overlay === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOverlay(item.id)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-md text-[11px] font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap m-focus-ring ${
                    active
                      ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)]'
                      : 'text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <BasemapStyleSwitcher
            value={basemapStyle}
            onChange={(style) => {
              setUseOsmFallback(false);
              setBasemapStyle(style);
            }}
            compact
          />

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen agromet map'}
            className="w-9 h-9 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] flex items-center justify-center cursor-pointer m-focus-ring"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Leaflet Canvas */}
      <div
        className={`relative w-full bg-[#0D1012] ${
          isFullscreen ? 'flex-1 min-h-0' : 'h-[clamp(280px,46dvh,480px)]'
        }`}
      >
        <div ref={containerRef} className="w-full h-full" />

        {hoverCoords && (
          <div className="hidden sm:flex absolute top-3 left-3 z-[400] px-2.5 py-1 rounded-md bg-[var(--m-surface-inset)]/90 backdrop-blur-md border border-[var(--m-border)] text-[10px] font-mono tabular-nums text-[var(--m-text-secondary)] pointer-events-none">
            {formatCoordinatePair(hoverCoords.lat, hoverCoords.lng, 2)}
          </div>
        )}

        <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            aria-label="Zoom in"
            className="w-10 h-10 rounded-lg bg-[var(--m-surface-inset)]/95 border border-[var(--m-border)] text-[var(--m-text-primary)] hover:border-[var(--m-accent)] flex items-center justify-center cursor-pointer m-focus-ring"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            aria-label="Zoom out"
            className="w-10 h-10 rounded-lg bg-[var(--m-surface-inset)]/95 border border-[var(--m-border)] text-[var(--m-text-primary)] hover:border-[var(--m-accent)] flex items-center justify-center cursor-pointer m-focus-ring"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (focusNode) {
                mapRef.current?.flyTo([focusNode.lat, focusNode.lng], 6.5, { animate: true });
              }
            }}
            aria-label="Recenter on active farm district"
            title="Recenter on active farm district"
            className="w-10 h-10 rounded-lg bg-[var(--m-surface-inset)]/95 border border-[var(--m-border)] text-[var(--m-accent)] hover:border-[var(--m-accent)] flex items-center justify-center cursor-pointer m-focus-ring"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend & Attribution Footer */}
      <div className="bg-[var(--m-surface-inset)] border-t border-[var(--m-border)] px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-mono">
        <div className="flex items-center gap-3 flex-wrap text-[var(--m-text-secondary)]">
          {legendItems.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </span>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 text-[var(--m-text-muted)]">
          <Info className="w-3 h-3 text-[var(--m-accent)] shrink-0" />
          <span>Selected pin: Live Open-Meteo Grid · State dots: IMD AMFU Reference</span>
        </span>
      </div>
    </section>
  );
};

export default AgrometRegionalMap;
