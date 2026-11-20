import React, { useState, useMemo } from 'react';
import { GitCompare, ShieldCheck, Activity } from 'lucide-react';
import { NWPModelDataset } from '../../types/nwp';
import { alignModelComparison } from '../../services/nwp/nwpNormalizer';
import { DataPanel, SectionHeading, UnavailableState } from '../ui/ObservatoryPrimitives';

interface ModelComparisonProps {
  dataset?: NWPModelDataset;
}

interface AgreementRow {
  variable: string;
  spread: number | null;
  level: 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT_DATA';
  availableModels: string[];
}

export const ModelComparison: React.FC<ModelComparisonProps> = ({ dataset }) => {
  const [selectedLeadHour, setSelectedLeadHour] = useState<number>(0);

  const wrfRun = dataset?.models.WRF;
  const gefsRun = dataset?.models.GEFS;
  const ecmwfRun = dataset?.models.ECMWF;

  const comparisonRows = useMemo(
    () => alignModelComparison(wrfRun?.points || [], gefsRun?.points || [], ecmwfRun?.points || []),
    [wrfRun, gefsRun, ecmwfRun]
  );

  const comparisonHours = [
    { label: 'NOW', lead: 0 },
    { label: '+6H', lead: 6 },
    { label: '+12H', lead: 12 },
    { label: '+24H', lead: 24 },
    { label: '+48H', lead: 48 },
  ];

  const currentRow = comparisonRows.find((r) => r.leadHours === selectedLeadHour) || comparisonRows[0];

  const agreements: AgreementRow[] = useMemo(() => {
    if (!currentRow) return [];

    const availableTemps: { model: string; val: number }[] = [];
    const availableRains: { model: string; val: number }[] = [];
    const availableWinds: { model: string; val: number }[] = [];

    if (typeof currentRow.wrf?.temperature2m === 'number') availableTemps.push({ model: 'WRF', val: currentRow.wrf.temperature2m });
    if (typeof currentRow.gefs?.temperature2m === 'number') availableTemps.push({ model: 'GEFS', val: currentRow.gefs.temperature2m });
    if (typeof currentRow.ecmwf?.temperature2m === 'number') availableTemps.push({ model: 'ECMWF', val: currentRow.ecmwf.temperature2m });

    if (typeof currentRow.wrf?.precipitation === 'number') availableRains.push({ model: 'WRF', val: currentRow.wrf.precipitation });
    if (typeof currentRow.gefs?.precipitation === 'number') availableRains.push({ model: 'GEFS', val: currentRow.gefs.precipitation });
    if (typeof currentRow.ecmwf?.precipitation === 'number') availableRains.push({ model: 'ECMWF', val: currentRow.ecmwf.precipitation });

    if (typeof currentRow.wrf?.windSpeed10m === 'number') availableWinds.push({ model: 'WRF', val: currentRow.wrf.windSpeed10m });
    if (typeof currentRow.gefs?.windSpeed10m === 'number') availableWinds.push({ model: 'GEFS', val: currentRow.gefs.windSpeed10m });
    if (typeof currentRow.ecmwf?.windSpeed10m === 'number') availableWinds.push({ model: 'ECMWF', val: currentRow.ecmwf.windSpeed10m });

    const tempVals = availableTemps.map((t) => t.val);
    const tempSpread = tempVals.length > 1 ? Math.round((Math.max(...tempVals) - Math.min(...tempVals)) * 10) / 10 : null;
    const tempLevel: AgreementRow['level'] =
      tempSpread === null ? 'INSUFFICIENT_DATA' : tempSpread <= 1.5 ? 'HIGH' : tempSpread <= 3.5 ? 'MODERATE' : 'LOW';

    const rainVals = availableRains.map((r) => r.val);
    const rainSpread = rainVals.length > 1 ? Math.round((Math.max(...rainVals) - Math.min(...rainVals)) * 10) / 10 : null;
    const rainLevel: AgreementRow['level'] =
      rainSpread === null ? 'INSUFFICIENT_DATA' : rainSpread <= 1.0 ? 'HIGH' : rainSpread <= 4.0 ? 'MODERATE' : 'LOW';

    const windVals = availableWinds.map((w) => w.val);
    const windSpread = windVals.length > 1 ? Math.round((Math.max(...windVals) - Math.min(...windVals)) * 10) / 10 : null;
    const windLevel: AgreementRow['level'] =
      windSpread === null ? 'INSUFFICIENT_DATA' : windSpread <= 5.0 ? 'HIGH' : windSpread <= 12.0 ? 'MODERATE' : 'LOW';

    return [
      {
        variable: 'Temperature',
        spread: tempSpread,
        level: tempLevel,
        availableModels: availableTemps.map((t) => t.model),
      },
      {
        variable: 'Rainfall',
        spread: rainSpread,
        level: rainLevel,
        availableModels: availableRains.map((r) => r.model),
      },
      {
        variable: 'Wind',
        spread: windSpread,
        level: windLevel,
        availableModels: availableWinds.map((w) => w.model),
      },
    ];
  }, [currentRow]);

  const tempSpread = gefsRun?.ensembleStats?.tempSpread;

  return (
    <div className="flex flex-col gap-5 w-full">
      <DataPanel className="flex flex-col gap-4">
        <SectionHeading
          title="Compare Model Guidance"
          subtitle="Side-by-side evaluation of WRF (Regional), GEFS (Ensemble), and ECMWF (Global)"
          icon={<GitCompare className="w-4 h-4" />}
          action={
            <div className="flex items-center gap-1 bg-[var(--m-surface-inset)] p-1 rounded-lg border border-[var(--m-border)] text-xs font-mono">
              {comparisonHours.map((opt) => (
                <button
                  key={opt.lead}
                  type="button"
                  onClick={() => setSelectedLeadHour(opt.lead)}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs font-medium ${
                    selectedLeadHour === opt.lead
                      ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)] font-semibold'
                      : 'text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          }
        />

        <div className="w-full overflow-x-auto rounded-xl border border-[var(--m-border)] bg-[var(--m-surface-inset)] no-scrollbar">
          <table className="w-full text-left text-xs border-collapse font-mono tabular-nums">
            <thead className="bg-[var(--m-surface-1)] text-[10px] uppercase tracking-wider text-[var(--m-text-muted)] border-b border-[var(--m-border)]">
              <tr>
                <th className="py-2.5 px-4">Parameter</th>
                <th className="py-2.5 px-4 text-center">WRF (Regional)</th>
                <th className="py-2.5 px-4 text-center">GEFS (Ensemble)</th>
                <th className="py-2.5 px-4 text-center">ECMWF (Global)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--m-border-strong)] text-[var(--m-text-secondary)]">
              <tr className="hover:bg-[var(--m-surface-3)]/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-[var(--m-text-primary)]">Temperature</td>
                <td className="py-3 px-4 text-center font-bold text-[var(--m-text-muted)]">
                  {currentRow?.wrf?.temperature2m !== undefined ? `${currentRow.wrf.temperature2m}°C` : '—'}
                </td>
                <td className="py-3 px-4 text-center font-bold text-[var(--m-watch)]">
                  {currentRow?.gefs?.temperature2m !== undefined ? `${currentRow.gefs.temperature2m}°C` : 'Unavailable'}
                </td>
                <td className="py-3 px-4 text-center font-bold text-[var(--m-watch)]">
                  {currentRow?.ecmwf?.temperature2m !== undefined ? `${currentRow.ecmwf.temperature2m}°C` : 'Unavailable'}
                </td>
              </tr>

              <tr className="hover:bg-[var(--m-surface-3)]/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-[var(--m-text-primary)]">Rainfall</td>
                <td className="py-3 px-4 text-center font-bold text-[var(--m-text-muted)]">
                  {currentRow?.wrf?.precipitation !== undefined ? `${currentRow.wrf.precipitation} mm` : '—'}
                </td>
                <td className="py-3 px-4 text-center font-bold text-[var(--m-ok)]">
                  {currentRow?.gefs?.precipitation !== undefined ? `${currentRow.gefs.precipitation} mm` : 'Unavailable'}
                </td>
                <td className="py-3 px-4 text-center font-bold text-[var(--m-ok)]">
                  {currentRow?.ecmwf?.precipitation !== undefined ? `${currentRow.ecmwf.precipitation} mm` : 'Unavailable'}
                </td>
              </tr>

              <tr className="hover:bg-[var(--m-surface-3)]/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-[var(--m-text-primary)]">Wind (10m)</td>
                <td className="py-3 px-4 text-center font-bold text-[var(--m-text-muted)]">
                  {currentRow?.wrf?.windSpeed10m !== undefined ? `${currentRow.wrf.windSpeed10m} km/h` : '—'}
                </td>
                <td className="py-3 px-4 text-center font-bold text-[var(--m-accent)]">
                  {currentRow?.gefs?.windSpeed10m !== undefined ? `${currentRow.gefs.windSpeed10m} km/h` : 'Unavailable'}
                </td>
                <td className="py-3 px-4 text-center font-bold text-[var(--m-accent)]">
                  {currentRow?.ecmwf?.windSpeed10m !== undefined ? `${currentRow.ecmwf.windSpeed10m} km/h` : 'Unavailable'}
                </td>
              </tr>

              <tr className="hover:bg-[var(--m-surface-3)]/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-[var(--m-text-primary)]">Pressure (MSL)</td>
                <td className="py-3 px-4 text-center font-bold text-[var(--m-text-muted)]">
                  {currentRow?.wrf?.pressureMSL !== undefined ? `${currentRow.wrf.pressureMSL} hPa` : '—'}
                </td>
                <td className="py-3 px-4 text-center font-bold text-[#C4B5FD]">
                  {currentRow?.gefs?.pressureMSL !== undefined ? `${currentRow.gefs.pressureMSL} hPa` : 'Unavailable'}
                </td>
                <td className="py-3 px-4 text-center font-bold text-[#C4B5FD]">
                  {currentRow?.ecmwf?.pressureMSL !== undefined ? `${currentRow.ecmwf.pressureMSL} hPa` : 'Unavailable'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </DataPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DataPanel className="flex flex-col justify-between gap-3">
          <SectionHeading
            title="Inter-Model Agreement"
            subtitle="Calculated from live model guidance at selected lead time"
            icon={<ShieldCheck className="w-4 h-4" />}
          />

          <div className="flex flex-col gap-2.5">
            {agreements.length > 0 ? (
              agreements.map((ag) => {
                const badgeClass =
                  ag.level === 'HIGH'
                    ? 'bg-[var(--m-ok-soft)] border-[var(--m-ok)]/35 text-[var(--m-ok)]'
                    : ag.level === 'MODERATE'
                    ? 'bg-[var(--m-watch-soft)] border-[var(--m-watch)]/35 text-[var(--m-watch)]'
                    : ag.level === 'LOW'
                    ? 'bg-[var(--m-danger-soft)] border-[var(--m-danger)]/35 text-[var(--m-danger)]'
                    : 'bg-[var(--m-text-muted)]/12 border-[var(--m-border-strong)] text-[var(--m-text-secondary)]';

                return (
                  <div
                    key={ag.variable}
                    className="m-panel-inset p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--m-text-primary)]">{ag.variable}</span>
                      <span className="text-[11px] text-[var(--m-text-muted)] font-mono tabular-nums">
                        {ag.spread !== null
                          ? `Spread: ${ag.spread} ${ag.variable === 'Temperature' ? '°C' : ag.variable === 'Rainfall' ? 'mm' : 'km/h'} (${ag.availableModels.join(' vs ')})`
                          : `Single model only (${ag.availableModels.join(', ') || 'None'})`}
                      </span>
                    </div>

                    <span className={`px-2.5 py-1 rounded-md border text-[10px] font-mono font-bold shrink-0 ${badgeClass}`}>
                      {ag.level === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT DATA' : `${ag.level} AGREEMENT`}
                    </span>
                  </div>
                );
              })
            ) : (
              <UnavailableState
                title="Comparison Points Unavailable"
                reason="At least two active model runs are required to compute inter-model spread."
              />
            )}
          </div>

          <p className="text-[11px] text-[var(--m-text-muted)]">
            Agreement requires at least two active models reporting valid output at the chosen lead hour.
          </p>
        </DataPanel>

        <DataPanel className="flex flex-col justify-between gap-3">
          <SectionHeading
            title="Forecast Uncertainty"
            subtitle="NOAA GEFS 24h ensemble spread"
            icon={<Activity className="w-4 h-4" />}
          />

          {tempSpread ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-4 gap-2 font-mono tabular-nums">
                <div className="p-2.5 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-center">
                  <span className="text-[10px] uppercase text-[var(--m-text-muted)] block">Mean</span>
                  <span className="text-sm font-bold text-[var(--m-text-primary)]">{tempSpread.mean}°C</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-center">
                  <span className="text-[10px] uppercase text-[var(--m-text-muted)] block">Min</span>
                  <span className="text-sm font-bold text-[var(--m-accent)]">{tempSpread.min}°C</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-center">
                  <span className="text-[10px] uppercase text-[var(--m-text-muted)] block">Max</span>
                  <span className="text-sm font-bold text-[var(--m-watch)]">{tempSpread.max}°C</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-center">
                  <span className="text-[10px] uppercase text-[var(--m-text-muted)] block">Spread</span>
                  <span className="text-sm font-bold text-[var(--m-ok)]">
                    {Math.round((tempSpread.max - tempSpread.min) * 10) / 10}°C
                  </span>
                </div>
              </div>

              <div className="m-panel-inset p-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                  <span className="text-[var(--m-text-secondary)]">24h Thermal Dispersion:</span>
                  <span className="text-[var(--m-text-primary)] font-bold">
                    {Math.round((tempSpread.max - tempSpread.min) * 10) / 10}°C Spread
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-md bg-[var(--m-surface-1)] border border-[var(--m-border)] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--m-accent)] via-[#22C7A0] to-[#F59E0B]"
                    style={{ width: `${Math.min(Math.max((tempSpread.max - tempSpread.min) * 12, 16), 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <UnavailableState
              title="Ensemble Spread Unavailable"
              reason="NOAA GEFS ensemble spread metrics are currently unavailable for this coordinate."
            />
          )}

          <p className="text-[11px] text-[var(--m-text-muted)]">
            Low ensemble spread indicates higher synoptic predictability across perturbed trajectories.
          </p>
        </DataPanel>
      </div>
    </div>
  );
};
