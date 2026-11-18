/**
 * MAUSAM DESIGN SYSTEM TOKENS
 * Product: MAUSAM - Atmospheric Intelligence & Citizen Weather Platform
 * Human-designed, Indian atmospheric aesthetic with refined information hierarchy.
 */

export const MAUSAM_BRAND = {
  name: 'MAUSAM',
  tagline: 'Atmospheric Intelligence & Citizen Weather Platform',
  descriptor: 'Personalized Atmospheric & Environmental Intelligence for India',
} as const;

export const tokens = {
  colors: {
    // 1. Core Brand Colors
    primary: '#0B3D91', // Deep Government Blue
    primaryDark: '#062A63',
    primaryLight: '#E3F2FD', // Ice/Sky Blue
    secondary: '#1565C0', // Royal Blue

    // 2. Calibrated Weather Severity Colors
    severity: {
      normal: '#22C7A0',
      watch: '#F59E0B',
      alert: '#F97316',
      warning: '#EF4444',
    },

    // 3. Atmospheric States
    weather: {
      clear: '#F59E0B',
      sunny: '#F59E0B',
      cloudy: '#8295A8',
      rain: '#0B72B9',
      rainy: '#35C7E8',
      storm: '#F97316',
      snow: '#7DD3FC',
      fog: '#8295A8',
      mist: '#8295A8',
      heat: '#EF4444',
      cold: '#35C7E8',
      duststorm: '#F59E0B',
      unknown: '#8295A8',
    },

    // 4. Semantic Status System
    status: {
      good: '#22C7A0',     // Normal / Good AQI / Live
      warning: '#F59E0B',  // Watch / Moderate / Stale
      prepare: '#F97316',  // Alert / Poor AQI
      danger: '#EF4444',   // Warning / Red Alert / Error
      info: '#35C7E8',     // Telemetry Cyan
    },

    // 5. Canonical v3.0.0 Calibrated Observatory Dark Surfaces
    dark: {
      background: '#07111D',
      backgroundAlt: '#08131F',
      surface: '#0B1927',
      surfaceSecondary: '#101F2E',
      surfaceHover: '#172A3B',
      textPrimary: '#F3F6FA',
      textSecondary: '#B5C3D1',
      textMuted: '#8295A8',
      border: '#26394B',
      borderSubtle: 'rgba(38, 57, 75, 0.7)',
      borderHover: '#38536A',
    },

    // 6. Light Surfaces (Print & Export Palette)
    light: {
      background: '#F5F9FC',
      surface: '#FFFFFF',
      surfaceRaised: '#EEF4F9',
      textPrimary: '#172B4D',
      textSecondary: '#475569',
      textMuted: '#64748B',
      border: '#CBD5E1',
    },

    // 7. Atmospheric Gradients
    gradients: {
      daySky: 'linear-gradient(145deg, rgba(53, 199, 232, 0.08) 0%, #0B1927 100%)',
      sunset: 'linear-gradient(145deg, rgba(245, 158, 11, 0.10) 0%, #0B1927 100%)',
      night: 'linear-gradient(145deg, #101F2E 0%, #07111D 100%)',
      storm: 'linear-gradient(145deg, rgba(239, 68, 68, 0.10) 0%, #0B1927 100%)',
    },

    // 8. Spatial 3D Atmospheric Canvas & Floating HUD Tokens
    spatial: {
      canvasVoid: '#07111D',
      oceanBase: '#0B1927',
      landRelief: '#101F2E',
      hudSurface: 'rgba(11, 25, 39, 0.94)',
      hudSurfaceElevated: 'rgba(16, 31, 46, 0.97)',
      hudBorder: '#26394B',
      hudBorderStrong: '#38536A',
      primaryCyan: '#35C7E8',
      precipitationBlue: '#0B72B9',
      windTeal: '#22C7A0',
      clearGreen: '#22C7A0',
      watchAmber: '#F59E0B',
      alertOrange: '#F97316',
      severeRed: '#EF4444',
    },
  },

  typography: {
    fontFamily: "'IBM Plex Sans', 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    monoFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    display: 'font-display',
  },

  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    6: '24px',
    8: '32px',
    12: '48px',
    16: '64px',
  },

  radii: {
    button: '8px',
    card: '12px',
    panel: '14px',
    pill: '9999px',
  },
} as const;

export type WeatherVisualState = 
  | 'clear'
  | 'cloudy'
  | 'rainy'
  | 'storm'
  | 'snow'
  | 'fog'
  | 'heat'
  | 'cold'
  | 'unknown';

export interface VisualStateConfig {
  state: WeatherVisualState;
  label: string;
  icon: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  gradient: string;
  surfaceBg: string;
  ambientGlow: string;
}

