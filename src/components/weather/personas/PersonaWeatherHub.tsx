import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LocationRecord } from '../../../types';
import { WeatherDataBundle } from '../../../services/weatherService';
import { authoritativeClient, PersonaDataBundle } from '../../../services/authoritativeService';
import { HealthCard } from './HealthCard';
import { FitnessCard } from './FitnessCard';
import { BeachSurferCard } from './BeachSurferCard';
import { TravelerCard } from './TravelerCard';
import { FamilyCommuteCard } from './FamilyCommuteCard';
import { AgriGardenCard } from './AgriGardenCard';
import { CommuterCard } from './CommuterCard';
import { EventPlannerCard } from './EventPlannerCard';
import { SkeletonMetricCard } from '../../common/Skeletons';
import {
  DataPanel,
  SectionHeading,
  SourceStatus,
  UnavailableState,
} from '../../ui/ObservatoryPrimitives';
import {
  ShieldCheck,
  RefreshCw,
  LayoutGrid,
  HeartPulse,
  Footprints,
  Waves,
  Luggage,
  Users,
  Sprout,
  Car,
  Calendar,
} from 'lucide-react';

interface PersonaWeatherHubProps {
  selectedLocation: LocationRecord;
  weatherBundle: WeatherDataBundle;
}

type PersonaFilter =
  | 'all'
  | 'health'
  | 'fitness'
  | 'beach'
  | 'travel'
  | 'family'
  | 'agri'
  | 'commute'
  | 'events';

