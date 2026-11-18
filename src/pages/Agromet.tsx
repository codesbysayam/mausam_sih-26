import React, { useState, useMemo, useEffect } from 'react';
import {
  INDIAN_STATES_AND_DISTRICTS,
  getExtendedAgrometBulletin,
  ExtendedAgrometBulletin,
} from '../services/agrometService';
import { WeatherDataBundle } from '../services/weatherService';
import { LocationRecord } from '../types';
import { LocatingPhase } from '../services/geolocationService';
import { CropType, PhenologicalStage } from '../services/agronomicEngine';

import { AgriculturalWeatherStatusPanel } from '../components/agromet/AgriculturalWeatherStatusPanel';
import { AgrometCommandHeader } from '../components/agromet/AgrometCommandHeader';
import { FarmStatusOverview } from '../components/agromet/FarmStatusOverview';
import { TodaysFarmActionCenter } from '../components/agromet/TodaysFarmActionCenter';
import { WeatherCropResponse7Day } from '../components/agromet/WeatherCropResponse7Day';
import { CropIntelligenceCard } from '../components/agromet/CropIntelligenceCard';
import { CropStageTimeline } from '../components/agromet/CropStageTimeline';
import { WeatherCropRiskRadar } from '../components/agromet/WeatherCropRiskRadar';
import { AgriculturalTimeline72h } from '../components/agromet/AgriculturalTimeline72h';
import { IrrigationIntelligenceCommand } from '../components/agromet/IrrigationIntelligenceCommand';
import { SprayingWindowAnalyzer } from '../components/agromet/SprayingWindowAnalyzer';
import { BioticRiskMonitor } from '../components/agromet/BioticRiskMonitor';
import { OfficialAgrometAdvisories } from '../components/agromet/OfficialAgrometAdvisories';
import { FieldOperationsCalendarGrid } from '../components/agromet/FieldOperationsCalendarGrid';
import { NearestObservationNetwork } from '../components/agromet/NearestObservationNetwork';
import { AgrometDataProvenanceFooter } from '../components/agromet/AgrometDataProvenanceFooter';

interface AgrometPageProps {
  weatherBundle?: WeatherDataBundle;
  selectedLocation?: LocationRecord;
  onNavigateToTab?: (tab: string) => void;
  onDetectLocation?: (forceRefresh?: boolean) => Promise<any>;
  isLocating?: boolean;
  locatePhase?: LocatingPhase;
  locationSource?: 'DEVICE_GPS' | 'MANUAL_SEARCH';
  onOpenLocationCenter?: () => void;
}