export const WEATHER_VISUAL_CONFIGS: Record<WeatherVisualState, VisualStateConfig> = {
  clear: {
    state: 'clear',
    label: 'Clear Skies',
    icon: 'sunny',
    accentColor: tokens.colors.weather.clear,
    badgeBg: 'rgba(255, 200, 87, 0.12)',
    badgeText: '#FFC857',
    gradient: tokens.colors.gradients.daySky,
    surfaceBg: '#111C27',
    ambientGlow: 'rgba(255, 200, 87, 0.08)',
  },
  cloudy: {
    state: 'cloudy',
    label: 'Partly Cloudy',
    icon: 'partly_cloudy_day',
    accentColor: tokens.colors.weather.cloudy,
    badgeBg: 'rgba(147, 164, 184, 0.14)',
    badgeText: '#CBD5E1',
    gradient: 'linear-gradient(135deg, rgba(22, 35, 49, 0.8) 0%, #111C27 100%)',
    surfaceBg: '#111C27',
    ambientGlow: 'rgba(147, 164, 184, 0.06)',
  },
  rainy: {
    state: 'rainy',
    label: 'Rain Showers',
    icon: 'rainy',
    accentColor: tokens.colors.weather.rainy,
    badgeBg: 'rgba(20, 153, 232, 0.18)',
    badgeText: '#43C7F4',
    gradient: 'linear-gradient(135deg, rgba(20, 153, 232, 0.15) 0%, #111C27 100%)',
    surfaceBg: '#111C27',
    ambientGlow: 'rgba(20, 153, 232, 0.12)',
  },
  storm: {
    state: 'storm',
    label: 'Thunderstorm',
    icon: 'thunderstorm',
    accentColor: tokens.colors.weather.storm,
    badgeBg: 'rgba(239, 83, 80, 0.18)',
    badgeText: '#FF9F43',
    gradient: tokens.colors.gradients.storm,
    surfaceBg: '#162331',
    ambientGlow: 'rgba(239, 83, 80, 0.14)',
  },
  snow: {
    state: 'snow',
    label: 'Snow / Flurries',
    icon: 'ac_unit',
    accentColor: tokens.colors.weather.snow,
    badgeBg: 'rgba(67, 199, 244, 0.15)',
    badgeText: '#DCEEFB',
    gradient: 'linear-gradient(135deg, rgba(67, 199, 244, 0.15) 0%, #111C27 100%)',
    surfaceBg: '#111C27',
    ambientGlow: 'rgba(67, 199, 244, 0.10)',
  },
  fog: {
    state: 'fog',
    label: 'Dense Fog & Mist',
    icon: 'foggy',
    accentColor: tokens.colors.weather.fog,
    badgeBg: 'rgba(147, 164, 184, 0.16)',
    badgeText: '#E2E8F0',
    gradient: 'linear-gradient(135deg, rgba(22, 35, 49, 0.7) 0%, #111C27 100%)',
    surfaceBg: '#111C27',
    ambientGlow: 'rgba(147, 164, 184, 0.08)',
  },
  heat: {
    state: 'heat',
    label: 'Heatwave Alert',
    icon: 'local_fire_department',
    accentColor: tokens.colors.weather.heat,
    badgeBg: 'rgba(239, 83, 80, 0.18)',
    badgeText: '#EF5350',
    gradient: 'linear-gradient(135deg, rgba(239, 83, 80, 0.16) 0%, #111C27 100%)',
    surfaceBg: '#111C27',
    ambientGlow: 'rgba(239, 83, 80, 0.12)',
  },
  cold: {
    state: 'cold',
    label: 'Coldwave Advisory',
    icon: 'severe_cold',
    accentColor: tokens.colors.weather.cold,
    badgeBg: 'rgba(67, 199, 244, 0.16)',
    badgeText: '#43C7F4',
    gradient: 'linear-gradient(135deg, rgba(67, 199, 244, 0.14) 0%, #111C27 100%)',
    surfaceBg: '#111C27',
    ambientGlow: 'rgba(67, 199, 244, 0.10)',
  },
  unknown: {
    state: 'unknown',
    label: 'Observational',
    icon: 'thermostat',
    accentColor: tokens.colors.weather.unknown,
    badgeBg: 'rgba(147, 164, 184, 0.12)',
    badgeText: '#93A4B8',
    gradient: 'linear-gradient(135deg, #162331 0%, #071018 100%)',
    surfaceBg: '#111C27',
    ambientGlow: 'rgba(147, 164, 184, 0.05)',
  },
};

export function resolveVisualState(
  condition: string,
  weatherType: string,
  temp?: number,
  isRainingNow?: boolean
): VisualStateConfig {
  const c = (condition || '').toLowerCase();
  const t = (weatherType || '').toLowerCase();

  if (isRainingNow || t === 'rain' || c.includes('rain') || c.includes('drizzle') || c.includes('shower')) {
    if (t === 'thunderstorm' || c.includes('thunder') || c.includes('lightning') || c.includes('squall')) {
      return WEATHER_VISUAL_CONFIGS.storm;
    }
    return WEATHER_VISUAL_CONFIGS.rainy;
  }

  if (t === 'thunderstorm' || c.includes('thunder') || c.includes('storm')) {
    return WEATHER_VISUAL_CONFIGS.storm;
  }

  if (t === 'fog' || c.includes('fog') || c.includes('mist') || c.includes('haze')) {
    return WEATHER_VISUAL_CONFIGS.fog;
  }

  if (c.includes('snow') || c.includes('blizzard') || c.includes('ice')) {
    return WEATHER_VISUAL_CONFIGS.snow;
  }

  if (typeof temp === 'number' && temp >= 40) {
    return WEATHER_VISUAL_CONFIGS.heat;
  }

  if (typeof temp === 'number' && temp <= 5) {
    return WEATHER_VISUAL_CONFIGS.cold;
  }

  if (c.includes('cloud') || c.includes('overcast')) {
    return WEATHER_VISUAL_CONFIGS.cloudy;
  }

  if (t === 'sunny' || c.includes('clear') || c.includes('sun')) {
    return WEATHER_VISUAL_CONFIGS.clear;
  }

  return WEATHER_VISUAL_CONFIGS.cloudy;
}
