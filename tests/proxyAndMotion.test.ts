import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  OfficialTelemetryGateway,
  redactSecrets,
  resolveCpcbConfig,
} from '../src/services/weather/officialProxyGateway';
import {
  getResponsiveMotionProfile,
  classifyWeatherAtmosphere,
} from '../src/motion/tokens';

function makeJsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('OfficialTelemetryGateway — IMD & CPCB Proxy Fallback Abstraction', () => {
  it('automatically switches to Open-Meteo proxy when IMD is unconfigured', async () => {
    const gw = new OfficialTelemetryGateway();
    let requestedUrls: string[] = [];

    const mockFetch: typeof fetch = async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      requestedUrls.push(url);
      return makeJsonResponse(200, {
        current: {
          temperature_2m: 30.2,
          relative_humidity_2m: 72,
          wind_speed_10m: 11.4,
          precipitation: 0,
          surface_pressure: 1009,
          time: '2026-11-22T12:00',
        },
      });
    };

    const result = await gw.fetchWeatherWithFallback(20.2961, 85.8245, {
      deps: {
        env: {},
        fetchImpl: mockFetch,
        proxyBaseUrl: 'http://localhost:3000',
      },
    });

    assert.equal(result.meta.primaryProvider, 'IMD');
    assert.equal(result.meta.providerUsed, 'OPEN_METEO_PROXY');
    assert.equal(result.meta.fallbackUsed, true);
    assert.equal(result.meta.fallbackReason, 'UNCONFIGURED');
    assert.equal(result.current?.temperatureC, 30.2);
    assert.equal(requestedUrls.length, 1);
    assert.ok(requestedUrls[0].includes('/api/proxy/open-meteo'));
  });

  it('activates auth cooldown circuit breaker on HTTP 401/403 from IMD and skips official endpoint during cooldown', async () => {
    const gw = new OfficialTelemetryGateway({ authCooldownMs: 60_000 });
    let nowMs = 1_700_000_000_000;
    const requestedUrls: string[] = [];

    const mockFetch: typeof fetch = async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      requestedUrls.push(url);
      if (url.includes('mausam.imd.gov.in')) {
        return makeJsonResponse(403, { error: 'Forbidden' });
      }
      return makeJsonResponse(200, {
        current: {
          temperature_2m: 28.5,
          relative_humidity_2m: 66,
          wind_speed_10m: 8.2,
          time: '2026-11-22T12:00',
        },
      });
    };

    const env = {
      IMD_API_ENABLED: 'true',
      IMD_API_BASE_URL: 'https://mausam.imd.gov.in/api/v1',
      IMD_API_KEY: 'super-secret-imd-key',
    };

    // First call hits IMD -> receives 403 -> falls back to Open-Meteo proxy
    const first = await gw.fetchWeatherWithFallback(20.2961, 85.8245, {
      deps: { env, fetchImpl: mockFetch, now: () => nowMs, proxyBaseUrl: 'http://localhost:3000' },
    });
    assert.equal(first.meta.providerUsed, 'OPEN_METEO_PROXY');
    assert.equal(first.meta.fallbackReason, 'AUTH_ERROR');
    assert.equal(first.meta.httpStatus, 403);
    assert.equal(first.meta.cooldownActive, true);
    assert.equal(requestedUrls.length, 2);

    // Second call within cooldown window skips IMD completely
    nowMs += 10_000;
    const second = await gw.fetchWeatherWithFallback(20.2961, 85.8245, {
      deps: { env, fetchImpl: mockFetch, now: () => nowMs, proxyBaseUrl: 'http://localhost:3000' },
    });
    assert.equal(second.meta.fallbackReason, 'AUTH_COOLDOWN');
    assert.equal(second.meta.cooldownActive, true);
    assert.equal(requestedUrls.length, 3); // only Open-Meteo proxy called
    assert.ok(requestedUrls[2].includes('/api/proxy/open-meteo'));
  });

  it('switches CPCB requests to Open-Meteo Air Quality proxy on unconfigured or 401 auth failure', async () => {
    const gw = new OfficialTelemetryGateway({ authCooldownMs: 60_000 });
    let nowMs = 1_700_000_000_000;

    const mockFetch: typeof fetch = async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('cpcbccr.com')) {
        return makeJsonResponse(401, { message: 'Unauthorized' });
      }
      return makeJsonResponse(200, {
        current: {
          us_aqi: 92,
          pm2_5: 31.4,
          pm10: 58.2,
          nitrogen_dioxide: 14.1,
          sulphur_dioxide: 6.3,
          carbon_monoxide: 410,
          ozone: 42.5,
          time: '2026-11-22T12:00',
        },
      });
    };

    const result = await gw.fetchAqiWithFallback(28.6139, 77.209, {
      deps: {
        env: {
          CPCB_API_KEY: 'invalid-cpcb-token-1234',
          CPCB_BASE_URL: 'https://app.cpcbccr.com/caaqms',
        },
        fetchImpl: mockFetch,
        now: () => nowMs,
        proxyBaseUrl: 'http://localhost:3000',
      },
    });

    assert.equal(result.available, true);
    assert.equal(result.meta.primaryProvider, 'CPCB');
    assert.equal(result.meta.providerUsed, 'OPEN_METEO_PROXY');
    assert.equal(result.meta.fallbackUsed, true);
    assert.equal(result.meta.fallbackReason, 'AUTH_ERROR');
    assert.equal(result.meta.httpStatus, 401);
    assert.equal(result.data?.aqi, 92);
    assert.equal(result.data?.pm25, 31.4);
    assert.equal(result.data?.scale, 'US_EPA_AQI');
  });

  it('rejects private/non-HTTPS CPCB base URLs and redacts secrets from logs', () => {
    const cfg = resolveCpcbConfig({
      CPCB_API_KEY: 'live-secret-token',
      CPCB_BASE_URL: 'http://127.0.0.1:9000/internal',
    });
    assert.equal(cfg.enabled, false);

    const sanitized = redactSecrets(
      'Failed connecting with key live-secret-token and bearer abcdef123456',
      ['live-secret-token', 'abcdef123456']
    );
    assert.ok(!sanitized.includes('live-secret-token'));
    assert.ok(!sanitized.includes('abcdef123456'));
    assert.ok(sanitized.includes('[REDACTED]'));
  });
});

