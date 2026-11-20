import React, { useState, useMemo } from 'react';
import { ChevronRight, MapPin, Search, X } from 'lucide-react';
import { StateWarningSummary, AlertSeverity, WarningRecord } from '../../types/warningTypes';
import { STATE_ALERT_SEVERITIES } from '../../data/nationalWarningsData';
import { DataPanel, SectionHeading, SourceStatus } from '../ui/ObservatoryPrimitives';

interface StateWatchlistPanelProps {
  selectedState: string | null;
  onSelectState: (stateName: string, stateCode: string) => void;
  onOpenStateDrawer?: (summary: StateWarningSummary) => void;
  warnings?: WarningRecord[];
  isUnavailable?: boolean;
}

export const StateWatchlistPanel: React.FC<StateWatchlistPanelProps> = ({
  selectedState,
  onSelectState,
  onOpenStateDrawer,
  warnings = [],
  isUnavailable = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');

  const statesList = useMemo(() => {
    const baseList: StateWarningSummary[] = Object.values(STATE_ALERT_SEVERITIES).map((s) => {
      const matched = isUnavailable
        ? []
        : warnings.filter(
            (w) =>
              w.state.toLowerCase() === s.stateName.toLowerCase() ||
              w.stateCode.toLowerCase() === s.stateCode.replace('in-', '').toLowerCase() ||
              w.stateCode.toLowerCase() === s.stateCode.toLowerCase()
          );

      if (matched.length > 0) {
        const order: Record<AlertSeverity, number> = {
          red: 4,
          orange: 3,
          yellow: 2,
          purple: 1,
          green: 0,
        };
        const sorted = [...matched].sort(
          (a, b) => (order[b.severity] ?? 0) - (order[a.severity] ?? 0)
        );
        const top = sorted[0];
        return {
          ...s,
          highestSeverity: top.severity,
          activeCount: matched.length,
          primaryHazard: top.hazardCategory,
          primaryHazardLabel: top.hazardLabel,
          bulletinHeadline: top.title,
          validityRange: top.validUntil,
        };
      }

      return {
        ...s,
        highestSeverity: 'green',
        activeCount: 0,
        primaryHazardLabel: isUnavailable ? 'Feed Unreachable' : 'Normal Seasonal Conditions',
        bulletinHeadline: isUnavailable
          ? 'SACHET / NDMA feed unreachable — alert status unverified.'
          : 'No active severe weather warning',
        validityRange: isUnavailable ? 'Unavailable' : 'Routine Synoptic Cycle',
      };
    });

    return baseList.sort((a, b) => {
      const order: Record<AlertSeverity, number> = {
        red: 4,
        orange: 3,
        yellow: 2,
        purple: 1,
        green: 0,
      };
      const diff = order[b.highestSeverity] - order[a.highestSeverity];
      if (diff !== 0) return diff;
      return a.stateName.localeCompare(b.stateName);
    });
  }, [warnings, isUnavailable]);

  const filteredStates = useMemo(() => {
    return statesList.filter((s) => {
      const matchSearch =
        searchQuery === '' ||
        s.stateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.capital.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.primaryHazardLabel.toLowerCase().includes(searchQuery.toLowerCase());

      const matchSev = severityFilter === 'all' || s.highestSeverity === severityFilter;

      return matchSearch && matchSev;
    });
  }, [statesList, searchQuery, severityFilter]);

  const activeFocusedState = useMemo(() => {
    if (!selectedState || selectedState === 'all') return null;
    return (
      statesList.find(
        (s) =>
          s.stateName.toLowerCase() === selectedState.toLowerCase() ||
          s.stateCode.toLowerCase() === selectedState.toLowerCase() ||
          selectedState.toLowerCase().includes(s.stateName.toLowerCase())
      ) || null
    );
  }, [statesList, selectedState]);

  const getSeverityBadge = (sev: AlertSeverity) => {
    if (isUnavailable) {
      return {
        bg: 'bg-[var(--m-text-muted)]/12 text-[var(--m-text-secondary)] border-[var(--m-border-strong)]',
        dot: 'bg-[var(--m-text-muted)]',
        label: 'UNVERIFIED',
      };
    }
    switch (sev) {
      case 'red':
        return {
          bg: 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/45',
          dot: 'bg-[#EF4444]',
          label: 'RED ALERT',
        };
      case 'orange':
        return {
          bg: 'bg-[var(--m-alert-soft)] text-[var(--m-alert)] border-[var(--m-alert)]/45',
          dot: 'bg-[#F97316]',
          label: 'ORANGE ALERT',
        };
      case 'yellow':
        return {
          bg: 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/45',
          dot: 'bg-[#EAB308]',
          label: 'YELLOW WATCH',
        };
      case 'purple':
        return {
          bg: 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] border-[var(--m-accent)]/45',
          dot: 'bg-[var(--m-accent)]',
          label: 'ADVISORY',
        };
      default:
        return {
          bg: 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35',
          dot: 'bg-[#22C7A0]',
          label: 'NORMAL',
        };
    }
  };

  const redCount = statesList.filter((s) => s.highestSeverity === 'red').length;
  const orangeCount = statesList.filter((s) => s.highestSeverity === 'orange').length;
  const yellowCount = statesList.filter((s) => s.highestSeverity === 'yellow').length;

  return (
    <DataPanel
      id="state-warning-watchlist-panel"
      className="flex flex-col justify-between gap-3.5 h-full"
    >
      <div className="flex flex-col gap-3">
        <SectionHeading
          title="State Warning Watchlist"
          subtitle="Subdivision early warning status (36 States & UTs)"
          icon={<MapPin className="w-4 h-4" />}
          action={
            <div className="flex items-center gap-1.5 font-mono tabular-nums text-[10px]">
              <span className="px-2 py-0.5 rounded font-bold bg-[var(--m-danger-soft)] text-[var(--m-danger)] border border-[var(--m-danger)]/35">
                {isUnavailable ? '—' : redCount} Red
              </span>
              <span className="px-2 py-0.5 rounded font-bold bg-[var(--m-alert-soft)] text-[var(--m-alert)] border border-[var(--m-alert)]/35">
                {isUnavailable ? '—' : orangeCount} Org
              </span>
              <span className="px-2 py-0.5 rounded font-bold bg-[var(--m-watch-soft)] text-[var(--m-watch)] border border-[var(--m-watch)]/35">
                {isUnavailable ? '—' : yellowCount} Yel
              </span>
            </div>
          }
        />

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--m-text-muted)] pointer-events-none" />
            <input
              id="input-watchlist-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search state or hazard..."
              className="w-full min-h-[38px] pl-8 pr-8 py-1.5 bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg text-xs text-[var(--m-text-primary)] placeholder-[var(--m-text-muted)] focus:outline-none focus:border-[var(--m-accent)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] cursor-pointer"
                aria-label="Clear state filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            id="select-watchlist-severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | 'all')}
            className="min-h-[38px] bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--m-text-primary)] focus:outline-none focus:border-[var(--m-accent)] cursor-pointer"
          >
            <option value="all">All ({statesList.length})</option>
            <option value="red">Red ({isUnavailable ? '—' : redCount})</option>
            <option value="orange">Orange ({isUnavailable ? '—' : orangeCount})</option>
            <option value="yellow">Yellow ({isUnavailable ? '—' : yellowCount})</option>
            <option value="purple">Advisory</option>
            <option value="green">Normal</option>
          </select>
        </div>
      </div>

      {activeFocusedState && (
        <div
          id="watchlist-focused-state-card"
          className="p-3 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-accent)]/45 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-[var(--m-accent)] shrink-0" />
              <span className="text-xs font-bold text-[var(--m-text-primary)] uppercase tracking-tight truncate">
                {activeFocusedState.stateName}
              </span>
              <span className="text-[10px] text-[var(--m-text-muted)] font-mono shrink-0">
                ({activeFocusedState.capital})
              </span>
            </div>
            {(() => {
              const badge = getSeverityBadge(activeFocusedState.highestSeverity);
              return (
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${badge.bg}`}
                >
                  {badge.label}
                </span>
              );
            })()}
          </div>

          <p className="text-[11px] text-[var(--m-text-secondary)] leading-snug line-clamp-2">
            {activeFocusedState.bulletinHeadline}
          </p>

          <div className="flex items-center justify-between text-[10px] text-[var(--m-text-muted)] pt-1.5 border-t border-[var(--m-border)]">
            <span className="truncate max-w-[180px] font-mono">
              Station: {activeFocusedState.representativeStation}
            </span>
            {onOpenStateDrawer && (
              <button
                type="button"
                onClick={() => onOpenStateDrawer(activeFocusedState)}
                className="text-[var(--m-accent)] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer shrink-0"
              >
                <span>Full Advisory</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      <div
        id="watchlist-states-scroll"
        className="flex-1 overflow-y-auto max-h-[380px] sm:max-h-[420px] pr-1 space-y-1.5"
      >
        {filteredStates.length === 0 ? (
          <div className="text-center py-8 text-[var(--m-text-muted)] text-xs">
            No states match filter criteria.
          </div>
        ) : (
          filteredStates.map((st) => {
            const isSelected =
              selectedState &&
              (selectedState.toLowerCase() === st.stateName.toLowerCase() ||
                selectedState.toLowerCase() === st.stateCode.toLowerCase() ||
                selectedState.toLowerCase().includes(st.stateName.toLowerCase()));
            const badge = getSeverityBadge(st.highestSeverity);

            return (
              <button
                key={st.stateCode}
                type="button"
                id={`watchlist-item-${st.stateCode}`}
                onClick={() => onSelectState(st.stateName, st.stateCode)}
                className={`w-full text-left p-2.5 min-h-[46px] rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-2.5 ${
                  isSelected
                    ? 'bg-[var(--m-surface-2)] border-[var(--m-accent)]'
                    : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] hover:border-[var(--m-border-strong)]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2 h-2 rounded-sm shrink-0 ${badge.dot}`} />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[var(--m-text-primary)] truncate flex items-center gap-1.5">
                      <span>{st.stateName}</span>
                      {st.activeCount > 0 && !isUnavailable && (
                        <span className="text-[10px] font-mono text-[var(--m-text-muted)] font-normal tabular-nums">
                          ({st.activeCount} alert{st.activeCount > 1 ? 's' : ''})
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--m-text-muted)] truncate">
                      {st.primaryHazardLabel} · {st.capital}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider whitespace-nowrap ${badge.bg}`}
                  >
                    {badge.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[var(--m-text-muted)]" />
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="pt-2.5 border-t border-[var(--m-border)] flex items-center justify-between text-[10px] text-[var(--m-text-muted)]">
        <SourceStatus
          status={isUnavailable ? 'UNAVAILABLE' : warnings.length > 0 ? 'LIVE' : 'ALL_CLEAR'}
          source="SACHET / IMD Registry"
        />
        <span className="font-mono tabular-nums">36 States &amp; UTs</span>
      </div>
    </DataPanel>
  );
};
