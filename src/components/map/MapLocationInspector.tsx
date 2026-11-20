import React, { useEffect, useState } from 'react';
import { X, MapPin, Wind, Droplets, Gauge, Cloud, RefreshCw } from 'lucide-react';
import {
  OpenMeteoProvider,
  OpenMeteoCurrentWeather,
  OpenMeteoDailyForecast,
  OpenMeteoAirQuality,
} from '../../services/providers/openMeteoProvider';
import { RadarStation } from '../../types/radar';
import { StateWeatherData } from './IndiaWeatherMap';
import { formatTimestampIST } from '../../services/providers/providerStatus';
import { SourceStatus, ProvenanceStatus } from '../ui/ObservatoryPrimitives';
import { formatCoordinatePair } from '../../../shared/weatherContract';

export interface MapLocationInspectorProps {
  inspectedCoords: { lat: number; lng: number } | null;
  onClearInspectedCoords?: () => void;
  viewMode: 'synoptic' | 'radar';
  station?: RadarStation | null;
  stateData?: StateWeatherData | null;
  observationTime?: string;
  dataStatus?: 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE';
}

function fmtVal(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return `${value}${suffix}`;
}

export const MapLocationInspector: React.FC<MapLocationInspectorProps> = ({
  inspectedCoords,
  onClearInspectedCoords,
  viewMode,
  station,
  stateData,
  observationTime,
  dataStatus = 'RECENT',
}) => {
  const [pointWeather, setPointWeather] = useState<OpenMeteoCurrentWeather | null>(null);
  const [pointDaily, setPointDaily] = useState<OpenMeteoDailyForecast[]>([]);
  const [pointAqi, setPointAqi] = useState<OpenMeteoAirQuality | null>(null);
  const [isLoadingPoint, setIsLoadingPoint] = useState(false);
  const [pointError, setPointError] = useState<string | null>(null);

  const targetLat = inspectedCoords?.lat ?? (viewMode === 'radar' ? station?.latitude : undefined);
  const targetLng = inspectedCoords?.lng ?? (viewMode === 'radar' ? station?.longitude : undefined);

  useEffect(() => {
    if (typeof targetLat !== 'number' || typeof targetLng !== 'number') return;
    let cancelled = false;

    const loadPoint = async () => {
      setIsLoadingPoint(true);
      setPointError(null);
      try {
        const [wxRes, aqiRes] = await Promise.allSettled([
          OpenMeteoProvider.getWeather(targetLat, targetLng, true),
          OpenMeteoProvider.getAirQuality(targetLat, targetLng),
        ]);
        if (cancelled) return;

        if (wxRes.status === 'fulfilled' && wxRes.value.current) {
          setPointWeather(wxRes.value.current);
          setPointDaily(wxRes.value.daily.slice(0, 4));
        } else {
          setPointWeather(null);
          setPointDaily([]);
          setPointError('Point meteorology feed unavailable for these coordinates.');
        }

        if (aqiRes.status === 'fulfilled') {
          setPointAqi(aqiRes.value);
        } else {
          setPointAqi(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setPointError(err?.message || 'Unable to inspect coordinates.');
        }
      } finally {
        if (!cancelled) setIsLoadingPoint(false);
      }
    };

    loadPoint();
    return () => {
      cancelled = true;
    };
  }, [targetLat, targetLng]);

  const isRadar = viewMode === 'radar';
  const heading = inspectedCoords
    ? 'Inspected Map Point'
    : isRadar
    ? station?.name || 'Radar Station'
    : stateData?.name
    ? `${stateData.name} Regional Snapshot`
    : 'Location Inspector';

  const statusForBadge: ProvenanceStatus = isRadar ? dataStatus : 'REFERENCE';

  return (
    <aside
      aria-label="Map Location Inspector"
      className="m-panel p-4 flex flex-col gap-3.5 text-[var(--m-text-primary)] h-full"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[var(--m-border)]">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--m-text-muted)]">
            <MapPin className="w-3.5 h-3.5 text-[var(--m-accent)] shrink-0" />
            <span>{inspectedCoords ? 'Point Inspection' : isRadar ? station?.id || 'DWR' : 'Regional Reference'}</span>
          </div>
          <h3 className="text-sm font-bold text-[var(--m-text-primary)] mt-0.5 truncate">{heading}</h3>
          {typeof targetLat === 'number' && typeof targetLng === 'number' && (
            <div className="text-[11px] font-mono tabular-nums text-[var(--m-text-muted)] mt-0.5">
              {formatCoordinatePair(targetLat, targetLng, 3)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <SourceStatus status={statusForBadge} />
          {inspectedCoords && onClearInspectedCoords && (
            <button
              type="button"
              onClick={onClearInspectedCoords}
              className="w-8 h-8 rounded-lg bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-1)] border border-[var(--m-border)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] flex items-center justify-center cursor-pointer m-focus-ring"
              title="Clear custom map pin"
              aria-label="Clear custom map pin"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Live Point Meteorology (Open-Meteo) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold uppercase tracking-wider text-[var(--m-text-secondary)]">
            Point Conditions
          </span>
          <span className="font-mono text-[10px] text-[var(--m-accent)]">Open-Meteo Point Query</span>
        </div>

        {isLoadingPoint ? (
          <div className="p-3 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-xs text-[var(--m-text-muted)] flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--m-accent)]" />
            <span>Querying coordinates...</span>
          </div>
        ) : pointError ? (
          <div className="p-3 rounded-lg bg-[var(--m-surface-inset)] border border-[#F59E0B]/40 text-xs text-[#FCD34D]">
            {pointError}
          </div>
        ) : pointWeather ? (
          <div className="flex flex-col gap-2.5">
            <div className="p-3 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex items-baseline justify-between gap-2">
              <div>
                <div className="text-2xl font-bold font-mono tabular-nums text-[var(--m-text-primary)]">
                  {fmtVal(pointWeather.temperatureC, '°C')}
                </div>
                <div className="text-xs text-[var(--m-text-secondary)] mt-0.5">{pointWeather.condition || '—'}</div>
              </div>
              <div className="text-right text-[11px] text-[var(--m-text-muted)] font-mono tabular-nums">
                <div>Feels {fmtVal(pointWeather.feelsLikeC, '°C')}</div>
                <div className="mt-0.5">
                  {pointWeather.observedAt ? formatTimestampIST(pointWeather.observedAt).split(',')[0] : '—'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex items-center gap-2">
                <Wind className="w-3.5 h-3.5 text-[var(--m-accent)] shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-[var(--m-text-muted)]">Wind</div>
                  <div className="font-mono tabular-nums font-semibold text-[var(--m-text-primary)] truncate">
                    {fmtVal(pointWeather.windSpeedKmh, ' km/h')} {pointWeather.windDirection || ''}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex items-center gap-2">
                <Droplets className="w-3.5 h-3.5 text-[var(--m-accent)] shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-[var(--m-text-muted)]">Humidity / Rain</div>
                  <div className="font-mono tabular-nums font-semibold text-[var(--m-text-primary)] truncate">
                    {fmtVal(pointWeather.relativeHumidity, '%')} · {fmtVal(pointWeather.precipitationMm, ' mm')}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex items-center gap-2">
                <Gauge className="w-3.5 h-3.5 text-[var(--m-accent)] shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-[var(--m-text-muted)]">Pressure</div>
                  <div className="font-mono tabular-nums font-semibold text-[var(--m-text-primary)]">
                    {fmtVal(pointWeather.pressureHpa, ' hPa')}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] flex items-center gap-2">
                <Cloud className="w-3.5 h-3.5 text-[var(--m-accent)] shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-[var(--m-text-muted)]">Cloud / AQI</div>
                  <div className="font-mono tabular-nums font-semibold text-[var(--m-text-primary)] truncate">
                    {fmtVal(pointWeather.cloudCoverPercent, '%')} ·{' '}
                    {pointAqi?.aqi !== null && pointAqi?.aqi !== undefined ? `AQI ${pointAqi.aqi}` : 'AQI —'}
                  </div>
                </div>
              </div>
            </div>

            {pointDaily.length > 0 && (
              <div className="pt-1">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--m-text-muted)] mb-1.5">
                  Multi-Day Outlook (Point Forecast)
                </div>
                <div className="divide-y divide-[var(--m-border)] bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg px-2.5">
                  {pointDaily.map((d) => (
                    <div
                      key={d.date}
                      className="py-1.5 flex items-center justify-between text-[11px] gap-2"
                    >
                      <span className="font-medium text-[var(--m-text-primary)] w-16 shrink-0">{d.dayName}</span>
                      <span className="text-[var(--m-text-muted)] truncate flex-1">{d.condition}</span>
                      <span className="font-mono tabular-nums text-[var(--m-text-primary)] shrink-0">
                        {fmtVal(d.tempMinC, '°')} / {fmtVal(d.tempMaxC, '°')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-xs text-[var(--m-text-muted)]">
            Tap anywhere on the map to inspect local conditions and forecast.
          </div>
        )}
      </div>

      {/* Station or Regional Reference Context */}
      {isRadar && station ? (
        <div className="pt-2.5 border-t border-[var(--m-border)]">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold text-[var(--m-text-muted)] mb-1.5">
            <span>DWR Station Specs</span>
            <span className="font-mono text-[var(--m-text-secondary)]">{station.band.split(' ')[0]}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="p-2 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)]">
              <span className="text-[var(--m-text-muted)] block text-[10px]">Range</span>
              <span className="font-mono tabular-nums font-semibold">{station.maxRangeKm} km</span>
            </div>
            <div className="p-2 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)]">
              <span className="text-[var(--m-text-muted)] block text-[10px]">Elevation</span>
              <span className="font-mono tabular-nums font-semibold">
                {station.elevationM !== undefined && station.elevationM !== null ? `${station.elevationM} m` : '—'}
              </span>
            </div>
          </div>
        </div>
      ) : stateData ? (
        <div className="pt-2.5 border-t border-[var(--m-border)]">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold text-[var(--m-text-muted)] mb-1.5">
            <span>Regional Reference Baseline</span>
            <span className="font-mono text-[var(--m-text-muted)]">{stateData.updatedAt || 'Reference'}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)] grid grid-cols-2 gap-y-1 gap-x-2 text-[11px]">
            <span className="text-[var(--m-text-muted)]">
              Ref Temp: <strong className="text-[var(--m-text-primary)] font-mono tabular-nums">{fmtVal(stateData.temperature, '°C')}</strong>
            </span>
            <span className="text-[var(--m-text-muted)]">
              Ref Rain: <strong className="text-[var(--m-text-primary)] font-mono tabular-nums">{fmtVal(stateData.rainfall, ' mm')}</strong>
            </span>
            <span className="text-[var(--m-text-muted)]">
              Ref Wind: <strong className="text-[var(--m-text-primary)] font-mono tabular-nums">{fmtVal(stateData.windSpeed, ' km/h')}</strong>
            </span>
            <span className="text-[var(--m-text-muted)]">
              Ref AQI: <strong className="text-[var(--m-text-primary)] font-mono tabular-nums">{fmtVal(stateData.aqi)}</strong>
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-auto pt-2 border-t border-[var(--m-border)] text-[10px] text-[var(--m-text-muted)]">
        {observationTime
          ? `Overlay sweep: ${observationTime}`
          : 'Sources separated: Radar mosaic, Open-Meteo point query, and regional reference.'}
      </div>
    </aside>
  );
};

export default MapLocationInspector;
