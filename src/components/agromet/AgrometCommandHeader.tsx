import React, { useState, useRef, useEffect } from 'react';
import {
  Sprout,
  MapPin,
  Calendar as CalendarIcon,
  ChevronDown,
  X,
  FileText,
  Crosshair,
  Search,
} from 'lucide-react';
import { CropType, PhenologicalStage, ALL_CROPS, CROP_STAGES } from '../../services/agronomicEngine';
import { INDIAN_STATES_AND_DISTRICTS } from '../../services/agrometService';
import { LocationRecord } from '../../types';
import DateCalendar from '../DateCalendar';
import { formatDateShort } from '../../utils/dateUtils';
import { PageHeader, DataPanel, SectionHeading } from '../ui/ObservatoryPrimitives';
import { formatCoordinatePair } from '../../../shared/weatherContract';

interface AgrometCommandHeaderProps {
  selectedState: string;
  selectedDistrict: string;
  onStateChange: (state: string) => void;
  onDistrictChange: (district: string) => void;
  selectedCrop: CropType;
  onCropChange: (crop: CropType) => void;
  selectedStage: PhenologicalStage;
  onStageChange: (stage: PhenologicalStage) => void;
  lastUpdatedStr: string;
  stationName: string;
  isLive: boolean;
  sowingDate?: Date;
  onSowingDateChange?: (date: Date) => void;
  selectedLocation?: LocationRecord;
  isLocating?: boolean;
  onDetectLocation?: () => void;
  onOpenLocationCenter?: () => void;
}

