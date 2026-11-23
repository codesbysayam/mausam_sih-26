import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Maximize2,
  Minimize2,
  MapPin,
  ShieldAlert,
  ChevronRight,
  Globe2,
  AlertTriangle,
  Search,
  ZoomIn,
  ZoomOut,
  Crosshair,
} from 'lucide-react';
import { ALL_INDIA_STATES_MET_PROFILES, StateMeteorologicalProfile } from '../../data/allIndiaStatesProfiles';
import { StateWarningSummary, AlertSeverity, WarningRecord } from '../../types/warningTypes';
import { warningService } from '../../services/warningService';
import {
  INDIA_GEOGRAPHIC_BOUNDS,
  resolveBasemapSpec,
  type BasemapStyleId,
} from '../../utils/mapBasemaps';
import { BasemapStyleSwitcher } from '../maps';

interface NationalWarningMapProps {
  selectedState: string | null;
  onSelectState: (stateName: string, stateCode: string) => void;
  onOpenStateDrawer?: (summary: StateWarningSummary) => void;
  warnings?: WarningRecord[];
  isUnavailable?: boolean;
}

const SEVERITY_COLORS: Record<AlertSeverity, { bg: string; border: string; text: string; label: string }> = {
  red: { bg: '#C94F4B', border: '#F0EEE7', text: '#F0EEE7', label: 'RED ALERT' },
  orange: { bg: '#D98548', border: '#F0EEE7', text: '#0B0C0D', label: 'ORANGE ALERT' },
  yellow: { bg: '#D8B14F', border: '#0B0C0D', text: '#0B0C0D', label: 'YELLOW WATCH' },
  purple: { bg: '#A7C5C5', border: '#0B0C0D', text: '#0B0C0D', label: 'ADVISORY' },
  green: { bg: '#5C9A79', border: '#111314', text: '#0B0C0D', label: 'NORMAL' },
};

const UNAVAILABLE_STYLE = {
  bg: '#52575B',
  border: '#191C1D',
  text: '#E6E4DD',
  label: 'UNVERIFIED',
};

// Leaflet controller for smooth bounds fit, zoom controls & fullscreen resize
const MapController: React.FC<{
  selectedProfile: StateMeteorologicalProfile | null;
  resetCounter: number;
  zoomDeltaCounter: { dir: 1 | -1; seq: number };
  isFullscreen: boolean;
}> = ({ selectedProfile, resetCounter, zoomDeltaCounter, isFullscreen }) => {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const timer = setTimeout(() => {
      map.invalidateSize({ animate: false, pan: false });
      if (!selectedProfile) {
        map.fitBounds(INDIA_GEOGRAPHIC_BOUNDS, { padding: [22, 22], maxZoom: 5 });
      }
    }, 120);

    const observer =
      typeof ResizeObserver !== 'undefined' && container
        ? new ResizeObserver(() => {
            map.invalidateSize({ animate: false, pan: false });
          })
        : null;
    if (observer && container) {
      observer.observe(container);
    }

    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, [map, isFullscreen]);

  useEffect(() => {
    if (selectedProfile) {
      map.flyTo([selectedProfile.lat, selectedProfile.lng], 6, { duration: 0.75 });
    }
  }, [selectedProfile, map]);

  useEffect(() => {
    if (resetCounter > 0) {
      map.fitBounds(INDIA_GEOGRAPHIC_BOUNDS, { padding: [22, 22], maxZoom: 5, animate: true });
    }
  }, [resetCounter, map]);

  useEffect(() => {
    if (zoomDeltaCounter.seq > 0) {
      if (zoomDeltaCounter.dir > 0) map.zoomIn();
      else map.zoomOut();
    }
  }, [zoomDeltaCounter, map]);

  return null;
};

/**
 * Geographic marker builder:
 * - Active warning states get a prominent geographic pin + readable state name callout + alert count badge.
 * - Normal / Unverified states get a clean compact coordinate dot so markers never collide or clip.
 */
