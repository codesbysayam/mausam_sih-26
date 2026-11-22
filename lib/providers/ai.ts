// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Provider-Neutral Server-Side Meteorological Assistant Service
// Supports Google's OpenAI-compatible Gemini endpoint or any
// OpenAI-compatible Chat Completions endpoint via explicit opt-in:
//   MAUSAM_ASSISTANT_MODE      (local | offline | remote) — defaults to local
//   MAUSAM_ASSISTANT_API_URL   (optional; required only in remote mode)
//   MAUSAM_ASSISTANT_API_KEY   (optional; required only in remote mode)
//   MAUSAM_ASSISTANT_MODEL
// Defaults to grounded local telemetry with zero API keys required —
// never prompts for keys, never fabricates metrics, and never leaks secrets.
// ====================================================================

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

export const DEFAULT_ASSISTANT_MODEL = 'gemini-3.8-flash';

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

export function getAssistantMode(env: NodeJS.ProcessEnv = process.env): AssistantMode {
  const raw = (env.MAUSAM_ASSISTANT_MODE || 'local').trim().toLowerCase();

  if (raw === 'remote') return 'remote';
  if (raw === 'offline') return 'offline';
  if (raw === 'local') return 'local';

  // Unknown, 'auto', or unset configuration must never force an API-key prompt.
  return 'local';
}

export function isAssistantLocalMode(env: NodeJS.ProcessEnv = process.env): boolean {
  const mode = getAssistantMode(env);
  return mode === 'local' || mode === 'offline';
}

export function isRemoteAssistantEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    getAssistantMode(env) === 'remote' &&
    Boolean(getAssistantEndpoint(env) && env.MAUSAM_ASSISTANT_API_KEY?.trim())
  );
}

/**
 * Validates and normalizes the configured assistant endpoint URL.
 * Enforces HTTPS, rejects embedded credentials, query strings, fragments,
 * and private/loopback/metadata destinations, and constructs the canonical
 * OpenAI-compatible `/chat/completions` URL.
 */
export function validateAssistantEndpointUrl(rawUrl: string): {
  valid: boolean;
  normalizedUrl?: string;
  reason?: string;
} {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { valid: false, reason: 'MAUSAM_ASSISTANT_API_URL is empty' };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'MAUSAM_ASSISTANT_API_URL is not a valid URL' };
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

export function getAssistantEndpoint(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const raw = env.MAUSAM_ASSISTANT_API_URL?.trim();
  if (!raw) return undefined;
  const check = validateAssistantEndpointUrl(raw);
  return check.valid ? check.normalizedUrl : undefined;
}

export function resolveAssistantConfig(
  env: NodeJS.ProcessEnv = process.env
): AssistantConfig | null {
  const mode = getAssistantMode(env);
  if (mode === 'local' || mode === 'offline') {
    return null;
  }
  const endpoint = getAssistantEndpoint(env);
  const apiKey = (env.MAUSAM_ASSISTANT_API_KEY || '').trim();
  const model = (env.MAUSAM_ASSISTANT_MODEL || DEFAULT_ASSISTANT_MODEL).trim();
  if (!endpoint || !apiKey) return null;
  return {
    mode,
    apiUrl: endpoint,
    apiKey,
    model: model || DEFAULT_ASSISTANT_MODEL,
  };
}

function redactSecret(text: string, secret: string): string {
  if (!secret || secret.length < 4) return text;
  return text.split(secret).join('[REDACTED]');
}