export const PersonaWeatherHub: React.FC<PersonaWeatherHubProps> = ({
  selectedLocation,
  weatherBundle,
}) => {
  const [activeFilter, setActiveFilter] = useState<PersonaFilter>('all');
  const [bundle, setBundle] = useState<PersonaDataBundle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const bootTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bundleRef = useRef<PersonaDataBundle | null>(null);
  bundleRef.current = bundle;

  const loadPersonaData = useCallback(
    async (forceRefresh = false) => {
      if (forceRefresh) setIsRefreshing(true);
      else if (!bundleRef.current) setIsLoading(true);
      setFetchError(null);

      if (bootTimeoutRef.current) clearTimeout(bootTimeoutRef.current);
      bootTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        setIsRefreshing(false);
        if (!bundleRef.current) {
          setFetchError('Authoritative persona feed timed out.');
        }
      }, 8000);

      try {
        const cur = weatherBundle.current;
        const data = await authoritativeClient.getPersonaBundle(
          selectedLocation,
          {
            temp: cur.temp,
            humidity: cur.humidity,
            windSpeed: cur.windSpeed,
            windDir: cur.windDirection,
            uvIndex: cur.uvIndex,
            isRaining:
              cur.condition?.toLowerCase().includes('rain') ||
              cur.condition?.toLowerCase().includes('shower') ||
              cur.condition?.toLowerCase().includes('drizzle'),
            visibilityKm: cur.visibilityKm ?? cur.visibility ?? null,
            sunrise: cur.sunrise,
            sunset: cur.sunset,
          },
          forceRefresh
        );
        if (bootTimeoutRef.current) clearTimeout(bootTimeoutRef.current);
        setBundle(data);
        setFetchError(null);
        setLastRefreshedAt(new Date());
      } catch (err: any) {
        if (bootTimeoutRef.current) clearTimeout(bootTimeoutRef.current);
        console.error('Failed to load persona data bundle:', err);
        setFetchError(err?.message || 'Unable to load sector persona telemetry.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedLocation, weatherBundle.current]
  );

  useEffect(() => {
    loadPersonaData();
    return () => {
      if (bootTimeoutRef.current) clearTimeout(bootTimeoutRef.current);
    };
  }, [selectedLocation.id, loadPersonaData]);

  const filterTabs: Array<{
    id: PersonaFilter;
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'all', label: 'All Sectors', Icon: LayoutGrid },
    { id: 'health', label: 'Health & Air', Icon: HeartPulse },
    { id: 'fitness', label: 'Outdoor Fitness', Icon: Footprints },
    { id: 'beach', label: 'Beach & Surf', Icon: Waves },
    { id: 'travel', label: 'Travelers', Icon: Luggage },
    { id: 'family', label: 'Family Transit', Icon: Users },
    { id: 'agri', label: 'Agriculture', Icon: Sprout },
    { id: 'commute', label: 'Commuters', Icon: Car },
    { id: 'events', label: 'Event Planners', Icon: Calendar },
  ];

  const updatedStr = lastRefreshedAt
    ? lastRefreshedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST'
    : null;

  return (
    <DataPanel
      id="authoritative-persona-hub"
      className="mb-4 space-y-4"
    >
      <SectionHeading
        title="Sector & Persona Atmospheric Intelligence"
        subtitle={`Calibrated air quality, marine, transit, and agromet feeds for ${selectedLocation.displayName || selectedLocation.city}`}
        icon={<ShieldCheck className="w-4 h-4 text-[#22C7A0]" />}
        badge={
          <SourceStatus
            status={isLoading && !bundle ? 'LOADING' : fetchError && !bundle ? 'UNAVAILABLE' : 'LIVE'}
            updatedAt={updatedStr}
          />
        }
        action={
          <button
            type="button"
            onClick={() => loadPersonaData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-lg bg-[#08131F] hover:bg-[#101F2E] text-xs text-[#35C7E8] border border-[#26394B] transition-colors font-semibold disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Feeds'}</span>
          </button>
        }
      />

      {/* Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[#26394B]">
        {filterTabs.map(({ id, label, Icon }) => {
          const isActive = activeFilter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveFilter(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border cursor-pointer ${
                isActive
                  ? 'bg-[#0B72B9] text-[#F3F6FA] border-[#35C7E8]'
                  : 'bg-[#08131F] hover:bg-[#101F2E] text-[#8295A8] hover:text-[#F3F6FA] border-[#26394B]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {isLoading && !bundle ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonMetricCard />
          <SkeletonMetricCard />
          <SkeletonMetricCard />
          <SkeletonMetricCard />
        </div>
      ) : fetchError && !bundle ? (
        <UnavailableState
          title="Persona Feeds Temporarily Unavailable"
          reason={fetchError}
          source="/api/weather?mode=bundle"
          onRetry={() => loadPersonaData(true)}
        />
      ) : bundle ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {(activeFilter === 'all' || activeFilter === 'health') && (
            <div className="h-full">
              <HealthCard
                aqi={bundle.health.aqi}
                pollen={bundle.health.pollen}
                uvIndex={bundle.health.uvIndex}
                uvRiskLabel={bundle.health.uvRiskLabel}
                uvAdvice={bundle.health.uvAdvice}
                humidity={bundle.health.humidity}
                ambientTemp={weatherBundle.current.temp}
                city={selectedLocation.city}
              />
            </div>
          )}

          {(activeFilter === 'all' || activeFilter === 'fitness') && (
            <div className="h-full">
              <FitnessCard
                sunrise={bundle.fitness.sunrise}
                sunset={bundle.fitness.sunset}
                bestRunningHours={bundle.fitness.bestRunningHours}
                workoutSuitability={bundle.fitness.workoutSuitability}
                heatAlertActive={bundle.fitness.heatAlertActive}
                heatAlertMessage={bundle.fitness.heatAlertMessage}
                windSpeedKmh={bundle.fitness.windSpeedKmh}
                windDirection={bundle.fitness.windDirection}
                hydrationRateMlHour={bundle.fitness.hydrationRateMlHour}
                thermalStressLevel={bundle.fitness.thermalStressLevel}
                city={selectedLocation.city}
              />
            </div>
          )}

          {(activeFilter === 'all' || activeFilter === 'beach') && (
            <div className="h-full">
              <BeachSurferCard
                isCoastal={bundle.beachAndSurf.isCoastal}
                tides={bundle.beachAndSurf.tides}
                marine={bundle.beachAndSurf.marine}
                city={selectedLocation.city}
              />
            </div>
          )}

          {(activeFilter === 'all' || activeFilter === 'travel') && (
            <div className="h-full">
              <TravelerCard
                activeAlerts={bundle.travel.activeAlerts}
                packingSuggestions={bundle.travel.packingSuggestions}
                travelSafetyRating={bundle.travel.travelSafetyRating}
                city={selectedLocation.city}
                state={selectedLocation.state}
                lat={selectedLocation.lat}
                lng={selectedLocation.lng}
              />
            </div>
          )}

          {(activeFilter === 'all' || activeFilter === 'family') && (
            <div className="h-full">
              <FamilyCommuteCard
                morningCommuteStatus={bundle.familyCommute.morningCommuteStatus}
                eveningCommuteStatus={bundle.familyCommute.eveningCommuteStatus}
                morningWindow={bundle.familyCommute.morningWindow}
                eveningWindow={bundle.familyCommute.eveningWindow}
                rainExpectedDuringCommute={bundle.familyCommute.rainExpectedDuringCommute}
                commuteRainSummary={bundle.familyCommute.commuteRainSummary}
                schoolBusSafetyNote={bundle.familyCommute.schoolBusSafetyNote}
                severeWarnings={bundle.familyCommute.severeWarnings}
                city={selectedLocation.city}
              />
            </div>
          )}

          {(activeFilter === 'all' || activeFilter === 'agri') && (
            <div className="h-full">
              <AgriGardenCard
                soilMoisturePercent={bundle.agriculture.soilMoisturePercent}
                soilMoistureStatus={bundle.agriculture.soilMoistureStatus}
                threeDayRainfallTotalMm={bundle.agriculture.threeDayRainfallTotalMm}
                frostAlertActive={bundle.agriculture.frostAlertActive}
                frostAlertMessage={bundle.agriculture.frostAlertMessage}
                currentCropSeason={bundle.agriculture.currentCropSeason}
                seasonalPlantingTip={bundle.agriculture.seasonalPlantingTip}
                irrigationRecommendation={bundle.agriculture.irrigationRecommendation}
                city={selectedLocation.city}
                state={selectedLocation.state}
              />
            </div>
          )}

          {(activeFilter === 'all' || activeFilter === 'commute') && (
            <div className="h-full">
              <CommuterCard
                roadCondition={bundle.commuter.roadCondition}
                roadSafetyIndex={bundle.commuter.roadSafetyIndex}
                roadSafetyLabel={bundle.commuter.roadSafetyLabel}
                visibilityKm={bundle.commuter.visibilityKm}
                visibilityStatus={bundle.commuter.visibilityStatus}
                travelHazards={bundle.commuter.travelHazards}
                city={selectedLocation.city}
              />
            </div>
          )}

          {(activeFilter === 'all' || activeFilter === 'events') && (
            <div className="h-full lg:col-span-2">
              <EventPlannerCard
                extendedForecast={bundle.eventPlanner.extendedForecast}
                comfortIndexToday={bundle.eventPlanner.comfortIndexToday}
                comfortCategoryToday={bundle.eventPlanner.comfortCategoryToday}
                eventRecommendation={bundle.eventPlanner.eventRecommendation}
                city={selectedLocation.city}
              />
            </div>
          )}
        </div>
      ) : null}
    </DataPanel>
  );
};
