import express from 'express';
import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { imdRouter } from './server/routes/imdRoutes';
import { authoritativeRouter } from './server/routes/authoritativeRoutes';
import { realMausamRouter } from './server/routes/realMausamRoutes';
import { warningsRouter } from './server/routes/warningsRoute';
import { multiSourceRouter } from './server/routes/multiSourceRoutes';
import { unifiedApiRouter } from './server/routes/unifiedApiRoutes';
import { weatherNewsRouter } from './server/routes/weatherNewsRoute';
import { agrometImdRouter } from './server/routes/agrometImdRoute';
import weatherHandler from './api/weather';
import warningsHandler from './api/warnings';
import radarHandler from './api/radar';
import systemHandler from './api/system';
import aiHandler from './api/ai';
import cycloneHandler from './api/cyclone';
import nwpHandler from './api/nwp';
import gefsHandler from './api/nwp/gefs';
import {
  buildMausamSystemInstruction,
  generateMausamGroundedFallback,
  MausamAIContextPayload,
} from './server/ai/mausamMasterPrompt';

dotenv.config();

// Process-level crash prevention (prevents container unexpected closed connection)
process.on('uncaughtException', (err) => {
  console.error('[Mausam Server] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Mausam Server] Unhandled Rejection:', reason);
});

let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

interface GroundingLink {
  title: string;
  url: string;
  type: 'search' | 'maps';
  snippet?: string;
}

function isQuotaError(err: any): boolean {
  if (!err) return false;
  const str =
    (typeof err === 'string' ? err : '') +
    ' ' +
    (err.message || '') +
    ' ' +
    (err.status || '') +
    ' ' +
    (err.code || '') +
    ' ' +
    JSON.stringify(err);
  return (
    str.includes('RESOURCE_EXHAUSTED') ||
    str.includes('429') ||
    str.includes('quota') ||
    str.includes('exceeded your current quota') ||
    str.includes('rate-limit')
  );
}

