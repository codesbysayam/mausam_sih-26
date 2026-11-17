import React, { useEffect, useRef, useState, useMemo } from 'react';
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
  Eye,
  EyeOff,
  Info,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { WeatherSystemEvent, WeatherSystemForecastPoint } from '../../types/cyclone';

interface CycloneTrackMapProps {
  activeSystem: WeatherSystemEvent | null;
}

// Indian Coastal Doppler Weather Radar network stations
const COASTAL_DWR_STATIONS = [
  { id: 'VSK', name: 'Visakhapatnam DWR', lat: 17.7282, lng: 83.3344, state: 'Andhra Pradesh' },
  { id: 'MCT', name: 'Machilipatnam DWR', lat: 16.2058, lng: 81.1554, state: 'Andhra Pradesh' },
  { id: 'PRD', name: 'Paradip DWR', lat: 20.3164, lng: 86.6917, state: 'Odisha' },
  { id: 'GPL', name: 'Gopalpur DWR', lat: 19.2618, lng: 84.8724, state: 'Odisha' },
  { id: 'KOL', name: 'Kolkata (Alipore) DWR', lat: 22.5333, lng: 88.3333, state: 'West Bengal' },
  { id: 'CHN', name: 'Chennai DWR', lat: 13.0827, lng: 80.2907, state: 'Tamil Nadu' },
  { id: 'KRK', name: 'Karaikal DWR', lat: 10.9254, lng: 79.8380, state: 'Puducherry' },
  { id: 'BMB', name: 'Mumbai (Colaba) DWR', lat: 18.8998, lng: 72.8136, state: 'Maharashtra' },
  { id: 'GOA', name: 'Goa (Panaji) DWR', lat: 15.4909, lng: 73.8278, state: 'Goa' },
  { id: 'KCH', name: 'Kochi DWR', lat: 9.9312, lng: 76.2673, state: 'Kerala' },
  { id: 'AGT', name: 'Agartala DWR', lat: 23.8864, lng: 91.2404, state: 'Tripura' },
];