function createGeographicStateIcon(
  profile: StateMeteorologicalProfile,
  severity: AlertSeverity,
  isSelected: boolean,
  activeCount: number,
  isUnavailable: boolean
): L.DivIcon {
  const palette = isUnavailable ? UNAVAILABLE_STYLE : SEVERITY_COLORS[severity] || SEVERITY_COLORS.green;
  const isAlerted = !isUnavailable && severity !== 'green';
  const shortLabel =
    profile.name.length > 16
      ? profile.code === 'DNHDD'
        ? 'DNH & DD'
        : profile.code === 'AN'
        ? 'A & N Islands'
        : profile.name.slice(0, 14) + '…'
      : profile.name;

  if (isAlerted || isSelected) {
    const ringGlow =
      severity === 'red'
        ? '0 0 0 5px rgba(201,79,75,0.28)'
        : severity === 'orange'
        ? '0 0 0 5px rgba(217,133,72,0.28)'
        : severity === 'yellow'
        ? '0 0 0 5px rgba(216,177,79,0.26)'
        : '0 0 0 4px rgba(197,164,109,0.28)';

    const countBadge =
      activeCount > 0
        ? `<span style="margin-left:5px;padding:0 5px;border-radius:9999px;background:#0B0C0D;color:#F0EEE7;font-size:9px;font-weight:700;line-height:15px;">${activeCount}</span>`
        : '';

    return L.divIcon({
      className: 'mausam-geo-state-marker-alert',
      html: `
        <div style="display:flex;align-items:center;gap:5px;transform:translate(-7px,-50%);pointer-events:auto;">
          <div style="width:14px;height:14px;border-radius:9999px;background:${palette.bg};border:2px solid ${palette.border};box-shadow:${ringGlow};flex-shrink:0;"></div>
          <div style="display:inline-flex;align-items:center;padding:2px 7px;border-radius:6px;background:rgba(11,12,13,0.92);border:1px solid ${palette.bg};color:#F0EEE7;font-family:var(--font-mono,monospace);font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.45);">
            <span>${shortLabel}</span>${countBadge}
          </div>
        </div>
      `,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  }

  return L.divIcon({
    className: 'mausam-geo-state-marker-normal',
    html: `
      <div style="
        width: 11px;
        height: 11px;
        border-radius: 9999px;
        background: ${palette.bg};
        border: 1.5px solid #0B0C0D;
        box-shadow: 0 1px 4px rgba(0,0,0,0.6);
        opacity: ${isUnavailable ? '0.65' : '0.88'};
      "></div>
    `,
    iconSize: [11, 11],
    iconAnchor: [5.5, 5.5],
  });
}

export const NationalWarningMap: React.FC<NationalWarningMapProps> = ({
  selectedState,
  onSelectState,
  onOpenStateDrawer,
  warnings = [],
  isUnavailable = false,
}) => {
  const [resetCounter, setResetCounter] = useState(0);
  const [zoomDeltaCounter, setZoomDeltaCounter] = useState<{ dir: 1 | -1; seq: number }>({
    dir: 1,
    seq: 0,
  });
  const [basemapStyle, setBasemapStyle] = useState<BasemapStyleId>('dark');
  const [useOsmFallback, setUseOsmFallback] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stateSearch, setStateSearch] = useState('');

  const reconciled = useMemo(
    () => warningService.reconcileNationalWarnings(warnings, { isUnavailable }),
    [warnings, isUnavailable]
  );

  const selectedProfile = useMemo(() => {
    if (!selectedState || selectedState === 'all') return null;
    const q = selectedState.toLowerCase();
    return (
      ALL_INDIA_STATES_MET_PROFILES.find(
        (p) =>
          p.name.toLowerCase() === q ||
          p.code.toLowerCase() === q ||
          `in-${p.code.toLowerCase()}` === q ||
          p.aliases.some((a) => a.toLowerCase() === q)
      ) || null
    );
  }, [selectedState]);

  const matchingStates = useMemo(() => {
    const q = stateSearch.trim().toLowerCase();
    if (!q) return [];
    return ALL_INDIA_STATES_MET_PROFILES.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.capital.toLowerCase().includes(q) ||
        p.aliases.some((a) => a.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [stateSearch]);

  const resolveStateSummary = useCallback(
    (profile: StateMeteorologicalProfile): StateWarningSummary => {
      const codeKey = profile.code.toLowerCase();
      const matched = reconciled.stateSummaries[codeKey];
      if (matched) return matched;

      return {
        stateCode: `in-${codeKey}`,
        stateName: profile.name,
        capital: profile.capital,
        highestSeverity: 'green',
        activeCount: 0,
        primaryHazard: 'agromet_advisory',
        primaryHazardLabel: isUnavailable ? 'Feed Unverified' : 'Normal Seasonal Conditions',
        representativeStation: profile.representativeStation,
        bulletinHeadline: isUnavailable
          ? 'Official SACHET / IMD feed unreachable — status unverified.'
          : 'No active severe weather warning',
        validityRange: isUnavailable ? 'Unavailable' : 'Routine Synoptic Cycle',
      };
    },
    [reconciled, isUnavailable]
  );

  const tileErrorCountRef = React.useRef(0);
  const handleTileError = useCallback(() => {
    tileErrorCountRef.current += 1;
    if (tileErrorCountRef.current >= 3 && !useOsmFallback) {
      setUseOsmFallback(true);
    }
  }, [useOsmFallback]);

  const handleResetView = () => {
    onSelectState('All India', 'in-all');
    setResetCounter((c) => c + 1);
  };

  const activeBasemap = resolveBasemapSpec(basemapStyle, useOsmFallback);

  return (
    <div
      id="national-weather-alert-map-card"
      className={`m-panel p-3.5 sm:p-5 flex flex-col justify-between gap-3.5 min-w-0 ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none h-[100dvh]'
          : 'h-full min-h-[420px] sm:min-h-[520px] lg:min-h-[560px]'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 pb-3 border-b border-[var(--m-border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex items-center justify-center text-[var(--m-accent)] shrink-0">
              <Globe2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-[var(--m-text-primary)] tracking-tight">
                  National Weather Alert Map
                </h2>
                {isUnavailable ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold text-[var(--m-watch)] bg-[var(--m-watch-soft)] border border-[var(--m-watch)]/35 px-2 py-0.5 rounded whitespace-nowrap">
                    <AlertTriangle className="w-3 h-3" />
                    FEED UNVERIFIED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold text-[var(--m-ok)] bg-[var(--m-ok-soft)] border border-[var(--m-ok)]/35 px-2 py-0.5 rounded whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--m-ok)]" />
                    SACHET / IMD LIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--m-text-muted)] mt-0.5 truncate">
                All {reconciled.totalStatesAndUTs} Indian States &amp; UTs · {activeBasemap.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <BasemapStyleSwitcher
              value={basemapStyle}
              onChange={(style) => {
                tileErrorCountRef.current = 0;
                setUseOsmFallback(false);
                setBasemapStyle(style);
              }}
              compact
            />

            <button
              id="btn-reset-national-map"
              type="button"
              onClick={handleResetView}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] text-xs font-semibold text-[var(--m-text-primary)] border border-[var(--m-border)] transition-colors cursor-pointer whitespace-nowrap m-focus-ring"
            >
              <Crosshair className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              <span>Fit India</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="w-9 h-9 rounded-lg bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] border border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Quick State / UT Search Jump Bar */}
        <div className="relative max-w-sm">
          <Search className="w-3.5 h-3.5 text-[var(--m-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={stateSearch}
            onChange={(e) => setStateSearch(e.target.value)}
            placeholder="Jump to State or UT (e.g., Odisha, Kerala, Ladakh)…"
            aria-label="Search state or union territory on warning map"
            className="w-full h-9 pl-8 pr-3 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] focus:border-[var(--m-accent)] text-xs text-[var(--m-text-primary)] placeholder:text-[var(--m-text-muted)] outline-none"
          />
          {matchingStates.length > 0 && (
            <div className="absolute left-0 right-0 top-10 z-[480] rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border-strong)] shadow-xl overflow-hidden">
              {matchingStates.map((st) => {
                const summary = resolveStateSummary(st);
                const palette = isUnavailable
                  ? UNAVAILABLE_STYLE
                  : SEVERITY_COLORS[summary.highestSeverity] || SEVERITY_COLORS.green;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      onSelectState(st.name, `in-${st.code.toLowerCase()}`);
                      setStateSearch('');
                    }}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--m-surface-2)] flex items-center justify-between gap-2 border-b last:border-b-0 border-[var(--m-border)] cursor-pointer"
                  >
                    <span className="text-[var(--m-text-primary)] font-medium truncate">
                      {st.name}{' '}
                      <span className="text-[var(--m-text-muted)] font-mono text-[10px]">
                        ({st.capital})
                      </span>
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0"
                      style={{ backgroundColor: palette.bg, color: palette.text }}
                    >
                      {palette.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Geographic Leaflet Map */}
      <div
        className={`relative flex-1 w-full rounded-xl overflow-hidden border border-[var(--m-border)] bg-[#0D1012] z-10 ${
          isFullscreen ? 'min-h-0' : 'h-[clamp(290px,48dvh,560px)] min-h-[290px]'
        }`}
      >
        <MapContainer
          center={[22.2, 82.6]}
          zoom={4.5}
          minZoom={2}
          maxZoom={11}
          worldCopyJump={true}
          zoomSnap={0.5}
          zoomControl={false}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%', background: '#0D1012' }}
          className="z-10"
        >
          <TileLayer
            key={`${activeBasemap.id}-${useOsmFallback ? 'fb' : 'pri'}`}
            attribution={activeBasemap.attribution}
            url={activeBasemap.baseUrl}
            maxZoom={activeBasemap.maxZoom}
            className={activeBasemap.className}
            eventHandlers={{
              tileerror: handleTileError,
            }}
          />
          {activeBasemap.referenceUrl && (
            <TileLayer
              key={`${activeBasemap.id}-ref`}
              url={activeBasemap.referenceUrl}
              maxZoom={activeBasemap.maxZoom}
              opacity={0.78}
            />
          )}

          <MapController
            selectedProfile={selectedProfile}
            resetCounter={resetCounter}
            zoomDeltaCounter={zoomDeltaCounter}
            isFullscreen={isFullscreen}
          />

          {ALL_INDIA_STATES_MET_PROFILES.map((profile) => {
            const summary = resolveStateSummary(profile);
            const isSelected = selectedProfile?.id === profile.id;
            const icon = createGeographicStateIcon(
              profile,
              summary.highestSeverity,
              isSelected,
              summary.activeCount,
              isUnavailable
            );
            const palette = isUnavailable
              ? UNAVAILABLE_STYLE
              : SEVERITY_COLORS[summary.highestSeverity] || SEVERITY_COLORS.green;

            return (
              <Marker
                key={profile.id}
                position={[profile.lat, profile.lng]}
                icon={icon}
                zIndexOffset={summary.highestSeverity !== 'green' ? 500 : isSelected ? 600 : 100}
                eventHandlers={{
                  click: () => {
                    onSelectState(profile.name, `in-${profile.code.toLowerCase()}`);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.96}>
                  <div className="text-[11px] font-mono leading-snug">
                    <div className="font-bold text-slate-900">
                      {profile.name} ({profile.code})
                    </div>
                    <div className="text-[10px] text-slate-600">
                      {isUnavailable
                        ? 'Feed Unverified — Status Unknown'
                        : summary.activeCount > 0
                        ? `${palette.label} · ${summary.activeCount} active bulletin${summary.activeCount > 1 ? 's' : ''}`
                        : 'Normal · No active severe alert'}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      Representative Point: {profile.capital} ({profile.lat.toFixed(2)}°N, {profile.lng.toFixed(2)}°E)
                    </div>
                  </div>
                </Tooltip>

                <Popup className="mausam-leaflet-popup" minWidth={230} maxWidth={290}>
                  <div className="p-1 text-slate-900">
                    <div className="flex items-center justify-between gap-2 pb-1.5 mb-2 border-b border-slate-200">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span className="font-bold text-xs uppercase tracking-tight truncate">
                          {profile.name}
                        </span>
                      </div>
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0"
                        style={{
                          backgroundColor: palette.bg,
                          color: palette.text,
                        }}
                      >
                        {palette.label}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-700 mb-2.5">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Representative Point:</span>
                        <span className="font-semibold text-right">{profile.capital}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Coordinates:</span>
                        <span className="font-mono text-[10px]">
                          {profile.lat.toFixed(2)}°N, {profile.lng.toFixed(2)}°E
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Active Bulletins:</span>
                        <span className="font-bold">
                          {isUnavailable ? 'Unverified' : summary.activeCount}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Primary Hazard:</span>
                        <span className="font-semibold truncate max-w-[140px]">
                          {summary.primaryHazardLabel}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 leading-snug mb-2.5">
                      {summary.bulletinHeadline}
                    </p>

                    {onOpenStateDrawer && (
                      <button
                        type="button"
                        onClick={() => onOpenStateDrawer(summary)}
                        className="w-full py-1.5 px-2.5 rounded bg-[var(--m-accent)] hover:opacity-90 text-[var(--m-on-accent)] text-[11px] font-semibold flex items-center justify-center gap-1 transition-opacity cursor-pointer"
                      >
                        <span>Inspect State Advisory</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Custom Zoom & Fit Controls */}
        <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setZoomDeltaCounter((prev) => ({ dir: 1, seq: prev.seq + 1 }))}
            aria-label="Zoom in"
            title="Zoom in"
            className="w-10 h-10 rounded-lg bg-[var(--m-surface-inset)]/95 border border-[var(--m-border)] text-[var(--m-text-primary)] hover:border-[var(--m-accent)] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomDeltaCounter((prev) => ({ dir: -1, seq: prev.seq + 1 }))}
            aria-label="Zoom out"
            title="Zoom out"
            className="w-10 h-10 rounded-lg bg-[var(--m-surface-inset)]/95 border border-[var(--m-border)] text-[var(--m-text-primary)] hover:border-[var(--m-accent)] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            aria-label="Fit All India"
            title="Fit All India"
            className="w-10 h-10 rounded-lg bg-[var(--m-surface-inset)]/95 border border-[var(--m-border)] text-[var(--m-accent)] hover:border-[var(--m-accent)] flex items-center justify-center transition-colors cursor-pointer m-focus-ring"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {/* Subtle Geographic & Coordinate Disclaimer Overlay */}
        <div className="absolute bottom-2 left-2 z-[400] px-2.5 py-1 rounded-md bg-[var(--m-surface-1)]/90 border border-[var(--m-border)] text-[10px] font-mono text-[var(--m-text-muted)] pointer-events-none">
          Representative State/UT Coordinates · {reconciled.affectedStateCount}/{reconciled.totalStatesAndUTs} Alerted
        </div>
      </div>

      {/* Reconciled Severity Legend */}
      <div className="pt-2 border-t border-[var(--m-border)] flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--m-text-muted)]">
            <ShieldAlert className="w-3.5 h-3.5 text-[var(--m-accent)]" />
            <span>Official IMD Warning Classifications (States &amp; UTs)</span>
          </div>
          <div className="text-[11px] font-mono text-[var(--m-text-secondary)] tabular-nums">
            {isUnavailable
              ? 'Feed Unverified · No state confirmed normal'
              : `${reconciled.redStates} Red · ${reconciled.orangeStates} Orange · ${reconciled.yellowStates} Yellow · ${reconciled.normalStateCount} Normal (${reconciled.totalBulletins} active bulletins)`}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--m-danger-soft)] border border-[var(--m-danger)]/35">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C94F4B] shrink-0" />
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-bold text-[var(--m-danger)] text-[10px] uppercase">Red Alert</span>
              <span className="text-[10px] text-[var(--m-text-muted)] truncate">Take Action</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--m-alert-soft)] border border-[var(--m-alert)]/35">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D98548] shrink-0" />
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-bold text-[var(--m-alert)] text-[10px] uppercase">Orange Alert</span>
              <span className="text-[10px] text-[var(--m-text-muted)] truncate">Be Prepared</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--m-watch-soft)] border border-[var(--m-watch)]/35">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D8B14F] shrink-0" />
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-bold text-[var(--m-watch)] text-[10px] uppercase">Yellow Watch</span>
              <span className="text-[10px] text-[var(--m-text-muted)] truncate">Be Updated</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--m-ok-soft)] border border-[var(--m-ok)]/35">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5C9A79] shrink-0" />
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-bold text-[var(--m-ok)] text-[10px] uppercase">
                {isUnavailable ? 'Unverified' : 'Green Normal'}
              </span>
              <span className="text-[10px] text-[var(--m-text-muted)] truncate">
                {isUnavailable ? 'Feed Offline' : 'No Severe Alert'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
