// ====================================================================
// MAUSAM - Accessible Mobile & Tablet Navigation Drawer
// Slide-over drawer with >=44px touch targets, Escape dismissal,
// backdrop click close, active route indicator, workspace switcher,
// and Projector / Smart TV display profile toggles.
// ====================================================================

import React, { useEffect, useRef } from 'react';
import {
  X,
  Home,
  Radio,
  TrendingUp,
  AlertTriangle,
  Activity,
  Wheat,
  Disc,
  ThermometerSun,
  FileText,
  Database,
  Globe2,
  LayoutDashboard,
  List,
  Monitor,
  Presentation,
  Tv,
  MapPin,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import type { MainNavTab } from './MainNavigation';
import { useExperience, type DisplayProfile, type ExperienceMode } from '../../context/ExperienceContext';
import { triggerHaptic } from '../../utils/haptics';

interface MobileNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectTab: (tab: MainNavTab) => void;
  activeAlertCount: number;
  locationLabel: string;
  onOpenLocationCenter: () => void;
  onOpenAskMausam: () => void;
}

const DRAWER_NAV_ITEMS: Array<{
  id: MainNavTab;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'home', label: 'Overview', subtitle: 'Live atmospheric summary', icon: Home },
  { id: 'radar', label: 'Weather Map & Radar', subtitle: 'Layers, wind & radar loop', icon: Radio },
  { id: 'forecast', label: 'Forecast & NWP', subtitle: 'Hourly, 7-day & models', icon: TrendingUp },
  { id: 'warnings', label: 'Official Alerts', subtitle: 'IMD & NDMA SACHET CAP', icon: AlertTriangle },
  { id: 'aqi', label: 'Air Quality', subtitle: 'CPCB stations & pollutants', icon: Activity },
  { id: 'agromet', label: 'Agromet Intelligence', subtitle: 'Soil moisture & crop advisories', icon: Wheat },
  { id: 'cyclone-tracker', label: 'Cyclone Monitor', subtitle: 'RSMC basin tracks & advisories', icon: Disc },
  { id: 'weather', label: 'Local Station Detail', subtitle: 'Hourly, marine & telemetry', icon: ThermometerSun },
  { id: 'reports', label: 'Bulletins & Reports', subtitle: 'Official synopsis documents', icon: FileText },
  { id: 'debug', label: 'Data & Sources', subtitle: 'Feed diagnostics & status', icon: Database },
];

