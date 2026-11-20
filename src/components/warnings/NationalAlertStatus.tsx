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
  reconciledCounts?: {
    redStates: number;
    orangeStates: number;
    yellowStates: number;
    affectedStateCount: number;
    normalStateCount: number;
    totalStatesAndUTs: number;
    unmappedBulletinsCount: number;
    latestIssuedAt: string | null;
  };
  lastUpdated?: string;
  sourceAttribution?: string;
  onViewRegionalAlerts?: () => void;
  isUnavailable?: boolean;
}

export const NationalAlertStatus: React.FC<NationalAlertStatusProps> = ({
  overallStatus,
  stats,
  reconciledCounts,
  lastUpdated,
  sourceAttribution = 'NDMA SACHET / IMD CAP Feed',
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

  const totalStates = reconciledCounts?.totalStatesAndUTs ?? 36;
  const affectedStates = reconciledCounts?.affectedStateCount ?? stats.statesAffected;
  const normalStates = reconciledCounts?.normalStateCount ?? stats.greenNormalStates;
  const redStates = reconciledCounts?.redStates ?? 0;
  const orangeStates = reconciledCounts?.orangeStates ?? 0;
  const yellowStates = reconciledCounts?.yellowStates ?? 0;
  const unmappedCount = reconciledCounts?.unmappedBulletinsCount ?? 0;

  const provenanceSummary = isUnavailable
    ? `Source: ${sourceAttribution} · Bulletin count unverified`
    : [
        `${stats.totalActive} active bulletin${stats.totalActive === 1 ? '' : 's'} across ${affectedStates} of ${totalStates} States & UTs${
          unmappedCount > 0 ? ` (+${unmappedCount} regional/multi-state)` : ''
        }`,
        `Source: ${sourceAttribution}`,
        lastUpdated ? `Synced: ${lastUpdated}` : null,
        reconciledCounts?.latestIssuedAt ? `Latest Bulletin: ${reconciledCounts.latestIssuedAt}` : null,
      ]
        .filter(Boolean)
        .join(' · ');

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
          source={provenanceSummary}
          action={
            onViewRegionalAlerts ? (
              <button
                id="btn-scroll-to-bulletins"
                type="button"
                onClick={onViewRegionalAlerts}
                className="px-3.5 py-2 min-h-[40px] rounded-lg bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] text-[var(--m-text-primary)] border border-[var(--m-border-strong)] font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer m-focus-ring"
              >
                <span className="font-mono tabular-nums">
                  Bulletins ({isUnavailable ? '—' : stats.totalActive})
                </span>
                <ArrowDown className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              </button>
            ) : undefined
          }
        />
      </div>

      <div
        id="national-alert-metrics-row"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <DataPanel id="metric-severe-red" className="border-[var(--m-danger)]/35">
          <MetricValue
            label="Red Warnings"
            value={isUnavailable ? null : stats.severeRed}
            unit="bulletins"
            hint={
              isUnavailable
                ? 'Feed unverified'
                : `${redStates} state${redStates === 1 ? '' : 's'}/UTs at Red · Take immediate action`
            }
            unavailableLabel="Feed unverified"
            valueClassName="text-2xl sm:text-3xl font-bold text-[var(--m-danger)]"
          />
        </DataPanel>

        <DataPanel id="metric-moderate-orange" className="border-[var(--m-alert)]/35">
          <MetricValue
            label="Orange Alerts"
            value={isUnavailable ? null : stats.moderateOrange}
            unit="bulletins"
            hint={
              isUnavailable
                ? 'Feed unverified'
                : `${orangeStates} state${orangeStates === 1 ? '' : 's'}/UTs at Orange · Be prepared`
            }
            unavailableLabel="Feed unverified"
            valueClassName="text-2xl sm:text-3xl font-bold text-[var(--m-alert)]"
          />
        </DataPanel>

        <DataPanel id="metric-advisory-yellow" className="border-[var(--m-watch)]/35">
          <MetricValue
            label="Yellow Watches"
            value={isUnavailable ? null : stats.advisoryYellow}
            unit="bulletins"
            hint={
              isUnavailable
                ? 'Feed unverified'
                : `${yellowStates} state${yellowStates === 1 ? '' : 's'}/UTs at Yellow · Multiple bulletins possible per state`
            }
            unavailableLabel="Feed unverified"
            valueClassName="text-2xl sm:text-3xl font-bold text-[var(--m-watch)]"
          />
        </DataPanel>

        <DataPanel
          id="metric-monitored-green"
          className={isUnavailable ? 'border-[var(--m-watch)]/35' : 'border-[var(--m-ok)]/35'}
        >
          <MetricValue
            label={isUnavailable ? 'Feed Verification' : 'Normal States / UTs'}
            value={isUnavailable ? null : normalStates}
            unit={`/ ${totalStates}`}
            hint={
              isUnavailable
                ? 'Status unverified — feed offline'
                : `${affectedStates} alerted · ${normalStates} with no active severe alert`
            }
            unavailableLabel="SACHET feed unreachable"
            valueClassName="text-2xl sm:text-3xl font-bold text-[var(--m-ok)]"
          />
        </DataPanel>
      </div>
    </section>
  );
};
