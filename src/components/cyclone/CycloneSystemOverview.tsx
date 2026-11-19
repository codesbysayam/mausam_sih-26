import React from 'react';
import {
  Compass,
  Wind,
  Gauge,
  MapPin,
  ShieldCheck,
  Radio,
  Info,
} from 'lucide-react';
import { WeatherSystemEvent } from '../../types/cyclone';
import { DataPanel, MetricValue, SectionHeading } from '../ui/ObservatoryPrimitives';
import { formatCoordinatePair } from '../../../shared/weatherContract';

interface CycloneSystemOverviewProps {
  activeSystem: WeatherSystemEvent;
  hasActiveMarineCyclone: boolean;
}

export const CycloneSystemOverview: React.FC<CycloneSystemOverviewProps> = ({
  activeSystem,
  hasActiveMarineCyclone,
}) => {
  const isDissipated = activeSystem.status === 'DISSIPATED';
  const isInland = activeSystem.basin === 'Inland Central India';

  return (
    <div className="w-full flex flex-col gap-4">
      <DataPanel className="flex flex-col gap-3">
        <SectionHeading
          title="IMD 4-Stage Cyclone Warning Protocol"
          subtitle="National Weather Forecasting Centre (NWFC) escalation stages"
          icon={<Radio className="w-4 h-4" />}
          badge={
            <span className="text-[11px] font-mono text-[var(--m-ok)] inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {hasActiveMarineCyclone
                ? 'CYCLONIC STORM PROTOCOL ACTIVE'
                : 'STAGE 0 · ALL CLEAR SURVEILLANCE'}
            </span>
          }
          action={
            <span className="text-[11px] font-mono text-[var(--m-text-muted)]">
              {isInland
                ? 'Inland Synoptic Disturbance'
                : isDissipated
                ? 'Historical Archive'
                : 'Marine Basin Surveillance'}
            </span>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-lg border border-[var(--m-border)] bg-[var(--m-surface-inset)] flex flex-col gap-0.5">
            <span className="text-[10px] font-mono font-bold text-[var(--m-text-muted)] uppercase">
              Stage 1 (T-72h)
            </span>
            <span className="text-xs font-semibold text-[var(--m-text-primary)]">Pre-Cyclone Watch</span>
            <span className="text-[10px] text-[var(--m-text-muted)] font-mono mt-1">
              {hasActiveMarineCyclone ? 'Active' : 'Standby'}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-[var(--m-border)] bg-[var(--m-surface-inset)] flex flex-col gap-0.5">
            <span className="text-[10px] font-mono font-bold text-[var(--m-text-muted)] uppercase">
              Stage 2 (T-48h)
            </span>
            <span className="text-xs font-semibold text-[var(--m-text-primary)]">Cyclone Alert (Yellow)</span>
            <span className="text-[10px] text-[var(--m-text-muted)] font-mono mt-1">
              {hasActiveMarineCyclone ? 'Active' : 'Standby'}
            </span>
          </div>

          <div
            className={`p-3 rounded-lg border flex flex-col gap-0.5 ${
              hasActiveMarineCyclone
                ? 'border-[var(--m-danger)]/50 bg-[var(--m-danger-soft)]'
                : 'border-[var(--m-border)] bg-[var(--m-surface-inset)]'
            }`}
          >
            <span className="text-[10px] font-mono font-bold text-[var(--m-text-muted)] uppercase">
              Stage 3 (T-24h)
            </span>
            <span className="text-xs font-semibold text-[var(--m-text-primary)]">Cyclone Warning (Orange)</span>
            <span
              className={`text-[10px] font-mono mt-1 ${
                hasActiveMarineCyclone ? 'text-[var(--m-danger)] font-bold' : 'text-[var(--m-text-muted)]'
              }`}
            >
              {hasActiveMarineCyclone ? 'ACTIVE' : 'Standby'}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-[var(--m-border)] bg-[var(--m-surface-inset)] flex flex-col gap-0.5">
            <span className="text-[10px] font-mono font-bold text-[var(--m-text-muted)] uppercase">
              Stage 4 (T-12h)
            </span>
            <span className="text-xs font-semibold text-[var(--m-text-primary)]">Post-Landfall Outlook</span>
            <span className="text-[10px] text-[var(--m-text-muted)] font-mono mt-1">
              {isDissipated ? 'Concluded' : 'Standby'}
            </span>
          </div>
        </div>
      </DataPanel>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <DataPanel className="flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-[var(--m-accent)]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--m-text-muted)]">
              Position Fix
            </span>
            <MapPin className="w-4 h-4" />
          </div>
          <MetricValue
            label="Estimated Center"
            value={formatCoordinatePair(activeSystem.latitude, activeSystem.longitude, 1)}
            hint={activeSystem.currentLocation}
            valueClassName="text-base sm:text-lg font-bold text-[var(--m-text-primary)]"
          />
        </DataPanel>

        <DataPanel className="flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-[var(--m-alert)]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--m-text-muted)]">
              Wind Field
            </span>
            <Wind className="w-4 h-4" />
          </div>
          <MetricValue
            label="Sustained Wind Speed"
            value={activeSystem.maxSustainedWind || null}
            hint={`Peak gusts: ${activeSystem.windGust || '—'}`}
            valueClassName="text-base sm:text-lg font-bold text-[var(--m-text-primary)]"
          />
        </DataPanel>

        <DataPanel className="flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-[var(--m-accent)]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--m-text-muted)]">
              Barometry
            </span>
            <Gauge className="w-4 h-4" />
          </div>
          <MetricValue
            label="Central Pressure"
            value={activeSystem.pressure || null}
            hint={`Movement: ${activeSystem.movementDirection} at ${activeSystem.movementSpeed}`}
            valueClassName="text-base sm:text-lg font-bold text-[var(--m-text-primary)]"
          />
        </DataPanel>

        <DataPanel className="flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-[var(--m-ok)]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--m-text-muted)]">
              Classification
            </span>
            <Compass className="w-4 h-4" />
          </div>
          <MetricValue
            label="System Grade"
            value={activeSystem.classification}
            hint={activeSystem.expectedLandfall}
            valueClassName="text-base sm:text-lg font-bold text-[var(--m-text-primary)]"
          />
        </DataPanel>
      </div>

      {activeSystem.advisoryText && (
        <DataPanel variant="inset" className="flex items-start gap-2.5 text-xs text-[var(--m-text-secondary)]">
          <Info className="w-4 h-4 text-[var(--m-accent)] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[var(--m-text-primary)] font-mono uppercase mr-1.5">
              Official IMD Advisory:
            </strong>
            {activeSystem.advisoryText}
          </p>
        </DataPanel>
      )}
    </div>
  );
};
