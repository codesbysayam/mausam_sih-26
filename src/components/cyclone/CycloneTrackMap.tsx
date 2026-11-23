import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Layers,
  Crosshair,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Radio,
  ShieldCheck,
  Compass,
  History,
  Info,
} from 'lucide-react';
import { WeatherSystemEvent } from '../../types/cyclone';
import { formatCoordinatePair } from '../../../shared/weatherContract';
import {
  resolveBasemapSpec,
  type BasemapStyleId,
} from '../../utils/mapBasemaps';
import { useFramePlayback } from '../../hooks/useFramePlayback';
import { buildCyclonePlaybackFrames } from '../../services/map/mapFrameService';
import { BasemapStyleSwitcher, MapPlaybackControls } from '../maps';

interface CycloneTrackMapProps {
  activeSystem: WeatherSystemEvent | null;
}

interface SurveillanceDwrStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  state: string;
  band: string;
  rangeKm: number;
  sectorType: 'Coastal Marine DWR' | 'Inland Eastern Perimeter DWR';
}

// Verified IMD Doppler Weather Radar coordinates cross-checked with src/data/radarStations.ts
const SURVEILLANCE_DWR_STATIONS: SurveillanceDwrStation[] = [
  { id: 'DWR_VSK', name: 'Visakhapatnam DWR', lat: 17.6868, lng: 83.2185, state: 'Andhra Pradesh', band: 'S-Band Dual-Pol', rangeKm: 250, sectorType: 'Coastal Marine DWR' },
  { id: 'DWR_MCH', name: 'Machilipatnam DWR', lat: 16.1875, lng: 81.1389, state: 'Andhra Pradesh', band: 'S-Band Dual-Pol', rangeKm: 250, sectorType: 'Coastal Marine DWR' },
  { id: 'DWR_PDP', name: 'Paradip DWR', lat: 20.3164, lng: 86.6114, state: 'Odisha', band: 'S-Band Dual-Pol', rangeKm: 250, sectorType: 'Coastal Marine DWR' },
  { id: 'DWR_GPL', name: 'Gopalpur DWR', lat: 19.2612, lng: 84.9089, state: 'Odisha', band: 'S-Band Doppler', rangeKm: 250, sectorType: 'Coastal Marine DWR' },
  { id: 'DWR_KOL', name: 'Kolkata (Alipore) DWR', lat: 22.5726, lng: 88.3639, state: 'West Bengal', band: 'S-Band Dual-Pol', rangeKm: 250, sectorType: 'Coastal Marine DWR' },
  { id: 'DWR_CHN', name: 'Chennai (Port) DWR', lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu', band: 'S-Band Dual-Pol', rangeKm: 250, sectorType: 'Coastal Marine DWR' },
  { id: 'DWR_KRK', name: 'Karaikal DWR', lat: 10.9254, lng: 79.838, state: 'Puducherry', band: 'S-Band Doppler', rangeKm: 250, sectorType: 'Coastal Marine DWR' },
  { id: 'DWR_MUM', name: 'Mumbai (Colaba) DWR', lat: 18.9067, lng: 72.8147, state: 'Maharashtra', band: 'S-Band Dual-Pol', rangeKm: 250, sectorType: 'Coastal Marine DWR' },
  { id: 'DWR_GOA', name: 'Goa (Panaji) DWR', lat: 15.4909, lng: 73.8278, state: 'Goa', band: 'S-Band Doppler', rangeKm: 250, sectorType: 'Coastal Marine DWR' },
  { id: 'DWR_KOC', name: 'Kochi DWR', lat: 9.9312, lng: 76.2673, state: 'Kerala', band: 'C-Band Dual-Pol', rangeKm: 250, sectorType: 'Coastal Marine DWR' },
  { id: 'DWR_AGT', name: 'Agartala DWR', lat: 23.8315, lng: 91.2868, state: 'Tripura', band: 'S-Band Doppler', rangeKm: 250, sectorType: 'Inland Eastern Perimeter DWR' },
];

export const CycloneTrackMap: React.FC<CycloneTrackMapProps> = ({ activeSystem }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const playbackGroupRef = useRef<L.LayerGroup | null>(null);
  const basemapGroupRef = useRef<L.LayerGroup | null>(null);

  const [showRadarRings, setShowRadarRings] = useState(true);
  const [showForecast, setShowForecast] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [basemapStyle, setBasemapStyle] = useState<BasemapStyleId>('dark');
  const [usingOsmFallback, setUsingOsmFallback] = useState(false);
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Build real chronological track playback frames (historical -> current -> forecast)
  const trackFrames = useMemo(
    () => buildCyclonePlaybackFrames(activeSystem),
    [activeSystem]
  );

  const currentFixIdx = useMemo(() => {
    const idx = trackFrames.findIndex((f) => f.dataType === 'CURRENT');
    return idx >= 0 ? idx : 0;
  }, [trackFrames]);

  const playback = useFramePlayback({
    frames: trackFrames,
    baseIntervalMs: 1100,
    initialSpeed: 1,
    initialLoop: true,
    initialPosition: currentFixIdx,
    resetKey: activeSystem?.id ?? 'calm-basin',
    sortByTime: false, // already strictly sorted by buildCyclonePlaybackFrames
  });

  // Mount Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const defaultCenter: [number, number] = activeSystem
      ? [activeSystem.latitude, activeSystem.longitude]
      : [18.5, 84.5];
    const defaultZoom = activeSystem ? 5.5 : 5;

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      minZoom: 2,
      maxZoom: 12,
      worldCopyJump: true,
      zoomControl: false,
      attributionControl: true,
    });

    const basemapGroup = L.layerGroup().addTo(map);
    basemapGroupRef.current = basemapGroup;

    const layersGroup = L.layerGroup().addTo(map);
    layersGroupRef.current = layersGroup;

    const playbackGroup = L.layerGroup().addTo(map);
    playbackGroupRef.current = playbackGroup;

    map.on('mousemove', (ev: L.LeafletMouseEvent) => {
      setHoverCoords({ lat: ev.latlng.lat, lng: ev.latlng.lng });
    });
    map.on('mouseout', () => setHoverCoords(null));

    mapInstanceRef.current = map;

    const container = mapContainerRef.current;
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ pan: false, animate: false });
    });
    resizeObserver.observe(container);

    const initialTimer = setTimeout(() => {
      map.invalidateSize({ pan: false, animate: false });
    }, 250);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(initialTimer);
      map.remove();
      mapInstanceRef.current = null;
      layersGroupRef.current = null;
      playbackGroupRef.current = null;
      basemapGroupRef.current = null;
    };
  }, []);

  // Re-sync basemap tiles whenever user switches style or OSM failover activates
  useEffect(() => {
    const basemapGroup = basemapGroupRef.current;
    if (!basemapGroup) return;

    basemapGroup.clearLayers();
    const spec = resolveBasemapSpec(basemapStyle, usingOsmFallback);
    let errorCount = 0;

    const tileLayer = L.tileLayer(spec.baseUrl, {
      maxZoom: spec.maxZoom,
      attribution: spec.attribution,
      className: spec.className,
    });

    tileLayer.on('tileerror', () => {
      errorCount += 1;
      if (errorCount >= 3 && !usingOsmFallback) {
        setUsingOsmFallback(true);
      }
    });

    tileLayer.addTo(basemapGroup);

    if (spec.referenceUrl) {
      L.tileLayer(spec.referenceUrl, {
        maxZoom: spec.maxZoom,
        opacity: 0.78,
      }).addTo(basemapGroup);
    }
  }, [basemapStyle, usingOsmFallback]);

  // Render DWR network + static system track geometry
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layersGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    if (showRadarRings) {
      SURVEILLANCE_DWR_STATIONS.forEach((station) => {
        const isInland = station.sectorType === 'Inland Eastern Perimeter DWR';
        const dotColor = isInland ? '#C5A46D' : '#A7C5C5';

        const radarIcon = L.divIcon({
          className: 'radar-station-marker',
          html: `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;">
              <div style="width:10px;height:10px;border-radius:9999px;background:${dotColor};border:2px solid #F0EEE7;"></div>
              <div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;padding:1px 6px;border-radius:4px;background:rgba(11,12,13,0.92);border:1px solid #2F3534;font-size:9px;font-family:monospace;color:${dotColor};pointer-events:none;">
                ${station.name.replace(' DWR', '')}
              </div>
            </div>
          `,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker([station.lat, station.lng], { icon: radarIcon });
        marker.bindPopup(`
          <div style="font-family:monospace;font-size:12px;color:#171B19;padding:4px;min-width:210px;">
            <strong style="color:#9C7B42;">${station.name}</strong><br/>
            <span>State: ${station.state}</span><br/>
            <span>Classification: <strong>${station.sectorType}</strong></span><br/>
            <span>Radar Band: ${station.band}</span><br/>
            <span>Verified Coords: ${station.lat.toFixed(4)}°N, ${station.lng.toFixed(4)}°E</span><br/>
            <span style="font-size:10px;color:#475569;display:block;margin-top:4px;">
              Dashed circle shows ${station.rangeKm} km theoretical Doppler coverage geometry (not live radar reflectivity).
            </span>
          </div>
        `);
        layers.addLayer(marker);

        const dopplerRing = L.circle([station.lat, station.lng], {
          radius: station.rangeKm * 1000,
          color: dotColor,
          weight: 1,
          dashArray: '5, 5',
          fillColor: dotColor,
          fillOpacity: 0.03,
        });
        layers.addLayer(dopplerRing);
      });
    }

    if (activeSystem) {
      const isHistorical = activeSystem.status === 'DISSIPATED';
      const systemColor = isHistorical
        ? '#898B83'
        : activeSystem.rainfallThreat === 'RED'
        ? '#C94F4B'
        : activeSystem.rainfallThreat === 'ORANGE'
        ? '#D98548'
        : activeSystem.classification === 'Deep Depression' || activeSystem.classification === 'Depression'
        ? '#D8B14F'
        : '#5C9A79';

      if (showHistory && activeSystem.historicalTrack && activeSystem.historicalTrack.length > 0) {
        const histPoints: [number, number][] = activeSystem.historicalTrack.map((pt) => [
          pt.latitude,
          pt.longitude,
        ]);

        const histLine = L.polyline(histPoints, {
          color: isHistorical ? '#898B83' : '#A7C5C5',
          weight: 2.5,
          dashArray: '3, 6',
          opacity: 0.85,
        });
        layers.addLayer(histLine);

        activeSystem.historicalTrack.forEach((pt) => {
          const ptIcon = L.divIcon({
            className: 'hist-pt-icon',
            html: `<div style="width:9px;height:9px;border-radius:9999px;background:#898B83;border:1.5px solid #F0EEE7;"></div>`,
            iconSize: [10, 10],
            iconAnchor: [5, 5],
          });
          const m = L.marker([pt.latitude, pt.longitude], { icon: ptIcon });
          m.bindTooltip(`
            <div style="font-family:monospace;font-size:11px;">
              <strong>${pt.time.slice(5, 16).replace('T', ' ')} IST</strong><br/>
              ${pt.locationName || pt.expectedClassification}
            </div>
          `);
          layers.addLayer(m);
        });
      }

      if (showForecast && activeSystem.forecastTrack && activeSystem.forecastTrack.length > 0) {
        const currentCoord: [number, number] = [activeSystem.latitude, activeSystem.longitude];
        const forecastCoords: [number, number][] = [
          currentCoord,
          ...activeSystem.forecastTrack.map((pt): [number, number] => [pt.latitude, pt.longitude]),
        ];

        const forecastLine = L.polyline(forecastCoords, {
          color: systemColor,
          weight: 3,
          opacity: 0.9,
        });
        layers.addLayer(forecastLine);

        activeSystem.forecastTrack.forEach((pt) => {
          const ptIcon = L.divIcon({
            className: 'fc-pt-icon',
            html: `<div style="width:11px;height:11px;border-radius:9999px;background:#111314;border:2px solid ${systemColor};"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          });
          const m = L.marker([pt.latitude, pt.longitude], { icon: ptIcon });
          m.bindTooltip(`
            <div style="font-family:monospace;font-size:11px;">
              <strong>Forecast: ${pt.time.slice(5, 16).replace('T', ' ')} IST</strong><br/>
              ${pt.expectedClassification}<br/>
              Wind: ${pt.windSpeed || '—'}
            </div>
          `);
          layers.addLayer(m);
        });
      }

      const centerIcon = L.divIcon({
        className: 'cyclone-center-marker',
        html: `
          <div style="width:26px;height:26px;border-radius:9999px;display:flex;align-items:center;justify-content:center;background:${systemColor};border:2px solid #F0EEE7;box-shadow:0 4px 12px rgba(0,0,0,0.5);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111314" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 2a10 10 0 0 1 7.07 2.93"></path>
              <path d="M12 22a10 10 0 0 1-7.07-2.93"></path>
            </svg>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const centerMarker = L.marker([activeSystem.latitude, activeSystem.longitude], {
        icon: centerIcon,
      });

      centerMarker.bindPopup(`
        <div style="font-family:monospace;font-size:12px;color:#111314;min-width:200px;">
          <strong style="color:${systemColor};">${activeSystem.classification}</strong><br/>
          <span style="font-size:11px;color:#475569;">${activeSystem.name}</span><br/>
          <hr style="margin:4px 0;border:0;border-top:1px solid #CBD5E1;"/>
          <span>Coords: <strong>${formatCoordinatePair(activeSystem.latitude, activeSystem.longitude, 1)}</strong></span><br/>
          <span>Wind: <strong>${activeSystem.maxSustainedWind || '—'}</strong></span><br/>
          <span>Movement: <strong>${activeSystem.movementDirection || '—'} (${activeSystem.movementSpeed || '—'})</strong></span><br/>
          <span>Status: <strong>${activeSystem.status}</strong></span>
        </div>
      `);
      layers.addLayer(centerMarker);

      map.flyTo(
        [activeSystem.latitude, activeSystem.longitude],
        5.8,
        { animate: true, duration: 0.9 }
      );
    } else {
      map.flyTo([18.5, 84.5], 5, { animate: true });
    }
  }, [activeSystem, showRadarRings, showForecast, showHistory]);

  // Render animated/scrubbed track position marker & traversed path progression
  useEffect(() => {
    const playbackGroup = playbackGroupRef.current;
    if (!playbackGroup) return;
    playbackGroup.clearLayers();

    if (trackFrames.length < 2 || !playback.currentFrame) return;

    const traversedCoords: [number, number][] = trackFrames
      .slice(0, playback.currentIndex + 1)
      .map((f) => [f.lat, f.lng]);

    if (traversedCoords.length >= 2) {
      L.polyline(traversedCoords, {
        color: '#F59E0B',
        weight: 4,
        opacity: 0.92,
      }).addTo(playbackGroup);
    }

    const activeFrame = playback.currentFrame;
    const badgeColor =
      activeFrame.dataType === 'CURRENT'
        ? '#10B981'
        : activeFrame.dataType === 'FORECAST'
        ? '#38BDF8'
        : '#F59E0B';

    const playheadIcon = L.divIcon({
      className: 'cyclone-playhead-marker',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
          <div style="width:22px;height:22px;border-radius:9999px;background:rgba(11,12,13,0.92);border:3px solid ${badgeColor};box-shadow:0 0 0 4px rgba(245,158,11,0.28);display:flex;align-items:center;justify-content:center;">
            <div style="width:7px;height:7px;border-radius:9999px;background:${badgeColor};"></div>
          </div>
          <div style="position:absolute;top:-26px;left:50%;transform:translateX(-50%);white-space:nowrap;padding:2px 7px;border-radius:5px;background:rgba(11,12,13,0.94);border:1px solid ${badgeColor};color:#F0EEE7;font-family:monospace;font-size:10px;font-weight:700;pointer-events:none;">
            ${activeFrame.dataType} · ${activeFrame.displayTime}
          </div>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    const playheadMarker = L.marker([activeFrame.lat, activeFrame.lng], {
      icon: playheadIcon,
      zIndexOffset: 900,
    });

    playheadMarker.bindPopup(`
      <div style="font-family:monospace;font-size:12px;color:#111314;min-width:210px;">
        <strong style="color:#B45309;">${activeFrame.dataType} TRACK FIX</strong><br/>
        <span>${activeFrame.displayTime}</span><br/>
        <hr style="margin:4px 0;border:0;border-top:1px solid #CBD5E1;"/>
        <span>Class: <strong>${activeFrame.category}</strong></span><br/>
        <span>Coords: <strong>${formatCoordinatePair(activeFrame.lat, activeFrame.lng, 2)}</strong></span><br/>
        <span>Wind: <strong>${activeFrame.maxSustainedWindLabel}</strong> · Pressure: <strong>${activeFrame.pressureLabel}</strong></span>
      </div>
    `);
    playheadMarker.addTo(playbackGroup);
  }, [trackFrames, playback.currentIndex, playback.currentFrame]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetView = () => {
    if (activeSystem) {
      mapInstanceRef.current?.flyTo([activeSystem.latitude, activeSystem.longitude], 5.5, { animate: true });
    } else {
      mapInstanceRef.current?.flyTo([18.5, 84.5], 5, { animate: true });
    }
  };

  const activeBasemap = resolveBasemapSpec(basemapStyle, usingOsmFallback);

  return (
    <div
      className={`w-full m-panel overflow-hidden flex flex-col relative min-w-0 ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none h-[100dvh]'
          : 'min-h-[420px] sm:min-h-[540px] lg:min-h-[620px]'
      }`}
    >
      {/* Top Map Control Bar */}
      <div className="bg-[var(--m-surface-inset)] border-b border-[var(--m-border)] px-4 py-3 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] flex items-center justify-center text-[var(--m-accent)] shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[var(--m-text-primary)] tracking-tight truncate">
              Synoptic Basin &amp; Doppler Surveillance Map
            </h2>
            <p className="text-[11px] font-mono text-[var(--m-text-muted)] truncate">
              10 Coastal Marine DWRs + 1 Inland Eastern Perimeter · {activeBasemap.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <BasemapStyleSwitcher
            value={basemapStyle}
            onChange={(style) => {
              setUsingOsmFallback(false);
              setBasemapStyle(style);
            }}
            compact
          />

          <button
            type="button"
            onClick={() => setShowRadarRings((prev) => !prev)}
            className={`px-2.5 py-1.5 min-h-[36px] rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer m-focus-ring whitespace-nowrap ${
              showRadarRings
                ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)]/45 text-[var(--m-accent)]'
                : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>DWR Rings</span>
          </button>

          <button
            type="button"
            onClick={() => setShowForecast((prev) => !prev)}
            className={`px-2.5 py-1.5 min-h-[36px] rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer m-focus-ring whitespace-nowrap ${
              showForecast
                ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)]/45 text-[var(--m-accent)]'
                : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Forecast</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className={`px-2.5 py-1.5 min-h-[36px] rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer m-focus-ring whitespace-nowrap ${
              showHistory
                ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)]/45 text-[var(--m-accent)]'
                : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="w-9 h-9 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div
        className={`relative flex-1 w-full bg-[#0D1012] ${
          isFullscreen ? 'min-h-0' : 'h-[clamp(290px,48dvh,540px)] min-h-[290px]'
        }`}
      >
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Cursor Geodetic Coordinate Readout */}
        {hoverCoords && (
          <div className="hidden sm:flex absolute top-3 left-3 z-[400] px-2.5 py-1 rounded-md bg-[var(--m-surface-inset)]/90 backdrop-blur-md border border-[var(--m-border)] text-[10px] font-mono tabular-nums text-[var(--m-text-secondary)] pointer-events-none">
            {formatCoordinatePair(hoverCoords.lat, hoverCoords.lng, 2)}
          </div>
        )}

        {/* Floating Zoom / Reset Controls */}
        <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-10 h-10 rounded-lg bg-[var(--m-surface-inset)]/95 border border-[var(--m-border)] text-[var(--m-text-primary)] hover:border-[var(--m-accent)] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-10 h-10 rounded-lg bg-[var(--m-surface-inset)]/95 border border-[var(--m-border)] text-[var(--m-text-primary)] hover:border-[var(--m-accent)] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="w-10 h-10 rounded-lg bg-[var(--m-surface-inset)]/95 border border-[var(--m-border)] text-[var(--m-accent)] hover:border-[var(--m-accent)] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
            title="Reset View"
            aria-label="Reset View"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Left Basin Status & Coverage vs Reflectivity Legend */}
        <div className="absolute bottom-4 left-3 z-[400] bg-[var(--m-surface-1)]/95 backdrop-blur-md border border-[var(--m-border)] rounded-xl px-3.5 py-2.5 flex flex-col gap-2 max-w-[340px] shadow-lg">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--m-ok)] shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-[var(--m-text-primary)] font-mono uppercase truncate">
                {activeSystem
                  ? `${activeSystem.classification} · ${activeSystem.name}`
                  : 'NORTH INDIAN OCEAN SURVEILLANCE'}
              </span>
              <span className="text-[10px] text-[var(--m-text-muted)] font-mono truncate">
                {activeSystem
                  ? `Official IMD / SACHET Fix · ${trackFrames.length} chronological track fix${trackFrames.length === 1 ? '' : 'es'}`
                  : 'Verified IMD DWR Station Network Reference'}
              </span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-[var(--m-border)] flex flex-col gap-1 text-[10px] font-mono text-[var(--m-text-secondary)]">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full border border-dashed border-[#A7C5C5] inline-block shrink-0" />
              <span>250 km DWR Coverage Geometry (Reference only — NOT live echoes)</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#A7C5C5]" />
                Coastal Marine DWR (10)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#C5A46D]" />
                Inland Perimeter (Agartala)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Track Time-Lapse Loop Controller (strictly real RSMC/IMD fixes; never fabricated) */}
      <div className="bg-[var(--m-surface-1)] border-t border-[var(--m-border)] px-3 py-2.5">
        <MapPlaybackControls
          playback={playback}
          currentTimestampLabel={
            playback.currentFrame
              ? playback.currentFrame.displayTime
              : 'No active track fixes'
          }
          firstTimestampLabel={trackFrames[0]?.displayTime}
          lastTimestampLabel={trackFrames[trackFrames.length - 1]?.displayTime}
          frameKindBadge={playback.currentFrame?.dataType}
          frameDetail={
            playback.currentFrame
              ? `${playback.currentFrame.category} · ${formatCoordinatePair(
                  playback.currentFrame.lat,
                  playback.currentFrame.lng,
                  1
                )} · Wind ${playback.currentFrame.maxSustainedWindLabel}`
              : undefined
          }
          sourceLabel="RSMC New Delhi / IMD"
          emptyMessage={
            activeSystem
              ? 'Selected bulletin contains fewer than 2 geolocated track fixes — track playback unavailable.'
              : 'Basin calm: no active tropical cyclone track fixes published in current IMD / SACHET feed.'
          }
          compact
        />
      </div>

      {/* Footer Notice */}
      <div className="bg-[var(--m-surface-inset)] border-t border-[var(--m-border)] px-4 py-2 flex items-center justify-between flex-wrap gap-2 text-[10px] font-mono text-[var(--m-text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <Info className="w-3 h-3 text-[var(--m-accent)] shrink-0" />
          <span>
            Dashed circles represent static 250 km Doppler range envelopes around verified IMD radar locations, not live precipitation echoes.
          </span>
        </span>
        <span>Source: IMD DWR Registry &amp; RSMC New Delhi</span>
      </div>
    </div>
  );
};
