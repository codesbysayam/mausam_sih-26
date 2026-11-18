import React, { useState } from 'react';
import { Radio, ChevronDown, ChevronUp } from 'lucide-react';
import { RadarStation } from '../../types/radar';

export interface RadarTechnicalSpecsProps {
  station: RadarStation | null;
  radarSourceLabel?: string;
}

export const RadarTechnicalSpecs: React.FC<RadarTechnicalSpecsProps> = ({
  station,
  radarSourceLabel = 'RainViewer precipitation radar / IMD DWR Reference',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="m-panel overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="w-full min-h-[48px] px-4 sm:px-5 py-3.5 flex items-center justify-between text-left transition-colors hover:bg-[#101F2E]/70 cursor-pointer m-focus-ring"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#101F2E] border border-[#26394B] flex items-center justify-center text-[#35C7E8] shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-sm text-[#F3F6FA] block">
              Radar Technical Specifications
            </span>
            {station && (
              <span className="text-[11px] text-[#8295A8] font-mono block truncate">
                {station.name} · {station.id}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#35C7E8] font-semibold shrink-0">
          <span>{isExpanded ? 'Hide Specs' : 'Show Specs'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 sm:p-5 border-t border-[#26394B]">
          {station ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="m-panel-inset p-3">
                <span className="text-[10px] text-[#8295A8] uppercase tracking-wider block mb-1">
                  Station Coordinates
                </span>
                <span className="text-[#F3F6FA] font-bold text-sm font-mono tabular-nums block">
                  {station.latitude.toFixed(4)}°N, {station.longitude.toFixed(4)}°E
                </span>
                <span className="text-[10px] text-[#B5C3D1] mt-1 block">WGS84 Geodetic Datum</span>
              </div>

              <div className="m-panel-inset p-3">
                <span className="text-[10px] text-[#8295A8] uppercase tracking-wider block mb-1">
                  Transmitter Band &amp; Frequency
                </span>
                <span className="text-[#35C7E8] font-bold text-sm font-mono block">
                  {station.band}
                </span>
                <span className="text-[10px] text-[#B5C3D1] mt-1 block">
                  {station.frequencyGhz ? `${station.frequencyGhz} GHz Carrier` : 'Dual Polarization'}
                </span>
              </div>

              <div className="m-panel-inset p-3">
                <span className="text-[10px] text-[#8295A8] uppercase tracking-wider block mb-1">
                  Antenna Elevation
                </span>
                <span className="text-[#6EE7B7] font-bold text-sm font-mono tabular-nums block">
                  {station.elevationM !== undefined && station.elevationM !== null
                    ? `${station.elevationM} m ASL`
                    : '—'}
                </span>
                <span className="text-[10px] text-[#B5C3D1] mt-1 block">Tower Mast Height</span>
              </div>

              <div className="m-panel-inset p-3">
                <span className="text-[10px] text-[#8295A8] uppercase tracking-wider block mb-1">
                  Coverage &amp; Range
                </span>
                <span className="text-[#FCD34D] font-bold text-sm font-mono tabular-nums block">
                  {station.maxRangeKm} km Surveillance
                </span>
                <span className="text-[10px] text-[#B5C3D1] mt-1 block">Radial Doppler Footprint</span>
              </div>

              <div className="m-panel-inset p-3">
                <span className="text-[10px] text-[#8295A8] uppercase tracking-wider block mb-1">
                  Primary Data Source
                </span>
                <span className="text-[#F3F6FA] font-semibold text-xs block">
                  IMD Doppler Radar Network
                </span>
                <span className="text-[10px] text-[#B5C3D1] mt-1 block">National Weather Radars</span>
              </div>

              <div className="m-panel-inset p-3">
                <span className="text-[10px] text-[#8295A8] uppercase tracking-wider block mb-1">
                  Active Overlay Source
                </span>
                <span className="text-[#35C7E8] font-semibold text-xs block truncate">
                  {radarSourceLabel}
                </span>
                <span className="text-[10px] text-[#B5C3D1] mt-1 block">Open Doppler Reflectivity</span>
              </div>

              <div className="m-panel-inset p-3">
                <span className="text-[10px] text-[#8295A8] uppercase tracking-wider block mb-1">
                  Scan Strategy
                </span>
                <span className="text-[#F3F6FA] font-bold font-mono text-xs block">
                  10 Elevation Cuts (0.5°–19.5°)
                </span>
                <span className="text-[10px] text-[#B5C3D1] mt-1 block">10-Minute Volumetric Cycle</span>
              </div>

              <div className="m-panel-inset p-3">
                <span className="text-[10px] text-[#8295A8] uppercase tracking-wider block mb-1">
                  Product Availability
                </span>
                <span className="text-[#6EE7B7] font-bold text-xs block">
                  Precipitation Composite Active
                </span>
                <span className="text-[10px] text-[#8295A8] mt-1 block">IMD Volumetric Restricted</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-[#8295A8] py-2">
              Select a radar station to inspect hardware and operational frequency parameters.
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default RadarTechnicalSpecs;
