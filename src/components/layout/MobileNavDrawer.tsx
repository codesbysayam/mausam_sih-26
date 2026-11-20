import React, { useEffect, useRef } from 'react';
import {
  Home,
  ThermometerSun,
  TrendingUp,
  AlertTriangle,
  Radio,
  Activity,
  Wheat,
  FileText,
  Database,
  LucideIcon,
  Disc,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { MainNavTab } from './MainNavigation';
import { FooterView } from './FooterNavigation';
import { LocationRecord } from '../../types';
import { LocatingPhase } from '../../services/geolocationService';
import { LanguageSelector } from './LanguageSelector';
import { UseMyLocationButton } from '../location/UseMyLocationButton';
import { AudioAlertToggle } from '../common/AudioAlertToggle';
import { triggerHaptic } from '../../utils/haptics';
import { formatCoordinatePair } from '../../../shared/weatherContract';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onNavigateTab: (tab: MainNavTab | FooterView) => void;
  activeAlertCount?: number;
  selectedLocation: LocationRecord;
  onOpenAskMausam?: () => void;
  fontSizeMultiplier: number;
  onAdjustFontSize: (delta: number) => void;
  onResetFontSize: () => void;
  onDetectLocation?: (forceRefresh?: boolean) => Promise<any>;
  isLocating?: boolean;
  locatePhase?: LocatingPhase;
  locationSource?: 'DEVICE_GPS' | 'MANUAL_SEARCH';
  onOpenLocationCenter?: () => void;
}

interface MobileNavItem {
  id: MainNavTab;
  labelKey: string;
  defaultLabel: string;
  icon: LucideIcon;
  color: string;
  badge?: number;
}

