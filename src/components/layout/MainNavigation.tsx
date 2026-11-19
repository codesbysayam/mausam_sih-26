import React from 'react';
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
import { TranslationDictionary } from '../../i18n/translations';
import { triggerHaptic } from '../../utils/haptics';

export type MainNavTab =
  | 'home'
  | 'radar'
  | 'forecast'
  | 'warnings'
  | 'aqi'
  | 'agromet'
  | 'cyclone-tracker'
  | 'weather'
  | 'reports'
  | 'debug';

interface MainNavigationProps {
  activeTab: MainNavTab | string;
  onTabChange: (tab: MainNavTab) => void;
  activeAlertCount?: number;
}

interface NavItemConfig {
  id: MainNavTab;
  labelKey: keyof TranslationDictionary;
  defaultLabel: string;
  icon: LucideIcon;
  accentColor: string;
}

const NAV_CONFIG: NavItemConfig[] = [
  {
    id: 'home',
    labelKey: 'home',
    defaultLabel: 'Overview',
    icon: Home,
    accentColor: 'text-[var(--m-accent)]',
  },
  {
    id: 'radar',
    labelKey: 'radar',
    defaultLabel: 'Weather Map',
    icon: Radio,
    accentColor: 'text-[var(--m-ok)]',
  },
  {
    id: 'forecast',
    labelKey: 'forecast',
    defaultLabel: 'Forecast & NWP',
    icon: TrendingUp,
    accentColor: 'text-[#60A5FA]',
  },
  {
    id: 'warnings',
    labelKey: 'warnings',
    defaultLabel: 'Alerts',
    icon: AlertTriangle,
    accentColor: 'text-[var(--m-danger)]',
  },
  {
    id: 'aqi',
    labelKey: 'airQuality',
    defaultLabel: 'Air Quality',
    icon: Activity,
    accentColor: 'text-[var(--m-watch)]',
  },
  {
    id: 'agromet',
    labelKey: 'agromet',
    defaultLabel: 'Agromet',
    icon: Wheat,
    accentColor: 'text-[var(--m-ok)]',
  },
  {
    id: 'cyclone-tracker',
    labelKey: 'cycloneTracker' as any,
    defaultLabel: 'Cyclones',
    icon: Disc,
    accentColor: 'text-[var(--m-accent)]',
  },
  {
    id: 'weather',
    labelKey: 'weather',
    defaultLabel: 'Local Detail',
    icon: ThermometerSun,
    accentColor: 'text-[#FB923C]',
  },
  {
    id: 'reports',
    labelKey: 'reports',
    defaultLabel: 'Reports',
    icon: FileText,
    accentColor: 'text-[var(--m-text-secondary)]',
  },
  {
    id: 'debug',
    labelKey: 'apiDebug' as any,
    defaultLabel: 'Data & Sources',
    icon: Database,
    accentColor: 'text-[var(--m-accent)]',
  },
];

export const MainNavigation: React.FC<MainNavigationProps> = ({
  activeTab,
  onTabChange,
  activeAlertCount = 0,
}) => {
  const { t } = useLanguage();

  return (
    <nav
      id="primary-main-navigation"
      className="hidden md:block w-full bg-[var(--m-surface-inset)] border-b border-[var(--m-border)] select-none"
      aria-label="Primary Navigation"
    >
      <div className="max-w-[1560px] mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
          {NAV_CONFIG.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badgeCount = item.id === 'warnings' ? activeAlertCount : 0;
            const translated = t(item.labelKey, item.defaultLabel);

            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onTabChange(item.id);
                }}
                className={`relative flex items-center gap-1.5 px-3 min-h-[40px] text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 border-b-2 ${
                  isActive
                    ? 'border-[var(--m-accent)] text-[var(--m-text-primary)] bg-[var(--m-surface-2)] font-semibold'
                    : 'border-transparent text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-1)]'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive ? item.accentColor : 'text-[var(--m-text-muted)]'
                  }`}
                />
                <span>{translated}</span>

                {badgeCount > 0 && (
                  <span
                    className="ml-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums font-semibold leading-none bg-[var(--m-danger-soft)] text-[var(--m-danger)] border border-[var(--m-danger)]/35"
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