export const CycloneTrackMap: React.FC<CycloneTrackMapProps> = ({
  activeSystem,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  const [showRadarRings, setShowRadarRings] = useState(true);
  const [showForecast, setShowForecast] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize Leaflet Map with free OpenStreetMap tiles and ResizeObserver
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

    // Free OpenStreetMap Standard Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const layersGroup = L.layerGroup().addTo(map);
    layersGroupRef.current = layersGroup;
    mapInstanceRef.current = map;

    // ResizeObserver to prevent tile duplications or layout breaks
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

  // Update map layers whenever activeSystem, visibility toggles, or map state changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layersGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    // 1. Plot Coastal Doppler Radar Network Coverage
    if (showRadarRings) {
      COASTAL_DWR_STATIONS.forEach((station) => {
        // Radar Station Icon
        const radarIcon = L.divIcon({
          className: 'radar-station-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="w-3.5 h-3.5 rounded-full bg-[#0284C7] border-2 border-white shadow-md"></div>
              <div class="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded bg-[#09111C]/90 border border-[#1E3A5F] text-[9px] font-mono text-[#38BDF8] pointer-events-none">
                ${station.name.replace(' DWR', '')}
              </div>
            </div>
          `,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const marker = L.marker([station.lat, station.lng], { icon: radarIcon });
        marker.bindPopup(`
          <div style="font-family: monospace; font-size: 12px; color: #0F172A; padding: 4px;">
            <strong style="color: #0284C7;">${station.name}</strong><br/>
            <span>State: ${station.state}</span><br/>
            <span>Status: <strong style="color: #10B981;">24x7 OPERATIONAL</strong></span><br/>
            <span style="font-size: 10px; color: #64748B;">Surveillance Range: 400 km • Doppler Range: 250 km</span>
          </div>
        `);
        layers.addLayer(marker);

        // 250km Doppler velocity range ring
        const dopplerRing = L.circle([station.lat, station.lng], {
          radius: 250000,
          color: '#0284C7',
          weight: 1,
          dashArray: '4, 4',
          fillColor: '#0284C7',
          fillOpacity: 0.03,
        });
        layers.addLayer(dopplerRing);
      });
    }

    // 2. Plot Active Synoptic System or Selected Disturbance
    if (activeSystem) {
      const isHistorical = activeSystem.status === 'DISSIPATED';
      const systemColor = isHistorical
        ? '#64748B'
        : activeSystem.rainfallThreat === 'RED'
        ? '#EF4444'
        : activeSystem.rainfallThreat === 'ORANGE'
        ? '#F97316'
        : activeSystem.classification === 'Depression'
        ? '#38BDF8'
        : '#10B981';

      // Observed / Historical Track Points
      if (showHistory && activeSystem.historicalTrack && activeSystem.historicalTrack.length > 0) {
        const histPoints: [number, number][] = activeSystem.historicalTrack.map((pt) => [
          pt.latitude,
          pt.longitude,
        ]);

        const histLine = L.polyline(histPoints, {
          color: isHistorical ? '#94A3B8' : '#38BDF8',
          weight: 3,
          dashArray: '3, 6',
          opacity: 0.8,
        });
        layers.addLayer(histLine);

        activeSystem.historicalTrack.forEach((pt, i) => {
          const ptIcon = L.divIcon({
            className: 'hist-pt-icon',
            html: `<div class="w-2.5 h-2.5 rounded-full bg-[#94A3B8] border border-white"></div>`,
            iconSize: [10, 10],
            iconAnchor: [5, 5],
          });
          const m = L.marker([pt.latitude, pt.longitude], { icon: ptIcon });
          m.bindTooltip(`
            <div style="font-family: monospace; font-size: 11px;">
              <strong>${pt.time.slice(5, 16).replace('T', ' ')} IST</strong><br/>
              ${pt.locationName || pt.expectedClassification}
            </div>
          `);
          layers.addLayer(m);
        });
      }

      // Forecast Track Points
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
            html: `<div class="w-3 h-3 rounded-full bg-white border-2" style="border-color: ${systemColor};"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          });
          const m = L.marker([pt.latitude, pt.longitude], { icon: ptIcon });
          m.bindTooltip(`
            <div style="font-family: monospace; font-size: 11px;">
              <strong>Forecast: ${pt.time.slice(5, 16).replace('T', ' ')} IST</strong><br/>
              ${pt.expectedClassification}<br/>
              Wind: ${pt.windSpeed || 'N/A'}
            </div>
          `);
          layers.addLayer(m);
        });
      }

      // System Center Marker
      const centerIcon = L.divIcon({
        className: 'cyclone-center-marker',
        html: `
          <div class="relative flex items-center justify-center">
            ${
              !isHistorical
                ? `<span class="animate-ping absolute inline-flex h-8 w-8 rounded-full" style="background-color: ${systemColor}; opacity: 0.4;"></span>`
                : ''
            }
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-white shadow-xl border-2 border-white" style="background-color: ${systemColor};">
              🌀
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const centerMarker = L.marker([activeSystem.latitude, activeSystem.longitude], {
        icon: centerIcon,
      });

      centerMarker.bindPopup(`
        <div style="font-family: monospace; font-size: 12px; color: #0F172A; min-width: 180px;">
          <strong style="color: ${systemColor};">${activeSystem.classification}</strong><br/>
          <span style="font-size: 11px; color: #475569;">${activeSystem.name}</span><br/>
          <hr style="margin: 4px 0; border: 0; border-top: 1px solid #CBD5E1;"/>
          <span>Coords: <strong>${activeSystem.latitude.toFixed(1)}°N, ${activeSystem.longitude.toFixed(1)}°E</strong></span><br/>
          <span>Wind: <strong>${activeSystem.maxSustainedWind}</strong></span><br/>
          <span>Pressure: <strong>${activeSystem.pressure}</strong></span><br/>
          <span>Status: <strong>${activeSystem.status}</strong></span>
        </div>
      `);
      layers.addLayer(centerMarker);

      // Pan/Fly to system location
      map.flyTo([activeSystem.latitude, activeSystem.longitude], activeSystem.basin === 'Inland Central India' ? 6.2 : 5.5, {
        animate: true,
        duration: 1,
      });
    } else {
      // Default view over Bay of Bengal & Arabian Sea
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
      className={`w-full bg-[#0B1523] border border-[#1E3A5F] rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300 relative ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-[500px] sm:h-[580px]'
      }`}
    >
      {/* Top Map Control Bar */}
      <div className="bg-[#09111C]/90 backdrop-blur-md border-b border-[#1E2E40] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#38BDF8]" />
          <span className="text-xs font-bold uppercase tracking-wider font-mono text-white">
            Synoptic Basin &amp; Radar Surveillance Map
          </span>
          <span className="px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] text-[10px] font-mono font-bold">
            FREE OSM TILES
          </span>
        </div>

        {/* Map Layer Toggles */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <button
            type="button"
            onClick={() => setShowRadarRings((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
              showRadarRings
                ? 'bg-[#0284C7]/20 border-[#0284C7] text-[#38BDF8]'
                : 'bg-[#09111C] border-[#1E2E40] text-[#64748B]'
            }`}
            title="Toggle Coastal Doppler Radar coverage rings"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Radar Surveillance</span>
          </button>

          <button
            type="button"
            onClick={() => setShowForecast((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
              showForecast
                ? 'bg-[#0284C7]/20 border-[#0284C7] text-[#38BDF8]'
                : 'bg-[#09111C] border-[#1E2E40] text-[#64748B]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Forecast Path</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
              showHistory
                ? 'bg-[#0284C7]/20 border-[#0284C7] text-[#38BDF8]'
                : 'bg-[#09111C] border-[#1E2E40] text-[#64748B]'
            }`}
          >
            <span>Track History</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1.5 rounded-lg bg-[#09111C] border border-[#1E2E40] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div className="relative flex-1 w-full bg-[#060D17]">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Zoom / Reset Controls */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-lg bg-[#0B1523]/90 border border-[#1E2E40] text-white hover:bg-[#1E2E40] flex items-center justify-center shadow-lg transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-lg bg-[#0B1523]/90 border border-[#1E2E40] text-white hover:bg-[#1E2E40] flex items-center justify-center shadow-lg transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="w-8 h-8 rounded-lg bg-[#0B1523]/90 border border-[#1E2E40] text-[#38BDF8] hover:bg-[#1E2E40] flex items-center justify-center shadow-lg transition-colors cursor-pointer"
            title="Reset View"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Basin Status Watermark */}
        <div className="absolute bottom-4 left-4 z-[400] bg-[#09111C]/90 backdrop-blur-md border border-[#1E2E40] rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-xl pointer-events-none">
          <ShieldCheck className="w-4 h-4 text-[#10B981]" />
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-white font-mono uppercase">
              {activeSystem
                ? `${activeSystem.classification} • ${activeSystem.name}`
                : 'SURVEILLANCE SECTOR • NORTH INDIAN OCEAN'}
            </span>
            <span className="text-[10px] text-[#94A3B8] font-mono">
              {activeSystem?.status === 'DISSIPATED'
                ? 'System Dissipated • Historical Archive'
                : '11 IMD Coastal Doppler Radars Active • No Blindspots'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