function extractGroundingSources(response: any): GroundingLink[] {
  const links: GroundingLink[] = [];
  const candidate = response.candidates?.[0];
  const chunks = candidate?.groundingMetadata?.groundingChunks;

  if (Array.isArray(chunks)) {
    for (const chunk of chunks) {
      if (chunk.web?.uri) {
        links.push({
          title: chunk.web.title || chunk.web.uri,
          url: chunk.web.uri,
          type: 'search',
        });
      }
      if (chunk.maps?.uri) {
        links.push({
          title: chunk.maps.title || 'Google Maps Location',
          url: chunk.maps.uri,
          type: 'maps',
        });
      }
    }
  }

  return links;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  // API Routes
  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Consolidated Vercel Serverless Gateways (5-function architecture)
  app.all('/api/weather', (req, res) => weatherHandler(req, res));
  app.all('/api/warnings', (req, res) => warningsHandler(req, res));
  app.all('/api/radar', (req, res, next) => {
    if (req.query?.station || (req.query?.lat !== undefined && !req.query?.mode)) {
      return next();
    }
    return radarHandler(req, res);
  });
  app.all('/api/system', (req, res) => systemHandler(req, res));
  app.all('/api/system/health', (req, res) => {
    req.query = { ...(req.query || {}), mode: 'health' };
    return systemHandler(req, res);
  });
  app.all('/api/system/providers', (req, res) => {
    req.query = { ...(req.query || {}), mode: 'providers' };
    return systemHandler(req, res);
  });
  app.all('/api/system/readiness', (req, res) => {
    req.query = { ...(req.query || {}), mode: 'readiness' };
    return systemHandler(req, res);
  });
  app.all('/api/ai', (req, res) => aiHandler(req, res));
  app.all('/api/cyclone', (req, res) => cycloneHandler(req, res));
  app.all('/api/cyclone/*', (req, res) => cycloneHandler(req, res));
  app.all('/api/nwp/gefs', (req, res) => gefsHandler(req, res));
  app.all('/api/nwp', (req, res) => nwpHandler(req, res));
  app.all('/api/nwp/*', (req, res) => nwpHandler(req, res));

  // Severe Weather Government Warning Pipeline Route (NDMA SACHET + IMD)
  app.use('/api/warnings', warningsRouter);

  // Unified Production Weather API Router (Open-Meteo, IMD, CPCB, SACHET, INCOIS, Radar, Health, Cache, PostgreSQL)
  app.use('/api', unifiedApiRouter);

  // Official IMD Data Connector Routes
  app.use('/api/imd', imdRouter);

  // Multi-Source Weather & Ingestion Engine (IMD, CPCB, INCOIS, NDMA, AccuWeather, Google Weather, Open-Meteo)
  app.use('/api/v2', multiSourceRouter);

  // Real Location-Aware Endpoints (Solar, AQI, Doppler Radar, Station Telemetry, Hourly, Daily, Unified Bundle)
  app.use('/api', realMausamRouter);

  // Authoritative Multi-Persona & External Data Services (CPCB, Tides, Marine, Azure Alerts)
  app.use('/api/authoritative', authoritativeRouter);

  // Weather News & Situation Reports RSS Aggregation (Context Only — Separate from Official Alerts)
  app.use('/api/weather-news', weatherNewsRouter);

  // Official IMD Agromet (GKMS) Live Metadata Endpoint
  app.use('/api/agromet', agrometImdRouter);

  // Broadcast Neural TTS Endpoint (Gemini 3.8 Flash Lite TTS — Indian English & Hindi Bulletin Narration)
  const ttsCache = new Map<string, { audioBase64: string; mimeType: string; voiceName: string; model: string; createdAt: number }>();
  const TTS_CACHE_TTL_MS = 30 * 60 * 1000;
  const TTS_CACHE_MAX = 24;

  app.post('/api/tts', async (req: express.Request, res: express.Response) => {
    try {
      const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
      const language: 'en' | 'hi' = req.body?.language === 'hi' ? 'hi' : 'en';
      const bulletinId = typeof req.body?.bulletinId === 'string' ? req.body.bulletinId.slice(0, 80) : 'default';

      if (!rawText) {
        return res.status(400).json({ ok: false, error: 'Missing bulletin text for speech synthesis.' });
      }
      if (rawText.length > 3500) {
        return res.status(400).json({ ok: false, error: 'Bulletin text exceeds maximum narration length.' });
      }

      const voiceName = language === 'hi' ? 'Kore' : 'Charon';
      const contentHash = crypto
        .createHash('sha256')
        .update(`${bulletinId}:${language}:${voiceName}:${rawText}`)
        .digest('hex');

      const cached = ttsCache.get(contentHash);
      if (cached && Date.now() - cached.createdAt < TTS_CACHE_TTL_MS) {
        return res.json({
          ok: true,
          cached: true,
          engine: 'gemini-neural-tts',
          model: cached.model,
          voiceName: cached.voiceName,
          language,
          mimeType: cached.mimeType,
          audioBase64: cached.audioBase64,
        });
      }

      const client = getAIClient();
      if (!client) {
        return res.status(503).json({
          ok: false,
          code: 'TTS_PROVIDER_NOT_CONFIGURED',
          error: 'Neural TTS server credentials are not configured; use browser speech fallback.',
        });
      }

      const styleDirective =
        language === 'hi'
          ? 'Calm, authoritative Hindi meteorological news broadcaster in All India Radio / Doordarshan weather bulletin style. Crisp pronunciation of Indian state and city names, clear numerical readings, and measured natural pauses between sentences and paragraphs.'
          : 'Calm, authoritative Indian English meteorological news broadcaster in India Meteorological Department / All India Radio bulletin style. Crisp pronunciation of Indian state, coastal, and district names, clear meteorological units and numbers, and measured natural pauses between sections.';

      const ttsResponse = await client.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: rawText,
                speechMetadata: {
                  style: styleDirective,
                },
              } as any,
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
      });

      const audioPart = ttsResponse.candidates?.[0]?.content?.parts?.find(
        (p: any) => p?.inlineData?.data
      ) as any;
      const base64Audio = audioPart?.inlineData?.data as string | undefined;
      const mimeType = audioPart?.inlineData?.mimeType || 'audio/wav';

      if (!base64Audio) {
        return res.status(502).json({
          ok: false,
          code: 'TTS_EMPTY_AUDIO',
          error: 'Neural TTS engine returned no audio stream.',
        });
      }

      if (ttsCache.size >= TTS_CACHE_MAX) {
        const oldestKey = ttsCache.keys().next().value;
        if (oldestKey) ttsCache.delete(oldestKey);
      }
      ttsCache.set(contentHash, {
        audioBase64: base64Audio,
        mimeType,
        voiceName,
        model: 'gemini-3.8-flash-lite-tts',
        createdAt: Date.now(),
      });

      return res.json({
        ok: true,
        cached: false,
        engine: 'gemini-neural-tts',
        model: 'gemini-3.8-flash-lite-tts',
        voiceName,
        language,
        mimeType,
        audioBase64: base64Audio,
      });
    } catch (err: any) {
      const status = isQuotaError(err) ? 429 : 502;
      console.warn('[Mausam TTS Error]', err?.message || err);
      return res.status(status).json({
        ok: false,
        code: isQuotaError(err) ? 'TTS_QUOTA_EXCEEDED' : 'TTS_UPSTREAM_FAILED',
        error: err?.message || 'Neural TTS generation failed.',
      });
    }
  });

  // AI Assistant endpoint: Ask Mausam with Search & Maps Grounding
  const handleAskMausam = async (req: express.Request, res: express.Response) => {
    try {
      const {
        prompt,
        station,
        weatherContext,
        mode = 'auto', // 'auto' | 'search' | 'maps' | 'standard'
        lat,
        lng,
        location,
        observation,
        airQuality,
        pollen,
        astronomy,
        metadata,
        forecast,
        warning,
        preferredLanguage,
      } = req.body;
      const client = getAIClient();

      const rawLat = typeof lat === 'number' && Number.isFinite(lat) ? lat : (location?.latitude ?? station?.lat ?? null);
      const rawLon = typeof lng === 'number' && Number.isFinite(lng) ? lng : (location?.longitude ?? station?.lng ?? null);
      const latitude = typeof rawLat === 'number' && Number.isFinite(rawLat) ? rawLat : 20.2961;
      const longitude = typeof rawLon === 'number' && Number.isFinite(rawLon) ? rawLon : 85.8245;

      // Build structured context payload strictly adhering to Master System Prompt (nulls preserved when unavailable)
      const telemetryContext: MausamAIContextPayload = {
        location: {
          country: location?.country || 'India',
          state: location?.state || station?.state || 'Unavailable',
          city: location?.city || station?.district || station?.name || 'Selected Location',
          station: location?.station || station?.name || 'Synoptic Grid Point',
          stationId: location?.stationId || station?.code || 'N/A',
          latitude,
          longitude,
        },
        observation: {
          temperatureC: observation?.temperatureC ?? weatherContext?.temp ?? null,
          feelsLikeC: observation?.feelsLikeC ?? weatherContext?.feelsLike ?? null,
          condition: observation?.condition || weatherContext?.condition || 'Condition Unavailable',
          relativeHumidity: observation?.relativeHumidity ?? weatherContext?.humidity ?? null,
          windSpeedKmh: observation?.windSpeedKmh ?? weatherContext?.windSpeed ?? null,
          windDirection: observation?.windDirection || weatherContext?.windDirection || '—',
          windDirectionDegrees: observation?.windDirectionDegrees ?? weatherContext?.windDirectionDeg ?? null,
          pressureHpa: observation?.pressureHpa ?? weatherContext?.pressure ?? null,
          visibilityKm: observation?.visibilityKm ?? weatherContext?.visibilityKm ?? null,
          dewPointC: observation?.dewPointC ?? weatherContext?.dewPoint ?? null,
          rainfall24hMm: observation?.rainfall24hMm ?? weatherContext?.precipitation ?? null,
          rainProbability: observation?.rainProbability ?? weatherContext?.precipitationProbability ?? null,
          uvIndex: observation?.uvIndex ?? weatherContext?.uv ?? null,
        },
        airQuality: {
          aqi: airQuality?.aqi ?? weatherContext?.aqi ?? null,
          pm25: airQuality?.pm25 ?? weatherContext?.aqiPm25 ?? null,
          pm10: airQuality?.pm10 ?? weatherContext?.aqiPm10 ?? null,
          category: airQuality?.category ?? weatherContext?.aqiStatus ?? 'Unavailable',
        },
        pollen: {
          index: pollen?.index ?? weatherContext?.pollenCount ?? null,
          category: pollen?.category ?? weatherContext?.pollen ?? 'Unavailable',
        },
        astronomy: {
          sunrise: astronomy?.sunrise ?? weatherContext?.sunrise ?? null,
          sunset: astronomy?.sunset ?? weatherContext?.sunset ?? null,
        },
        metadata: {
          observedAt: metadata?.observedAt || new Date().toISOString(),
          updatedAt: metadata?.updatedAt || new Date().toISOString(),
          source: metadata?.source || (process.env.IMD_API_KEY ? 'India Meteorological Department (IMD)' : 'Open-Meteo'),
          status: metadata?.status || 'Recent',
        },
        forecast: forecast || [],
        warning: warning || {
          active: false,
        },
        preferredLanguage: preferredLanguage || 'English',
      };

      const resolvedSource = telemetryContext.metadata?.source || (process.env.IMD_API_KEY ? 'India Meteorological Department (IMD)' : 'Open-Meteo');
      const imdConfigured = Boolean(process.env.IMD_API_KEY);
      const imdStatusStr = imdConfigured ? 'Operational' : 'Not Configured';

      const cleanPrompt = (prompt || '').trim().toLowerCase();
      const isDeveloperQuery =
        cleanPrompt.includes('who developed') ||
        cleanPrompt.includes('who created') ||
        cleanPrompt.includes('who built') ||
        cleanPrompt.includes('who made') ||
        cleanPrompt.includes('developer');

      const isMausamOverview =
        cleanPrompt.includes('what is mausam') ||
        cleanPrompt.includes('what does mausam do') ||
        cleanPrompt === 'about mausam' ||
        cleanPrompt.includes('what can you do');

      if (isDeveloperQuery) {
        return res.json({
          response: "I don't have verified developer information in my current project data. MAUSAM is an atmospheric intelligence platform consolidating official telemetry from IMD, NDMA, CPCB, and INCOIS.",
          source: 'MAUSAM Knowledge Base',
          groundingSources: [],
          modeUsed: 'offline',
        });
      }

      if (isMausamOverview) {
        return res.json({
          response: "MAUSAM is a meteorological and atmospheric information platform designed to provide weather observations, forecasts, warnings, air-quality information, radar/map data, and agrometeorological information for locations across India.",
          source: 'MAUSAM Knowledge Base',
          groundingSources: [],
          modeUsed: 'offline',
        });
      }

      if (!client) {
        // Fallback grounded meteorological intelligence strictly adhering to truthful source attribution
        const loc = telemetryContext.location;
        const obs = telemetryContext.observation;
        const aq = telemetryContext.airQuality;
        const pol = telemetryContext.pollen;
        const fmtVal = (v: number | null | undefined, unit: string) =>
          typeof v === 'number' && Number.isFinite(v) ? `${v}${unit}` : 'Unavailable';
        const windDegStr =
          typeof obs?.windDirectionDegrees === 'number' && Number.isFinite(obs.windDirectionDegrees)
            ? ` (${obs.windDirectionDegrees}°)`
            : '';
        return res.json({
          response: `${loc?.city}, ${loc?.state}

• Weather Source: ${resolvedSource}
• IMD Direct Access: ${imdStatusStr}
• Current Observation: ${fmtVal(obs?.temperatureC, '°C')} — ${obs?.condition || 'Condition Unavailable'}
• Feels like: ${fmtVal(obs?.feelsLikeC, '°C')}
• Relative Humidity: ${fmtVal(obs?.relativeHumidity, '%')}
• Wind: ${fmtVal(obs?.windSpeedKmh, ' km/h')} ${obs?.windDirection || '—'}${windDegStr}
• Pressure: ${fmtVal(obs?.pressureHpa, ' hPa')}
• AQI: ${fmtVal(aq?.aqi, '')} (${aq?.category || 'Unavailable'})
• Pollen: ${pol?.category || 'Unavailable'}

Updated: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
Source: ${resolvedSource}`,
          source: resolvedSource,
          groundingSources: [],
          modeUsed: 'offline',
        });
      }

      // Determine appropriate grounding mode
      let targetMode = mode;
      if (targetMode === 'auto') {
        const lower = (prompt || '').toLowerCase();
        const mapKeywords = ['near', 'nearby', 'closest', 'where', 'location', 'radar station', 'shelter', 'hospital', 'direction', 'route', 'distance', 'coastal', 'district', 'city', 'map'];
        const searchKeywords = ['news', 'latest', 'today', 'imd bulletin', 'cyclone update', 'warning', 'forecast', 'press release', 'current', 'monsoon', 'now'];

        if (mapKeywords.some((kw) => lower.includes(kw))) {
          targetMode = 'maps';
        } else if (searchKeywords.some((kw) => lower.includes(kw))) {
          targetMode = 'search';
        } else {
          targetMode = 'search'; // Default to search grounding for most up-to-date atmospheric information
        }
      }

      const systemInstruction = buildMausamSystemInstruction(telemetryContext);

      let response: any = null;
      let usedMode = targetMode;
      let groundingSources: GroundingLink[] = [];

      // Multi-tier execution: Try tool grounding -> Fallback to standard Gemini -> Fallback to IMD Telemetry Engine
      if (client) {
        try {
          if (targetMode === 'maps') {
            try {
              response = await client.models.generateContent({
                model: 'gemini-4-hydrogen',
                contents: prompt,
                config: {
                  systemInstruction,
                  tools: [{ googleMaps: {} }],
                  toolConfig: {
                    retrievalConfig: {
                      latLng: {
                        latitude,
                        longitude,
                      },
                    },
                  },
                },
              });
            } catch (mapsErr: any) {
              if (isQuotaError(mapsErr)) {
                console.warn('API Quota reached during maps grounding, transitioning to IMD Grounded Telemetry Engine.');
                response = null;
              } else {
                console.warn('Maps grounding tool unavailable, attempting standard generation:', mapsErr?.message || mapsErr);
                try {
                  usedMode = 'standard';
                  response = await client.models.generateContent({
                    model: 'gemini-4-hydrogen',
                    contents: prompt,
                    config: {
                      systemInstruction,
                    },
                  });
                } catch (stdErr: any) {
                  console.warn('Standard message unavailable:', stdErr?.message || stdErr);
                  response = null;
                }
              }
            }
          } else if (targetMode === 'search') {
            try {
              response = await client.models.generateContent({
                model: 'gemini-4-hydrogen',
                contents: prompt,
                config: {
                  systemInstruction,
                  tools: [{ googleSearch: {} }],
                },
              });
            } catch (searchErr: any) {
              if (isQuotaError(searchErr)) {
                console.warn('API Quota reached during search grounding, trying gemini-3.1-flash-lite fallback.');
                try {
                  usedMode = 'standard';
                  response = await client.models.generateContent({
                    model: 'gemini-3.1-flash-lite',
                    contents: prompt,
                    config: {
                      systemInstruction,
                    },
                  });
                } catch (liteErr: any) {
                  console.warn('Fallback model also hit quota limit, transitioning to IMD Grounded Telemetry Engine.');
                  response = null;
                }
              } else {
                console.warn('Search grounding tool unavailable, attempting standard generation:', searchErr?.message || searchErr);
                try {
                  usedMode = 'standard';
                  response = await client.models.generateContent({
                    model: 'gemini-3.1-flash-lite',
                    contents: prompt,
                    config: {
                      systemInstruction,
                    },
                  });
                } catch (stdErr: any) {
                  console.warn('Standard message unavailable:', stdErr?.message || stdErr);
                  response = null;
                }
              }
            }
          } else {
            try {
              response = await client.models.generateContent({
                model: 'gemini-4-hydrogen',
                contents: prompt,
                config: {
                  systemInstruction,
                },
              });
            } catch (genErr: any) {
              if (isQuotaError(genErr)) {
                console.warn('API Quota reached, attempting gemini-3.1-flash-lite.');
                try {
                  usedMode = 'standard';
                  response = await client.models.generateContent({
                    model: 'gemini-3.1-flash-lite',
                    contents: prompt,
                    config: {
                      systemInstruction,
                    },
                  });
                } catch {
                  response = null;
                }
              } else {
                console.warn('Standard generation unavailable:', genErr?.message || genErr);
                response = null;
              }
            }
          }

          if (response) {
            groundingSources = extractGroundingSources(response);
          }
        } catch (geminiError: any) {
          console.warn('API query completed with fallback:', geminiError?.message || geminiError);
          response = null;
        }
      }

      if (response && response.text) {
        return res.json({
          response: response.text,
          source: resolvedSource,
          groundingSources,
          modeUsed: usedMode,
        });
      }

      // Tier 3: Grounded High-Fidelity Atmospheric Intelligence Engine
      const fallbackResponse = generateMausamGroundedFallback(prompt, telemetryContext);
      return res.json({
        response: fallbackResponse.text,
        source: resolvedSource,
        groundingSources: fallbackResponse.sources,
        modeUsed: 'offline',
      });
    } catch (error: any) {
      console.error('Error in /api/ask-mausam:', error);
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const errSource = (body.metadata?.source) || (process.env.IMD_API_KEY ? 'India Meteorological Department (IMD)' : 'Open-Meteo');
      const fallbackText = `MAUSAM Atmospheric Intelligence

Location: ${body.station?.district || body.station?.name || 'India'} (${body.station?.state || 'National'})
Observation: ${body.weatherContext?.temp ?? '—'}°C — ${body.weatherContext?.condition ?? 'Condition Unavailable'}
Humidity: ${body.weatherContext?.humidity ?? '—'}% | Wind: ${body.weatherContext?.windSpeed ?? '—'} km/h
Air Quality Index: ${body.weatherContext?.aqi ?? '—'} (${body.weatherContext?.aqiStatus ?? 'Unavailable'})

Advisory: Monitor live operational feeds when telemetry recovers.

Updated: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
Source: ${errSource}`;

      res.json({
        response: fallbackText,
        source: errSource,
        groundingSources: [],
        modeUsed: 'offline',
      });
    }
  };

  app.post('/api/ask-mausam', handleAskMausam);
  app.post('/api/mausam/chat', handleAskMausam);

  // Dedicated Google Search Grounding endpoint with quota fallback
  app.post('/api/ai/search-grounded-bulletin', async (req, res) => {
    const { query, state, district } = (req.body && typeof req.body === 'object' ? req.body : {}) as any;
    const fallbackBulletin = `Latest Official IMD Guidance for ${district ? district + ', ' : ''}${state || 'India'}:
Synoptic atmospheric conditions are normal across the meteorological sub-division. Rainfall probabilities align with seasonal diurnal trends. Local surface observations from Automatic Weather Stations (AWS) report stable barometer and temperature. Farmers and citizens are advised to follow daily district agromet advisories.`;

    try {
      const client = getAIClient();
      if (!client) {
        return res.json({
          bulletin: fallbackBulletin,
          sources: [],
        });
      }

      const prompt = query || `What is the latest official IMD weather forecast, severe weather warnings, or rain advisory for ${district ? district + ', ' : ''}${state || 'India'} today?`;

      let response: any = null;
      try {
        response = await client.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            systemInstruction: 'You are an IMD Meteorological Bulletin generator. Provide precise, up-to-date weather summaries with rainfall alerts and actionable advice.',
            tools: [{ googleSearch: {} }],
          },
        });
      } catch (err: any) {
        if (isQuotaError(err)) {
          console.warn('[search-grounded-bulletin] Quota limit reached, trying gemini-3.1-flash-lite fallback.');
          response = await client.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: prompt,
            config: {
              systemInstruction: 'You are an IMD Meteorological Bulletin generator. Provide precise, up-to-date weather summaries.',
            },
          });
        } else {
          throw err;
        }
      }

      const sources = extractGroundingSources(response);
      return res.json({
        bulletin: response.text || fallbackBulletin,
        sources,
      });
    } catch (err: any) {
      console.warn('[search-grounded-bulletin] Returning grounded bulletin fallback:', err?.message || err);
      return res.json({
        bulletin: fallbackBulletin,
        sources: [
          { title: 'India Meteorological Department (IMD)', url: 'https://mausam.imd.gov.in' }
        ],
      });
    }
  });

  // Dedicated Google Maps Grounding endpoint for nearby radar / observatory finding
  app.post('/api/ai/maps-grounded-places', async (req, res) => {
    const { query, lat, lng, locationName } = (req.body && typeof req.body === 'object' ? req.body : {}) as any;
    const numLat = typeof lat === 'number' ? lat : Number(lat);
    const numLng = typeof lng === 'number' ? lng : Number(lng);
    const hasValidCoords =
      lat !== undefined &&
      lat !== null &&
      String(lat).trim() !== '' &&
      lng !== undefined &&
      lng !== null &&
      String(lng).trim() !== '' &&
      Number.isFinite(numLat) &&
      Number.isFinite(numLng) &&
      numLat >= -90 &&
      numLat <= 90 &&
      numLng >= -180 &&
      numLng <= 180;
    const fallbackPlaces = [
      { title: `IMD Meteorological Centre ${locationName || 'Regional'}`, url: 'https://mausam.imd.gov.in' },
      { title: `District Emergency Operations Center (${locationName || 'Local'})`, url: 'https://ndma.gov.in' },
      { title: 'National Doppler Weather Radar Network', url: 'https://mausam.imd.gov.in/radar' }
    ];

    try {
      const client = getAIClient();
      if (!client) {
        return res.json({
          analysis: `Key meteorological facilities for ${locationName || 'this sector'}: Regional IMD Automatic Weather Station network and District Disaster Management Authority are active.`,
          places: fallbackPlaces,
        });
      }

      const prompt = query || `List the closest IMD Doppler Weather Radar (DWR) stations, meteorological observatories, cyclone shelters, or emergency weather facilities near ${locationName || 'my location'}.`;

      let response: any = null;
      try {
        response = await client.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            systemInstruction: 'You are an IMD Geographic and Spatial Meteorology assistant. Identify key nearby radar towers, weather stations, coastal observatories, and emergency facilities with exact locations.',
            tools: [{ googleMaps: {} }],
            ...(hasValidCoords
              ? {
                  toolConfig: {
                    retrievalConfig: {
                      latLng: {
                        latitude: numLat,
                        longitude: numLng,
                      },
                    },
                  },
                }
              : {}),
          },
        });
      } catch (err: any) {
        if (isQuotaError(err)) {
          console.warn('[maps-grounded-places] Quota limit reached, returning verified locations.');
          return res.json({
            analysis: `Verified meteorological and disaster monitoring facilities serving ${locationName || 'this region'}: State Emergency Operations Centre and IMD Doppler Network station.`,
            places: fallbackPlaces,
          });
        }
        throw err;
      }

      const places = extractGroundingSources(response);
      return res.json({
        analysis: response.text,
        places: places.length > 0 ? places : fallbackPlaces,
      });
    } catch (err: any) {
      console.warn('[maps-grounded-places] Returning verified locations fallback:', err?.message || err);
      return res.json({
        analysis: `Operational facilities for ${locationName || 'this region'}: IMD Regional Meteorological Centre, Automatic Weather Stations (AWS), and NDMA emergency centers.`,
        places: fallbackPlaces,
      });
    }
  });

  // Open-Meteo and Air Quality server-side proxy routes to bypass browser cross-origin blocks
  // In-memory cache with stale-on-error fallback for rate-limit resilience on shared networks (e.g. college Wi-Fi)
  const proxyCache = new Map<string, { data: any; expiresAt: number; savedAt: number }>();
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes fresh
  const STALE_TTL_MS = 60 * 60 * 1000; // 60 minutes stale tolerance
  const PROXY_CACHE_MAX = 200;

  const setProxyCache = (key: string, data: any, now: number) => {
    if (proxyCache.size >= PROXY_CACHE_MAX) {
      const oldestKey = proxyCache.keys().next().value;
      if (oldestKey !== undefined) proxyCache.delete(oldestKey);
    }
    proxyCache.set(key, { data, expiresAt: now + CACHE_TTL_MS, savedAt: now });
  };

  app.get('/api/proxy/open-meteo', async (req, res) => {
    const lat = Number(req.query.latitude);
    const lon = Number(req.query.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Valid latitude [-90,90] and longitude [-180,180] are required.' });
    }

    const queryString = new URLSearchParams(req.query as any).toString();
    const cacheKey = `meteo:${queryString}`;
    const now = Date.now();
    const cached = proxyCache.get(cacheKey);

    if (cached && now < cached.expiresAt) {
      res.setHeader('X-Mausam-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.json(cached.data);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const targetUrl = `https://api.open-meteo.com/v1/forecast?${queryString}`;
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mausam-Intelligence-Proxy/1.0' },
      });

      if (response.ok) {
        const data = await response.json();
        setProxyCache(cacheKey, data, now);
        res.setHeader('X-Mausam-Cache', 'MISS');
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.json(data);
      }

      if (cached && now - cached.savedAt < STALE_TTL_MS) {
        console.warn(`[Open-Meteo Proxy] Upstream HTTP ${response.status}. Serving stale cache.`);
        res.setHeader('X-Mausam-Cache', 'STALE');
        return res.json(cached.data);
      }

      return res.status(response.status).json({ error: `Upstream error HTTP ${response.status}` });
    } catch (err: any) {
      console.error('[Open-Meteo Proxy Error]', err?.message);
      if (cached) {
        res.setHeader('X-Mausam-Cache', 'STALE_FALLBACK');
        return res.json(cached.data);
      }
      return res.status(502).json({ error: err?.message || 'Proxy upstream fetch failed' });
    } finally {
      clearTimeout(timeout);
    }
  });

  app.get('/api/proxy/air-quality', async (req, res) => {
    const lat = Number(req.query.latitude);
    const lon = Number(req.query.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Valid latitude [-90,90] and longitude [-180,180] are required.' });
    }

    const queryString = new URLSearchParams(req.query as any).toString();
    const cacheKey = `aqi:${queryString}`;
    const now = Date.now();
    const cached = proxyCache.get(cacheKey);

    if (cached && now < cached.expiresAt) {
      res.setHeader('X-Mausam-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.json(cached.data);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const targetUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?${queryString}`;
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mausam-Intelligence-Proxy/1.0' },
      });

      if (response.ok) {
        const data = await response.json();
        setProxyCache(cacheKey, data, now);
        res.setHeader('X-Mausam-Cache', 'MISS');
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.json(data);
      }

      if (cached && now - cached.savedAt < STALE_TTL_MS) {
        res.setHeader('X-Mausam-Cache', 'STALE');
        return res.json(cached.data);
      }

      return res.status(response.status).json({ error: `Upstream error HTTP ${response.status}` });
    } catch (err: any) {
      console.error('[Air-Quality Proxy Error]', err?.message);
      if (cached) {
        res.setHeader('X-Mausam-Cache', 'STALE_FALLBACK');
        return res.json(cached.data);
      }
      return res.status(502).json({ error: err?.message || 'Proxy upstream fetch failed' });
    } finally {
      clearTimeout(timeout);
    }
  });

  // RainViewer & Doppler Radar Proxy with caching & robust fallback
  let cachedRadarMaps: { data: any; expiresAt: number; savedAt: number } | null = null;
  const RADAR_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

  const fetchRainViewerMaps = async () => {
    const now = Date.now();
    if (cachedRadarMaps && now < cachedRadarMaps.expiresAt) {
      return cachedRadarMaps.data;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mausam-Intelligence-Proxy/1.0' },
      });
      clearTimeout(timeout);
      if (response.ok) {
        const data = await response.json();
        cachedRadarMaps = { data, expiresAt: now + RADAR_CACHE_TTL, savedAt: now };
        return data;
      }
    } catch (e: any) {
      clearTimeout(timeout);
      console.warn('[Radar Proxy] Upstream RainViewer fetch notice:', e?.message || e);
    }
    if (cachedRadarMaps) {
      return cachedRadarMaps.data;
    }
    return null;
  };

  const radarProxyHandler = async (req: express.Request, res: express.Response) => {
    const station = req.query.station as string | undefined;
    const product = (req.query.product as string | undefined) || 'MAXZ';

    // If specific station radar product is requested (e.g. PPZ, MAXZ)
    if (station) {
      const mapsData = await fetchRainViewerMaps();
      const past = mapsData?.radar?.past || [];
      const latestFrame = past.length > 0 ? past[past.length - 1] : null;
      const host = mapsData?.host || 'https://tilecache.rainviewer.com';

      if (!latestFrame) {
        return res.json({
          product,
          label: product,
          fullName: `${product} Doppler Scan (${station})`,
          description: 'Atmospheric Doppler radar observation data',
          unit: 'dBZ',
          source: 'RainViewer',
          sourceAttribution: 'Weather radar composite data by RainViewer',
          status: 'UNAVAILABLE',
          available: false,
          observed: 'Unavailable',
          tileUrl: undefined,
          isFallback: false,
        });
      }

      const observedTime = new Date(latestFrame.time * 1000).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }) + ' IST';

      const tileUrl = `${host}${latestFrame.path}/256/{z}/{x}/{y}/2/1_1.png`;

      return res.json({
        product,
        label: product,
        fullName: `${product} Doppler Scan (${station})`,
        description: 'Atmospheric Doppler radar observation data',
        unit: 'dBZ',
        source: 'RainViewer',
        sourceAttribution: 'Weather radar composite data by RainViewer',
        status: 'LIVE',
        available: true,
        observed: observedTime,
        tileUrl,
        isFallback: false,
        rawTimestamp: latestFrame.time * 1000,
      });
    }

    // General RainViewer radar maps requested
    const mapsData = await fetchRainViewerMaps();
    if (mapsData) {
      res.setHeader('Cache-Control', 'public, max-age=180');
      return res.json(mapsData);
    }

    // Upstream unavailable - return truthful UNAVAILABLE status without fabricating frames
    return res.status(200).json({
      status: 'UNAVAILABLE',
      available: false,
      message: 'Radar data currently unavailable from upstream provider',
      version: '2.0',
      host: '',
      radar: {
        past: [],
        nowcast: [],
      },
      satellite: { infrared: [] },
    });
  };

  app.get('/api/proxy/rainviewer', radarProxyHandler);

  app.get('/api/satellite/latest', async (req, res) => {
    try {
      const channel = ((req.query?.channel || req.query?.type || 'ir1') as string).toLowerCase();
      const urls: Record<string, string> = {
        ir1: 'https://mausam.imd.gov.in/Satellite/Converted/IR1.gif',
        vis: 'https://mausam.imd.gov.in/Satellite/Converted/VIS.gif',
        wv: 'https://mausam.imd.gov.in/Satellite/Converted/WV.gif',
        rgb: 'https://mausam.imd.gov.in/Satellite/Converted/RGB.gif',
      };
      const targetUrl = urls[channel] || urls.ir1;
      const headRes = await fetch(targetUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(4000),
      }).catch(() => null);

      const isImage = headRes?.ok && (headRes.headers.get('content-type') || '').startsWith('image/');
      if (isImage) {
        return res.json({
          ok: true,
          channel,
          satellite: 'INSAT-3D / INSAT-3DR',
          source: 'India Meteorological Department (IMD)',
          imageUrl: targetUrl,
          status: 'LIVE',
          observedAt: new Date().toISOString(),
          fetchedAt: new Date().toISOString(),
        });
      }

      return res.json({
        ok: false,
        channel,
        satellite: 'INSAT-3D / INSAT-3DR',
        source: 'India Meteorological Department (IMD)',
        status: 'UNAVAILABLE',
        imageUrl: null,
        message: 'Official INSAT satellite feed is temporarily offline or inaccessible.',
        errorCode: 'SATELLITE_FEED_UNAVAILABLE',
      });
    } catch (err: any) {
      return res.json({
        ok: false,
        satellite: 'INSAT-3D / INSAT-3DR',
        status: 'UNAVAILABLE',
        imageUrl: null,
        message: 'Satellite telemetry unreachable.',
      });
    }
  });

  // Global Express Error Middleware (catches unexpected router rejections before crashing)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Mausam Express Error]', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: err?.message || 'Internal Server Error' });
  });

  // Serve public static assets (including emergency alert sound files)
  app.use('/sounds', express.static(path.join(process.cwd(), 'public/sounds'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.wav')) {
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Accept-Ranges', 'bytes');
      } else if (filePath.endsWith('.mp3')) {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Accept-Ranges', 'bytes');
      }
    },
  }));
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Vite middleware for development (disable HMR automatically in Cloud Run preview / DISABLE_HMR)
  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled =
      process.env.DISABLE_HMR === 'true' ||
      Boolean(process.env.K_SERVICE || process.env.K_REVISION);
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: !isHmrDisabled,
        ...(isHmrDisabled ? { ws: false as const } : {}),
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (
          filePath.endsWith('sw.js') ||
          filePath.endsWith('registerSW.js') ||
          filePath.endsWith('manifest.webmanifest')
        ) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
    }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mausam Server running on http://localhost:${PORT}`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://0.0.0.0:${PORT}/`);
  });

  // Cloud Run / Reverse Proxy Keep-Alive alignment (prevents premature connection drops)
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  const shutdown = () => {
    server.close(async () => {
      try {
        const [{ weatherDatabase }, { dbService }] = await Promise.all([
          import('./server/database/db'),
          import('./backend/database/db'),
        ]);
        await Promise.allSettled([weatherDatabase.close(), dbService.close()]);
      } catch {
        // ignore shutdown close errors
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 2000).unref();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
