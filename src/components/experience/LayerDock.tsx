// ====================================================================
// MAUSAM Interactive Atmospheric Layer Dock & Accessible Station Directory
// Collapsible desktop rail (and <1024px drawer) with domain-grouped layers,
// active scientific scale legend, source status badges, and an accessible
// 36-station keyboard selector mirroring every 3D marker on the relief map.
// ====================================================================

import React, { useMemo, useState } from 'react';
import {
  InspectedSpatialFeature,
  LayerCategory,
  SPATIAL_LAYERS,
  SpatialLayerId,
  useExperience,
} from '../../context/ExperienceContext';
import { getMergedStatePoints } from '../scene/geoMath';
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Cloud,
  CloudRain,
  Gauge,
  Layers,
  MapPin,
  Orbit,
  Radio,
  Sprout,
  Thermometer,
  Wind,
} from 'lucide-react';

const CATEGORY_ORDER: LayerCategory[] = [
  'Atmosphere',
  'Precipitation',
  'Environment',
  'Hazards',
  'Agriculture',
];

const LAYER_DATA_MODE: Record<SpatialLayerId, 'MODEL' | 'OBS' | 'OFFICIAL'> = {
  conditions: 'MODEL',
  wind: 'MODEL',
  rain: 'MODEL',
  radar: 'OBS',
  satellite: 'MODEL',
  aqi: 'MODEL',
  warnings: 'OFFICIAL',
  cyclones: 'OFFICIAL',
  agromet: 'MODEL',
};

function LayerIcon({
  layerId,
  color,
}: {
  layerId: SpatialLayerId;
  color: string;
}) {
  const props = { className: 'w-4 h-4 shrink-0', style: { color } };
  switch (layerId) {
    case 'conditions':
      return <Thermometer {...props} />;
    case 'wind':
      return <Wind {...props} />;
    case 'rain':
      return <CloudRain {...props} />;
    case 'radar':
      return <Radio {...props} />;
    case 'satellite':
      return <Cloud {...props} />;
    case 'aqi':
      return <Gauge {...props} />;
    case 'warnings':
      return <AlertTriangle {...props} />;
    case 'cyclones':
      return <Orbit {...props} />;
    case 'agromet':
      return <Sprout {...props} />;
    default:
      return <Thermometer {...props} />;
  }
}

