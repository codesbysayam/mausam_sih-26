// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Zero-Secret Runtime Configuration & Grounded Local Assistant Service
// Locked to keyless local grounded mode by default — zero external API
// keys, zero secret environment variable reads, zero fabricated metrics.
// ====================================================================

export const MAUSAM_RUNTIME_CONFIG = {
  assistantMode: 'local' as const,
  remoteAssistantEnabled: false,
  officialImdEnabled: false,
  directCpcbEnabled: false,
  directIncoisEnabled: false,
  accuweatherEnabled: false,
  googleWeatherEnabled: false,
  redisEnabled: false,
  databaseEnabled: false,
  worldTidesEnabled: false,
  azureMapsEnabled: false,
  wrfDirectEnabled: false,
} as const;

export const OPTIONAL_INTEGRATION_DISABLED_MESSAGE =
  'Optional integration disabled. Core MAUSAM services are operating using public data sources.';

export interface AskMausamParams {
  prompt: string;
  station?: any;
  weatherContext?: any;
  mode?: 'auto' | 'search' | 'maps' | 'standard';
  lat?: number;
  lng?: number;
  location?: any;
  observation?: any;
  airQuality?: any;
  pollen?: any;
  astronomy?: any;
  metadata?: any;
  forecast?: any[];
  warning?: any;
  preferredLanguage?: string;
}

export interface AskMausamResult {
  response: string;
  source: string;
  groundingSources: Array<{ title: string; url: string }>;
  modeUsed: string;
  error?: string;
}

export interface AssistantConfig {
  mode: string;
  apiUrl: string;
  apiKey: string;
  model: string;
}

export interface AssistantCompletionResult {
  ok: boolean;
  text: string;
  model: string;
  statusCode?: number;
  error?: string;
}

export const DEFAULT_ASSISTANT_MODEL = 'grounded-local';

const PRIVATE_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^\[::1\]$/,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /\.local$/i,
  /\.internal$/i,
];

export type AssistantMode = 'auto' | 'remote' | 'local' | 'offline';

export function getAssistantMode(_env?: Record<string, string | undefined>): AssistantMode {
  return MAUSAM_RUNTIME_CONFIG.assistantMode;
}

export function isAssistantLocalMode(_env?: Record<string, string | undefined>): boolean {
  return MAUSAM_RUNTIME_CONFIG.assistantMode === 'local';
}

export function isRemoteAssistantEnabled(_env?: Record<string, string | undefined>): boolean {
  return MAUSAM_RUNTIME_CONFIG.remoteAssistantEnabled;
}

/**
 * Validates and normalizes an HTTPS assistant endpoint URL.
 * Retained for helper compatibility; remote gateway calls are disabled in keyless mode.
 */
export function validateAssistantEndpointUrl(rawUrl: string): {
  valid: boolean;
  normalizedUrl?: string;
  reason?: string;
} {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { valid: false, reason: 'Assistant endpoint URL is empty' };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'Assistant endpoint URL is not a valid URL' };
  }

  if (url.protocol !== 'https:') {
    return { valid: false, reason: `Unsupported protocol ${url.protocol}; HTTPS is required` };
  }

  if (url.username || url.password || url.search || url.hash) {
    return {
      valid: false,
      reason: 'Embedded credentials, query strings, and URL fragments are not permitted',
    };
  }

  const hostname = url.hostname.toLowerCase();
  if (PRIVATE_HOST_PATTERNS.some((re) => re.test(hostname))) {
    return { valid: false, reason: 'Private, loopback, or metadata hosts are not permitted' };
  }

  const path = url.pathname.replace(/\/+$/, '');

  if (path.endsWith('/chat/completions')) {
    url.pathname = path;
  } else if (
    path.endsWith('/v1beta/openai') ||
    path.endsWith('/v1') ||
    path.endsWith('/openai/v1')
  ) {
    url.pathname = `${path}/chat/completions`;
  } else if (path.endsWith('/v1beta')) {
    url.pathname = `${path}/openai/chat/completions`;
  } else {
    url.pathname = `${path}/v1/chat/completions`;
  }

  return { valid: true, normalizedUrl: url.toString() };
}

