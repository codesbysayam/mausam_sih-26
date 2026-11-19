import React, { useState } from 'react';
import { CurrentWeather, DailyForecastItem, HourlyForecastItem, WeatherAlert } from '../../types';
import { UserPersona, PERSONA_CONFIGS, buildHumanWeatherStory } from '../../services/humanWeatherEngine';
import {
  Users,
  Bike,
  Plane,
  Heart,
  Sprout,
  Car,
  CalendarDays,
  ArrowRight,
  Waves,
} from 'lucide-react';
import { DataPanel, SectionHeading } from '../ui/ObservatoryPrimitives';

interface HomePersonalizedHubProps {
  weather: CurrentWeather;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  alerts: WeatherAlert[];
  onNavigateToWeather?: () => void;
}

const PERSONA_ICONS: Record<UserPersona, React.FC<{ className?: string }>> = {
  general: Users,
  health: Heart,
  fitness: Bike,
  travel: Plane,
  family: Users,
  agriculture: Sprout,
  commuting: Car,
  events: CalendarDays,
  beach: Waves,
};

export const HomePersonalizedHub: React.FC<HomePersonalizedHubProps> = ({
  weather,
  hourly,
  daily,
  alerts,
  onNavigateToWeather,
}) => {
  const [activePersona, setActivePersona] = useState<UserPersona>('general');

  const story = buildHumanWeatherStory(weather, hourly, daily, alerts, activePersona);
  const activeConfig = PERSONA_CONFIGS[activePersona];
  const IconComponent = PERSONA_ICONS[activePersona] || Users;

  return (
    <DataPanel id="homepage-personalized-hub" className="flex flex-col gap-4">
      <SectionHeading
        title="Sector Decision Focus"
        subtitle="Calibrate meteorological thresholds across civil, transport, agricultural & coastal domains"
        icon={<Users className="w-4 h-4" />}
      />

      {/* Segmented Domain Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(Object.keys(PERSONA_CONFIGS) as UserPersona[]).map((pKey) => {
          const cfg = PERSONA_CONFIGS[pKey];
          const isSelected = activePersona === pKey;
          const PIcon = PERSONA_ICONS[pKey] || Users;

          return (
            <button
              key={pKey}
              type="button"
              onClick={() => setActivePersona(pKey)}
              className={`px-3 min-h-[36px] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer m-focus-ring border ${
                isSelected
                  ? 'bg-[#35C7E8] text-[#05101C] border-[var(--m-accent)]'
                  : 'bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] border-[var(--m-border)] hover:border-[var(--m-border-strong)]'
              }`}
            >
              <PIcon className="w-3.5 h-3.5" />
              <span>{cfg.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Active Sector Advice Card */}
      <div className="m-panel-inset p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-[var(--m-surface-2)] border border-[var(--m-border)] flex items-center justify-center text-[var(--m-accent)] shrink-0">
            <IconComponent className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-bold text-[var(--m-text-primary)]">
                {activeConfig.label}
              </span>
              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${story.personaAdvice.badgeColor}`}>
                {story.personaAdvice.badge}
              </span>
            </div>

            <div className="text-xs font-semibold text-[var(--m-accent)] mb-1">
              {story.personaAdvice.highlight}
            </div>

            <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed max-w-3xl">
              {story.personaAdvice.advice}
            </p>
          </div>
        </div>

        {onNavigateToWeather && (
          <button
            type="button"
            onClick={onNavigateToWeather}
            className="text-xs text-[var(--m-accent)] hover:text-[var(--m-accent)] font-semibold flex items-center gap-1.5 shrink-0 self-start md:self-auto cursor-pointer"
          >
            <span>Open Local Weather Detail</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </DataPanel>
  );
};

