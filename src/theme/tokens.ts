/**
 * MAUSAM DESIGN SYSTEM TOKENS — OBSIDIAN × ATMOSPHERIC OBSERVATORY
 * Palette: Void (#0B0C0D) · Graphite (#191C1D) · Brass (#C5A46D) · Mineral Green (#89977B) · Atmospheric Ice (#A7C5C5)
 * Brass is brand accent only — official weather severity colors remain strictly meteorological.
 */

export const MAUSAM_BRAND = {
  name: 'MAUSAM',
  tagline: 'The Atmospheric Observatory',
  descriptor: 'National Atmospheric Intelligence & Environmental Observation for India',
} as const;

export const tokens = {
  colors: {
    // 1. Core Brand & Surface Tokens (Obsidian × Graphite × Brass)
    primary: '#C5A46D',        // Restrained Brass Accent
    primaryDark: '#9C7B42',    // Deep Aged Brass (light theme / borders)
    primaryLight: '#E0C18A',   // Bright Brass (focus / emphasis)
    secondary: '#89977B',      // Mineral Green (Moss)
    ice: '#A7C5C5',            // Atmospheric Ice

    // 2. Official Warning Severity Colors (IMD / NDMA Calibrated)
    severity: {
      normal: '#5C9A79',       // Green — No Warning
      watch: '#D8B14F',        // Yellow — Watch / Be Aware
      alert: '#D98548',        // Orange — Alert / Be Prepared
      warning: '#C94F4B',      // Red — Severe Warning / Take Action
      unknown: '#898B83',      // Unknown / Unavailable
    },

    // 3. Semantic Weather Data Colors (Strictly for Weather Telemetry)
    weather: {
      clear: '#E6B96B',        // --weather-sun
      sunny: '#E6B96B',
      cloudy: '#C3C9C5',       // --weather-cloud
      rain: '#78AEB6',         // --weather-rain
      rainy: '#78AEB6',
      storm: '#D98548',        // --severity-orange
      snow: '#A7C5C5',         // --mausam-ice
      fog: '#C3C9C5',          // --weather-cloud
      mist: '#C3C9C5',
      heat: '#E27B55',         // --weather-hot
      cold: '#91B6CC',         // --weather-cold
      wind: '#9CAF9A',         // --weather-wind
      duststorm: '#D8B14F',
      unknown: '#898B83',
    },

    // 4. Semantic Status System
    status: {
      good: '#5C9A79',
      warning: '#D8B14F',
      prepare: '#D98548',
      danger: '#C94F4B',
      info: '#A7C5C5',
    },

    // 5. Obsidian × Graphite Observatory Dark Surfaces
    dark: {
      background: '#0B0C0D',
      backgroundAlt: '#111314',
      surface: '#191C1D',
      surfaceSecondary: '#202424',
      surfaceHover: '#292E2D',
      textPrimary: '#F0EEE7',
      textSecondary: '#C1BFB5',
      textMuted: '#898B83',
      border: 'rgba(226, 219, 200, 0.13)',
      borderSubtle: 'rgba(226, 219, 200, 0.08)',
      borderHover: 'rgba(226, 219, 200, 0.25)',
    },

    // 6. Warm Editorial Paper Light Surfaces (Classic & Paper Modes)
    light: {
      background: '#F1F0EA',
      surface: '#FAF9F5',
      surfaceRaised: '#FFFFFF',
      textPrimary: '#171B19',
      textSecondary: '#48504A',
      textMuted: '#6A716A',
      border: 'rgba(23, 27, 25, 0.13)',
    },

    // 7. Restrained Atmospheric Gradients (Zero Cyan Glow)
    gradients: {
      daySky: 'linear-gradient(145deg, rgba(230, 185, 107, 0.07) 0%, #191C1D 100%)',
      sunset: 'linear-gradient(145deg, rgba(226, 123, 85, 0.09) 0%, #191C1D 100%)',
      night: 'linear-gradient(145deg, #191C1D 0%, #0B0C0D 100%)',
      storm: 'linear-gradient(145deg, rgba(201, 79, 75, 0.10) 0%, #191C1D 100%)',
    },

    // 8. Spatial 3D Atmospheric Observatory Canvas & Instrument HUD Tokens
    spatial: {
      canvasVoid: '#0B0C0D',
      oceanBase: '#0E1214',
      landRelief: '#2B302C',
      hudSurface: 'rgba(17, 19, 20, 0.94)',
      hudSurfaceElevated: 'rgba(25, 28, 29, 0.97)',
      hudBorder: 'rgba(226, 219, 200, 0.13)',
      hudBorderStrong: 'rgba(226, 219, 200, 0.25)',
      primaryBrass: '#C5A46D',
      precipitationTeal: '#78AEB6',
      windMoss: '#9CAF9A',
      clearGreen: '#5C9A79',
      watchAmber: '#D8B14F',
      alertOrange: '#D98548',
      severeRed: '#C94F4B',
    },
  },

  typography: {
    displayFamily: "'Manrope', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontFamily: "'Inter', 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
    button: '7px',
    card: '11px',
    panel: '11px',
    hero: '15px',
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
    badgeBg: 'rgba(230, 185, 107, 0.14)',
    badgeText: '#E6B96B',
    gradient: tokens.colors.gradients.daySky,
    surfaceBg: '#191C1D',
    ambientGlow: 'rgba(230, 185, 107, 0.08)',
  },
  cloudy: {
    state: 'cloudy',
    label: 'Partly Cloudy',
    icon: 'partly_cloudy_day',
    accentColor: tokens.colors.weather.cloudy,
    badgeBg: 'rgba(195, 201, 197, 0.12)',
    badgeText: '#C3C9C5',
    gradient: 'linear-gradient(135deg, rgba(41, 46, 45, 0.72) 0%, #191C1D 100%)',
    surfaceBg: '#191C1D',
    ambientGlow: 'rgba(195, 201, 197, 0.06)',
  },
  rainy: {
    state: 'rainy',
    label: 'Rain Showers',
    icon: 'rainy',
    accentColor: tokens.colors.weather.rainy,
    badgeBg: 'rgba(120, 174, 182, 0.16)',
    badgeText: '#78AEB6',
    gradient: 'linear-gradient(135deg, rgba(120, 174, 182, 0.12) 0%, #191C1D 100%)',
    surfaceBg: '#191C1D',
    ambientGlow: 'rgba(120, 174, 182, 0.10)',
  },
  storm: {
    state: 'storm',
    label: 'Thunderstorm',
    icon: 'thunderstorm',
    accentColor: tokens.colors.weather.storm,
    badgeBg: 'rgba(217, 133, 72, 0.16)',
    badgeText: '#D98548',
    gradient: tokens.colors.gradients.storm,
    surfaceBg: '#202424',
    ambientGlow: 'rgba(217, 133, 72, 0.12)',
  },
  snow: {
    state: 'snow',
    label: 'Snow / Flurries',
    icon: 'ac_unit',
    accentColor: tokens.colors.weather.snow,
    badgeBg: 'rgba(167, 197, 197, 0.15)',
    badgeText: '#A7C5C5',
    gradient: 'linear-gradient(135deg, rgba(167, 197, 197, 0.12) 0%, #191C1D 100%)',
    surfaceBg: '#191C1D',
    ambientGlow: 'rgba(167, 197, 197, 0.08)',
  },
  fog: {
    state: 'fog',
    label: 'Dense Fog & Mist',
    icon: 'foggy',
    accentColor: tokens.colors.weather.fog,
    badgeBg: 'rgba(195, 201, 197, 0.14)',
    badgeText: '#C3C9C5',
    gradient: 'linear-gradient(135deg, rgba(41, 46, 45, 0.7) 0%, #191C1D 100%)',
    surfaceBg: '#191C1D',
    ambientGlow: 'rgba(195, 201, 197, 0.07)',
  },
  heat: {
    state: 'heat',
    label: 'Heatwave Alert',
    icon: 'local_fire_department',
    accentColor: tokens.colors.weather.heat,
    badgeBg: 'rgba(226, 123, 85, 0.18)',
    badgeText: '#E27B55',
    gradient: 'linear-gradient(135deg, rgba(226, 123, 85, 0.14) 0%, #191C1D 100%)',
    surfaceBg: '#191C1D',
    ambientGlow: 'rgba(226, 123, 85, 0.12)',
  },
  cold: {
    state: 'cold',
    label: 'Coldwave Advisory',
    icon: 'severe_cold',
    accentColor: tokens.colors.weather.cold,
    badgeBg: 'rgba(145, 182, 204, 0.16)',
    badgeText: '#91B6CC',
    gradient: 'linear-gradient(135deg, rgba(145, 182, 204, 0.12) 0%, #191C1D 100%)',
    surfaceBg: '#191C1D',
    ambientGlow: 'rgba(145, 182, 204, 0.10)',
  },
  unknown: {
    state: 'unknown',
    label: 'Observational',
    icon: 'thermostat',
    accentColor: tokens.colors.weather.unknown,
    badgeBg: 'rgba(137, 139, 131, 0.14)',
    badgeText: '#C1BFB5',
    gradient: 'linear-gradient(135deg, #202424 0%, #111314 100%)',
    surfaceBg: '#191C1D',
    ambientGlow: 'rgba(137, 139, 131, 0.05)',
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