export function getAssistantEndpoint(_env?: Record<string, string | undefined>): string | undefined {
  return undefined;
}

export function resolveAssistantConfig(
  _env?: Record<string, string | undefined>
): AssistantConfig | null {
  return null;
}

function buildDeterministicTelemetrySummary(
  params: AskMausamParams,
  reasonNote: string,
  error?: string
): AskMausamResult {
  const { location, observation, airQuality, metadata } = params;
  const city = location?.city || location?.name || 'India';
  const state = location?.state || 'National';
  const resolvedSource = metadata?.source || 'Open-Meteo';

  const hasTemp =
    observation &&
    typeof observation.temperatureC === 'number' &&
    Number.isFinite(observation.temperatureC);
  const hasHum =
    observation &&
    typeof observation.relativeHumidity === 'number' &&
    Number.isFinite(observation.relativeHumidity);
  const hasWind =
    observation &&
    typeof observation.windSpeedKmh === 'number' &&
    Number.isFinite(observation.windSpeedKmh);

  const obsText = hasTemp
    ? `• Current Observation: ${observation.temperatureC}°C — ${observation.condition || 'Reported'}\n• Relative Humidity: ${hasHum ? `${observation.relativeHumidity}%` : 'Unavailable'}\n• Wind Speed: ${hasWind ? `${observation.windSpeedKmh} km/h` : 'Unavailable'}`
    : '• Current surface weather observation is unavailable in this payload.';

  const hasAqi =
    airQuality && typeof airQuality.aqi === 'number' && Number.isFinite(airQuality.aqi);
  const aqiText = hasAqi
    ? `• Air Quality Index: ${airQuality.aqi} (${airQuality.category || 'Monitored'})`
    : '• Air Quality observation is unavailable.';

  const result: AskMausamResult = {
    response: `${city}, ${state}\n\n${obsText}\n${aqiText}\n\nSource: ${resolvedSource}\nStatus: ${reasonNote}`,
    source: resolvedSource,
    groundingSources: [],
    modeUsed: 'grounded-local',
  };

  if (error) {
    result.error = error;
  }

  return result;
}

export class MausamAssistantService {
  public static readonly providerName = 'MAUSAM Meteorological Assistant (Grounded Local)';
  public readonly name = 'MAUSAM Meteorological Assistant (Grounded Local)';

  public static isConfigured(_env?: Record<string, string | undefined>): boolean {
    return true;
  }

  public static isRemoteEnabled(_env?: Record<string, string | undefined>): boolean {
    return MAUSAM_RUNTIME_CONFIG.remoteAssistantEnabled;
  }

  public static async completeChat(_options: {
    systemInstruction: string;
    prompt: string;
    temperature?: number;
    timeoutMs?: number;
    env?: Record<string, string | undefined>;
    fetchImpl?: typeof fetch;
  }): Promise<AssistantCompletionResult> {
    return {
      ok: false,
      text: '',
      model: 'local',
      error: 'Grounded local mode is active; remote assistant calls are disabled.',
    };
  }

  public static async checkHealth(
    _env?: Record<string, string | undefined>
  ): Promise<{
    configured: boolean;
    operational: boolean;
    latencyMs: number | null;
    error?: string;
  }> {
    return {
      configured: true,
      operational: true,
      latencyMs: null,
      error: 'Grounded local assistant active. No API key required.',
    };
  }

  public static async askMausam(
    params: AskMausamParams,
    _deps?: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch }
  ): Promise<AskMausamResult> {
    return buildDeterministicTelemetrySummary(
      params,
      'Grounded local assistant active. Using verified surface telemetry.'
    );
  }
}

// Named compatibility alias for existing server modules
export const AIProvider = MausamAssistantService;
