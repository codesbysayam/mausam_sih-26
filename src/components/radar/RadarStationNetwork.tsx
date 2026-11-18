import React, { useState, useMemo } from 'react';
import { Radar, Search, X } from 'lucide-react';
import { RadarStation } from '../../types/radar';
import { OFFICIAL_RADAR_STATIONS } from '../../services/radarService';
import { DataPanel, SectionHeading, SourceStatus } from '../ui/ObservatoryPrimitives';

export interface RadarStationNetworkProps {
  selectedStationId?: string;
  onSelectStation: (station: RadarStation) => void;
}

export const RadarStationNetwork: React.FC<RadarStationNetworkProps> = ({
  selectedStationId,
  onSelectStation,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'coastal' | 'inland'>('all');

  const filteredStations = useMemo(() => {
    return OFFICIAL_RADAR_STATIONS.filter((station) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        station.name.toLowerCase().includes(term) ||
        station.id.toLowerCase().includes(term) ||
        (station.state && station.state.toLowerCase().includes(term));

      if (!matchesSearch) return false;
      if (filterType === 'coastal') return station.isCoastal === true;
      if (filterType === 'inland') return !station.isCoastal;
      return true;
    });
  }, [searchTerm, filterType]);

  return (
    <DataPanel>
      <SectionHeading
        title="Radar Station Network"
        subtitle="Doppler Weather Radar (DWR) installations across coastal and interior territories"
        icon={<Radar className="w-4 h-4" />}
        badge={
          <span className="text-[11px] font-mono text-[#35C7E8] tabular-nums">
            {filteredStations.length} stations
          </span>
        }
        action={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-[#8295A8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search stations, cities, states..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search Doppler radar stations"
                className="w-full min-h-[40px] bg-[#08131F] border border-[#26394B] rounded-lg pl-8 pr-8 py-1.5 text-xs text-[#F3F6FA] placeholder-[#8295A8] focus:outline-none focus:border-[#35C7E8] m-focus-ring"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear station search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-[#8295A8] hover:text-[#F3F6FA] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center bg-[#08131F] border border-[#26394B] rounded-lg p-1 text-xs">
              {(['all', 'coastal', 'inland'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterType(f)}
                  className={`min-h-[34px] px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors cursor-pointer whitespace-nowrap m-focus-ring ${
                    filterType === f
                      ? 'bg-[#0B72B9] text-white'
                      : 'text-[#B5C3D1] hover:text-[#F3F6FA]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        }
        className="mb-4"
      />

      {filteredStations.length === 0 ? (
        <div className="text-center py-10 text-xs text-[#8295A8] m-panel-inset">
          No Doppler weather radar station matched your search filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredStations.map((station) => {
            const isSelected = selectedStationId === station.id;
            return (
              <div
                key={station.id}
                className={`m-panel-inset p-4 transition-colors flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#35C7E8] ring-1 ring-[#35C7E8]/40'
                    : 'hover:border-[#38536A]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[#F3F6FA] leading-snug truncate">
                        {station.name}
                      </h3>
                      <div className="text-xs text-[#8295A8] mt-0.5">
                        {station.state} · {station.isCoastal ? 'Coastal Sector' : 'Inland Sector'}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0B72B9]/20 text-[#35C7E8] border border-[#35C7E8]/30 whitespace-nowrap shrink-0">
                      {station.id}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs my-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#8295A8]">Radar Band</span>
                      <span className="font-mono text-[#F3F6FA]">{station.band}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#8295A8]">Coordinates</span>
                      <span className="font-mono text-[#F3F6FA] tabular-nums">
                        {station.latitude.toFixed(4)}°N, {station.longitude.toFixed(4)}°E
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#8295A8]">Surveillance Range</span>
                      <span className="font-mono text-[#F3F6FA] tabular-nums">{station.maxRangeKm} km</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[#8295A8]">Station Reference</span>
                      <SourceStatus status="REFERENCE" labelOverride={station.status || 'Operational'} />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#26394B] mt-1">
                  <button
                    type="button"
                    onClick={() => onSelectStation(station)}
                    className={`w-full min-h-[40px] py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer m-focus-ring ${
                      isSelected
                        ? 'bg-[#0B72B9] text-white'
                        : 'bg-[#101F2E] text-[#35C7E8] border border-[#26394B] hover:bg-[#0B72B9] hover:text-white'
                    }`}
                  >
                    <Radar className="w-3.5 h-3.5 shrink-0" />
                    <span>{isSelected ? 'Focused on Map' : 'View on Map'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DataPanel>
  );
};

export default RadarStationNetwork;