export const AgrometPage: React.FC<AgrometPageProps> = ({
  weatherBundle,
  selectedLocation,
  onDetectLocation,
  isLocating = false,
  onOpenLocationCenter,
}) => {
  const [selectedState, setSelectedState] = useState<string>(() => {
    if (selectedLocation?.state && INDIAN_STATES_AND_DISTRICTS[selectedLocation.state]) {
      return selectedLocation.state;
    }
    return 'Odisha';
  });

  const [selectedDistrict, setSelectedDistrict] = useState<string>(() => {
    const defaultDistricts = INDIAN_STATES_AND_DISTRICTS[selectedState] || [];
    if (selectedLocation?.district && defaultDistricts.includes(selectedLocation.district)) {
      return selectedLocation.district;
    }
    if (selectedLocation?.city && defaultDistricts.includes(selectedLocation.city)) {
      return selectedLocation.city;
    }
    return defaultDistricts[0] || 'Khordha (Bhubaneswar)';
  });

  useEffect(() => {
    if (selectedLocation?.state && INDIAN_STATES_AND_DISTRICTS[selectedLocation.state]) {
      setSelectedState(selectedLocation.state);
      const districts = INDIAN_STATES_AND_DISTRICTS[selectedLocation.state] || [];
      if (selectedLocation.district && districts.includes(selectedLocation.district)) {
        setSelectedDistrict(selectedLocation.district);
      } else if (selectedLocation.city && districts.includes(selectedLocation.city)) {
        setSelectedDistrict(selectedLocation.city);
      } else if (districts[0]) {
        setSelectedDistrict(districts[0]);
      }
    }
  }, [selectedLocation]);

  const [selectedCrop, setSelectedCrop] = useState<CropType>('Rice (Paddy)');
  const [selectedStage, setSelectedStage] = useState<PhenologicalStage>('Tillering');
  const [sowingDate, setSowingDate] = useState<Date>(() => new Date(Date.now() - 42 * 24 * 60 * 60 * 1000));

  const bulletin: ExtendedAgrometBulletin = useMemo(() => {
    return getExtendedAgrometBulletin(selectedState, selectedDistrict);
  }, [selectedState, selectedDistrict]);

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    const districts = INDIAN_STATES_AND_DISTRICTS[state] || [];
    setSelectedDistrict(districts[0] || '');
  };

  const handleDistrictChange = (district: string) => {
    setSelectedDistrict(district);
  };

  const isLive = typeof weatherBundle?.current?.temp === 'number';
  const lastUpdatedStr =
    weatherBundle?.current?.observationTimeFormatted ||
    weatherBundle?.current?.lastUpdated ||
    '';

  const stationName =
    weatherBundle?.current?.stationName ||
    `AMFU ${selectedDistrict} • IMD Agro-Met Node`;

  return (
    <div
      id="agromet-command-center-page"
      className="space-y-5 pb-20 max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-4"
    >
      <AgrometCommandHeader
        selectedState={selectedState}
        selectedDistrict={selectedDistrict}
        onStateChange={handleStateChange}
        onDistrictChange={handleDistrictChange}
        selectedCrop={selectedCrop}
        onCropChange={setSelectedCrop}
        selectedStage={selectedStage}
        onStageChange={setSelectedStage}
        lastUpdatedStr={lastUpdatedStr}
        stationName={stationName}
        isLive={isLive}
        sowingDate={sowingDate}
        onSowingDateChange={setSowingDate}
        selectedLocation={selectedLocation}
        isLocating={isLocating}
        onDetectLocation={onDetectLocation ? () => onDetectLocation(true) : undefined}
        onOpenLocationCenter={onOpenLocationCenter}
      />

      <AgriculturalWeatherStatusPanel
        weather={weatherBundle}
        district={selectedDistrict}
        state={selectedState}
      />

      <FarmStatusOverview
        weather={weatherBundle}
        selectedCrop={selectedCrop}
        selectedStage={selectedStage}
        lastUpdatedStr={lastUpdatedStr}
        stationName={stationName}
      />

      <TodaysFarmActionCenter
        weather={weatherBundle}
        selectedCrop={selectedCrop}
        selectedStage={selectedStage}
        district={selectedDistrict}
      />

      <WeatherCropResponse7Day
        weather={weatherBundle}
        selectedCrop={selectedCrop}
        selectedStage={selectedStage}
        district={selectedDistrict}
      />

      <CropIntelligenceCard
        weather={weatherBundle}
        selectedCrop={selectedCrop}
        selectedStage={selectedStage}
        district={selectedDistrict}
      />

      <CropStageTimeline
        selectedCrop={selectedCrop}
        selectedStage={selectedStage}
        onStageSelect={setSelectedStage}
        sowingDate={sowingDate}
      />

      <WeatherCropRiskRadar
        weather={weatherBundle}
        selectedCrop={selectedCrop}
        selectedStage={selectedStage}
        district={selectedDistrict}
      />

      <AgriculturalTimeline72h
        weather={weatherBundle}
        district={selectedDistrict}
      />

      <IrrigationIntelligenceCommand
        weather={weatherBundle}
        selectedCrop={selectedCrop}
        selectedStage={selectedStage}
        district={selectedDistrict}
      />

      <SprayingWindowAnalyzer
        weather={weatherBundle}
        selectedCrop={selectedCrop}
        selectedStage={selectedStage}
        district={selectedDistrict}
      />

      <BioticRiskMonitor
        weather={weatherBundle}
        selectedCrop={selectedCrop}
        selectedStage={selectedStage}
        district={selectedDistrict}
      />

      <OfficialAgrometAdvisories bulletin={bulletin} />

      <FieldOperationsCalendarGrid
        weather={weatherBundle}
        selectedCrop={selectedCrop}
        selectedStage={selectedStage}
        district={selectedDistrict}
      />

      <NearestObservationNetwork
        weather={weatherBundle}
        stateName={selectedState}
        districtName={selectedDistrict}
        lastUpdatedStr={lastUpdatedStr}
      />

      <AgrometDataProvenanceFooter
        lastUpdatedStr={lastUpdatedStr}
        stationName={stationName}
      />
    </div>
  );
};
