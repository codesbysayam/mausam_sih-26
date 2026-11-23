import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationRecord, MarineObservation } from '../../types';
import { marineService } from '../../services/marineService';
import {
  DataPanel,
  SectionHeading,
  SourceStatus,
  UnavailableState,
} from '../ui/ObservatoryPrimitives';
import {
  Waves,
  Anchor,
  ShieldCheck,
  Compass,
  Crosshair,
} from 'lucide-react';
import { formatLocationTitle } from '../../utils/locationFormatter';
import {
  resolveBasemapSpec,
  type BasemapStyleId,
} from '../../utils/mapBasemaps';
import { BasemapStyleSwitcher } from '../maps';

interface CoastalMarineSectionProps {
  location: LocationRecord;
}

function getWaveColor(waveHeightMeters: number | null): string {
  if (waveHeightMeters === null) return '#64748B';
  if (waveHeightMeters < 1.0) return '#34D399';
  if (waveHeightMeters < 2.0) return '#38BDF8';
  if (waveHeightMeters < 3.0) return '#F59E0B';
  return '#EF4444';
}

const CoastalMarineMiniMap: React.FC<{
  location: LocationRecord;
  marineData: MarineObservation;
}> = ({ location, marineData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const basemapGroupRef = useRef<L.LayerGroup | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);

  const [basemapStyle, setBasemapStyle] = useState<BasemapStyleId>('satellite');
  const [useOsmFallback, setUseOsmFallback] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [location.lat, location.lng],
      zoom: 8,
      minZoom: 4,
      maxZoom: 13,
      zoomControl: false,
      attributionControl: true,
    });

    basemapGroupRef.current = L.layerGroup().addTo(map);
    markerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const ro = new ResizeObserver(() => map.invalidateSize({ pan: false, animate: false }));
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      basemapGroupRef.current = null;
      markerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const group = basemapGroupRef.current;
    if (!group) return;
    group.clearLayers();

    const spec = resolveBasemapSpec(basemapStyle, useOsmFallback);
    let errCount = 0;

    const layer = L.tileLayer(spec.baseUrl, {
      maxZoom: spec.maxZoom,
      attribution: spec.attribution,
      className: spec.className,
    });
    layer.on('tileerror', () => {
      errCount += 1;
      if (errCount >= 3 && !useOsmFallback) setUseOsmFallback(true);
    });
    layer.addTo(group);

    if (spec.referenceUrl) {
      L.tileLayer(spec.referenceUrl, { maxZoom: spec.maxZoom, opacity: 0.72 }).addTo(group);
    }
  }, [basemapStyle, useOsmFallback]);

  useEffect(() => {
    const map = mapRef.current;
    const group = markerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    const waveColor = getWaveColor(marineData.waveHeightMeters);

    // Coastal wave monitoring zone ring (30 km offshore grid cell)
    L.circle([location.lat, location.lng], {
      radius: 30000,
      color: waveColor,
      weight: 1.5,
      dashArray: '4, 4',
      fillColor: waveColor,
      fillOpacity: 0.14,
    }).addTo(group);

    const hasCurrentBearing =
      typeof marineData.currentDirectionDeg === 'number' &&
      Number.isFinite(marineData.currentDirectionDeg);

    const stationIcon = L.divIcon({
      className: 'mausam-marine-buoy-marker',
      html: `
        <div style="display:flex;align-items:center;gap:6px;transform:translate(-10px,-50%);">
          <div style="width:20px;height:20px;border-radius:9999px;background:#0B0C0D;border:2px solid ${waveColor};display:flex;align-items:center;justify-content:center;color:${waveColor};font-family:monospace;font-size:12px;font-weight:700;">
            ${
              hasCurrentBearing
                ? `<span style="display:inline-block;transform:rotate(${marineData.currentDirectionDeg}deg);">↑</span>`
                : '●'
            }
          </div>
          <div style="padding:2px 7px;border-radius:5px;background:rgba(11,12,13,0.94);border:1px solid ${waveColor};color:#F8FAFC;font-family:monospace;font-size:10px;font-weight:700;white-space:nowrap;">
            ${marineData.waveHeightMeters !== null ? `${marineData.waveHeightMeters}m Wave` : 'Marine Cell'}
            ${marineData.seaSurfaceTempC !== null ? ` · ${marineData.seaSurfaceTempC}°C SST` : ''}
          </div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const marker = L.marker([location.lat, location.lng], { icon: stationIcon });
    marker.bindPopup(`
      <div style="font-family:monospace;font-size:11.5px;color:#111314;min-width:205px;">
        <strong>${location.displayName || location.city} Marine Cell</strong><br/>
        <span>Coords: ${location.lat.toFixed(3)}°N, ${location.lng.toFixed(3)}°E</span><br/>
        <hr style="margin:4px 0;border:0;border-top:1px solid #CBD5E1;"/>
        <span>Wave: <strong>${marineData.waveHeightMeters !== null ? `${marineData.waveHeightMeters} m` : '—'}</strong> · Swell: <strong>${marineData.swellHeightMeters !== null ? `${marineData.swellHeightMeters} m` : '—'}</strong></span><br/>
        <span>SST: <strong>${marineData.seaSurfaceTempC !== null ? `${marineData.seaSurfaceTempC}°C` : '—'}</strong></span><br/>
        <span>Current: <strong>${marineData.currentVelocityKmh !== null ? `${marineData.currentVelocityKmh} km/h` : '—'} ${marineData.currentDirectionCompass || ''}</strong></span>
      </div>
    `);
    marker.addTo(group);

    map.flyTo([location.lat, location.lng], 8, { animate: true, duration: 0.7 });
  }, [location, marineData]);

  return (
    <div className="m-panel-inset overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-[var(--m-border)] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--m-text-secondary)]">
          <Compass className="w-3.5 h-3.5 text-[var(--m-accent)]" />
          <span className="font-semibold text-[var(--m-text-primary)]">
            Coastal &amp; Littoral Sea-State Map
          </span>
          <span className="hidden sm:inline text-[var(--m-text-muted)]">
            · 30 km Offshore Marine Grid
          </span>
        </div>

        <div className="flex items-center gap-1.5">
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
            onClick={() => mapRef.current?.flyTo([location.lat, location.lng], 8, { animate: true })}
            aria-label="Recenter coastal map"
            title="Recenter coastal map"
            className="w-8 h-8 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)] text-[var(--m-accent)] flex items-center justify-center cursor-pointer m-focus-ring"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="relative w-full h-[240px] sm:h-[260px] bg-[#0D1012]">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      <div className="px-3 py-1.5 border-t border-[var(--m-border)] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-[var(--m-text-muted)]">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#34D399]" /> &lt;1m Calm
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8]" /> 1–2m Moderate
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> 2–3m Rough
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> &gt;3m High
          </span>
        </div>
        <span>Arrow indicates surface current bearing when reported · {marineData.source}</span>
      </div>
    </div>
  );
};

export const CoastalMarineSection: React.FC<CoastalMarineSectionProps> = ({ location }) => {
  const [marineData, setMarineData] = useState<MarineObservation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    marineService.getMarineData(location).then((data) => {
      if (isMounted) {
        setMarineData(data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [location.id, location.lat, location.lng]);

  const isCoastal = marineService.isLocationCoastal(location);

  if (!isCoastal) {
    return (
      <DataPanel id="coastal-marine-section">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex items-center justify-center text-[var(--m-text-muted)] shrink-0">
              <Waves className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--m-text-primary)] uppercase tracking-wider">
                Coastal &amp; Marine Meteorology
              </h3>
              <p className="text-xs text-[var(--m-text-muted)]">
                Not applicable to inland continental stations ({formatLocationTitle(location)})
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-md bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border border-[var(--m-border)] self-start sm:self-auto">
            INLAND STATION
          </span>
        </div>
      </DataPanel>
    );
  }

  if (loading) {
    return (
      <DataPanel id="coastal-marine-section" className="space-y-4">
        <SectionHeading
          title="Coastal & Marine Meteorology"
          subtitle={`Synchronizing wave height, swell, and SST for ${location.displayName || location.city}`}
          icon={<Waves className="w-4 h-4" />}
          action={<SourceStatus status="LOADING" source="Open-Meteo Marine" />}
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="m-panel-inset h-20" />
          ))}
        </div>
      </DataPanel>
    );
  }

  if (!marineData || !marineData.isApplicable || marineData.status === 'UNAVAILABLE') {
    return (
      <DataPanel id="coastal-marine-section">
        <UnavailableState
          title="Coastal & Marine Telemetry Unavailable"
          reason="Wave buoy / Open-Meteo marine grid data is unavailable for this coordinate cell."
          source={marineData?.source || 'Open-Meteo Marine'}
        />
      </DataPanel>
    );
  }

  const fishingBadgeColor =
    marineData.fishingSuitability === 'Favorable'
      ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35'
      : marineData.fishingSuitability === 'Caution'
      ? 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/35'
      : marineData.fishingSuitability === 'Unavailable'
      ? 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border-[var(--m-border)]'
      : 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/35';

  const beachBadgeColor =
    marineData.beachSafetyStatus === 'Safe'
      ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35'
      : marineData.beachSafetyStatus.includes('Caution')
      ? 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/35'
      : marineData.beachSafetyStatus === 'Unavailable'
      ? 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border-[var(--m-border)]'
      : 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/35';

  return (
    <DataPanel id="coastal-marine-section" className="space-y-4">
      <SectionHeading
        title="Coastal & Marine Meteorology"
        subtitle={`Sea state, swell period, and sea-surface temperature for ${location.displayName || location.city}`}
        icon={<Waves className="w-4 h-4" />}
        action={
          <SourceStatus
            status={marineData.status}
            source={marineData.source}
            updatedAt={marineData.timestampFormatted}
          />
        }
      />

      {/* Advisory Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="m-panel-inset p-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Anchor className="w-4 h-4 text-[var(--m-accent)] shrink-0" />
            <div>
              <div className="text-xs font-bold text-[var(--m-text-primary)]">Small Craft &amp; Fishing</div>
              <div className="text-[11px] text-[var(--m-text-muted)]">Derived from significant wave &amp; swell state</div>
            </div>
          </div>
          <span className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md uppercase border ${fishingBadgeColor}`}>
            {marineData.fishingSuitability}
          </span>
        </div>

        <div className="m-panel-inset p-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[var(--m-ok)] shrink-0" />
            <div>
              <div className="text-xs font-bold text-[var(--m-text-primary)]">Littoral Surf State</div>
              <div className="text-[11px] text-[var(--m-text-muted)]">Shoreline wave-height classification</div>
            </div>
          </div>
          <span className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md uppercase border ${beachBadgeColor}`}>
            {marineData.beachSafetyStatus}
          </span>
        </div>
      </div>

      {/* Embedded Coastal Sea-State & Current Vector Map */}
      <CoastalMarineMiniMap location={location} marineData={marineData} />

      {/* Numerical Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono tabular-nums">
        <div className="m-panel-inset p-3">
          <div className="text-[10px] font-sans text-[var(--m-text-muted)] font-semibold uppercase">Wave Height</div>
          <div className="text-lg font-bold text-[var(--m-text-primary)] mt-0.5">
            {marineData.waveHeightMeters !== null ? `${marineData.waveHeightMeters} m` : '—'}
          </div>
          <div className="text-[10px] text-[var(--m-text-muted)] mt-0.5">
            Period: {marineData.wavePeriodSeconds !== null ? `${marineData.wavePeriodSeconds}s` : '—'}
          </div>
        </div>

        <div className="m-panel-inset p-3">
          <div className="text-[10px] font-sans text-[var(--m-text-muted)] font-semibold uppercase">Swell Height</div>
          <div className="text-lg font-bold text-[var(--m-accent)] mt-0.5">
            {marineData.swellHeightMeters !== null ? `${marineData.swellHeightMeters} m` : '—'}
          </div>
          <div className="text-[10px] text-[var(--m-text-muted)] mt-0.5">
            Period: {marineData.swellPeriodSeconds !== null ? `${marineData.swellPeriodSeconds}s` : '—'}
          </div>
        </div>

        <div className="m-panel-inset p-3">
          <div className="text-[10px] font-sans text-[var(--m-text-muted)] font-semibold uppercase">Sea Surface Temp</div>
          <div className="text-lg font-bold text-[var(--m-watch)] mt-0.5">
            {marineData.seaSurfaceTempC !== null ? `${marineData.seaSurfaceTempC}°C` : '—'}
          </div>
          <div className="text-[10px] font-sans text-[var(--m-text-muted)] mt-0.5">Open-Meteo SST Grid</div>
        </div>

        <div className="m-panel-inset p-3">
          <div className="text-[10px] font-sans text-[var(--m-text-muted)] font-semibold uppercase">Ocean Current</div>
          <div className="text-lg font-bold text-[var(--m-text-primary)] mt-0.5">
            {marineData.currentVelocityKmh !== null ? `${marineData.currentVelocityKmh} km/h` : '—'}
          </div>
          <div className="text-[10px] text-[var(--m-text-muted)] mt-0.5">
            {marineData.currentDirectionCompass && marineData.currentDirectionDeg !== null
              ? `Towards ${marineData.currentDirectionCompass} (${marineData.currentDirectionDeg}°)`
              : 'Direction unavailable'}
          </div>
        </div>

        <div className="m-panel-inset p-3">
          <div className="text-[10px] font-sans text-[var(--m-text-muted)] font-semibold uppercase">Next High Tide</div>
          <div className="text-sm font-bold text-[var(--m-text-primary)] mt-1">
            {marineData.highTideTime || 'Unavailable'}
          </div>
          <div className="text-[10px] font-sans text-[var(--m-text-muted)] mt-0.5">
            {marineData.highTideTime ? 'Tide gauge feed' : 'Requires harmonic tide feed'}
          </div>
        </div>

        <div className="m-panel-inset p-3">
          <div className="text-[10px] font-sans text-[var(--m-text-muted)] font-semibold uppercase">Next Low Tide</div>
          <div className="text-sm font-bold text-[var(--m-text-primary)] mt-1">
            {marineData.lowTideTime || 'Unavailable'}
          </div>
          <div className="text-[10px] font-sans text-[var(--m-text-muted)] mt-0.5">
            {marineData.lowTideTime ? 'Tide gauge feed' : 'Requires harmonic tide feed'}
          </div>
        </div>
      </div>
    </DataPanel>
  );
};
