import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Globe2, Maximize2 } from 'lucide-react';
import { AlertSeverity, StateWarningSummary, WarningRecord } from '../../types/warningTypes';
import { STATE_ALERT_SEVERITIES } from '../../data/nationalWarningsData';
import { ALL_INDIA_STATES_MET_PROFILES, StateMeteorologicalProfile } from '../../data/allIndiaStatesProfiles';
import { DataPanel, SectionHeading, SourceStatus } from '../ui/ObservatoryPrimitives';

interface NationalWarningMapProps {
  selectedState: string | null;
  onSelectState: (stateName: string, stateCode: string) => void;
  onOpenStateDrawer?: (summary: StateWarningSummary) => void;
  warnings: WarningRecord[];
  isUnavailable?: boolean;
}

const SEVERITY_CONFIG: Record<
  AlertSeverity | 'unverified',
  { fill: string; border: string; label: string; text: string }
> = {
  red: {
    fill: '#EF4444',
    border: '#B91C1C',
    label: 'Red Alert',
    text: 'Take Action',
  },
  orange: {
    fill: '#F97316',
    border: '#C2410C',
    label: 'Orange Alert',
    text: 'Be Prepared',
  },
  yellow: {
    fill: '#EAB308',
    border: '#A16207',
    label: 'Yellow Watch',
    text: 'Be Updated',
  },
  purple: {
    fill: '#35C7E8',
    border: '#0B72B9',
    label: 'Advisory',
    text: 'Advisory Bulletin',
  },
  green: {
    fill: '#22C7A0',
    border: '#0F766E',
    label: 'Normal / Clear',
    text: 'No Active Warning',
  },
  unverified: {
    fill: '#64748B',
    border: '#334155',
    label: 'Unverified',
    text: 'Feed Unavailable',
  },
};

function MapResizeFix() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ pan: false, animate: false });
    });
    resizeObserver.observe(container);

    const timer = setTimeout(() => {
      map.invalidateSize({ pan: false, animate: false });
    }, 200);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, [map]);

  return null;
}

function MapCenterController({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);

  return null;
}

