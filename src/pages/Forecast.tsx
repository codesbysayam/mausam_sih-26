import React from 'react';
import { WeatherDataBundle } from '../services/weatherService';
import { LocationRecord } from '../types';
import { LocatingPhase } from '../services/geolocationService';
import { NWPWorkspace } from '../components/nwp/NWPWorkspace';
import { PrintReportHeader } from '../components/common/PrintReportHeader';
import { HourlyTemperatureTrendChart } from '../components/weather/HourlyTemperatureTrendChart';

interface ForecastPageProps {
  weatherBundle: WeatherDataBundle;
  selectedLocation: LocationRecord;
  onRefresh?: () => void;
  onSelectLocation?: (loc: LocationRecord) => void;
  onNavigateToTab?: (tab: string) => void;
  isLoadingWeather?: boolean;
  onDetectLocation?: (forceRefresh?: boolean) => Promise<any>;
  isLocating?: boolean;
  locatePhase?: LocatingPhase;
  locationSource?: 'DEVICE_GPS' | 'MANUAL_SEARCH';
  onOpenLocationCenter?: () => void;
}

export const ForecastPage: React.FC<ForecastPageProps> = ({
  weatherBundle,
  selectedLocation,
  onRefresh,
  isLocating = false,
  onDetectLocation,
  locationSource = 'MANUAL_SEARCH',
  onOpenLocationCenter,
}) => {
  return (
    <div
      id="forecast-view-container"
      className="flex flex-col gap-6 w-full max-w-[1520px] mx-auto text-[var(--m-text-primary)]"
    >
      {/* Official Government Print Report Header (Printed documents only) */}
      <PrintReportHeader
        reportTitle="Numerical Weather Prediction & Synoptic Forecast Bulletin"
        reportSubtitle="India Meteorological Department • Multi-Model Atmospheric Simulation Suite (WRF / GEFS / ECMWF)"
        location={selectedLocation}
        lastUpdated={weatherBundle?.lastFetchedAt}
      />

      {/* Recharts Hourly Temperature Trend Visualization */}
      <HourlyTemperatureTrendChart
        hourly={weatherBundle?.hourly || []}
        location={selectedLocation}
        source={weatherBundle?.current?.dataSource || weatherBundle?.current?.source || 'Open-Meteo Model Grid'}
        lastUpdated={(() => {
          const raw: unknown = weatherBundle?.current?.lastUpdated || weatherBundle?.lastFetchedAt;
          if (typeof raw === 'string') return raw;
          if (raw instanceof Date) return raw.toISOString();
          return undefined;
        })()}
      />

      {/* Complete Redesigned NWP Meteorological Workstation */}
      <NWPWorkspace
        location={selectedLocation}
        source={locationSource}
        isLocating={isLocating}
        onRefreshLocation={onRefresh}
        onOpenLocationCenter={onOpenLocationCenter}
        onDetectLocation={onDetectLocation ? () => onDetectLocation(true) : undefined}
      />
    </div>
  );
};

export default ForecastPage;
