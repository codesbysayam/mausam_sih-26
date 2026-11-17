import React from 'react';
import { WeatherDataBundle } from '../services/weatherService';
import { LocationRecord } from '../types';
import { LocatingPhase } from '../services/geolocationService';
import { NWPWorkspace } from '../components/nwp/NWPWorkspace';
import { PrintReportHeader } from '../components/common/PrintReportHeader';

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
  onSelectLocation,
  onNavigateToTab,
  isLoadingWeather = false,
  onDetectLocation,
  isLocating = false,
  locationSource = 'MANUAL_SEARCH',
  onOpenLocationCenter,
}) => {
  return (
    <div
      id="forecast-view-container"
      className="flex flex-col gap-6 w-full max-w-[1520px] mx-auto text-[#F4F7FA]"
    >
      {/* Official Government Print Report Header (Printed documents only) */}
      <PrintReportHeader
        reportTitle="Numerical Weather Prediction & Synoptic Forecast Bulletin"
        reportSubtitle="India Meteorological Department • Multi-Model Atmospheric Simulation Suite (WRF / GEFS / ECMWF)"
        location={selectedLocation}
        lastUpdated={weatherBundle?.lastFetchedAt}
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
