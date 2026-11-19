import React from 'react';
import {
  Sun,
  Moon,
  CloudMoon,
  CloudSun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudFog,
  CloudSnow,
  Wind,
  Haze,
} from 'lucide-react';
import { CentralWeatherCondition } from '../services/weatherConditions';

export type ConditionCategory =
  | 'clear_day'
  | 'clear_night'
  | 'partly_cloudy_day'
  | 'partly_cloudy_night'
  | 'cloudy'
  | 'overcast'
  | 'rain'
  | 'heavy_rain'
  | 'drizzle'
  | 'thunderstorm'
  | 'fog'
  | 'mist'
  | 'snow'
  | 'heat'
  | 'dust';

export interface WeatherVisualConfig {
  category: ConditionCategory;
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
  iconColor: string;
  bgGradient: string;
  badgeBg: string;
  badgeText: string;
  description: string;
}

/**
 * Normalizes any condition and day/night state into an unambiguous visual category
 */
export function categorizeCondition(
  rawCondition?: string,
  isDay = true,
  conditionKey?: CentralWeatherCondition
): ConditionCategory {
  if (conditionKey) {
    switch (conditionKey) {
      case 'CLEAR_DAY':
        return 'clear_day';
      case 'CLEAR_NIGHT':
        return 'clear_night';
      case 'PARTLY_CLOUDY_DAY':
        return 'partly_cloudy_day';
      case 'PARTLY_CLOUDY_NIGHT':
        return 'partly_cloudy_night';
      case 'CLOUDY':
        return 'cloudy';
      case 'FOG':
        return 'fog';
      case 'DRIZZLE':
        return 'drizzle';
      case 'RAIN':
        return 'rain';
      case 'HEAVY_RAIN':
        return 'heavy_rain';
      case 'THUNDERSTORM':
        return 'thunderstorm';
      case 'SNOW':
        return 'snow';
      case 'SLEET':
      case 'FREEZING_RAIN':
        return 'rain';
      case 'UNKNOWN':
      default:
        break;
    }
  }

  if (!rawCondition) {
    return isDay ? 'partly_cloudy_day' : 'partly_cloudy_night';
  }

  const c = rawCondition.toLowerCase();
  const nightDetected = !isDay || c.includes('night');

  if (c.includes('thunder') || c.includes('lightning') || c.includes('storm')) return 'thunderstorm';
  if (c.includes('heavy rain') || c.includes('downpour') || c.includes('torrential')) return 'heavy_rain';
  if (c.includes('drizzle') || c.includes('light rain') || c.includes('patchy rain')) return 'drizzle';
  if (c.includes('rain') || c.includes('shower') || c.includes('monsoon')) return 'rain';
  if (c.includes('snow') || c.includes('blizzard') || c.includes('sleet')) return 'snow';
  if (c.includes('fog') || c.includes('dense fog')) return 'fog';
  if (c.includes('mist') || c.includes('haze') || c.includes('smoke')) return 'mist';
  if (c.includes('dust') || c.includes('sand')) return 'dust';
  if (c.includes('overcast') || c.includes('heavy cloud')) return 'overcast';
  if (c.includes('partly') || c.includes('scattered') || c.includes('few clouds')) {
    return nightDetected ? 'partly_cloudy_night' : 'partly_cloudy_day';
  }
  if (c.includes('cloud')) return 'cloudy';
  if (c.includes('clear') || c.includes('sunny') || c.includes('fair')) {
    return nightDetected ? 'clear_night' : 'clear_day';
  }
  if (c.includes('heat') || c.includes('hot')) return 'heat';

  return nightDetected ? 'clear_night' : 'clear_day';
}

/**
 * Returns complete visual styling configuration for a given condition and time-of-day
 */
