// ====================================================================
// MAUSAM Interactive Atmospheric Layer Dock
// Domain-grouped spatial layer selector (Atmosphere, Precipitation,
// Environment, Hazards, Agriculture) with active scale legend and source provenance.
// ====================================================================

import React, { useState } from 'react';
import {
  LayerCategory,
  SPATIAL_LAYERS,
  SpatialLayerId,
  useExperience,
} from '../../context/ExperienceContext';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudRain,
  Gauge,
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
  const { activeLayer, setActiveLayer, activeLayerDef } = useExperience();
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  return (
    <>
      {/* Desktop / Landscape Tablet: Floating Left Dock */}
      <aside
        aria-label="Atmospheric Layer Selector"
        className="hidden md:flex fixed left-3 top-[68px] z-30 flex-col gap-2 w-[232px] pointer-events-auto"
      >
        <div className="spatial-hud-surface rounded-xl p-2 flex flex-col gap-2 max-h-[calc(100dvh-195px)] overflow-y-auto scrollbar-thin">
          {CATEGORY_ORDER.map((category) => {
            const items = SPATIAL_LAYERS.filter((l) => l.category === category);
            return (
              <div key={category} className="flex flex-col gap-0.5">
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8295A8]">
                  {category}
                </span>
                {items.map((layer) => {
                  const isActive = layer.id === activeLayer;
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => setActiveLayer(layer.id as SpatialLayerId)}
                      aria-pressed={isActive}
                      className={`w-full text-left px-2.5 min-h-[36px] rounded-lg flex items-center gap-2 text-xs transition-colors cursor-pointer spatial-focus-ring ${
                        isActive
                          ? 'bg-[#35C7E8]/15 text-[#F3F6FA] border border-[#35C7E8]/45 font-semibold'
                          : 'text-[#B5C3D1] hover:text-[#F3F6FA] hover:bg-[#101F2E] border border-transparent'
                      }`}
                    >
                      <LayerIcon
                        layerId={layer.id}
                        color={isActive ? layer.accentHex : '#8295A8'}
                      />
                      <span className="truncate">{layer.shortLabel}</span>
                      <span className="ml-auto text-[10px] font-mono tabular-nums text-[#8295A8] shrink-0">
                        {layer.unit}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Active Layer Scientific Scale Legend */}
        <div className="spatial-hud-surface rounded-xl px-3 py-2.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#F3F6FA] truncate">
              {activeLayerDef.label}
            </span>
            <span className="text-[10px] font-mono tabular-nums text-[#35C7E8] shrink-0">
              {activeLayerDef.unit}
            </span>
          </div>
          <div
            className="h-1.5 w-full rounded-sm"
            style={{ background: activeLayerDef.gradientCss }}
          />
          <div className="flex items-center justify-between text-[10px] font-mono text-[#8295A8] tabular-nums">
            <span>{activeLayerDef.legendMin}</span>
            <span>{activeLayerDef.legendMid}</span>
            <span>{activeLayerDef.legendMax}</span>
          </div>
          <div className="text-[10px] text-[#8295A8] leading-snug pt-1 border-t border-[#26394B]">
            Source: {activeLayerDef.source}
          </div>
        </div>
      </aside>

      {/* Mobile Viewport: Compact Floating Layer Selector */}
      <div className="md:hidden fixed left-2.5 right-2.5 top-[120px] z-30 pointer-events-none flex flex-col items-start gap-1.5">
        <button
          type="button"
          onClick={() => setIsMobileExpanded((v) => !v)}
          className="pointer-events-auto spatial-hud-surface rounded-xl px-3 min-h-[44px] flex items-center gap-2 text-xs font-semibold text-[#F3F6FA] cursor-pointer spatial-focus-ring"
        >
          <LayerIcon
            layerId={activeLayerDef.id}
            color={activeLayerDef.accentHex}
          />
          <span>Layer: {activeLayerDef.shortLabel}</span>
          {isMobileExpanded ? (
            <ChevronUp className="w-4 h-4 text-[#8295A8]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#8295A8]" />
          )}
        </button>

        {isMobileExpanded && (
          <div className="pointer-events-auto w-full spatial-hud-surface-elevated rounded-xl p-2 grid grid-cols-3 gap-1.5">
            {SPATIAL_LAYERS.map((layer) => {
              const isActive = layer.id === activeLayer;
              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => {
                    setActiveLayer(layer.id);
                    setIsMobileExpanded(false);
                  }}
                  className={`px-2 py-2 min-h-[52px] rounded-lg flex flex-col items-center justify-center gap-1 text-[11px] border cursor-pointer spatial-focus-ring ${
                    isActive
                      ? 'bg-[#35C7E8]/20 border-[#35C7E8] text-[#F3F6FA] font-semibold'
                      : 'bg-[#08131F] border-[#26394B] text-[#B5C3D1] hover:border-[#38536A]'
                  }`}
                >
                  <LayerIcon
                    layerId={layer.id}
                    color={isActive ? layer.accentHex : '#8295A8'}
                  />
                  <span className="truncate max-w-full">{layer.shortLabel}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};
