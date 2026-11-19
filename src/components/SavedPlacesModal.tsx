import React, { useState } from 'react';
import { LocationRecord, WeatherStation } from '../types';
import { ALL_INDIA_LOCATIONS } from '../data/allIndiaLocations';

interface SavedPlacesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStation: WeatherStation;
  onSelectStation: (station: WeatherStation) => void;
  selectedLocation?: LocationRecord;
  onSelectLocation?: (location: LocationRecord) => void;
}

export const SavedPlacesModal: React.FC<SavedPlacesModalProps> = ({
  isOpen,
  onClose,
  currentStation,
  onSelectStation,
  selectedLocation,
  onSelectLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'odisha' | 'north' | 'south' | 'west' | 'east' | 'ne_islands' | 'coastal' | 'radar'
  >('all');

  if (!isOpen) return null;

  const filteredLocations = ALL_INDIA_LOCATIONS.filter((loc) => {
    // Search query match
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      loc.displayName.toLowerCase().includes(q) ||
      loc.district.toLowerCase().includes(q) ||
      loc.state.toLowerCase().includes(q) ||
      loc.city.toLowerCase().includes(q) ||
      (loc.aliases && loc.aliases.some((a) => a.toLowerCase().includes(q))) ||
      (loc.pincode && loc.pincode.includes(q));

    if (!matchesSearch) return false;

    if (selectedFilter === 'odisha') return loc.state === 'Odisha';
    if (selectedFilter === 'north')
      return [
        'Delhi NCR',
        'Uttar Pradesh',
        'Rajasthan',
        'Punjab',
        'Haryana',
        'Himachal Pradesh',
        'Uttarakhand',
        'Jammu & Kashmir',
        'Ladakh',
        'Chandigarh',
      ].includes(loc.state);
    if (selectedFilter === 'south')
      return ['Karnataka', 'Tamil Nadu', 'Telangana', 'Andhra Pradesh', 'Kerala'].includes(
        loc.state
      );
    if (selectedFilter === 'west')
      return [
        'Maharashtra',
        'Gujarat',
        'Goa',
        'Dadra and Nagar Haveli and Daman and Diu',
      ].includes(loc.state);
    if (selectedFilter === 'east')
      return ['West Bengal', 'Bihar', 'Jharkhand', 'Chhattisgarh', 'Madhya Pradesh'].includes(
        loc.state
      );
    if (selectedFilter === 'ne_islands')
      return [
        'Assam',
        'Meghalaya',
        'Arunachal Pradesh',
        'Manipur',
        'Mizoram',
        'Tripura',
        'Nagaland',
        'Sikkim',
        'Andaman and Nicobar Islands',
        'Lakshadweep',
        'Puducherry',
      ].includes(loc.state);
    if (selectedFilter === 'coastal') return loc.coastalStatus === 'coastal';
    if (selectedFilter === 'radar')
      return (
        !!loc.imdStation &&
        (loc.imdStation.startsWith('DWR') ||
          (loc.radarCoverage && loc.radarCoverage.includes('DWR')))
      );

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[var(--m-surface-1)] card-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4.5 card-header-divider flex justify-between items-center bg-[var(--m-surface-2)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/30 flex items-center justify-center text-[var(--m-accent)]">
              <span className="material-symbols-outlined text-[22px]">travel_explore</span>
            </div>
            <div>
              <h3 className="font-h3 text-sm text-[#dae2fd] font-bold">
                All-India Synoptic Meteorological Network
              </h3>
              <p className="font-body-md text-xs text-[var(--m-text-secondary)]">
                Browse all 30 Odisha districts, metropolitan centers &amp; National S-Band Doppler
                Radars
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--m-text-secondary)] hover:text-[#dae2fd] p-1.5 rounded-lg hover:bg-[var(--m-surface-3)] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 bg-[var(--m-surface-1)] border-b border-[var(--m-border-strong)] flex flex-col gap-3">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#87929a] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search state, district, city, pin (e.g. Delhi, Mumbai, Bengaluru, Puri, Kolkata)..."
              className="w-full bg-[var(--m-surface-1)] card-border rounded-lg pl-9 pr-3 py-2 text-xs text-[#dae2fd] placeholder-[#87929a] focus:outline-none focus:border-[var(--m-accent)]"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === 'all'
                  ? 'bg-[#38bdf8] text-[#00354a]'
                  : 'bg-[var(--m-surface-1)] text-[var(--m-text-secondary)] hover:bg-[var(--m-surface-3)]'
              }`}
            >
              All India ({ALL_INDIA_LOCATIONS.length})
            </button>
            <button
              onClick={() => setSelectedFilter('odisha')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === 'odisha'
                  ? 'bg-[#38bdf8] text-[#00354a]'
                  : 'bg-[var(--m-surface-1)] text-[var(--m-text-secondary)] hover:bg-[var(--m-surface-3)]'
              }`}
            >
              Odisha 30 Districts
            </button>
            <button
              onClick={() => setSelectedFilter('north')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === 'north'
                  ? 'bg-[#38bdf8] text-[#00354a]'
                  : 'bg-[var(--m-surface-1)] text-[var(--m-text-secondary)] hover:bg-[var(--m-surface-3)]'
              }`}
            >
              North &amp; NCR
            </button>
            <button
              onClick={() => setSelectedFilter('south')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === 'south'
                  ? 'bg-[#38bdf8] text-[#00354a]'
                  : 'bg-[var(--m-surface-1)] text-[var(--m-text-secondary)] hover:bg-[var(--m-surface-3)]'
              }`}
            >
              South &amp; Deccan
            </button>
            <button
              onClick={() => setSelectedFilter('west')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === 'west'
                  ? 'bg-[#38bdf8] text-[#00354a]'
                  : 'bg-[var(--m-surface-1)] text-[var(--m-text-secondary)] hover:bg-[var(--m-surface-3)]'
              }`}
            >
              West Coast
            </button>
            <button
              onClick={() => setSelectedFilter('east')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === 'east'
                  ? 'bg-[#38bdf8] text-[#00354a]'
                  : 'bg-[var(--m-surface-1)] text-[var(--m-text-secondary)] hover:bg-[var(--m-surface-3)]'
              }`}
            >
              East &amp; Central
            </button>
            <button
              onClick={() => setSelectedFilter('ne_islands')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === 'ne_islands'
                  ? 'bg-[#38bdf8] text-[#00354a]'
                  : 'bg-[var(--m-surface-1)] text-[var(--m-text-secondary)] hover:bg-[var(--m-surface-3)]'
              }`}
            >
              NE &amp; Islands
            </button>
            <button
              onClick={() => setSelectedFilter('coastal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === 'coastal'
                  ? 'bg-[#38bdf8] text-[#00354a]'
                  : 'bg-[var(--m-surface-1)] text-[var(--m-text-secondary)] hover:bg-[var(--m-surface-3)]'
              }`}
            >
              Coastal Observatories
            </button>
            <button
              onClick={() => setSelectedFilter('radar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === 'radar'
                  ? 'bg-[#38bdf8] text-[#00354a]'
                  : 'bg-[var(--m-surface-1)] text-[var(--m-text-secondary)] hover:bg-[var(--m-surface-3)]'
              }`}
            >
              DWR Radars
            </button>
          </div>
        </div>

        {/* Location List */}
        <div className="p-4 flex flex-col gap-2.5 overflow-y-auto max-h-[440px]">
          {filteredLocations.map((loc) => {
            const isSelected = selectedLocation?.id === loc.id || currentStation.id === loc.id;
            return (
              <div
                key={loc.id}
                onClick={() => {
                  if (onSelectLocation) {
                    onSelectLocation(loc);
                  }
                  onSelectStation({
                    id: loc.id,
                    name: loc.displayName,
                    code: loc.imdStation || `AWS-${loc.district.substring(0, 3).toUpperCase()}`,
                    state: loc.state,
                    district: loc.district,
                    lat: loc.lat,
                    lng: loc.lng,
                    elevation: loc.elevation || '35m ASL',
                    status: 'active',
                    pm25: 45,
                    temp: 31,
                    condition: 'Clear',
                    weatherType: 'sunny',
                    radarType: loc.radarCoverage || 'IMD AWS Node',
                    isCoastal: loc.coastalStatus === 'coastal',
                  });
                  onClose();
                }}
                className={`p-3.5 rounded-xl card-border transition-all cursor-pointer flex justify-between items-center ${
                  isSelected
                    ? 'bg-[var(--m-surface-2)] border-[var(--m-accent)] shadow-md ring-1 ring-[#38bdf8]'
                    : 'bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] border-[var(--m-border-strong)]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[var(--m-accent)]">
                      {loc.imdStation || `AWS-${loc.district.substring(0, 3).toUpperCase()}`}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]"></span>
                    <span className="font-h3 text-sm font-semibold text-[#dae2fd]">
                      {loc.displayName}
                    </span>
                    {loc.isPrimary && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--m-accent-soft)] text-[var(--m-accent)] font-bold border border-[var(--m-accent)]/40">
                        Capital Hub
                      </span>
                    )}
                    {loc.coastalStatus === 'coastal' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#4edea3]/15 text-[#4edea3] font-medium border border-[#4edea3]/30">
                        Coastal
                      </span>
                    )}
                  </div>
                  <p className="font-body-md text-xs text-[var(--m-text-secondary)] mt-1">
                    State: <strong className="text-[#dae2fd]">{loc.state}</strong> • District:{' '}
                    {loc.district} • Elev: {loc.elevation} • Radar: {loc.radarCoverage}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-semibold text-[var(--m-accent)] hover:underline flex items-center gap-1 justify-end">
                    {isSelected ? 'Active Sector' : 'Switch Here'}
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </span>
                </div>
              </div>
            );
          })}

          {filteredLocations.length === 0 && (
            <div className="p-8 text-center text-[var(--m-text-secondary)] text-xs">
              No matching locations found for "{searchQuery}".
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 card-header-divider border-t border-[var(--m-border-strong)] bg-[var(--m-surface-2)] flex justify-between items-center text-xs font-body-md text-[var(--m-text-secondary)]">
          <span>
            {ALL_INDIA_LOCATIONS.length} National Synoptic Observation &amp; DWR Radar Nodes
            Configured
          </span>
          <span className="text-[var(--m-accent)] font-medium">Asia/Kolkata (IST Standard)</span>
        </div>
      </div>
    </div>
  );
};