const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { id: 'home', labelKey: 'home', defaultLabel: 'Overview', icon: Home, color: 'text-[var(--m-accent)]' },
  { id: 'radar', labelKey: 'radar', defaultLabel: 'Weather Map', icon: Radio, color: 'text-[var(--m-ok)]' },
  { id: 'forecast', labelKey: 'forecast', defaultLabel: 'Forecast & NWP', icon: TrendingUp, color: 'text-[var(--m-accent)]' },
  { id: 'warnings', labelKey: 'warnings', defaultLabel: 'Alerts', icon: AlertTriangle, color: 'text-[var(--m-danger)]' },
  { id: 'aqi', labelKey: 'airQuality', defaultLabel: 'Air Quality', icon: Activity, color: 'text-[var(--m-watch)]' },
  { id: 'agromet', labelKey: 'agromet', defaultLabel: 'Agromet', icon: Wheat, color: 'text-[var(--m-ok)]' },
  { id: 'cyclone-tracker', labelKey: 'cycloneTracker', defaultLabel: 'Cyclones', icon: Disc, color: 'text-[var(--m-accent)]' },
  { id: 'weather', labelKey: 'weather', defaultLabel: 'Local Detail', icon: ThermometerSun, color: 'text-[#FB923C]' },
  { id: 'reports', labelKey: 'reports', defaultLabel: 'Reports', icon: FileText, color: 'text-[var(--m-text-secondary)]' },
  { id: 'debug', labelKey: 'apiDebug', defaultLabel: 'Data & Sources', icon: Database, color: 'text-[var(--m-accent)]' },
];

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onNavigateTab,
  activeAlertCount = 0,
  selectedLocation,
  onOpenAskMausam,
  onAdjustFontSize,
  onResetFontSize,
  onDetectLocation,
  isLocating = false,
  locatePhase = 'idle',
  locationSource = 'MANUAL_SEARCH',
  onOpenLocationCenter,
}) => {
  const { t } = useLanguage();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'auto';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDetect = async () => {
    if (onDetectLocation) {
      try {
        await onDetectLocation(true);
      } catch (err) {
        console.debug('[MobileNavDrawer] Location detect handled error:', err);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation Menu"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div
        ref={drawerRef}
        className="relative z-10 w-[86%] max-w-[340px] h-full bg-[var(--m-surface-inset)] border-l border-[var(--m-border)] shadow-2xl flex flex-col justify-between overflow-y-auto"
      >
        <div>
          <div className="p-4 border-b border-[var(--m-border)] flex items-center justify-between bg-[var(--m-surface-1)]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border)] p-1 flex items-center justify-center shrink-0">
                <img
                  src="/assets/imd-logo.svg"
                  alt="IMD Logo"
                  className="w-full h-full object-contain"
                  loading="eager"
                />
              </div>
              <div>
                <div className="text-[var(--m-text-primary)] font-bold text-sm leading-none flex items-center gap-1.5">
                  <span>MAUSAM</span>
                  <span className="text-[10px] font-mono text-[var(--m-accent)]">IN</span>
                </div>
                <div className="text-[var(--m-text-muted)] text-[11px] mt-0.5">Atmospheric Intelligence</div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Close menu"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="p-3 bg-[var(--m-surface-1)] border-b border-[var(--m-border)] flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[var(--m-accent)] text-[16px] shrink-0">
                location_on
              </span>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[var(--m-text-primary)] truncate">
                    {selectedLocation.city}, {selectedLocation.state}
                  </span>
                  {locationSource === 'DEVICE_GPS' && (
                    <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[var(--m-ok-soft)] text-[var(--m-ok)]">
                      GPS
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[var(--m-text-muted)] block truncate">
                  {formatCoordinatePair(selectedLocation.lat, selectedLocation.lng, 2)}
                </span>
              </div>
            </div>
            {onOpenLocationCenter && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLocationCenter();
                }}
                className="text-xs text-[var(--m-accent)] font-semibold hover:underline shrink-0 px-2 py-2 min-h-[44px] cursor-pointer"
              >
                Change
              </button>
            )}
          </div>

          {onDetectLocation && (
            <div className="p-3 border-b border-[var(--m-border)]">
              <UseMyLocationButton
                onDetect={handleDetect}
                isLocating={isLocating}
                phase={locatePhase}
                variant="compact"
                className="w-full justify-center min-h-[44px]"
              />
            </div>
          )}

          {onOpenAskMausam && (
            <div className="p-3 border-b border-[var(--m-border)]">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAskMausam();
                }}
                className="w-full min-h-[44px] px-3 rounded-lg bg-[var(--m-surface-1)] border border-white/14 hover:border-[var(--m-accent)]/40 text-[var(--m-text-primary)] flex items-center justify-between text-xs font-semibold cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--m-accent)] text-[18px]">
                    auto_awesome
                  </span>
                  <span>Ask MAUSAM</span>
                </div>
                <span className="text-[11px] text-[var(--m-accent)]">Open →</span>
              </button>
            </div>
          )}

          <div className="p-2 flex flex-col gap-0.5">
            {MOBILE_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const badgeCount = item.id === 'warnings' ? activeAlertCount : item.badge;
              const label = t(item.labelKey as any, item.defaultLabel);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onNavigateTab(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer min-h-[44px] ${
                    isActive
                      ? 'bg-[var(--m-surface-2)] text-[var(--m-text-primary)] font-semibold border border-[var(--m-accent)]/30'
                      : 'text-[var(--m-text-secondary)] hover:bg-[var(--m-surface-2)] hover:text-[var(--m-text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? item.color : 'text-[var(--m-text-muted)]'}`} />
                    <span>{label}</span>
                  </div>

                  {badgeCount && badgeCount > 0 ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums font-semibold bg-[var(--m-danger-soft)] text-[var(--m-danger)]">
                      {badgeCount}
                    </span>
                  ) : (
                    <span className="text-[var(--m-text-muted)] text-sm">›</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-[var(--m-border)] bg-[var(--m-surface-1)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[var(--m-text-primary)]">Severe Audio Alert</span>
              <span className="text-[11px] text-[var(--m-text-muted)]">Chime when warnings increase</span>
            </div>
            <AudioAlertToggle variant="compact" showLabel={true} />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-[var(--m-text-muted)] uppercase font-semibold tracking-wider">
              Language
            </span>
            <LanguageSelector />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--m-border)] text-xs">
            <span className="text-[11px] text-[var(--m-text-muted)]">Text Size</span>
            <div className="flex items-center gap-1 bg-[var(--m-surface-2)] border border-[var(--m-border)] rounded px-1 h-9">
              <button
                type="button"
                onClick={() => onAdjustFontSize(-0.05)}
                className="px-2.5 text-xs text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] font-semibold h-full"
                aria-label="Decrease font size"
              >
                A-
              </button>
              <span className="text-white/15">|</span>
              <button
                type="button"
                onClick={onResetFontSize}
                className="px-2.5 text-xs text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] font-semibold h-full"
                aria-label="Reset font size"
              >
                A
              </button>
              <span className="text-white/15">|</span>
              <button
                type="button"
                onClick={() => onAdjustFontSize(0.05)}
                className="px-2.5 text-xs text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] font-semibold h-full"
                aria-label="Increase font size"
              >
                A+
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--m-border)] flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--m-text-muted)]">
            <button type="button" onClick={() => { onNavigateTab('terms'); onClose(); }} className="hover:text-[var(--m-accent)] py-1">
              Terms
            </button>
            <span>•</span>
            <button type="button" onClick={() => { onNavigateTab('privacy'); onClose(); }} className="hover:text-[var(--m-accent)] py-1">
              Privacy
            </button>
            <span>•</span>
            <button type="button" onClick={() => { onNavigateTab('api'); onClose(); }} className="hover:text-[var(--m-accent)] py-1">
              Open Data API
            </button>
            <span>•</span>
            <button type="button" onClick={() => { onNavigateTab('docs'); onClose(); }} className="hover:text-[var(--m-accent)] py-1">
              Docs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