export function getWeatherVisualConfig(
  condition?: string,
  isDay = true,
  conditionKey?: CentralWeatherCondition
): WeatherVisualConfig {
  const category = categorizeCondition(condition, isDay, conditionKey);

  switch (category) {
    case 'clear_night':
      return {
        category,
        icon: Moon,
        iconColor: 'text-[#B47A00]',
        bgGradient: 'from-[var(--m-accent-soft)] via-[var(--m-surface-1)] to-transparent',
        badgeBg: 'bg-[var(--m-accent-soft)] border-[var(--m-accent)]/35',
        badgeText: 'text-[var(--m-accent)]',
        description: 'Clear Night & Unobstructed Celestial Visibility',
      };

    case 'clear_day':
      return {
        category,
        icon: Sun,
        iconColor: 'text-[#C28400]',
        bgGradient: 'from-[var(--m-watch-soft)] via-[var(--m-surface-1)] to-transparent',
        badgeBg: 'bg-[var(--m-watch-soft)] border-[var(--m-watch)]/35',
        badgeText: 'text-[var(--m-watch)]',
        description: 'Clear Skies & Optimal Solar Radiation',
      };

    case 'partly_cloudy_night':
      return {
        category,
        icon: CloudMoon,
        iconColor: 'text-[var(--m-accent)]',
        bgGradient: 'from-[var(--m-surface-2)] via-[var(--m-surface-1)] to-transparent',
        badgeBg: 'bg-[var(--m-surface-2)] border-[var(--m-border-strong)]',
        badgeText: 'text-[var(--m-text-primary)]',
        description: 'Scattered Cloud Cover at Night',
      };

    case 'partly_cloudy_day':
      return {
        category,
        icon: CloudSun,
        iconColor: 'text-[var(--m-accent)]',
        bgGradient: 'from-[var(--m-accent-soft)] via-[var(--m-surface-1)] to-transparent',
        badgeBg: 'bg-[var(--m-accent-soft)] border-[var(--m-accent)]/35',
        badgeText: 'text-[var(--m-accent)]',
        description: 'Scattered Cloud Cover & Stable Boundary Layer',
      };

    case 'cloudy':
      return {
        category,
        icon: Cloud,
        iconColor: 'text-[var(--m-text-secondary)]',
        bgGradient: 'from-[var(--m-surface-2)] via-[var(--m-surface-1)] to-transparent',
        badgeBg: 'bg-[var(--m-surface-2)] border-[var(--m-border-strong)]',
        badgeText: 'text-[var(--m-text-secondary)]',
        description: 'Broken Stratocumulus Deck',
      };

    case 'overcast':
      return {
        category,
        icon: Cloud,
        iconColor: 'text-[var(--m-text-secondary)]',
        bgGradient: 'from-[var(--m-surface-2)] via-[var(--m-surface-1)] to-transparent',
        badgeBg: 'bg-[var(--m-surface-2)] border-[var(--m-border-strong)]',
        badgeText: 'text-[var(--m-text-primary)]',
        description: 'Overcast Stratus Deck',
      };

    case 'drizzle':
      return {
        category,
        icon: CloudDrizzle,
        iconColor: 'text-[var(--m-accent)]',
        bgGradient: 'from-[var(--m-accent-soft)] via-[var(--m-surface-1)] to-transparent',
        badgeBg: 'bg-[var(--m-accent-soft)] border-[var(--m-accent)]/35',
        badgeText: 'text-[var(--m-accent)]',
        description: 'Light Intermittent Drizzle',
      };

    case 'rain':
      return {
        category,
        icon: CloudRain,
        iconColor: 'text-[var(--m-accent)]',
        bgGradient: 'from-[var(--m-accent-soft)] via-[var(--m-surface-1)] to-transparent',
        badgeBg: 'bg-[var(--m-accent-soft)] border-[var(--m-accent)]/40',
        badgeText: 'text-[var(--m-accent)]',
        description: 'Active Synoptic Precipitation',
      };

    case 'heavy_rain':
      return {
        category,
        icon: CloudRain,
        iconColor: 'text-[var(--m-accent)]',
        bgGradient: 'from-[var(--m-accent-soft)] via-[var(--m-surface-2)] to-transparent',
        badgeBg: 'bg-[var(--m-accent-soft)] border-[var(--m-accent)]/45',
        badgeText: 'text-[var(--m-accent)]',
        description: 'Torrential Convective Downpour',
      };

    case 'thunderstorm':
      return {
        category,
        icon: CloudLightning,
        iconColor: 'text-[var(--m-warn)]',
        bgGradient: 'from-[var(--m-warn-soft)] via-[var(--m-surface-1)] to-transparent',
        badgeBg: 'bg-[var(--m-warn-soft)] border-[var(--m-warn)]/45',
        badgeText: 'text-[var(--m-warn)]',
        description: 'Convective Mesoscale Thunderstorm Cells',
      };

    case 'fog':
      return {
        category,
        icon: CloudFog,
        iconColor: 'text-[var(--m-text-secondary)]',
        bgGradient: 'from-[var(--m-surface-2)] via-[var(--m-surface-1)] to-transparent',
        badgeBg: 'bg-[var(--m-surface-2)] border-[var(--m-border-strong)]',
        badgeText: 'text-[var(--m-text-primary)]',
        description: 'Surface Inversion & Reduced Horizontal Visibility',
      };

    case 'mist':
      return {
        category,
        icon: Haze,
        iconColor: 'text-[var(--m-text-secondary)]',
        bgGradient: 'from-[var(--m-surface-2)] via-[var(--m-surface-1)] to-transparent',
        badgeBg: 'bg-[var(--m-surface-2)] border-[var(--m-border-strong)]',
        badgeText: 'text-[var(--m-text-primary)]',
        description: 'Shallow Atmospheric Mist / Haze Layer',
      };

    case 'snow':
      return {
        category,
        icon: CloudSnow,
        iconColor: 'text-[var(--m-accent)]',
        bgGradient: 'from-[var(--m-accent-soft)] via-[var(--m-surface-1)] to-transparent',
        badgeBg: 'bg-[var(--m-accent-soft)] border-[var(--m-accent)]/35',
        badgeText: 'text-[var(--m-accent)]',
        description: 'Cryospheric Frozen Precipitation',
      };

    case 'heat':
      return {
        category,
        icon: Sun,
        iconColor: 'text-[var(--m-danger)]',
        bgGradient: 'from-[var(--m-danger-soft)] via-[var(--m-surface-1)] to-transparent',
        badgeBg: 'bg-[var(--m-danger-soft)] border-[var(--m-danger)]/40',
        badgeText: 'text-[var(--m-danger)]',
        description: 'High Thermal Heatwave Conditions',
      };

    case 'dust':
      return {
        category,
        icon: Wind,
        iconColor: 'text-[var(--m-warn)]',
        bgGradient: 'from-[var(--m-warn-soft)] via-[var(--m-surface-1)] to-transparent',
        badgeBg: 'bg-[var(--m-warn-soft)] border-[var(--m-warn)]/40',
        badgeText: 'text-[var(--m-warn)]',
        description: 'Airborne Dust Suspension & Gusty Surface Winds',
      };

    default:
      return {
        category: 'partly_cloudy_day',
        icon: CloudSun,
        iconColor: 'text-[var(--m-accent)]',
        bgGradient: 'from-[var(--m-accent-soft)] via-[var(--m-surface-1)] to-transparent',
        badgeBg: 'bg-[var(--m-accent-soft)] border-[var(--m-accent)]/35',
        badgeText: 'text-[var(--m-accent)]',
        description: 'Normal Synoptic Conditions',
      };
  }
}
