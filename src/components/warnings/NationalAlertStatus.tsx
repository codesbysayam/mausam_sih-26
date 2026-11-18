import React from 'react';
import { ArrowDown } from 'lucide-react';
import { AlertSeverity, WarningStats } from '../../types/warningTypes';
import { DataPanel, MetricValue, SeverityBanner } from '../ui/ObservatoryPrimitives';

interface NationalAlertStatusProps {
  overallStatus: {
    severity: AlertSeverity;
    badgeLabel: string;
    headline: string;
    description: string;
    statusColor: string;
  };
  stats: WarningStats;
  lastUpdated?: string;
  onViewRegionalAlerts?: () => void;
  isUnavailable?: boolean;
}

export const NationalAlertStatus: React.FC<NationalAlertStatusProps> = ({
  overallStatus,
  stats,
  onViewRegionalAlerts,
  isUnavailable = false,
}) => {
  const bannerState: 'UNAVAILABLE' | 'ALL_CLEAR' | 'WATCH' | 'ALERT' | 'SEVERE' = isUnavailable
    ? 'UNAVAILABLE'
    : overallStatus.severity === 'red'
    ? 'SEVERE'
    : overallStatus.severity === 'orange'
    ? 'ALERT'
    : overallStatus.severity === 'yellow'
    ? 'WATCH'
    : 'ALL_CLEAR';

  const bannerTitle = isUnavailable
    ? 'Official SACHET / NDMA feed temporarily unreachable'
    : overallStatus.headline;

  const bannerDescription = isUnavailable
    ? 'Live CAP warning alerts could not be verified from the SACHET/NDMA gateway. Check regional sources or retry sync.'
    : overallStatus.description;

  return (
    <section
      id="current-national-alert-status-section"
      aria-label="Current National Alert Status"
      className="flex flex-col gap-3.5"
    >
      <div id="national-alert-primary-banner">
        <SeverityBanner
          state={bannerState}
          title={bannerTitle}
          description={bannerDescription}
          source={
            isUnavailable
              ? 'Bulletin count unverified'
              : `${stats.totalActive} active national bulletin${stats.totalActive === 1 ? '' : 's'}`
          }
          action={
            onViewRegionalAlerts ? (
              <button
                id="btn-scroll-to-bulletins"
                type="button"
                onClick={onViewRegionalAlerts}
                className="px-3.5 py-2 min-h-[40px] rounded-lg bg-[#08131F] hover:bg-[#101F2E] text-[#F3F6FA] border border-[#38536A] font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer m-focus-ring"
              >
                <span className="font-mono tabular-nums">
                  Bulletins ({isUnavailable ? '—' : stats.totalActive})
                </span>
                <ArrowDown className="w-3.5 h-3.5 text-[#35C7E8]" />
              </button>
            ) : undefined
          }
        />
      </div>

      <div
        id="national-alert-metrics-row"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <DataPanel id="metric-severe-red" className="border-[#EF4444]/35">
          <MetricValue
            label="Red Warnings"
            value={isUnavailable ? null : stats.severeRed}
            unit="bulletins"
            hint="Take immediate protective action"
            unavailableLabel="Feed unverified"
            valueClassName="text-2xl sm:text-3xl font-bold text-[#FCA5A5]"
          />
        </DataPanel>

        <DataPanel id="metric-moderate-orange" className="border-[#F97316]/35">
          <MetricValue
            label="Orange Alerts"
            value={isUnavailable ? null : stats.moderateOrange}
            unit="bulletins"
            hint="Be prepared for severe weather"
            unavailableLabel="Feed unverified"
            valueClassName="text-2xl sm:text-3xl font-bold text-[#FDBA74]"
          />
        </DataPanel>

        <DataPanel id="metric-advisory-yellow" className="border-[#EAB308]/35">
          <MetricValue
            label="Yellow Watches"
            value={isUnavailable ? null : stats.advisoryYellow}
            unit="bulletins"
            hint="Stay updated on weather changes"
            unavailableLabel="Feed unverified"
            valueClassName="text-2xl sm:text-3xl font-bold text-[#FDE047]"
          />
        </DataPanel>

        <DataPanel
          id="metric-monitored-green"
          className={isUnavailable ? 'border-[#F59E0B]/35' : 'border-[#22C7A0]/35'}
        >
          <MetricValue
            label={isUnavailable ? 'Feed Verification' : 'Normal States / UTs'}
            value={isUnavailable ? null : stats.greenNormalStates}
            unit="/ 36"
            hint="No severe warning in effect"
            unavailableLabel="SACHET feed unreachable"
            valueClassName="text-2xl sm:text-3xl font-bold text-[#6EE7B7]"
          />
        </DataPanel>
      </div>
    </section>
  );
};