export const LayerDock: React.FC = () => {
  const {
    activeLayer,
    setActiveLayer,
    activeLayerDef,
    setInspectedFeature,
    flyCameraTo,
  } = useExperience();

  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [activeRailTab, setActiveRailTab] = useState<'layers' | 'stations'>('layers');
  const [stationFilter, setStationFilter] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const stationPoints = useMemo(() => getMergedStatePoints(), []);
  const filteredStations = useMemo(() => {
    const q = stationFilter.trim().toLowerCase();
    if (!q) return stationPoints;
    return stationPoints.filter(
      (pt) =>
        pt.state.name.toLowerCase().includes(q) ||
        (pt.state.city || '').toLowerCase().includes(q) ||
        pt.code.toLowerCase().includes(q)
    );
  }, [stationPoints, stationFilter]);

  const handleInspectStation = (pt: (typeof stationPoints)[number]) => {
    const feature: InspectedSpatialFeature = {
      kind: 'state',
      id: pt.state.id,
      title: pt.state.name,
      subtitle: pt.state.city ? `${pt.state.city} · ${pt.code}` : pt.code,
      lat: pt.lat,
      lng: pt.lng,
      stateName: pt.state.name,
      warningLevel: pt.state.warningLevel,
      warningMessage: pt.state.warningMessage,
      source: pt.state.dataSource,
      metrics: [
        { label: 'Temperature', value: `${pt.state.temperature}°C` },
        { label: 'Wind', value: `${pt.state.windSpeed} km/h ${pt.state.windDir}` },
        { label: 'Rainfall', value: `${pt.state.rainfall} mm` },
        { label: 'Humidity', value: `${pt.state.humidity}%` },
        { label: 'AQI', value: `${pt.state.aqi}` },
      ],
    };
    setInspectedFeature(feature);
    flyCameraTo(pt.lat, pt.lng, 2.95);
    setIsDrawerOpen(false);
  };

  return (
    <>
      {/* Desktop (>=1024px): Collapsible Left Observatory Rail */}
      <aside
        aria-label="Atmospheric Layers and Stations"
        className="hidden lg:flex fixed left-3 top-[68px] z-30 flex-col gap-2 pointer-events-none"
      >
        {isDesktopCollapsed ? (
          <button
            type="button"
            onClick={() => setIsDesktopCollapsed(false)}
            aria-label="Expand layer dock"
            className="pointer-events-auto spatial-hud-surface rounded-[11px] px-3 min-h-[40px] flex items-center gap-2 text-xs font-semibold text-[var(--m-text-primary)] hover:border-[var(--m-border-strong)] cursor-pointer m-focus-ring"
          >
            <LayerIcon layerId={activeLayerDef.id} color={activeLayerDef.accentHex} />
            <span>{activeLayerDef.shortLabel}</span>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--m-text-muted)]" />
          </button>
        ) : (
          <div className="pointer-events-auto flex flex-col gap-2 w-[252px]">
            {/* Rail Header: Layers / Stations Tabs + Collapse */}
            <div className="spatial-hud-surface rounded-[11px] p-1.5 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveRailTab('layers')}
                aria-pressed={activeRailTab === 'layers'}
                className={`flex-1 min-h-[32px] px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer m-focus-ring ${
                  activeRailTab === 'layers'
                    ? 'bg-[var(--m-accent-soft)] text-[var(--m-text-primary)] border border-[var(--m-accent)]/40'
                    : 'text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Layers</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveRailTab('stations')}
                aria-pressed={activeRailTab === 'stations'}
                className={`flex-1 min-h-[32px] px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer m-focus-ring ${
                  activeRailTab === 'stations'
                    ? 'bg-[var(--m-accent-soft)] text-[var(--m-text-primary)] border border-[var(--m-accent)]/40'
                    : 'text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Stations ({stationPoints.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDesktopCollapsed(true)}
                aria-label="Collapse layer rail"
                className="min-w-[30px] min-h-[32px] flex items-center justify-center rounded-lg text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] cursor-pointer m-focus-ring"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {activeRailTab === 'layers' ? (
              <>
                <div className="spatial-hud-surface rounded-[11px] p-2 flex flex-col gap-2 max-h-[calc(100dvh-258px)] overflow-y-auto scrollbar-thin">
                  {CATEGORY_ORDER.map((category) => {
                    const items = SPATIAL_LAYERS.filter((l) => l.category === category);
                    return (
                      <div key={category} className="flex flex-col gap-0.5">
                        <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-[0.08em] text-[var(--m-text-muted)]">
                          {category}
                        </span>
                        {items.map((layer) => {
                          const isActive = layer.id === activeLayer;
                          const dataTag = LAYER_DATA_MODE[layer.id];
                          return (
                            <button
                              key={layer.id}
                              type="button"
                              onClick={() => setActiveLayer(layer.id as SpatialLayerId)}
                              aria-pressed={isActive}
                              className={`w-full text-left px-2.5 min-h-[36px] rounded-lg flex items-center gap-2 text-xs transition-colors cursor-pointer m-focus-ring ${
                                isActive
                                  ? 'bg-[var(--m-accent-soft)] text-[var(--m-text-primary)] border border-[var(--m-accent)]/45 font-semibold'
                                  : 'text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-2)] border border-transparent'
                              }`}
                            >
                              <LayerIcon
                                layerId={layer.id}
                                color={isActive ? layer.accentHex : 'var(--m-text-muted)'}
                              />
                              <span className="truncate">{layer.shortLabel}</span>
                              <span className="ml-auto flex items-center gap-1.5 shrink-0">
                                <span className="text-[9px] font-mono uppercase tracking-wider px-1 py-0.5 rounded bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border border-[var(--m-border)]">
                                  {dataTag}
                                </span>
                                <span className="text-[10px] font-mono tabular-nums text-[var(--m-text-muted)]">
                                  {layer.unit}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* Active Layer Scientific Scale Legend */}
                <div className="spatial-hud-surface rounded-[11px] px-3 py-2.5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[var(--m-text-primary)] truncate">
                      {activeLayerDef.label}
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-[var(--m-accent)] shrink-0">
                      {activeLayerDef.unit}
                    </span>
                  </div>
                  <div
                    className="h-1.5 w-full rounded-sm"
                    style={{ background: activeLayerDef.gradientCss }}
                  />
                  <div className="flex items-center justify-between text-[10px] font-mono text-[var(--m-text-muted)] tabular-nums">
                    <span>{activeLayerDef.legendMin}</span>
                    <span>{activeLayerDef.legendMid}</span>
                    <span>{activeLayerDef.legendMax}</span>
                  </div>
                  <div className="text-[10px] text-[var(--m-text-muted)] leading-snug pt-1 border-t border-[var(--m-border)]">
                    Source: {activeLayerDef.source}
                  </div>
                </div>
              </>
            ) : (
              /* Accessible 36-Station List Equivalent for All 3D Observatory Beacons */
              <div className="spatial-hud-surface rounded-[11px] p-2 flex flex-col gap-2 max-h-[calc(100dvh-160px)]">
                <input
                  type="text"
                  value={stationFilter}
                  onChange={(e) => setStationFilter(e.target.value)}
                  placeholder="Filter state or station…"
                  aria-label="Filter observatory stations"
                  className="w-full bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg px-2.5 min-h-[34px] text-xs text-[var(--m-text-primary)] placeholder:text-[var(--m-text-muted)] focus:outline-none focus:border-[var(--m-accent)]"
                />
                <div
                  role="list"
                  aria-label="Indian State and UT Weather Beacons"
                  className="overflow-y-auto scrollbar-thin flex flex-col gap-1 max-h-[calc(100dvh-230px)]"
                >
                  {filteredStations.map((pt) => {
                    const hasWarn = pt.state.warningLevel && pt.state.warningLevel !== 'normal';
                    return (
                      <button
                        key={pt.state.id}
                        type="button"
                        role="listitem"
                        onClick={() => handleInspectStation(pt)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg bg-[var(--m-surface-inset)]/60 hover:bg-[var(--m-surface-2)] border border-[var(--m-border)] hover:border-[var(--m-border-strong)] flex items-center justify-between gap-2 transition-colors cursor-pointer m-focus-ring"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[var(--m-text-primary)] truncate">
                            {pt.state.name}
                          </div>
                          <div className="text-[10px] text-[var(--m-text-muted)] truncate">
                            {pt.state.city || pt.code} · {pt.state.windSpeed} km/h {pt.state.windDir}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end">
                          <span className="text-xs font-mono font-semibold text-[var(--m-text-primary)] tabular-nums">
                            {pt.state.temperature}°C
                          </span>
                          {hasWarn && (
                            <span
                              className={`text-[9px] font-mono uppercase ${
                                pt.state.warningLevel === 'severe'
                                  ? 'text-[var(--m-danger)]'
                                  : pt.state.warningLevel === 'alert'
                                  ? 'text-[var(--m-alert)]'
                                  : 'text-[var(--m-watch)]'
                              }`}
                            >
                              {pt.state.warningLevel}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Tablet & Mobile (<1024px): Compact Layer & Station Drawer */}
      <div className="mausam-mobile-layer-dock lg:hidden fixed left-2.5 right-2.5 top-[118px] sm:top-[68px] z-30 pointer-events-none flex flex-col items-start gap-1.5 max-w-[360px]">
        <button
          type="button"
          onClick={() => setIsDrawerOpen((v) => !v)}
          aria-expanded={isDrawerOpen}
          className="pointer-events-auto spatial-hud-surface rounded-[11px] px-3 min-h-[42px] flex items-center gap-2 text-xs font-semibold text-[var(--m-text-primary)] cursor-pointer m-focus-ring"
        >
          <LayerIcon layerId={activeLayerDef.id} color={activeLayerDef.accentHex} />
          <span>Layer: {activeLayerDef.shortLabel}</span>
          <span className="text-[10px] font-mono text-[var(--m-text-muted)]">
            ({LAYER_DATA_MODE[activeLayerDef.id]})
          </span>
          {isDrawerOpen ? (
            <ChevronUp className="w-4 h-4 text-[var(--m-text-muted)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--m-text-muted)]" />
          )}
        </button>

        {isDrawerOpen && (
          <div className="pointer-events-auto w-full spatial-hud-surface-elevated rounded-[11px] p-2.5 flex flex-col gap-2 max-h-[60dvh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center gap-1 border-b border-[var(--m-border)] pb-2">
              <button
                type="button"
                onClick={() => setActiveRailTab('layers')}
                className={`flex-1 min-h-[34px] rounded-lg text-xs font-semibold cursor-pointer ${
                  activeRailTab === 'layers'
                    ? 'bg-[var(--m-accent-soft)] text-[var(--m-text-primary)] border border-[var(--m-accent)]/40'
                    : 'text-[var(--m-text-secondary)]'
                }`}
              >
                Layers
              </button>
              <button
                type="button"
                onClick={() => setActiveRailTab('stations')}
                className={`flex-1 min-h-[34px] rounded-lg text-xs font-semibold cursor-pointer ${
                  activeRailTab === 'stations'
                    ? 'bg-[var(--m-accent-soft)] text-[var(--m-text-primary)] border border-[var(--m-accent)]/40'
                    : 'text-[var(--m-text-secondary)]'
                }`}
              >
                Stations ({stationPoints.length})
              </button>
            </div>

            {activeRailTab === 'layers' ? (
              <div className="grid grid-cols-3 gap-1.5">
                {SPATIAL_LAYERS.map((layer) => {
                  const isActive = layer.id === activeLayer;
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => {
                        setActiveLayer(layer.id);
                        setIsDrawerOpen(false);
                      }}
                      className={`px-2 py-2 min-h-[52px] rounded-lg flex flex-col items-center justify-center gap-1 text-[11px] border cursor-pointer m-focus-ring ${
                        isActive
                          ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)] text-[var(--m-text-primary)] font-semibold'
                          : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] text-[var(--m-text-secondary)] hover:border-[var(--m-border-strong)]'
                      }`}
                    >
                      <LayerIcon
                        layerId={layer.id}
                        color={isActive ? layer.accentHex : 'var(--m-text-muted)'}
                      />
                      <span className="truncate max-w-full">{layer.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-1 max-h-[42dvh] overflow-y-auto scrollbar-thin">
                {stationPoints.map((pt) => (
                  <button
                    key={pt.state.id}
                    type="button"
                    onClick={() => handleInspectStation(pt)}
                    className="w-full text-left px-2.5 py-2 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex items-center justify-between gap-2 text-xs cursor-pointer"
                  >
                    <span className="font-semibold text-[var(--m-text-primary)] truncate">
                      {pt.state.name}
                    </span>
                    <span className="font-mono text-[var(--m-accent)] tabular-nums shrink-0">
                      {pt.state.temperature}°C
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
