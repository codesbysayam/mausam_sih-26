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
import { ChevronDown, ChevronUp } from 'lucide-react';

const CATEGORY_ORDER: LayerCategory[] = [
  'Atmosphere',
  'Precipitation',
  'Environment',
  'Hazards',
  'Agriculture',
];

export const LayerDock: React.FC = () => {
  const { activeLayer, setActiveLayer, activeLayerDef } = useExperience();
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  return (
    <>
      {/* Desktop / Landscape Tablet: Floating Left Dock */}
      <aside
        aria-label="Atmospheric Layer Selector"
        className="hidden md:flex fixed left-3 top-[68px] z-30 flex-col gap-2 w-[230px] pointer-events-auto"
      >
        <div className="spatial-hud-surface rounded-xl p-2 flex flex-col gap-2 max-h-[calc(100dvh-195px)] overflow-y-auto scrollbar-thin">
          {CATEGORY_ORDER.map((category) => {
            const items = SPATIAL_LAYERS.filter((l) => l.category === category);
            return (
              <div key={category} className="flex flex-col gap-0.5">
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7F93A8]">
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
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-xs transition-colors cursor-pointer spatial-focus-ring ${
                        isActive
                          ? 'bg-[#35C7E8]/18 text-white border border-[#35C7E8]/45 font-semibold'
                          : 'text-[#B8C7D9] hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-[16px] shrink-0"
                        style={{ color: isActive ? layer.accentHex : '#7F93A8' }}
                      >
                        {layer.icon}
                      </span>
                      <span className="truncate">{layer.shortLabel}</span>
                      <span className="ml-auto text-[10px] font-mono text-[#7F93A8] shrink-0">
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
            <span className="text-[11px] font-semibold text-[#F4F7FB] truncate">
              {activeLayerDef.label}
            </span>
            <span className="text-[10px] font-mono text-[#35C7E8] shrink-0">
              {activeLayerDef.unit}
            </span>
          </div>
          <div
            className="h-1.5 w-full rounded-full"
            style={{ background: activeLayerDef.gradientCss }}
          />
          <div className="flex items-center justify-between text-[10px] font-mono text-[#7F93A8] tabular-nums">
            <span>{activeLayerDef.legendMin}</span>
            <span>{activeLayerDef.legendMid}</span>
            <span>{activeLayerDef.legendMax}</span>
          </div>
          <div className="text-[10px] text-[#7F93A8] leading-snug pt-0.5 border-t border-[#84A8CC]/10">
            Source: {activeLayerDef.source}
          </div>
        </div>
      </aside>

      {/* Mobile Viewport: Compact Floating Layer Selector */}
      <div className="md:hidden fixed left-2.5 right-2.5 top-[116px] z-30 pointer-events-none flex flex-col items-start gap-1.5">
        <button
          type="button"
          onClick={() => setIsMobileExpanded((v) => !v)}
          className="pointer-events-auto spatial-hud-surface rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-semibold text-[#F4F7FB] cursor-pointer"
        >
          <span
            className="material-symbols-outlined text-[16px]"
            style={{ color: activeLayerDef.accentHex }}
          >
            {activeLayerDef.icon}
          </span>
          <span>Layer: {activeLayerDef.shortLabel}</span>
          {isMobileExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-[#7F93A8]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-[#7F93A8]" />
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
                  className={`px-2 py-2 rounded-lg flex flex-col items-center gap-1 text-[11px] border cursor-pointer ${
                    isActive
                      ? 'bg-[#35C7E8]/20 border-[#35C7E8] text-white font-semibold'
                      : 'bg-[#07111D]/60 border-[#84A8CC]/15 text-[#B8C7D9]'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={{ color: isActive ? layer.accentHex : '#7F93A8' }}
                  >
                    {layer.icon}
                  </span>
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