describe('Motion Architecture — Responsive Profiles & Atmosphere Classifier', () => {
  it('disables decorative motion when reducedMotion is requested', () => {
    const profile = getResponsiveMotionProfile(1440, true, false);
    assert.equal(profile.reducedMotion, true);
    assert.equal(profile.allowParallax, false);
    assert.equal(profile.allowMagnetic, false);
    assert.equal(profile.ambientIntensity, 'static');
    assert.equal(profile.durationScale, 0);
  });

  it('scales motion responsibly across desktop, tablet, and mobile tiers', () => {
    const desktop = getResponsiveMotionProfile(1440, false, false);
    const tablet = getResponsiveMotionProfile(820, false, true);
    const mobile = getResponsiveMotionProfile(390, false, true);

    assert.equal(desktop.tier, 'desktop');
    assert.equal(desktop.allowParallax, true);
    assert.equal(desktop.ambientIntensity, 'full');

    assert.equal(tablet.tier, 'tablet');
    assert.equal(tablet.allowParallax, false);
    assert.equal(tablet.ambientIntensity, 'subtle');

    assert.equal(mobile.tier, 'mobile');
    assert.equal(mobile.allowHoverLift, false);
    assert.equal(mobile.ambientIntensity, 'static');
  });

  it('classifies meteorological condition strings into deterministic atmosphere moods', () => {
    assert.equal(classifyWeatherAtmosphere('Severe Thunderstorm with Lightning', true), 'THUNDERSTORM');
    assert.equal(classifyWeatherAtmosphere('Heavy Monsoon Rain Showers', true), 'RAIN');
    assert.equal(classifyWeatherAtmosphere('Dense Fog & Mist', false), 'FOG');
    assert.equal(classifyWeatherAtmosphere('Light Snowfall', true), 'SNOW');
    assert.equal(classifyWeatherAtmosphere('Overcast Skies', true), 'CLOUDY');
    assert.equal(classifyWeatherAtmosphere('Clear Sky', true), 'CLEAR_DAY');
    assert.equal(classifyWeatherAtmosphere('Clear Sky', false), 'CLEAR_NIGHT');
  });
});
