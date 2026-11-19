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
            <span className="text-[11px] font-mono text-[#6EE7B7] inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {hasActiveMarineCyclone
                ? 'CYCLONIC STORM PROTOCOL ACTIVE'
                : 'STAGE 0 · ALL CLEAR SURVEILLANCE'}
            </span>
          }
          action={
            <span className="text-[11px] font-mono text-[#8295A8]">
              {isInland
                ? 'Inland Synoptic Disturbance'
                : isDissipated
                ? 'Historical Archive'
                : 'Marine Basin Surveillance'}
            </span>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-lg border border-[#26394B] bg-[#08131F] flex flex-col gap-0.5">
            <span className="text-[10px] font-mono font-bold text-[#8295A8] uppercase">
              Stage 1 (T-72h)
            </span>
            <span className="text-xs font-semibold text-[#F3F6FA]">Pre-Cyclone Watch</span>
            <span className="text-[10px] text-[#8295A8] font-mono mt-1">
              {hasActiveMarineCyclone ? 'Active' : 'Standby'}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-[#26394B] bg-[#08131F] flex flex-col gap-0.5">
            <span className="text-[10px] font-mono font-bold text-[#8295A8] uppercase">
              Stage 2 (T-48h)
            </span>
            <span className="text-xs font-semibold text-[#F3F6FA]">Cyclone Alert (Yellow)</span>
            <span className="text-[10px] text-[#8295A8] font-mono mt-1">
              {hasActiveMarineCyclone ? 'Active' : 'Standby'}
            </span>
          </div>

          <div
            className={`p-3 rounded-lg border flex flex-col gap-0.5 ${
              hasActiveMarineCyclone
                ? 'border-[#EF4444]/50 bg-[#EF4444]/10'
                : 'border-[#26394B] bg-[#08131F]'
            }`}
          >
            <span className="text-[10px] font-mono font-bold text-[#8295A8] uppercase">
              Stage 3 (T-24h)
            </span>
            <span className="text-xs font-semibold text-[#F3F6FA]">Cyclone Warning (Orange)</span>
            <span
              className={`text-[10px] font-mono mt-1 ${
                hasActiveMarineCyclone ? 'text-[#FCA5A5] font-bold' : 'text-[#8295A8]'
              }`}
            >
              {hasActiveMarineCyclone ? 'ACTIVE' : 'Standby'}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-[#26394B] bg-[#08131F] flex flex-col gap-0.5">
            <span className="text-[10px] font-mono font-bold text-[#8295A8] uppercase">
              Stage 4 (T-12h)
            </span>
            <span className="text-xs font-semibold text-[#F3F6FA]">Post-Landfall Outlook</span>
            <span className="text-[10px] text-[#8295A8] font-mono mt-1">
              {isDissipated ? 'Concluded' : 'Standby'}
            </span>
          </div>
        </div>
      </DataPanel>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <DataPanel className="flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-[#35C7E8]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8295A8]">
              Position Fix
            </span>
            <MapPin className="w-4 h-4" />
          </div>
          <MetricValue
            label="Estimated Center"
            value={formatCoordinatePair(activeSystem.latitude, activeSystem.longitude, 1)}
            hint={activeSystem.currentLocation}
            valueClassName="text-base sm:text-lg font-bold text-[#F3F6FA]"
          />
        </DataPanel>

        <DataPanel className="flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-[#FDBA74]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8295A8]">
              Wind Field
            </span>
            <Wind className="w-4 h-4" />
          </div>
          <MetricValue
            label="Sustained Wind Speed"
            value={activeSystem.maxSustainedWind || null}
            hint={`Peak gusts: ${activeSystem.windGust || '—'}`}
            valueClassName="text-base sm:text-lg font-bold text-[#F3F6FA]"
          />
        </DataPanel>

        <DataPanel className="flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-[#7DD3FC]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8295A8]">
              Barometry
            </span>
            <Gauge className="w-4 h-4" />
          </div>
          <MetricValue
            label="Central Pressure"
            value={activeSystem.pressure || null}
            hint={`Movement: ${activeSystem.movementDirection} at ${activeSystem.movementSpeed}`}
            valueClassName="text-base sm:text-lg font-bold text-[#F3F6FA]"
          />
        </DataPanel>

        <DataPanel className="flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-[#6EE7B7]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8295A8]">
              Classification
            </span>
            <Compass className="w-4 h-4" />
          </div>
          <MetricValue
            label="System Grade"
            value={activeSystem.classification}
            hint={activeSystem.expectedLandfall}
            valueClassName="text-base sm:text-lg font-bold text-[#F3F6FA]"
          />
        </DataPanel>
      </div>

      {activeSystem.advisoryText && (
        <DataPanel variant="inset" className="flex items-start gap-2.5 text-xs text-[#B5C3D1]">
          <Info className="w-4 h-4 text-[#35C7E8] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[#F3F6FA] font-mono uppercase mr-1.5">
              Official IMD Advisory:
            </strong>
            {activeSystem.advisoryText}
          </p>
        </DataPanel>
      )}
    </div>
  );
};
