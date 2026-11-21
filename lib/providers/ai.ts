// ====================================================================
// MAUSAM — Provider-neutral meteorological assistant adapter
// Uses a server-side OpenAI-compatible chat-completions endpoint when
// configured. The core application and grounded local mode need no key.
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

type AssistantMode = 'auto' | 'remote' | 'local' | 'offline';

function getMode(): AssistantMode {
  const raw = (process.env.MAUSAM_ASSISTANT_MODE || 'local').trim().toLowerCase();
  if (raw === 'remote' || raw === 'local' || raw === 'offline') return raw;
  return 'auto';
}

const DEFAULT_ASSISTANT_MODEL = 'gemini-3.8-flash';

function getEndpoint(): string | undefined {
  const raw = process.env.MAUSAM_ASSISTANT_API_URL?.trim();
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') return undefined;
    if (url.username || url.password || url.search || url.hash) return undefined;

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

    return url.toString();
  } catch {
    return undefined;
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function localTelemetrySummary(params: AskMausamParams, source: string): string {
  const lines: string[] = [];
  const obs = params.observation || {};
  const aqi = params.airQuality || {};
  const location = params.location || {};
  const label = [location.city || location.name, location.state]
    .filter(Boolean)
    .join(', ') || 'Selected location';

  if (isFiniteNumber(obs.temperatureC)) lines.push(`Temperature: ${obs.temperatureC} °C`);
  if (isFiniteNumber(obs.feelsLikeC)) lines.push(`Feels like: ${obs.feelsLikeC} °C`);
  if (isFiniteNumber(obs.relativeHumidity)) lines.push(`Relative humidity: ${obs.relativeHumidity}%`);
  if (isFiniteNumber(obs.windSpeedKmh)) lines.push(`Wind speed: ${obs.windSpeedKmh} km/h`);
  if (isFiniteNumber(obs.precipitationMm)) lines.push(`Precipitation: ${obs.precipitationMm} mm`);
  if (isFiniteNumber(aqi.aqi)) lines.push(`Air Quality Index: ${aqi.aqi}`);

  const status = lines.length
    ? lines.join('\n')
    : 'No verified weather or air-quality measurements were supplied with this request.';

  return [
    `MAUSAM telemetry summary — ${label}`,
    '',
    status,
    '',
    `Source supplied by the application: ${source}`,
    'This is a source-grounded telemetry summary, not a generated forecast. Missing measurements are not estimated.',
  ].join('\n');
}

export class AIProvider {
  public static readonly providerName = 'MAUSAM Assistant';
  public readonly name = 'MAUSAM Assistant';

  public static isConfigured(): boolean {
    const mode = getMode();
    if (mode === 'local' || mode === 'offline') return true;
    return Boolean(getEndpoint() && process.env.MAUSAM_ASSISTANT_API_KEY?.trim());
  }

  public static async checkHealth(): Promise<{
    configured: boolean;
    operational: boolean;
    latencyMs: number | null;
    error?: string;
  }> {
    const mode = getMode();
    if (mode === 'local' || mode === 'offline') {
      return {
        configured: true,
        operational: true,
        latencyMs: null,
        error: 'Grounded local mode is available; no remote model endpoint is configured.',
      };
    }

    const endpoint = getEndpoint();
    const apiKey = process.env.MAUSAM_ASSISTANT_API_KEY?.trim();
    if (!endpoint || !apiKey) {
      return {
        configured: false,
        operational: false,
        latencyMs: null,
        error: !endpoint
          ? 'MAUSAM_ASSISTANT_API_URL is missing or invalid.'
          : 'MAUSAM_ASSISTANT_API_KEY is missing.',
      };
    }

    // Do not consume tokens from the diagnostics page. A configured endpoint
    // is not reported as operational until a real assistant request succeeds.
    return {
      configured: true,
      operational: false,
      latencyMs: null,
      error: 'Gemini endpoint and credentials are configured; live availability is verified on the next assistant request.',
    };
  }

  public static async askMausam(params: AskMausamParams): Promise<AskMausamResult> {
    const location = params.location || {};
    const city = location.city || location.name || 'Selected location';
    const state = location.state || '';
    const source = params.metadata?.source || params.observation?.source || 'Source not reported';
    const mode = getMode();
    const endpoint = getEndpoint();

    const localResult = (error?: string): AskMausamResult => ({
      response: localTelemetrySummary(params, source),
      source,
      groundingSources: [],
      modeUsed: 'grounded-local',
      ...(error ? { error } : {}),
    });

    if (mode === 'local' || mode === 'offline') return localResult();
    const apiKey = process.env.MAUSAM_ASSISTANT_API_KEY?.trim();
    if (!endpoint || !apiKey) {
      const configurationError = !endpoint
        ? 'MAUSAM_ASSISTANT_API_URL is missing or invalid.'
        : 'MAUSAM_ASSISTANT_API_KEY is missing.';
      return localResult(mode === 'remote' || !endpoint || !apiKey ? configurationError : undefined);
    }

    const model = process.env.MAUSAM_ASSISTANT_MODEL?.trim() || DEFAULT_ASSISTANT_MODEL;
    const context = {
      location: { city, state, latitude: params.lat, longitude: params.lng },
      observation: params.observation ?? null,
      airQuality: params.airQuality ?? null,
      pollen: params.pollen ?? null,
      forecast: params.forecast ?? null,
      warning: params.warning ?? null,
      source,
      instruction: 'Treat supplied measurements as the only current telemetry. Distinguish observations from forecasts. Never invent missing values, timestamps, warnings, source names or citations. If the context does not contain an answer, say so.',
    };

    const systemMessage = [
      'You are MAUSAM Assistant, a meteorological and environmental information assistant for India.',
      'Answer in the user requested language when one is supplied.',
      'Use the supplied context carefully. Do not claim to have queried a live source unless a source is explicitly supplied.',
      'Clearly distinguish measured observations, model forecasts, official warnings and general explanations.',
      'Never fabricate weather, AQI, marine, radar, cyclone or agricultural measurements.',
      `Selected location: ${city}${state ? `, ${state}` : ''}.`,
      `Verified context: ${JSON.stringify(context)}`,
    ].join('\n');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      // Gemini's OpenAI-compatible endpoint requires Bearer authentication.
      headers.Authorization = `Bearer ${apiKey}`;

      const body: Record<string, unknown> = {
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: params.prompt?.trim() || 'Summarize the verified weather context for this location.' },
        ],
        temperature: 0.2,
        model,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const safeMessage = `Assistant endpoint returned HTTP ${response.status}.`;
        return localResult(safeMessage);
      }

      const payload = await response.json() as any;
      const answer = payload?.choices?.[0]?.message?.content;
      const text = typeof answer === 'string'
        ? answer.trim()
        : Array.isArray(answer)
          ? answer.map((part: any) => typeof part?.text === 'string' ? part.text : '').join('\n').trim()
          : '';

      if (!text) return localResult('Assistant endpoint returned no readable message content.');

      const groundingSources: Array<{ title: string; url: string }> = [];
      const citations = payload?.citations || payload?.sources || [];
      if (Array.isArray(citations)) {
        for (const item of citations) {
          const url = typeof item?.url === 'string' ? item.url : '';
          if (!url || !/^https?:\/\//i.test(url)) continue;
          groundingSources.push({
            title: typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : url,
            url,
          });
        }
      }

      return {
        response: text,
        source,
        groundingSources,
        modeUsed: 'remote',
      };
    } catch (error: unknown) {
      const message = error instanceof Error
        ? (error.name === 'AbortError' ? 'Assistant endpoint timed out after 20 seconds.' : error.message)
        : 'Assistant endpoint request failed.';
      return localResult(message);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