export const NationalWarningMap: React.FC<NationalWarningMapProps> = ({
  selectedState,
  onSelectState,
  onOpenStateDrawer,
  warnings = [],
  isUnavailable = false,
}) => {
  const INDIA_CENTER: [number, number] = [22.8, 80.5];
  const DEFAULT_ZOOM = 4.5;

  const [mapCenter, setMapCenter] = useState<[number, number]>(INDIA_CENTER);
  const [mapZoom, setMapZoom] = useState<number>(DEFAULT_ZOOM);

  const stationMetadataMap = useMemo(() => {
    const map = new Map<string, StateWarningSummary>();
    Object.values(STATE_ALERT_SEVERITIES).forEach((summary) => {
      map.set(summary.stateCode.toLowerCase(), summary);
      map.set(summary.stateName.toLowerCase(), summary);
    });
    return map;
  }, []);

  const resolveStateSummary = useCallback(
    (profile: StateMeteorologicalProfile): StateWarningSummary => {
      const sName = profile.name.toLowerCase();
      const sCode = profile.code.toLowerCase();
      const meta =
        stationMetadataMap.get(`in-${sCode}`) ||
        stationMetadataMap.get(sName);

      const matchedWarnings = isUnavailable
        ? []
        : warnings.filter(
            (w) =>
              w.state.toLowerCase() === sName ||
              w.stateCode.toLowerCase() === sCode ||
              w.stateCode.toLowerCase() === `in-${sCode}` ||
              w.state.toLowerCase().includes(sName) ||
              sName.includes(w.state.toLowerCase())
          );

      if (matchedWarnings.length > 0) {
        const order: Record<AlertSeverity, number> = {
          red: 4,
          orange: 3,
          yellow: 2,
          purple: 1,
          green: 0,
        };
        const sorted = [...matchedWarnings].sort(
          (a, b) => (order[b.severity] ?? 0) - (order[a.severity] ?? 0)
        );
        const top = sorted[0];
        return {
          stateCode: `in-${profile.code.toLowerCase()}`,
          stateName: profile.name,
          capital: profile.capital,
          highestSeverity: top.severity,
          activeCount: matchedWarnings.length,
          primaryHazard: top.hazardCategory,
          primaryHazardLabel: top.hazardLabel,
          representativeStation: profile.representativeStation || meta?.representativeStation || 'IMD AWS',
          bulletinHeadline: top.title,
          validityRange: top.validUntil,
        };
      }

      return {
        stateCode: `in-${profile.code.toLowerCase()}`,
        stateName: profile.name,
        capital: profile.capital,
        highestSeverity: 'green',
        activeCount: 0,
        primaryHazard: 'heavy_rain',
        primaryHazardLabel: isUnavailable ? 'Feed Unreachable' : 'Normal Seasonal Weather',
        representativeStation: profile.representativeStation || meta?.representativeStation || 'IMD AWS',
        bulletinHeadline: isUnavailable
          ? 'SACHET / NDMA feed unreachable — alert status unverified.'
          : 'No active severe meteorological warning for this subdivision.',
        validityRange: isUnavailable ? 'Unavailable' : 'Routine Observation',
      };
    },
    [stationMetadataMap, warnings, isUnavailable]
  );

  useEffect(() => {
    if (selectedState && selectedState !== 'all') {
      const match = ALL_INDIA_STATES_MET_PROFILES.find(
        (p) =>
          p.name.toLowerCase() === selectedState.toLowerCase() ||
          p.code.toLowerCase() === selectedState.toLowerCase() ||
          selectedState.toLowerCase().includes(p.name.toLowerCase())
      );
      if (match) {
        setMapCenter([match.lat, match.lng]);
        setMapZoom(6);
      }
    }
  }, [selectedState]);

  const handleResetView = () => {
    setMapCenter(INDIA_CENTER);
    setMapZoom(DEFAULT_ZOOM);
    if (selectedState && selectedState !== 'all') {
      onSelectState('All India', 'all');
    }
  };

  const createSeverityMarker = (
    severityKey: AlertSeverity | 'unverified',
    isSelected: boolean,
    code: string,
    count: number
  ) => {
    const config = SEVERITY_CONFIG[severityKey] || SEVERITY_CONFIG.green;
    const isLightBg = severityKey === 'yellow' || severityKey === 'green';
    const textFill = isLightBg ? '#07111D' : '#FFFFFF';
    const size = isSelected ? 34 : 28;

    const html = `
      <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-150 ${
        isSelected ? 'scale-115 z-50' : 'hover:scale-110 z-20'
      }" style="width: ${size}px; height: ${size}px;">
        <div class="relative flex items-center justify-center rounded-full font-mono font-bold text-[10px] border" style="width: ${size}px; height: ${size}px; background-color: ${
      config.fill
    }; border-color: ${isSelected ? '#FFFFFF' : config.border}; color: ${textFill}; ${
      isSelected ? 'box-shadow: 0 0 0 2px #35C7E8;' : ''
    }">
          <span>${code}</span>
        </div>
        ${
          count > 1
            ? `<span class="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-[9px] font-bold text-white" style="width: 15px; height: 15px; background: #07111D; border: 1px solid ${config.fill};">${count}</span>`
            : ''
        }
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-state-alert-marker',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2 - 4],
    });
  };

  const stateCounts = useMemo(() => {
    let red = 0;
    let orange = 0;
    let yellow = 0;
    let green = 0;

    ALL_INDIA_STATES_MET_PROFILES.forEach((p) => {
      const summary = resolveStateSummary(p);
      if (summary.highestSeverity === 'red') red++;
      else if (summary.highestSeverity === 'orange') orange++;
      else if (summary.highestSeverity === 'yellow') yellow++;
      else green++;
    });

    return { red, orange, yellow, green, total: ALL_INDIA_STATES_MET_PROFILES.length };
  }, [resolveStateSummary]);

  return (
    <DataPanel
      id="national-weather-alert-map-card"
      className="flex flex-col justify-between gap-3.5 h-full"
    >
      <SectionHeading
        title="National Weather Alert Map"
        subtitle="Geographic warning classification across Indian States & Union Territories"
        icon={<Globe2 className="w-4 h-4" />}
        badge={<SourceStatus status={isUnavailable ? 'UNAVAILABLE' : warnings.length > 0 ? 'LIVE' : 'ALL_CLEAR'} />}
        action={
          <div className="flex items-center gap-2">
            {selectedState && selectedState !== 'all' && (
              <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded bg-[#101F2E] border border-[#35C7E8]/40 text-[#7DD3FC]">
                Focus: {selectedState}
              </span>
            )}
            <button
              id="btn-reset-map-view"
              type="button"
              onClick={handleResetView}
              className="px-3 py-1.5 min-h-[36px] rounded-lg bg-[#08131F] hover:bg-[#101F2E] text-[#B5C3D1] hover:text-[#F3F6FA] border border-[#26394B] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reset to All-India Synoptic Overview"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#35C7E8]" />
              <span>Reset View</span>
            </button>
          </div>
        }
      />

      <div
        id="map-container-wrapper"
        className="w-full h-[460px] sm:h-[500px] lg:h-[540px] rounded-lg overflow-hidden relative border border-[#26394B] bg-[#07111D]"
      >
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          minZoom={4}
          maxZoom={9}
          scrollWheelZoom={false}
          attributionControl={true}
          zoomControl={true}
          style={{ width: '100%', height: '100%', backgroundColor: '#07111D' }}
        >
          <MapResizeFix />
          <MapCenterController center={mapCenter} zoom={mapZoom} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            maxZoom={18}
          />

          {ALL_INDIA_STATES_MET_PROFILES.map((profile) => {
            const summary = resolveStateSummary(profile);
            const severityKey = isUnavailable ? 'unverified' : summary.highestSeverity;
            const isSelected =
              selectedState &&
              (selectedState.toLowerCase() === profile.name.toLowerCase() ||
                selectedState.toLowerCase() === profile.code.toLowerCase() ||
                selectedState.toLowerCase() === summary.stateCode.toLowerCase());

            const icon = createSeverityMarker(
              severityKey,
              Boolean(isSelected),
              profile.code,
              summary.activeCount
            );

            const badgeConfig = SEVERITY_CONFIG[severityKey] || SEVERITY_CONFIG.green;

            return (
              <Marker
                key={profile.id}
                position={[profile.lat, profile.lng]}
                icon={icon}
                eventHandlers={{
                  click: () => {
                    onSelectState(profile.name, summary.stateCode);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -18]} opacity={0.95}>
                  <div className="font-sans text-xs">
                    <strong className="text-[#F3F6FA] block">{profile.name}</strong>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider block mt-0.5 font-mono"
                      style={{ color: badgeConfig.fill }}
                    >
                      {isUnavailable
                        ? 'Unverified · Feed Unavailable'
                        : `${badgeConfig.label} (${summary.activeCount} Alert${summary.activeCount === 1 ? '' : 's'})`}
                    </span>
                  </div>
                </Tooltip>

                <Popup className="mausam-dark-popup">
                  <div className="p-1 min-w-[230px] max-w-[280px] text-xs font-sans">
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#26394B] mb-2">
                      <div>
                        <h4 className="font-bold text-[#F3F6FA] text-sm leading-tight">
                          {profile.name}
                        </h4>
                        <span className="text-[10px] text-[#8295A8]">
                          Capital: {profile.capital}
                        </span>
                      </div>
                      <span
                        className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider"
                        style={{
                          backgroundColor: `${badgeConfig.fill}22`,
                          borderColor: badgeConfig.fill,
                          color: badgeConfig.fill,
                        }}
                      >
                        {badgeConfig.label}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[#F3F6FA]">
                      <div className="text-[11px] text-[#B5C3D1]">
                        <strong className="text-[#F3F6FA]">Primary Hazard:</strong>{' '}
                        {summary.primaryHazardLabel}
                      </div>

                      <div className="text-[11px] leading-snug bg-[#08131F] p-2 rounded border border-[#26394B]">
                        {summary.bulletinHeadline}
                      </div>

                      <div className="text-[10px] text-[#8295A8]">
                        <span>Station: </span>
                        <strong className="text-[#F3F6FA] font-mono">{summary.representativeStation}</strong>
                      </div>
                    </div>

                    <div className="pt-2.5 mt-2 border-t border-[#26394B] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectState(profile.name, summary.stateCode);
                        }}
                        className="w-full py-1.5 px-2 rounded bg-[#0B72B9] hover:bg-[#095C96] text-white font-semibold text-[11px] transition-colors cursor-pointer text-center"
                      >
                        Filter Warnings ({profile.name})
                      </button>

                      {onOpenStateDrawer && (
                        <button
                          type="button"
                          onClick={() => onOpenStateDrawer(summary)}
                          className="py-1.5 px-2.5 rounded bg-[#08131F] hover:bg-[#101F2E] text-[#B5C3D1] hover:text-[#F3F6FA] border border-[#26394B] font-semibold text-[11px] transition-colors cursor-pointer"
                          title="View Full State Advisory"
                        >
                          Advisory
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div
        id="warning-map-legend"
        className="pt-2.5 border-t border-[#26394B] flex flex-col gap-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8295A8]">
          <span className="font-mono font-semibold text-[#F3F6FA] uppercase tracking-wider text-[10px]">
            Official IMD Warning Classifications
          </span>
          <span className="font-mono text-[10px] tabular-nums">
            {isUnavailable
              ? 'Counts unverified while SACHET feed is unreachable'
              : `${stateCounts.red} Red · ${stateCounts.orange} Orange · ${stateCounts.yellow} Yellow · ${stateCounts.green} Normal`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-[#08131F] border border-[#26394B]">
            <span className="w-3 h-3 rounded-sm bg-[#EF4444] shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-[#FCA5A5] leading-tight truncate">
                Red Alert
              </div>
              <div className="text-[10px] text-[#8295A8] leading-tight truncate">
                Take Action
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-[#08131F] border border-[#26394B]">
            <span className="w-3 h-3 rounded-sm bg-[#F97316] shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-[#FDBA74] leading-tight truncate">
                Orange Alert
              </div>
              <div className="text-[10px] text-[#8295A8] leading-tight truncate">
                Be Prepared
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-[#08131F] border border-[#26394B]">
            <span className="w-3 h-3 rounded-sm bg-[#EAB308] shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-[#FDE047] leading-tight truncate">
                Yellow Watch
              </div>
              <div className="text-[10px] text-[#8295A8] leading-tight truncate">
                Be Updated
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-[#08131F] border border-[#26394B]">
            <span className="w-3 h-3 rounded-sm bg-[#22C7A0] shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-[#6EE7B7] leading-tight truncate">
                Normal
              </div>
              <div className="text-[10px] text-[#8295A8] leading-tight truncate">
                No Severe Warning
              </div>
            </div>
          </div>
        </div>
      </div>
    </DataPanel>
  );
};
