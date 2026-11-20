import React, { useState, useMemo } from 'react';
import { Radar, Search, X } from 'lucide-react';
import { RadarStation } from '../../types/radar';
import { OFFICIAL_RADAR_STATIONS } from '../../services/radarService';
import { DataPanel, SectionHeading, SourceStatus } from '../ui/ObservatoryPrimitives';
import { formatCoordinatePair } from '../../../shared/weatherContract';

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
          <span className="text-[11px] font-mono text-[var(--m-accent)] tabular-nums">
            {filteredStations.length} stations
          </span>
        }
        action={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-[var(--m-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search stations, cities, states..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search Doppler radar stations"
                className="w-full min-h-[40px] bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg pl-8 pr-8 py-1.5 text-xs text-[var(--m-text-primary)] placeholder-[var(--m-text-muted)] focus:outline-none focus:border-[var(--m-accent)] m-focus-ring"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear station search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg p-1 text-xs">
              {(['all', 'coastal', 'inland'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterType(f)}
                  className={`min-h-[34px] px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors cursor-pointer whitespace-nowrap m-focus-ring ${
                    filterType === f
                      ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)]'
                      : 'text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)]'
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
        <div className="text-center py-10 text-xs text-[var(--m-text-muted)] m-panel-inset">
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
                    ? 'border-[var(--m-accent)] ring-1 ring-[var(--m-focus)]/40'
                    : 'hover:border-[var(--m-border-strong)]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[var(--m-text-primary)] leading-snug truncate">
                        {station.name}
                      </h3>
                      <div className="text-xs text-[var(--m-text-muted)] mt-0.5">
                        {station.state} · {station.isCoastal ? 'Coastal Sector' : 'Inland Sector'}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--m-accent-soft)] text-[var(--m-accent)] border border-[var(--m-accent)]/30 whitespace-nowrap shrink-0">
                      {station.id}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs my-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--m-text-muted)]">Radar Band</span>
                      <span className="font-mono text-[var(--m-text-primary)]">{station.band}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--m-text-muted)]">Coordinates</span>
                      <span className="font-mono text-[var(--m-text-primary)] tabular-nums">
                        {formatCoordinatePair(station.latitude, station.longitude, 4)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--m-text-muted)]">Surveillance Range</span>
                      <span className="font-mono text-[var(--m-text-primary)] tabular-nums">{station.maxRangeKm} km</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[var(--m-text-muted)]">Station Reference</span>
                      <SourceStatus status="REFERENCE" labelOverride={station.status || 'Operational'} />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--m-border)] mt-1">
                  <button
                    type="button"
                    onClick={() => onSelectStation(station)}
                    className={`w-full min-h-[40px] py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer m-focus-ring ${
                      isSelected
                        ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)]'
                        : 'bg-[var(--m-surface-1)] text-[var(--m-accent)] border border-[var(--m-border)] hover:bg-[var(--m-accent-hover)] hover:text-white'
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
