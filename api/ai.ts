// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Consolidated Grounded Meteorological Assistant Gateway (/api/ai)
// Provider-neutral server-side gateway with canonical telemetry grounding
// and deterministic fallback when no external assistant URL/key is set.
// ====================================================================

import { MausamAssistantService, isAssistantLocalMode } from '../lib/providers/ai';

function sendJson(res: any, status: number, data: any, customHeaders: Record<string, string> = {}) {
  const payload = JSON.stringify(data);
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload, 'utf8').toString(),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    ...customHeaders,
  };

  if (typeof res.setHeader === 'function') {
    for (const [key, value] of Object.entries(defaultHeaders)) {
      res.setHeader(key, value);
    }
    if (typeof res.status === 'function') {
      res.status(status);
    } else {
      res.statusCode = status;
    }
    if (typeof res.end === 'function') {
      res.end(payload);
    } else if (typeof res.send === 'function') {
      res.send(payload);
    }
  } else if (typeof res.json === 'function') {
    if (typeof res.status === 'function') res.status(status);
    res.json(data);
  }
}

function parseQuery(req: any): Record<string, any> {
  if (req.query && Object.keys(req.query).length > 0) {
    return req.query;
  }
  try {
    const urlStr = req.url || '';
    const queryIndex = urlStr.indexOf('?');
    if (queryIndex === -1) return {};
    const searchParams = new URLSearchParams(urlStr.slice(queryIndex));
    const result: Record<string, any> = {};
    for (const [key, value] of searchParams.entries()) {
      result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

async function parseBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let data = '';
    if (typeof req.on !== 'function') {
      return resolve({});
    }
    req.on('data', (chunk: any) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function buildGroundedFallbackText(loc: any, cur: any, aqi: any, warnings: any[]): string {
  const locationLabel = loc?.name || loc?.city || 'Selected Location';
  let fallbackText = `Current surface telemetry for **${locationLabel}**:\n\n`;
  if (cur && typeof cur.temperatureC === 'number' && Number.isFinite(cur.temperatureC)) {
    const feelsStr =
      typeof cur.feelsLikeC === 'number' && Number.isFinite(cur.feelsLikeC)
        ? ` (Feels like ${cur.feelsLikeC}°C)`
        : '';
    fallbackText += `• **Temperature**: ${cur.temperatureC}°C${feelsStr}\n`;
    fallbackText += `• **Condition**: ${cur.condition || 'Reported'}\n`;
    const humVal = cur.relativeHumidity ?? cur.humidity;
    fallbackText += `• **Humidity**: ${typeof humVal === 'number' && Number.isFinite(humVal) ? `${humVal}%` : 'Unavailable'}\n`;
    fallbackText += `• **Wind**: ${typeof cur.windSpeedKmh === 'number' && Number.isFinite(cur.windSpeedKmh) ? `${cur.windSpeedKmh} km/h` : 'Unavailable'} ${cur.windDirection || ''}\n`;
    const rainProb = cur.precipitationProbability ?? cur.rainProbability;
    fallbackText += `• **Rain Probability**: ${typeof rainProb === 'number' && Number.isFinite(rainProb) ? `${rainProb}%` : 'Unavailable'}\n`;
  } else {
    fallbackText += '• **Surface Observation**: Currently unavailable in this request payload.\n';
  }
  if (aqi && (typeof aqi.index === 'number' || typeof aqi.aqi === 'number' || aqi.category)) {
    const aqiVal = aqi.index ?? aqi.aqi;
    fallbackText += `• **Air Quality**: AQI ${typeof aqiVal === 'number' && Number.isFinite(aqiVal) ? aqiVal : 'Unavailable'} (${aqi.category || 'Monitored'})\n`;
  }
  if (warnings.length > 0) {
    fallbackText += `\n**Active Warning**: ${warnings[0].headline || warnings[0].title} (${warnings[0].severity?.toUpperCase?.() || 'ACTIVE'} ALERT)`;
  } else {
    fallbackText += '\n*Warning status: No active severe alerts in the supplied telemetry context.*';
  }
  return fallbackText;
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, {});
  }

  const query = parseQuery(req);
  const body = await parseBody(req);
  const params = { ...query, ...body };
  const prompt = params.prompt || params.query || 'Current meteorological atmospheric briefing';
  const canonicalContext = params.canonicalContext;
  const preferredLanguage = params.preferredLanguage || 'English';

  const loc = canonicalContext?.location || params.location || { name: 'India', state: 'National' };
  const cur = canonicalContext?.currentWeather || params.observation;
  const aqi = canonicalContext?.aqi || params.airQuality;
  const warnings = canonicalContext?.warnings || params.warnings || [];
  const primarySource =
    canonicalContext?.sources?.[0]?.provider || 'Open-Meteo';

  // Build factual summary for strict grounding
  const factsList: Array<{ label: string; value: string; source?: string }> = [];
  if (cur && typeof cur.temperatureC === 'number' && Number.isFinite(cur.temperatureC)) {
    const feelsNote =
      typeof cur.feelsLikeC === 'number' && Number.isFinite(cur.feelsLikeC)
        ? ` (Feels like ${cur.feelsLikeC}°C)`
        : '';
    factsList.push({
      label: 'Temperature',
      value: `${cur.temperatureC}°C${feelsNote}`,
      source: primarySource,
    });
    if (cur.condition) {
      factsList.push({ label: 'Condition', value: cur.condition, source: primarySource });
    }
    const humVal = cur.relativeHumidity ?? cur.humidity;
    if (typeof humVal === 'number' && Number.isFinite(humVal)) {
      factsList.push({ label: 'Humidity', value: `${humVal}%` });
    }
    if (typeof cur.windSpeedKmh === 'number' && Number.isFinite(cur.windSpeedKmh)) {
      factsList.push({
        label: 'Wind Speed',
        value: `${cur.windSpeedKmh} km/h ${cur.windDirection || ''}`.trim(),
      });
    }
    const rainProb = cur.precipitationProbability ?? cur.rainProbability;
    if (typeof rainProb === 'number' && Number.isFinite(rainProb)) {
      factsList.push({ label: 'Rain Probability', value: `${rainProb}%` });
    }
    if (typeof cur.pressureHpa === 'number' && Number.isFinite(cur.pressureHpa)) {
      factsList.push({ label: 'Pressure', value: `${cur.pressureHpa} hPa` });
    }
  }
  if (aqi && (typeof aqi.index === 'number' || typeof aqi.aqi === 'number' || aqi.category)) {
    const aqiVal = aqi.index ?? aqi.aqi;
    factsList.push({
      label: 'Air Quality',
      value: `AQI ${typeof aqiVal === 'number' && Number.isFinite(aqiVal) ? aqiVal : 'Unavailable'} (${aqi.category || 'Monitored'})`,
      source: aqi.source || 'CPCB / Open-Meteo',
    });
  }
  if (warnings.length > 0) {
    factsList.push({
      label: 'Warning Advisory',
      value: `${warnings[0].headline || warnings[0].title} (${warnings[0].severity?.toUpperCase?.() || 'ACTIVE'} ALERT)`,
      source: warnings[0].source || 'IMD / SACHET Bulletin',
    });
  } else {
    factsList.push({ label: 'Warning Status', value: 'No severe weather alerts active', source: 'IMD / SACHET' });
  }

  const cleanPrompt = (prompt || '').trim().toLowerCase();
  if (
    cleanPrompt.includes('who developed') ||
    cleanPrompt.includes('who created') ||
    cleanPrompt.includes('who built') ||
    cleanPrompt.includes('developer')
  ) {
    return sendJson(res, 200, {
      response:
        "I don't have verified developer information in my current project data. MAUSAM is an atmospheric intelligence platform consolidating official telemetry from IMD, NDMA, CPCB, and INCOIS.",
      facts: [],
      warnings: [],
      source: 'MAUSAM Knowledge Base',
      groundingSources: [],
      modeUsed: 'knowledge-grounded',
    });
  }

  if (
    cleanPrompt.includes('what is mausam') ||
    cleanPrompt.includes('what does mausam do') ||
    cleanPrompt === 'about mausam' ||
    cleanPrompt.includes('what can you do')
  ) {
    return sendJson(res, 200, {
      response:
        'MAUSAM is a meteorological and atmospheric information platform designed to provide weather observations, forecasts, warnings, air-quality information, radar/map data, and agrometeorological information for locations across India.',
      facts: [],
      warnings: [],
      source: 'MAUSAM Knowledge Base',
      groundingSources: [],
      modeUsed: 'knowledge-grounded',
    });
  }

  const warningList = warnings.map(
    (w: any) => `${w.severity?.toUpperCase?.() || 'ALERT'}: ${w.headline || w.title}`
  );

  if (isAssistantLocalMode() || !MausamAssistantService.isRemoteEnabled()) {
    return sendJson(res, 200, {
      response: buildGroundedFallbackText(loc, cur, aqi, warnings),
      facts: factsList,
      warnings: warningList,
      source: primarySource,
      groundingSources: [],
      modeUsed: 'grounded-local',
    });
  }

  const systemInstruction = `You are Ask MAUSAM, the meteorological intelligence assistant for India.
You MUST adhere strictly to the verified meteorological ground truth provided below:
Location: ${loc.name || loc.city}, ${loc.state || 'India'} (Lat: ${loc.latitude ?? loc.lat ?? 'Unavailable'}, Lng: ${loc.longitude ?? loc.lng ?? 'Unavailable'})
Current Temperature: ${typeof cur?.temperatureC === 'number' ? `${cur.temperatureC}°C` : 'Unavailable'} (Feels like: ${typeof cur?.feelsLikeC === 'number' ? `${cur.feelsLikeC}°C` : 'Unavailable'})
Current Condition: ${cur?.condition ?? 'Unavailable'}
Relative Humidity: ${typeof (cur?.humidity ?? cur?.relativeHumidity) === 'number' ? `${cur.humidity ?? cur.relativeHumidity}%` : 'Unavailable'}
Wind Speed: ${typeof cur?.windSpeedKmh === 'number' ? `${cur.windSpeedKmh} km/h ${cur?.windDirection || ''}`.trim() : 'Unavailable'}
Rain Probability: ${typeof (cur?.precipitationProbability ?? cur?.rainProbability) === 'number' ? `${cur.precipitationProbability ?? cur.rainProbability}%` : 'Unavailable'}
Air Quality Index: ${typeof (aqi?.index ?? aqi?.aqi) === 'number' ? `${aqi.index ?? aqi.aqi} (${aqi?.category || 'Monitored'})` : 'Unavailable'}
Active Warnings: ${warnings.length > 0 ? warnings.map((w: any) => `${w.severity?.toUpperCase?.()}: ${w.headline || w.title}`).join('; ') : 'None'}
Data Source: ${primarySource}
Language: ${preferredLanguage}

RULES:
1. NEVER contradict the verified temperature or condition above.
2. NEVER fabricate unavailable values; state clearly if a metric is unavailable.
3. NEVER claim Open-Meteo is IMD or vice versa.
4. NEVER say "all clear" if there is an active warning.
5. Format key values cleanly with Markdown. Keep the tone concise and meteorological.`;

  const completion = await MausamAssistantService.completeChat({
    systemInstruction,
    prompt,
    temperature: 0.25,
  });

  if (completion.ok && completion.text) {
    let assistantText = completion.text;
    if (cur && typeof cur.temperatureC === 'number' && Number.isFinite(cur.temperatureC)) {
      const tempMatch = assistantText.match(/(\d+(\.\d+)?)\s*°\s*C/i);
      if (tempMatch && Math.abs(parseFloat(tempMatch[1]) - cur.temperatureC) > 1.5) {
        assistantText = assistantText.replace(
          new RegExp(`${tempMatch[1]}\\s*°\\s*C`, 'g'),
          `${cur.temperatureC}°C`
        );
      }
    }

    return sendJson(res, 200, {
      response: assistantText,
      facts: factsList,
      warnings: warningList,
      source: primarySource,
      groundingSources: [],
      modeUsed: `tool-grounded (${completion.model})`,
    });
  }

  return sendJson(res, 200, {
    response: buildGroundedFallbackText(loc, cur, aqi, warnings),
    facts: factsList,
    warnings: warningList,
    source: primarySource,
    groundingSources: [],
    modeUsed: 'canonical-grounded-fallback',
    error: completion.error,
  });
}
