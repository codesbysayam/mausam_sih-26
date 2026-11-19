import React, { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import { WeatherSystemEvent } from '../../types/cyclone';
import { formatCoordinatePair } from '../../../shared/weatherContract';

interface CycloneTrackMapProps {
  activeSystem: WeatherSystemEvent | null;
}

const COASTAL_DWR_STATIONS = [
  { id: 'VSK', name: 'Visakhapatnam DWR', lat: 17.7282, lng: 83.3344, state: 'Andhra Pradesh' },
  { id: 'MCT', name: 'Machilipatnam DWR', lat: 16.2058, lng: 81.1554, state: 'Andhra Pradesh' },
  { id: 'PRD', name: 'Paradip DWR', lat: 20.3164, lng: 86.6917, state: 'Odisha' },
  { id: 'GPL', name: 'Gopalpur DWR', lat: 19.2618, lng: 84.8724, state: 'Odisha' },
  { id: 'KOL', name: 'Kolkata (Alipore) DWR', lat: 22.5333, lng: 88.3333, state: 'West Bengal' },
  { id: 'CHN', name: 'Chennai DWR', lat: 13.0827, lng: 80.2907, state: 'Tamil Nadu' },
  { id: 'KRK', name: 'Karaikal DWR', lat: 10.9254, lng: 79.838, state: 'Puducherry' },
  { id: 'BMB', name: 'Mumbai (Colaba) DWR', lat: 18.8998, lng: 72.8136, state: 'Maharashtra' },
  { id: 'GOA', name: 'Goa (Panaji) DWR', lat: 15.4909, lng: 73.8278, state: 'Goa' },
  { id: 'KCH', name: 'Kochi DWR', lat: 9.9312, lng: 76.2673, state: 'Kerala' },
  { id: 'AGT', name: 'Agartala DWR', lat: 23.8864, lng: 91.2404, state: 'Tripura' },
];

export const CycloneTrackMap: React.FC<CycloneTrackMapProps> = ({ activeSystem }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  const [showRadarRings, setShowRadarRings] = useState(true);
  const [showForecast, setShowForecast] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const defaultCenter: [number, number] = activeSystem
      ? [activeSystem.latitude, activeSystem.longitude]
      : [18.5, 84.5];
    const defaultZoom = activeSystem ? (activeSystem.basin === 'Inland Central India' ? 6 : 5.5) : 5;

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      minZoom: 4,
      maxZoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    const layersGroup = L.layerGroup().addTo(map);
    layersGroupRef.current = layersGroup;
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
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layersGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    if (showRadarRings) {
      COASTAL_DWR_STATIONS.forEach((station) => {
        const radarIcon = L.divIcon({
          className: 'radar-station-marker',
          html: `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;">
              <div style="width:10px;height:10px;border-radius:9999px;background:#35C7E8;border:2px solid #F3F6FA;"></div>
              <div style="position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;padding:1px 6px;border-radius:4px;background:rgba(8,19,31,0.92);border:1px solid #26394B;font-size:9px;font-family:monospace;color:#7DD3FC;pointer-events:none;">
                ${station.name.replace(' DWR', '')}
              </div>
            </div>
          `,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker([station.lat, station.lng], { icon: radarIcon });
        marker.bindPopup(`
          <div style="font-family:monospace;font-size:12px;color:#0F172A;padding:4px;">
            <strong style="color:#0B72B9;">${station.name}</strong><br/>
            <span>State: ${station.state}</span><br/>
            <span>Station Type: <strong>Coastal Doppler Radar</strong></span><br/>
            <span style="font-size:10px;color:#475569;">Surveillance: 400 km · Doppler: 250 km</span>
          </div>
        `);
        layers.addLayer(marker);

        const dopplerRing = L.circle([station.lat, station.lng], {
          radius: 250000,
          color: '#35C7E8',
          weight: 1,
          dashArray: '4, 4',
          fillColor: '#35C7E8',
          fillOpacity: 0.04,
        });
        layers.addLayer(dopplerRing);
      });
    }

    if (activeSystem) {
      const isHistorical = activeSystem.status === 'DISSIPATED';
      const systemColor = isHistorical
        ? '#8295A8'
        : activeSystem.rainfallThreat === 'RED'
        ? '#EF4444'
        : activeSystem.rainfallThreat === 'ORANGE'
        ? '#F97316'
        : activeSystem.classification === 'Depression'
        ? '#35C7E8'
        : '#22C7A0';

      if (showHistory && activeSystem.historicalTrack && activeSystem.historicalTrack.length > 0) {
        const histPoints: [number, number][] = activeSystem.historicalTrack.map((pt) => [
          pt.latitude,
          pt.longitude,
        ]);

        const histLine = L.polyline(histPoints, {
          color: isHistorical ? '#8295A8' : '#7DD3FC',
          weight: 2.5,
          dashArray: '3, 6',
          opacity: 0.85,
        });
        layers.addLayer(histLine);

        activeSystem.historicalTrack.forEach((pt) => {
          const ptIcon = L.divIcon({
            className: 'hist-pt-icon',
            html: `<div style="width:9px;height:9px;border-radius:9999px;background:#8295A8;border:1.5px solid #F3F6FA;"></div>`,
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
            html: `<div style="width:11px;height:11px;border-radius:9999px;background:#07111D;border:2px solid ${systemColor};"></div>`,
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
          <div style="width:26px;height:26px;border-radius:9999px;display:flex;align-items:center;justify-content:center;background:${systemColor};border:2px solid #F3F6FA;box-shadow:0 4px 12px rgba(0,0,0,0.5);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#07111D" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
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
        <div style="font-family:monospace;font-size:12px;color:#0F172A;min-width:180px;">
          <strong style="color:${systemColor};">${activeSystem.classification}</strong><br/>
          <span style="font-size:11px;color:#475569;">${activeSystem.name}</span><br/>
          <hr style="margin:4px 0;border:0;border-top:1px solid #CBD5E1;"/>
          <span>Coords: <strong>${formatCoordinatePair(activeSystem.latitude, activeSystem.longitude, 1)}</strong></span><br/>
          <span>Wind: <strong>${activeSystem.maxSustainedWind || '—'}</strong></span><br/>
          <span>Pressure: <strong>${activeSystem.pressure || '—'}</strong></span><br/>
          <span>Status: <strong>${activeSystem.status}</strong></span>
        </div>
      `);
      layers.addLayer(centerMarker);

      map.flyTo(
        [activeSystem.latitude, activeSystem.longitude],
        activeSystem.basin === 'Inland Central India' ? 6.2 : 5.5,
        { animate: true, duration: 1 }
      );
    } else {
      map.flyTo([18.5, 84.5], 5, { animate: true });
    }
  }, [activeSystem, showRadarRings, showForecast, showHistory]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetView = () => {
    if (activeSystem) {
      mapInstanceRef.current?.flyTo([activeSystem.latitude, activeSystem.longitude], 5.5, { animate: true });
    } else {
      mapInstanceRef.current?.flyTo([18.5, 84.5], 5, { animate: true });
    }
  };

  return (
    <div
      className={`w-full m-panel overflow-hidden flex flex-col relative ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-[480px] sm:h-[560px]'
      }`}
    >
      {/* Top Map Control Bar */}
      <div className="bg-[#08131F] border-b border-[#26394B] px-4 py-3 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#101F2E] border border-[#26394B] flex items-center justify-center text-[#35C7E8] shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#F3F6FA] tracking-tight">
              Synoptic Basin &amp; Doppler Surveillance Map
            </h2>
            <p className="text-[11px] font-mono text-[#8295A8]">
              Bay of Bengal · Arabian Sea · 11 Coastal DWR Range Rings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <button
            type="button"
            onClick={() => setShowRadarRings((prev) => !prev)}
            className={`px-3 py-1.5 min-h-[38px] rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer m-focus-ring ${
              showRadarRings
                ? 'bg-[#35C7E8]/12 border-[#35C7E8]/45 text-[#7DD3FC]'
                : 'bg-[#0B1927] border-[#26394B] text-[#8295A8] hover:text-[#F3F6FA]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Radar Rings</span>
          </button>

          <button
            type="button"
            onClick={() => setShowForecast((prev) => !prev)}
            className={`px-3 py-1.5 min-h-[38px] rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer m-focus-ring ${
              showForecast
                ? 'bg-[#35C7E8]/12 border-[#35C7E8]/45 text-[#7DD3FC]'
                : 'bg-[#0B1927] border-[#26394B] text-[#8295A8] hover:text-[#F3F6FA]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Forecast Path</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className={`px-3 py-1.5 min-h-[38px] rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer m-focus-ring ${
              showHistory
                ? 'bg-[#35C7E8]/12 border-[#35C7E8]/45 text-[#7DD3FC]'
                : 'bg-[#0B1927] border-[#26394B] text-[#8295A8] hover:text-[#F3F6FA]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Track History</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="w-9 h-9 rounded-lg bg-[#0B1927] border border-[#26394B] text-[#B5C3D1] hover:text-[#F3F6FA] hover:border-[#38536A] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div className="relative flex-1 w-full bg-[#07111D]">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Zoom / Reset Controls */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-10 h-10 rounded-lg bg-[#0B1927]/95 border border-[#26394B] text-[#F3F6FA] hover:border-[#35C7E8] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-10 h-10 rounded-lg bg-[#0B1927]/95 border border-[#26394B] text-[#F3F6FA] hover:border-[#35C7E8] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="w-10 h-10 rounded-lg bg-[#0B1927]/95 border border-[#26394B] text-[#35C7E8] hover:border-[#35C7E8] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
            title="Reset View"
            aria-label="Reset View"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Basin Status Overlay */}
        <div className="absolute bottom-4 left-4 z-[400] bg-[#08131F]/95 border border-[#26394B] rounded-xl px-3.5 py-2 flex items-center gap-2.5 pointer-events-none max-w-[calc(100%-2rem)]">
          <ShieldCheck className="w-4 h-4 text-[#22C7A0] shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-semibold text-[#F3F6FA] font-mono uppercase truncate">
              {activeSystem
                ? `${activeSystem.classification} · ${activeSystem.name}`
                : 'NORTH INDIAN OCEAN SURVEILLANCE'}
            </span>
            <span className="text-[10px] text-[#8295A8] font-mono truncate">
              {activeSystem?.status === 'DISSIPATED'
                ? 'System Dissipated · Historical Archive'
                : '11 IMD Coastal Doppler Stations Mapped (250 km Range)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