export const MobileNavigationDrawer: React.FC<MobileNavigationDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  activeAlertCount,
  locationLabel,
  onOpenLocationCenter,
  onOpenAskMausam,
}) => {
  const {
    mode,
    setMode,
    surfaceTheme,
    setSurfaceTheme,
    displayProfile,
    setDisplayProfile,
  } = useExperience();

  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const timer = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 30);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNavPick = (tab: MainNavTab) => {
    triggerHaptic('light');
    if (mode === 'explore') {
      setMode('analyze');
    }
    onSelectTab(tab);
    onClose();
  };

  const handleModePick = (nextMode: ExperienceMode) => {
    triggerHaptic('light');
    setMode(nextMode);
    onClose();
  };

  const handleProfilePick = (profile: DisplayProfile) => {
    triggerHaptic('light');
    setDisplayProfile(profile);
    onClose();
  };

  return (
    <div
      id="mobile-navigation-drawer"
      className="fixed inset-0 z-[70] flex justify-start"
      role="dialog"
      aria-modal="true"
      aria-label="MAUSAM Navigation Menu"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close navigation menu"
        onClick={onClose}
        className="fixed inset-0 bg-black/65 backdrop-blur-xs cursor-pointer"
      />

      {/* Drawer Panel */}
      <aside className="relative z-10 w-[min(340px,88vw)] max-w-full h-[100dvh] bg-[var(--m-surface-1)] border-r border-[var(--m-border-strong)] shadow-2xl flex flex-col overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3.5 border-b border-[var(--m-border)] bg-[var(--m-surface-inset)] shrink-0">
          <div className="min-w-0">
            <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--m-accent)] font-semibold">
              MAUSAM Navigation
            </div>
            <div className="text-xs text-[var(--m-text-secondary)] truncate mt-0.5">
              {locationLabel}
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="min-w-[44px] min-h-[44px] rounded-xl border border-[var(--m-border)] bg-[var(--m-surface-2)] text-[var(--m-text-primary)] flex items-center justify-center cursor-pointer m-focus-ring shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-4">
          {/* Quick Actions: Location + Ask MAUSAM */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLocationCenter();
              }}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-[var(--m-border)] bg-[var(--m-surface-2)] text-xs font-semibold text-[var(--m-text-primary)] flex items-center justify-center gap-1.5 cursor-pointer m-focus-ring"
            >
              <MapPin className="w-4 h-4 text-[var(--m-accent)] shrink-0" />
              <span className="truncate">Locations</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAskMausam();
              }}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-[var(--m-accent)]/40 bg-[var(--m-accent-soft)] text-xs font-semibold text-[var(--m-accent)] flex items-center justify-center gap-1.5 cursor-pointer m-focus-ring"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="truncate">Ask MAUSAM</span>
            </button>
          </div>

          {/* Workspace Mode Switcher */}
          <div className="space-y-1.5">
            <div className="px-1 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--m-text-muted)]">
              Workspace Mode
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'explore', label: 'Explore', icon: Globe2 },
                  { id: 'analyze', label: 'Analyze', icon: LayoutDashboard },
                  { id: 'classic', label: 'Classic', icon: List },
                ] as const
              ).map(({ id, label, icon: Icon }) => {
                const active = mode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleModePick(id)}
                    aria-pressed={active}
                    className={`min-h-[44px] px-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer m-focus-ring ${
                      active
                        ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)] text-[var(--m-accent)]'
                        : 'bg-[var(--m-surface-2)] border-[var(--m-border)] text-[var(--m-text-secondary)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Display Profile Switcher (Standard / Projector / Smart TV) */}
          <div className="space-y-1.5">
            <div className="px-1 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--m-text-muted)]">
              Screen &amp; Display Mode
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'standard', label: 'Standard', icon: Monitor },
                  { id: 'projector', label: 'Projector', icon: Presentation },
                  { id: 'tv', label: 'Smart TV', icon: Tv },
                ] as const
              ).map(({ id, label, icon: Icon }) => {
                const active = displayProfile === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleProfilePick(id)}
                    aria-pressed={active}
                    className={`min-h-[44px] px-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer m-focus-ring ${
                      active
                        ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)] text-[var(--m-accent)]'
                        : 'bg-[var(--m-surface-2)] border-[var(--m-border)] text-[var(--m-text-secondary)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Sections List */}
          <nav aria-label="Meteorological Sections" className="space-y-1">
            <div className="px-1 pb-1 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--m-text-muted)]">
              Meteorological Modules
            </div>
            {DRAWER_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const badgeCount = item.id === 'warnings' ? activeAlertCount : 0;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavPick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full min-h-[48px] px-3 py-2 rounded-xl border flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer m-focus-ring ${
                    isActive
                      ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)]/50 text-[var(--m-text-primary)]'
                      : 'bg-transparent border-transparent hover:bg-[var(--m-surface-2)] text-[var(--m-text-secondary)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-[var(--m-accent)]' : 'text-[var(--m-text-muted)]'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate text-[var(--m-text-primary)]">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-[var(--m-text-muted)] truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  {badgeCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-mono tabular-nums font-bold bg-[var(--m-danger-soft)] text-[var(--m-danger)] border border-[var(--m-danger)]/35 shrink-0">
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer: Surface Theme Toggle */}
        <div className="px-4 py-3 border-t border-[var(--m-border)] bg-[var(--m-surface-inset)] flex items-center justify-between gap-2 shrink-0">
          <span className="text-xs font-medium text-[var(--m-text-secondary)]">Surface Theme</span>
          <div className="inline-flex rounded-lg border border-[var(--m-border)] p-0.5 bg-[var(--m-surface-2)]">
            <button
              type="button"
              onClick={() => setSurfaceTheme('paper')}
              aria-pressed={surfaceTheme === 'paper'}
              className={`min-h-[36px] px-2.5 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                surfaceTheme === 'paper'
                  ? 'bg-[var(--m-accent)] text-[#111314]'
                  : 'text-[var(--m-text-secondary)]'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              Light
            </button>
            <button
              type="button"
              onClick={() => setSurfaceTheme('dark')}
              aria-pressed={surfaceTheme === 'dark'}
              className={`min-h-[36px] px-2.5 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                surfaceTheme === 'dark'
                  ? 'bg-[var(--m-accent)] text-[#111314]'
                  : 'text-[var(--m-text-secondary)]'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              Dark
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