function buildDeterministicTelemetrySummary(
  params: AskMausamParams,
  reasonNote: string,
  error?: string
): AskMausamResult {
  const { location, observation, airQuality, metadata } = params;
  const city = location?.city || location?.name || 'India';
  const state = location?.state || 'National';
  const resolvedSource =
    metadata?.source ||
    (process.env.IMD_API_ENABLED === 'true' && (process.env.IMD_API_KEY || process.env.IMD_API_TOKEN)
      ? 'India Meteorological Department (IMD)'
      : 'Open-Meteo');

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
  public static readonly providerName = 'MAUSAM Meteorological Assistant (Provider-Neutral)';
  public readonly name = 'MAUSAM Meteorological Assistant (Provider-Neutral)';

  public static isConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
    if (isAssistantLocalMode(env)) {
      return true;
    }

    return Boolean(getAssistantEndpoint(env) && env.MAUSAM_ASSISTANT_API_KEY?.trim());
  }

  public static isRemoteEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    return isRemoteAssistantEnabled(env);
  }

  public static async completeChat(options: {
    systemInstruction: string;
    prompt: string;
    temperature?: number;
    timeoutMs?: number;
    env?: NodeJS.ProcessEnv;
    fetchImpl?: typeof fetch;
  }): Promise<AssistantCompletionResult> {
    const env = options.env ?? process.env;

    if (isAssistantLocalMode(env)) {
      return {
        ok: false,
        text: '',
        model: 'local',
        error: 'Grounded local mode is active; remote assistant calls are disabled.',
      };
    }

    const endpoint = getAssistantEndpoint(env);
    const apiKey = env.MAUSAM_ASSISTANT_API_KEY?.trim();

    if (!endpoint || !apiKey) {
      return {
        ok: false,
        text: '',
        model: 'unconfigured',
        error: !endpoint
          ? 'MAUSAM_ASSISTANT_API_URL is missing or invalid.'
          : 'MAUSAM_ASSISTANT_API_KEY is missing.',
      };
    }

    const model = env.MAUSAM_ASSISTANT_MODEL?.trim() || DEFAULT_ASSISTANT_MODEL;
    const fetchFn = options.fetchImpl ?? fetch;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 12000);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      };

      const body: Record<string, unknown> = {
        messages: [
          {
            role: 'system',
            content: options.systemInstruction,
          },
          {
            role: 'user',
            content:
              options.prompt?.trim() ||
              'Summarize the verified weather context for this location.',
          },
        ],
        temperature: options.temperature ?? 0.2,
        model,
      };

      const res = await fetchFn(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        return {
          ok: false,
          text: '',
          model,
          statusCode: res.status,
          error: redactSecret(
            `Assistant endpoint returned HTTP ${res.status}${errBody ? `: ${errBody.slice(0, 160)}` : ''}`,
            apiKey
          ),
        };
      }

      const json = (await res.json()) as any;
      const content =
        json?.choices?.[0]?.message?.content ??
        json?.output_text ??
        json?.response ??
        '';
      const text = typeof content === 'string' ? content.trim() : '';
      if (!text) {
        return {
          ok: false,
          text: '',
          model,
          statusCode: res.status,
          error: 'Assistant endpoint returned an empty completion',
        };
      }

      return {
        ok: true,
        text,
        model,
        statusCode: res.status,
      };
    } catch (err: any) {
      return {
        ok: false,
        text: '',
        model,
        error: redactSecret(err?.message || 'Assistant network error', apiKey),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  public static async checkHealth(
    env: NodeJS.ProcessEnv = process.env
  ): Promise<{
    configured: boolean;
    operational: boolean;
    latencyMs: number | null;
    error?: string;
  }> {
    if (isAssistantLocalMode(env)) {
      return {
        configured: true,
        operational: true,
        latencyMs: null,
        error: 'Grounded local assistant active. No API key required.',
      };
    }

    const endpoint = getAssistantEndpoint(env);
    const apiKey = env.MAUSAM_ASSISTANT_API_KEY?.trim();

    if (!endpoint || !apiKey) {
      return {
        configured: false,
        operational: false,
        latencyMs: null,
        error: 'Remote assistant is optional. Grounded local mode remains available.',
      };
    }

    // Do not consume tokens from the diagnostics page.
    // Actual availability is verified during an assistant request.
    return {
      configured: true,
      operational: false,
      latencyMs: null,
      error:
        'Remote assistant configured. Live availability is verified during an actual request.',
    };
  }

  public static async askMausam(
    params: AskMausamParams,
    deps?: { env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch }
  ): Promise<AskMausamResult> {
    const env = deps?.env ?? process.env;
    const mode = getAssistantMode(env);

    // Default behaviour: no Gemini call and no API key required.
    if (mode === 'local' || mode === 'offline') {
      return buildDeterministicTelemetrySummary(
        params,
        'Grounded local assistant active. Using verified surface telemetry.'
      );
    }

    const endpoint = getAssistantEndpoint(env);
    const apiKey = env.MAUSAM_ASSISTANT_API_KEY?.trim();

    // Remote mode is explicitly opt-in. Missing credentials fall back locally.
    if (!endpoint || !apiKey) {
      return buildDeterministicTelemetrySummary(
        params,
        'Remote assistant is not configured. Grounded local mode is active.',
        'Remote assistant is not configured. Grounded local mode is active.'
      );
    }

    const { location, observation, airQuality, metadata, lat, lng, prompt } = params;
    const city = location?.city || location?.name || 'India';
    const state = location?.state || 'National';
    const resolvedSource =
      metadata?.source ||
      (env.IMD_API_ENABLED === 'true' && (env.IMD_API_KEY || env.IMD_API_TOKEN)
        ? 'India Meteorological Department (IMD)'
        : 'Open-Meteo');

    const coordLine =
      typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng)
        ? `(${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`
        : '';
    const obsSummary =
      observation && typeof observation.temperatureC === 'number' && Number.isFinite(observation.temperatureC)
        ? `${observation.temperatureC}°C, ${observation.condition || 'Observed'}, Humidity ${observation.relativeHumidity ?? 'Unavailable'}%, Wind ${observation.windSpeedKmh ?? 'Unavailable'} km/h`
        : 'Current surface weather data unavailable';
    const aqiSummary =
      airQuality && typeof airQuality.aqi === 'number' && Number.isFinite(airQuality.aqi)
        ? `AQI ${airQuality.aqi} (${airQuality.category || 'Monitored'})`
        : 'Air Quality data unavailable';

    const systemInstruction = `You are Ask MAUSAM, the meteorological intelligence assistant for India.
Location: ${city}, ${state} ${coordLine}.
Current weather: ${obsSummary}.
Air Quality: ${aqiSummary}.
Data Source: ${resolvedSource}.
Provide accurate, concise meteorological answers. If a measurement is unavailable, state that clearly without guessing or fabricating numbers. Always attribute the actual data source.`;

    const completion = await this.completeChat({
      systemInstruction,
      prompt: prompt?.trim() || 'Summarize the verified weather context for this location.',
      temperature: 0.2,
      env,
      fetchImpl: deps?.fetchImpl,
    });

    if (completion.ok && completion.text) {
      return {
        response: completion.text,
        source: resolvedSource,
        groundingSources: [],
        modeUsed: `assistant (${completion.model})`,
      };
    }

    return buildDeterministicTelemetrySummary(
      params,
      'Deterministic telemetry fallback (upstream assistant endpoint temporarily unavailable).',
      completion.error
    );
  }
}

// Named compatibility alias for existing server modules
export const AIProvider = MausamAssistantService;