export const AgrometCommandHeader: React.FC<AgrometCommandHeaderProps> = ({
  selectedState,
  selectedDistrict,
  onStateChange,
  onDistrictChange,
  selectedCrop,
  onCropChange,
  selectedStage,
  onStageChange,
  lastUpdatedStr,
  stationName,
  isLive,
  sowingDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
  onSowingDateChange,
  selectedLocation,
  isLocating = false,
  onDetectLocation,
  onOpenLocationCenter,
}) => {
  const states = Object.keys(INDIAN_STATES_AND_DISTRICTS);
  const districts = INDIAN_STATES_AND_DISTRICTS[selectedState] || [selectedDistrict];

  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const cropAgeDays = Math.max(1, Math.round((Date.now() - sowingDate.getTime()) / (1000 * 60 * 60 * 24)));

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setShowCalendar(false);
      }
    };
    if (showCalendar) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showCalendar]);

  const coords =
    selectedLocation && typeof selectedLocation.lat === 'number' && typeof selectedLocation.lng === 'number'
      ? formatCoordinatePair(selectedLocation.lat, selectedLocation.lng, 2)
      : undefined;

  return (
    <div id="agromet-command-header" className="space-y-4">
      <PageHeader
        eyebrow="IMD GKMS • ICAR-NCMRWF AGROMET"
        title="Agromet Decision Support"
        description={`Crop-specific field telemetry, hydrological scheduling, and biotic risk protocols for ${selectedDistrict}, ${selectedState}.`}
        status={isLive ? 'LIVE' : 'UNAVAILABLE'}
        source={stationName}
        updatedAt={lastUpdatedStr || null}
        coordinates={coords}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {onDetectLocation && (
              <button
                type="button"
                onClick={onDetectLocation}
                disabled={isLocating}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-[40px] rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border-strong)] text-xs font-semibold text-[var(--m-text-primary)] transition-colors cursor-pointer disabled:opacity-60 m-focus-ring"
              >
                <Crosshair className={`w-3.5 h-3.5 text-[var(--m-accent)] ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Locating…' : 'Use GPS'}</span>
              </button>
            )}
            {onOpenLocationCenter && (
              <button
                type="button"
                onClick={onOpenLocationCenter}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-[40px] rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border-strong)] text-xs font-semibold text-[var(--m-text-primary)] transition-colors cursor-pointer m-focus-ring"
              >
                <Search className="w-3.5 h-3.5 text-[var(--m-text-secondary)]" />
                <span>Change Station</span>
              </button>
            )}
            <a
              href="/agromet_bulletin.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-[40px] rounded-lg bg-[var(--m-ok-soft)] hover:bg-[var(--m-ok-soft)] border border-[var(--m-ok)]/35 text-xs font-semibold text-[var(--m-ok)] transition-colors m-focus-ring"
              title="Open Printable IMD-ICAR GKMS District Agromet Bulletin"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>GKMS Bulletin</span>
            </a>
          </div>
        }
      >
        <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-[var(--m-text-secondary)]">
          <Sprout className="w-3.5 h-3.5 text-[var(--m-ok)]" />
          <span>Crop Age:</span>
          <strong className="text-[var(--m-text-primary)]">{cropAgeDays} DAS</strong>
          <span className="text-[#38536A]">|</span>
          <span>Stage:</span>
          <strong className="text-[var(--m-accent)]">{selectedStage}</strong>
        </div>
      </PageHeader>

      <DataPanel className="overflow-visible">
        <SectionHeading
          title="Target Agro-Climatic Zone & Crop Matrix"
          subtitle="Select state, district AMFU node, crop variety, phenological phase, and sowing date"
          icon={<MapPin className="w-4 h-4" />}
          badge={
            <span className="text-[11px] font-mono text-[var(--m-text-muted)] px-2 py-0.5 rounded bg-[var(--m-surface-inset)] border border-[var(--m-border)]">
              {states.length} Regions
            </span>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4">
          <div className="space-y-1">
            <label htmlFor="agromet-state-selector" className="block text-[11px] font-mono uppercase tracking-wider text-[var(--m-text-muted)]">
              State / UT
            </label>
            <select
              id="agromet-state-selector"
              value={selectedState}
              onChange={(e) => onStateChange(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[40px] bg-[var(--m-surface-inset)] text-xs font-mono font-semibold text-[var(--m-text-primary)] border border-[var(--m-border)] hover:border-[var(--m-border-strong)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--m-accent)] cursor-pointer"
            >
              {states.map((s) => (
                <option key={s} value={s} className="bg-[var(--m-surface-1)] text-[var(--m-text-primary)]">
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="agromet-district-selector" className="block text-[11px] font-mono uppercase tracking-wider text-[var(--m-text-muted)]">
              District AMFU
            </label>
            <select
              id="agromet-district-selector"
              value={selectedDistrict}
              onChange={(e) => onDistrictChange(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[40px] bg-[var(--m-surface-inset)] text-xs font-mono font-semibold text-[var(--m-text-primary)] border border-[var(--m-border)] hover:border-[var(--m-border-strong)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--m-accent)] cursor-pointer"
            >
              {districts.map((d) => (
                <option key={d} value={d} className="bg-[var(--m-surface-1)] text-[var(--m-text-primary)]">
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="agromet-crop-selector" className="block text-[11px] font-mono uppercase tracking-wider text-[var(--m-text-muted)]">
              Agricultural Crop
            </label>
            <select
              id="agromet-crop-selector"
              value={selectedCrop}
              onChange={(e) => onCropChange(e.target.value as CropType)}
              className="w-full min-h-[44px] sm:min-h-[40px] bg-[var(--m-surface-inset)] text-xs font-mono font-semibold text-[var(--m-ok)] border border-[var(--m-border)] hover:border-[var(--m-border-strong)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--m-accent)] cursor-pointer"
            >
              {ALL_CROPS.map((c) => (
                <option key={c} value={c} className="bg-[var(--m-surface-1)] text-[var(--m-text-primary)]">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="agromet-stage-selector" className="block text-[11px] font-mono uppercase tracking-wider text-[var(--m-text-muted)]">
              Phenological Stage
            </label>
            <select
              id="agromet-stage-selector"
              value={selectedStage}
              onChange={(e) => onStageChange(e.target.value as PhenologicalStage)}
              className="w-full min-h-[44px] sm:min-h-[40px] bg-[var(--m-surface-inset)] text-xs font-mono font-semibold text-[var(--m-accent)] border border-[var(--m-border)] hover:border-[var(--m-border-strong)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--m-accent)] cursor-pointer"
            >
              {CROP_STAGES.map((st) => (
                <option key={st} value={st} className="bg-[var(--m-surface-1)] text-[var(--m-text-primary)]">
                  {st}
                </option>
              ))}
            </select>
          </div>

          {onSowingDateChange && (
            <div className="space-y-1 relative" ref={calendarRef}>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--m-text-muted)]">
                Sowing Date
              </label>
              <button
                type="button"
                onClick={() => setShowCalendar(!showCalendar)}
                className="w-full min-h-[44px] sm:min-h-[40px] px-3 py-2 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] hover:border-[var(--m-border-strong)] text-xs font-mono text-[var(--m-text-primary)] transition-colors flex items-center justify-between gap-2 cursor-pointer m-focus-ring"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <CalendarIcon className="w-3.5 h-3.5 text-[var(--m-ok)] shrink-0" />
                  <span className="font-semibold tabular-nums">{formatDateShort(sowingDate)}</span>
                  <span className="text-[var(--m-text-muted)] text-[10px]">({cropAgeDays}d)</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-[var(--m-text-muted)] transition-transform shrink-0 ${showCalendar ? 'rotate-180' : ''}`} />
              </button>

              {showCalendar && (
                <div className="absolute right-0 top-full mt-2 z-50 p-2 bg-[var(--m-surface-2)] border border-[var(--m-border-strong)] rounded-xl shadow-2xl">
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--m-border)] mb-2 text-xs">
                    <span className="text-[var(--m-text-primary)] font-semibold">Select Sowing Date</span>
                    <button
                      type="button"
                      onClick={() => setShowCalendar(false)}
                      className="text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <DateCalendar
                    value={sowingDate}
                    onChange={(d) => {
                      onSowingDateChange(d);
                      setShowCalendar(false);
                    }}
                    maxDate={new Date()}
                    showToday={true}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </DataPanel>
    </div>
  );
};
