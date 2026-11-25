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

  it('tracks auth cooldown circuit breaker state cleanly via markAuthFailure and clearCooldown', () => {
    const gw = new OfficialTelemetryGateway({ authCooldownMs: 60_000 });
    const nowMs = 1_700_000_000_000;

    assert.equal(gw.isAuthCooldownActive('IMD', nowMs), false);
    gw.markAuthFailure('IMD', 403, nowMs);
    assert.equal(gw.isAuthCooldownActive('IMD', nowMs + 10_000), true);
    assert.equal(gw.getCircuitStatus(nowMs + 10_000).IMD.httpStatus, 403);
    assert.equal(gw.isAuthCooldownActive('IMD', nowMs + 61_000), false);
    gw.clearCooldown();
    assert.equal(gw.isAuthCooldownActive('IMD', nowMs), false);
  });

  it('switches CPCB requests to public Open-Meteo Air Quality proxy in keyless mode', async () => {
    const gw = new OfficialTelemetryGateway({ authCooldownMs: 60_000 });
    const nowMs = 1_700_000_000_000;
    const requestedUrls: string[] = [];

    const mockFetch: typeof fetch = async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      requestedUrls.push(url);
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
        env: {},
        fetchImpl: mockFetch,
        now: () => nowMs,
        proxyBaseUrl: 'http://localhost:3000',
      },
    });

    assert.equal(result.available, true);
    assert.equal(result.meta.primaryProvider, 'CPCB');
    assert.equal(result.meta.providerUsed, 'OPEN_METEO_PROXY');
    assert.equal(result.meta.fallbackUsed, true);
    assert.equal(result.meta.fallbackReason, 'UNCONFIGURED');
    assert.equal(result.data?.aqi, 92);
    assert.equal(result.data?.pm25, 31.4);
    assert.equal(result.data?.scale, 'US_EPA_AQI');
    assert.equal(requestedUrls.length, 1);
    assert.ok(requestedUrls[0].includes('/api/proxy/air-quality'));
  });

  it('keeps optional direct CPCB integration disabled by default and redacts secrets from logs', () => {
    const cfg = resolveCpcbConfig({});
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
