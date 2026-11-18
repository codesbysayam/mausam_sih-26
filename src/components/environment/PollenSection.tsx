import React, { useState } from 'react';
import {
  Flower2,
  Wind,
  Droplets,
  Sun,
  Stethoscope,
} from 'lucide-react';
import { CurrentWeather } from '../../types';
import {
  DataPanel,
  SectionHeading,
  SourceStatus,
  UnavailableState,
} from '../ui/ObservatoryPrimitives';

interface PollenSectionProps {
  weather: CurrentWeather;
}

export const PollenSection: React.FC<PollenSectionProps> = ({ weather }) => {
  const hasPollen =
    typeof weather.pollenCount === 'number' &&
    !Number.isNaN(weather.pollenCount) &&
    weather.pollenCount > 0;
  const pollenCount = hasPollen ? weather.pollenCount! : 0;
  const [selectedAllergen, setSelectedAllergen] = useState<number>(0);

  const getPollenAdvisory = (level: number, available: boolean) => {
    if (!available) {
      return {
        rating: 'Unavailable',
        color: '#8295A8',
        badgeClass: 'bg-[#08131F] text-[#8295A8] border-[#26394B]',
        description: 'Bio-pollen spore telemetry is not currently available for this station.',
        healthAdvice: 'Monitor local surface wind and humidity conditions before prolonged outdoor exertion.',
        sensitiveGroups: 'Follow routine seasonal allergy prophylaxis if sensitive to airborne dust.',
      };
    }
    if (level <= 1) {
      return {
        rating: 'Very Low',
        color: '#22C7A0',
        badgeClass: 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35',
        description: 'Bio-aerosol concentrations are minimal. Negligible allergic risk for general population.',
        healthAdvice: 'Suitable for outdoor cardiovascular exercise, gardening, and natural ventilation.',
        sensitiveGroups: 'Low aero-allergen burden for asthma and seasonal rhinitis patients.',
      };
    }
    if (level === 2) {
      return {
        rating: 'Low to Moderate',
        color: '#35C7E8',
        badgeClass: 'bg-[#35C7E8]/12 text-[#7DD3FC] border-[#35C7E8]/35',
        description: 'Low botanical pollen dispersion with minor background spore presence.',
        healthAdvice: 'Safe for most outdoor activities. Hypersensitive individuals should wash eyes/face after long exposure.',
        sensitiveGroups: 'Mild allergic rhinitis patients may experience occasional sneezing during morning peak hours.',
      };
    }
    if (level === 3) {
      return {
        rating: 'Moderate Risk',
        color: '#F59E0B',
        badgeClass: 'bg-[#F59E0B]/12 text-[#FCD34D] border-[#F59E0B]/35',
        description: 'Elevated aero-allergen counts driven by diurnal winds and warm afternoon temperatures.',
        healthAdvice: 'Keep vehicle windows closed when driving. Consider HEPA-filtered air purifiers indoors.',
        sensitiveGroups: 'Asthmatic patients and contact lens wearers should carry prescribed inhalers.',
      };
    }
    if (level === 4) {
      return {
        rating: 'High Risk',
        color: '#F97316',
        badgeClass: 'bg-[#F97316]/12 text-[#FDBA74] border-[#F97316]/35',
        description: 'Substantial pollen discharge from anemophilous weeds and flowering grasses.',
        healthAdvice: 'Limit strenuous outdoor workouts between 06:00 and 10:00 IST. Shower after returning indoors.',
        sensitiveGroups: 'Allergic bronchitis and rhinitis patients should follow prophylactic medication plans.',
      };
    }
    return {
      rating: 'Severe / Very High',
      color: '#EF4444',
      badgeClass: 'bg-[#EF4444]/12 text-[#FCA5A5] border-[#EF4444]/35',
      description: 'Extreme bio-allergen saturation with high bronchospasm trigger potential.',
      healthAdvice: 'Stay indoors with closed windows. Use N95 respiratory protection outdoors.',
      sensitiveGroups: 'High medical vigilance required for pediatric and geriatric COPD/asthma patients.',
    };
  };

  const currentAdvisory = getPollenAdvisory(pollenCount, hasPollen);
  const hasHumidity = typeof weather.humidity === 'number' && !Number.isNaN(weather.humidity);
  const hasWind = typeof weather.windSpeed === 'number' && !Number.isNaN(weather.windSpeed);
  const hasUv = typeof weather.uvIndex === 'number' && !Number.isNaN(weather.uvIndex);

  const pollenTypes = [
    {
      name: 'Grass Pollen (Poaceae)',
      level: !hasPollen ? '—' : pollenCount > 3 ? 'High' : 'Moderate',
      badgeClass: !hasPollen
        ? 'bg-[#0B1927] text-[#8295A8] border-[#26394B]'
        : pollenCount > 3
        ? 'bg-[#F97316]/12 text-[#FDBA74] border-[#F97316]/35'
        : 'bg-[#F59E0B]/12 text-[#FCD34D] border-[#F59E0B]/35',
      species: 'Cynodon dactylon, Poaceae species',
      peakHours: '06:00 – 10:00 IST',
      telemetryNote: hasPollen ? `Index Tier ${pollenCount}/5` : 'Species telemetry unavailable',
    },
    {
      name: 'Tree Pollen (Arboreal)',
      level: !hasPollen ? '—' : pollenCount >= 4 ? 'Moderate' : 'Low',
      badgeClass: !hasPollen
        ? 'bg-[#0B1927] text-[#8295A8] border-[#26394B]'
        : pollenCount >= 4
        ? 'bg-[#F59E0B]/12 text-[#FCD34D] border-[#F59E0B]/35'
        : 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35',
      species: 'Azadirachta, Acacia, Eucalyptus',
      peakHours: '11:00 – 15:00 IST',
      telemetryNote: hasPollen ? `Index Tier ${pollenCount}/5` : 'Species telemetry unavailable',
    },
    {
      name: 'Weed Pollen (Asteraceae)',
      level: !hasPollen ? '—' : pollenCount > 2 ? 'Moderate' : 'Low',
      badgeClass: !hasPollen
        ? 'bg-[#0B1927] text-[#8295A8] border-[#26394B]'
        : pollenCount > 2
        ? 'bg-[#F59E0B]/12 text-[#FCD34D] border-[#F59E0B]/35'
        : 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35',
      species: 'Parthenium hysterophorus, Amaranthus',
      peakHours: '08:00 – 12:00 IST',
      telemetryNote: hasPollen ? `Index Tier ${pollenCount}/5` : 'Species telemetry unavailable',
    },
    {
      name: 'Mold & Fungal Spores',
      level: !hasHumidity ? '—' : weather.humidity! > 75 ? 'Elevated RH' : 'Low',
      badgeClass: !hasHumidity
        ? 'bg-[#0B1927] text-[#8295A8] border-[#26394B]'
        : weather.humidity! > 75
        ? 'bg-[#F59E0B]/12 text-[#FCD34D] border-[#F59E0B]/35'
        : 'bg-[#22C7A0]/12 text-[#6EE7B7] border-[#22C7A0]/35',
      species: 'Alternaria, Cladosporium, Aspergillus',
      peakHours: 'Evening humid periods',
      telemetryNote: hasHumidity ? `RH ${Math.round(weather.humidity!)}% condition` : 'Spore telemetry unavailable',
    },
  ];

  return (
    <DataPanel className="flex flex-col gap-4">
      <SectionHeading
        title="Aero-Allergen & Bio-Pollen Surveillance"
        subtitle="Botanical dispersion index and respiratory exposure context"
        icon={<Flower2 className="w-4 h-4" />}
        badge={
          <SourceStatus
            status={hasPollen ? 'LIVE' : 'UNAVAILABLE'}
            labelOverride={hasPollen ? 'INDEX AVAILABLE' : 'INDEX UNAVAILABLE'}
            source="Environmental Dispersion Model"
          />
        }
      />

      {!hasPollen ? (
        <UnavailableState
          title="Live Bio-Pollen Count Unavailable"
          reason="Verified airborne pollen concentration (1–5 scale) is not reported by the active atmospheric stream. Species grain counts are withheld rather than estimated."
          source="Open-Meteo Air Quality / Aero-Allergen Feed"
        />
      ) : (
        <div
          id="pollen-concentration-indicator"
          className="m-panel-inset p-4 flex flex-col md:flex-row gap-4 items-stretch"
        >
          <div className="w-full md:w-52 shrink-0 bg-[#0B1927] p-4 rounded-xl border border-[#26394B] flex flex-col justify-between items-center text-center tabular-nums">
            <span className="text-[11px] uppercase tracking-wider font-mono font-semibold text-[#8295A8]">
              Pollen Index
            </span>

            <div className="my-3 flex flex-col items-center justify-center">
              <div
                className="w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center"
                style={{ borderColor: currentAdvisory.color }}
              >
                <span className="font-mono text-3xl font-bold text-[#F3F6FA]">
                  {pollenCount}
                </span>
                <span className="text-[10px] font-mono text-[#8295A8] -mt-0.5">of 5</span>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded-md border font-mono text-[10px] font-semibold uppercase tracking-wider ${currentAdvisory.badgeClass}`}
            >
              {currentAdvisory.rating}
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-between gap-3 text-xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Stethoscope className="w-4 h-4 text-[#35C7E8]" />
                <h3 className="font-semibold text-[#F3F6FA] text-sm">
                  Clinical Aero-Allergen Advisory
                </h3>
              </div>
              <p className="text-[#B5C3D1] leading-relaxed">{currentAdvisory.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-[#0B1927] p-3 rounded-lg border border-[#26394B]">
              <div>
                <span className="text-[10px] uppercase font-mono font-semibold text-[#35C7E8] block mb-0.5">
                  General Population
                </span>
                <p className="text-[#B5C3D1] leading-relaxed">{currentAdvisory.healthAdvice}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono font-semibold text-[#FCD34D] block mb-0.5">
                  Asthma &amp; Allergy Sensitive
                </span>
                <p className="text-[#B5C3D1] leading-relaxed">{currentAdvisory.sensitiveGroups}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-[#B5C3D1] pt-1 tabular-nums">
              <div className="flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-[#35C7E8]" />
                <span>
                  Wind: <strong className="text-[#F3F6FA]">{hasWind ? `${Math.round(weather.windSpeed!)} km/h` : '—'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-[#22C7A0]" />
                <span>
                  RH: <strong className="text-[#F3F6FA]">{hasHumidity ? `${Math.round(weather.humidity!)}%` : '—'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-[#FCD34D]" />
                <span>
                  UV: <strong className="text-[#F3F6FA]">{hasUv ? `${weather.uvIndex}/10` : '—'}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botanical Species Risk Breakdown (no fabricated grain counts) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {pollenTypes.map((p, idx) => (
          <button
            type="button"
            key={p.name}
            onClick={() => setSelectedAllergen(idx)}
            className={`text-left p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-colors m-focus-ring ${
              selectedAllergen === idx
                ? 'bg-[#101F2E] border-[#35C7E8]'
                : 'bg-[#08131F] border-[#26394B] hover:border-[#38536A]'
            }`}
          >
            <div>
              <div className="flex justify-between items-start gap-2 mb-1.5">
                <span className="font-semibold text-[#F3F6FA] text-xs leading-snug">{p.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded border font-mono text-[10px] font-semibold uppercase shrink-0 ${p.badgeClass}`}
                >
                  {p.level}
                </span>
              </div>
              <div className="text-[11px] text-[#8295A8] line-clamp-1">{p.species}</div>
              <div className="text-[11px] text-[#7DD3FC] font-mono mt-1.5">{p.telemetryNote}</div>
            </div>

            <div className="mt-3 pt-2 border-t border-[#26394B] text-[10px] font-mono text-[#8295A8] flex justify-between">
              <span>Peak Window</span>
              <span className="text-[#F3F6FA] tabular-nums">{p.peakHours}</span>
            </div>
          </button>
        ))}
      </div>
    </DataPanel>
  );
};
