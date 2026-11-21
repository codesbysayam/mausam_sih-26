// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// PostgreSQL Relational Database Service & Connection Pooler
// Idempotent schema bootstrap, parameterized SQL, leak-free pool release,
// bounded in-memory fallback caches, and full forecast/AQI/warning support.
// ====================================================================

import pg from 'pg';
import {
  NormalizedWeather,
  NormalizedForecast,
  NormalizedAQI,
  NormalizedWarningItem,
  GeoLocation,
} from '../normalization/types';

const { Pool } = pg;

const MAX_MEM_ENTRIES = 250;

export interface DatabaseStatus {
  configured: boolean;
  connected: boolean;
  provider: 'POSTGRESQL' | 'NOT_CONFIGURED' | 'IN_MEMORY_STRUCTURED';
  latencyMs?: number | null;
  poolSize?: number;
  lastChecked: string;
  error?: string;
}

const SCHEMA_BOOTSTRAP_SQL = `
  CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT,
    district TEXT,
    state TEXT,
    country TEXT NOT NULL DEFAULT 'India',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    elevation DOUBLE PRECISION,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS weather_observations (
    id BIGSERIAL PRIMARY KEY,
    location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    data_status TEXT NOT NULL,
    temperature DOUBLE PRECISION,
    feels_like DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    dew_point DOUBLE PRECISION,
    pressure DOUBLE PRECISION,
    wind_speed DOUBLE PRECISION,
    wind_direction TEXT,
    wind_direction_degrees DOUBLE PRECISION,
    wind_gust DOUBLE PRECISION,
    precipitation DOUBLE PRECISION,
    cloud_cover DOUBLE PRECISION,
    visibility DOUBLE PRECISION,
    uv_index DOUBLE PRECISION,
    weather_code INTEGER,
    condition TEXT,
    is_day BOOLEAN DEFAULT TRUE,
    raw_attribution TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_weather_obs_loc_time ON weather_observations (location_id, observed_at DESC);

  CREATE TABLE IF NOT EXISTS weather_forecasts (
    location_id TEXT PRIMARY KEY REFERENCES locations(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    model_name TEXT,
    generated_at TIMESTAMPTZ NOT NULL,
    payload_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS air_quality_readings (
    location_id TEXT PRIMARY KEY REFERENCES locations(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    aqi INTEGER,
    category TEXT,
    payload_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS weather_warnings (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    severity TEXT,
    hazard TEXT,
    state TEXT,
    district TEXT,
    issued_at TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    payload_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_weather_warnings_active ON weather_warnings (is_active, updated_at DESC);
`;

function setBounded<K, V>(map: Map<K, V>, key: K, value: V, maxSize = MAX_MEM_ENTRIES): void {
  if (map.has(key)) {
    map.delete(key);
  } else if (map.size >= maxSize) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
  map.set(key, value);
}

function toIsoSafe(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

export class WeatherDatabaseService {
  private static instance: WeatherDatabaseService;
  private pool: pg.Pool | null = null;
  private isPostgresActive = false;
  private schemaReady = false;
  private schemaPromise: Promise<boolean> | null = null;

  // Bounded in-memory repositories used when Postgres is not configured or temporarily unreachable
  private memLocations = new Map<string, GeoLocation>();
  private memObservations = new Map<string, NormalizedWeather[]>();
  private memForecasts = new Map<string, NormalizedForecast>();
  private memWarnings = new Map<string, NormalizedWarningItem>();
  private memAQI = new Map<string, NormalizedAQI>();

  private constructor() {
    this.initializeConnection();
  }

  public static getInstance(): WeatherDatabaseService {
    if (!WeatherDatabaseService.instance) {
      WeatherDatabaseService.instance = new WeatherDatabaseService();
    }
    return WeatherDatabaseService.instance;
  }

  private initializeConnection(): void {
    const connectionString = (process.env.POSTGRES_URL || process.env.DATABASE_URL || '').trim();

    if (!connectionString) {
      this.isPostgresActive = false;
      this.pool = null;
      return;
    }

    try {
      const disableSsl =
        connectionString.includes('localhost') ||
        connectionString.includes('127.0.0.1') ||
        connectionString.includes('sslmode=disable');

      this.pool = new Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: disableSsl ? false : { rejectUnauthorized: false },
      });

      this.pool.on('error', (err) => {
        console.warn('[Mausam DB] Unexpected idle client error:', err.message);
      });

      this.isPostgresActive = true;
    } catch (err: any) {
      console.warn('[Mausam DB] Failed to create PostgreSQL pool:', err.message);
      this.isPostgresActive = false;
      this.pool = null;
    }
  }

  private async ensureSchema(): Promise<boolean> {
    if (!this.pool || !this.isPostgresActive) return false;
    if (this.schemaReady) return true;
    if (this.schemaPromise) return this.schemaPromise;

    this.schemaPromise = (async () => {
      let client: pg.PoolClient | null = null;
      try {
        client = await this.pool!.connect();
        await client.query(SCHEMA_BOOTSTRAP_SQL);
        this.schemaReady = true;
        return true;
      } catch (err: any) {
        console.warn('[Mausam DB] Schema bootstrap warning:', err.message);
        return false;
      } finally {
        if (client) client.release();
        this.schemaPromise = null;
      }
    })();

    return this.schemaPromise;
  }

  public async getStatus(): Promise<DatabaseStatus> {
    const now = new Date().toISOString();
    if (!this.pool || !this.isPostgresActive) {
      return {
        configured: false,
        connected: false,
        provider: 'NOT_CONFIGURED',
        latencyMs: null,
        lastChecked: now,
      };
    }

    const start = Date.now();
    let client: pg.PoolClient | null = null;
    try {
      client = await this.pool.connect();
      await client.query('SELECT 1');
      return {
        configured: true,
        connected: true,
        provider: 'POSTGRESQL',
        latencyMs: Math.max(0, Date.now() - start),
        poolSize: this.pool.totalCount,
        lastChecked: now,
      };
    } catch (err: any) {
      return {
        configured: true,
        connected: false,
        provider: 'POSTGRESQL',
        latencyMs: null,
        lastChecked: now,
        error: err.message,
      };
    } finally {
      if (client) client.release();
    }
  }

  public async upsertLocation(loc: GeoLocation): Promise<string> {
    const id = loc.id || `loc_${loc.latitude.toFixed(4)}_${loc.longitude.toFixed(4)}`;
    setBounded(this.memLocations, id, { ...loc, id });

    if (this.pool && this.isPostgresActive && (await this.ensureSchema())) {
      try {
        await this.pool.query(
          `INSERT INTO locations (id, name, city, district, state, country, latitude, longitude, elevation, timezone, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             city = EXCLUDED.city,
             district = EXCLUDED.district,
             state = EXCLUDED.state,
             country = EXCLUDED.country,
             latitude = EXCLUDED.latitude,
             longitude = EXCLUDED.longitude,
             elevation = EXCLUDED.elevation,
             timezone = EXCLUDED.timezone,
             updated_at = NOW()`,
          [
            id,
            loc.name,
            loc.city || null,
            loc.district || null,
            loc.state || null,
            loc.country || 'India',
            loc.latitude,
            loc.longitude,
            loc.elevation ?? null,
            loc.timezone || 'Asia/Kolkata',
          ]
        );
      } catch (err: any) {
        console.warn('[Mausam DB] upsertLocation fallback:', err.message);
      }
    }

    return id;
  }

  public async saveWeatherObservation(obs: NormalizedWeather): Promise<void> {
    const locId = await this.upsertLocation(obs.location);
    const list = this.memObservations.get(locId) || [];
    list.unshift(obs);
    if (list.length > 50) list.pop();
    setBounded(this.memObservations, locId, list);

    if (this.pool && this.isPostgresActive && (await this.ensureSchema())) {
      try {
        await this.pool.query(
          `INSERT INTO weather_observations (
            location_id, source, observed_at, data_status,
            temperature, feels_like, humidity, dew_point, pressure,
            wind_speed, wind_direction, wind_direction_degrees, wind_gust,
            precipitation, cloud_cover, visibility, uv_index,
            weather_code, condition, is_day, raw_attribution
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
          [
            locId,
            obs.source,
            obs.observedAt,
            obs.dataStatus,
            obs.temperature,
            obs.feelsLike,
            obs.humidity,
            obs.dewPoint,
            obs.pressure,
            obs.windSpeed,
            obs.windDirection,
            obs.windDirectionDegrees,
            obs.windGust,
            obs.precipitation,
            obs.cloudCover,
            obs.visibility,
            obs.uvIndex,
            obs.weatherCode,
            obs.condition,
            obs.isDay,
            obs.rawSourceAttribution || null,
          ]
        );
      } catch (err: any) {
        console.warn('[Mausam DB] saveWeatherObservation fallback:', err.message);
      }
    }
  }

  public async getLatestObservation(locationId: string): Promise<NormalizedWeather | null> {
    if (this.pool && this.isPostgresActive && (await this.ensureSchema())) {
      try {
        const res = await this.pool.query(
          `SELECT o.*, l.name AS loc_name, l.city AS loc_city, l.district AS loc_district,
                  l.state AS loc_state, l.country AS loc_country, l.latitude AS loc_lat, l.longitude AS loc_lon
           FROM weather_observations o
           LEFT JOIN locations l ON l.id = o.location_id
           WHERE o.location_id = $1
           ORDER BY o.observed_at DESC
           LIMIT 1`,
          [locationId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          const lat = Number(row.loc_lat);
          const lon = Number(row.loc_lon);
          return {
            location: {
              id: locationId,
              name: row.loc_name || 'Location',
              city: row.loc_city || undefined,
              district: row.loc_district || undefined,
              state: row.loc_state || undefined,
              country: row.loc_country || 'India',
              latitude: Number.isFinite(lat) ? lat : 0,
              longitude: Number.isFinite(lon) ? lon : 0,
            },
            source: row.source,
            sourcePriority: 1,
            dataStatus: row.data_status,
            observedAt: toIsoSafe(row.observed_at),
            fetchedAt: toIsoSafe(row.created_at),
            ageSeconds: Math.max(0, Math.round((Date.now() - new Date(toIsoSafe(row.observed_at)).getTime()) / 1000)),
            temperature: row.temperature !== null ? Number(row.temperature) : null,
            feelsLike: row.feels_like !== null ? Number(row.feels_like) : null,
            humidity: row.humidity !== null ? Number(row.humidity) : null,
            dewPoint: row.dew_point !== null ? Number(row.dew_point) : null,
            pressure: row.pressure !== null ? Number(row.pressure) : null,
            windSpeed: row.wind_speed !== null ? Number(row.wind_speed) : null,
            windDirection: row.wind_direction || 'N/A',
            windDirectionDegrees: row.wind_direction_degrees !== null ? Number(row.wind_direction_degrees) : null,
            windGust: row.wind_gust !== null ? Number(row.wind_gust) : null,
            precipitation: row.precipitation !== null ? Number(row.precipitation) : null,
            cloudCover: row.cloud_cover !== null ? Number(row.cloud_cover) : null,
            visibility: row.visibility !== null ? Number(row.visibility) : null,
            uvIndex: row.uv_index !== null ? Number(row.uv_index) : null,
            weatherCode: row.weather_code !== null ? Number(row.weather_code) : null,
            condition: row.condition || 'Unavailable',
            isDay: Boolean(row.is_day),
            isFallback: false,
            rawSourceAttribution: row.raw_attribution || '',
          };
        }
      } catch (err: any) {
        console.warn('[Mausam DB] getLatestObservation fallback:', err.message);
      }
    }

    const list = this.memObservations.get(locationId);
    return list && list.length > 0 ? list[0] : null;
  }

  public async saveForecast(forecast: NormalizedForecast): Promise<void> {
    const locId = await this.upsertLocation(forecast.location);
    setBounded(this.memForecasts, locId, forecast);

    if (this.pool && this.isPostgresActive && (await this.ensureSchema())) {
      try {
        await this.pool.query(
          `INSERT INTO weather_forecasts (location_id, source, model_name, generated_at, payload_json, updated_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
           ON CONFLICT (location_id) DO UPDATE SET
             source = EXCLUDED.source,
             model_name = EXCLUDED.model_name,
             generated_at = EXCLUDED.generated_at,
             payload_json = EXCLUDED.payload_json,
             updated_at = NOW()`,
          [
            locId,
            forecast.source,
            forecast.model || 'Open-Meteo',
            forecast.generatedAt,
            JSON.stringify(forecast),
          ]
        );
      } catch (err: any) {
        console.warn('[Mausam DB] saveForecast fallback:', err.message);
      }
    }
  }

  public async getForecast(locationId: string): Promise<NormalizedForecast | null> {
    if (this.pool && this.isPostgresActive && (await this.ensureSchema())) {
      try {
        const res = await this.pool.query(
          `SELECT payload_json FROM weather_forecasts WHERE location_id = $1 LIMIT 1`,
          [locationId]
        );
        if (res.rows.length > 0 && res.rows[0].payload_json) {
          return res.rows[0].payload_json as NormalizedForecast;
        }
      } catch (err: any) {
        console.warn('[Mausam DB] getForecast fallback:', err.message);
      }
    }
    return this.memForecasts.get(locationId) || null;
  }

  public async saveAQI(aqi: NormalizedAQI): Promise<void> {
    const locId = await this.upsertLocation(aqi.location);
    setBounded(this.memAQI, locId, aqi);

    if (this.pool && this.isPostgresActive && (await this.ensureSchema())) {
      try {
        await this.pool.query(
          `INSERT INTO air_quality_readings (location_id, source, observed_at, aqi, category, payload_json, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
           ON CONFLICT (location_id) DO UPDATE SET
             source = EXCLUDED.source,
             observed_at = EXCLUDED.observed_at,
             aqi = EXCLUDED.aqi,
             category = EXCLUDED.category,
             payload_json = EXCLUDED.payload_json,
             updated_at = NOW()`,
          [
            locId,
            aqi.source,
            aqi.observedAt,
            aqi.aqi ?? null,
            aqi.category || null,
            JSON.stringify(aqi),
          ]
        );
      } catch (err: any) {
        console.warn('[Mausam DB] saveAQI fallback:', err.message);
      }
    }
  }

  public async getAQI(locationId: string): Promise<NormalizedAQI | null> {
    if (this.pool && this.isPostgresActive && (await this.ensureSchema())) {
      try {
        const res = await this.pool.query(
          `SELECT payload_json FROM air_quality_readings WHERE location_id = $1 LIMIT 1`,
          [locationId]
        );
        if (res.rows.length > 0 && res.rows[0].payload_json) {
          return res.rows[0].payload_json as NormalizedAQI;
        }
      } catch (err: any) {
        console.warn('[Mausam DB] getAQI fallback:', err.message);
      }
    }
    return this.memAQI.get(locationId) || null;
  }

  public async saveWarnings(warnings: NormalizedWarningItem[]): Promise<void> {
    for (const w of warnings) {
      setBounded(this.memWarnings, w.id, w);
      if (this.pool && this.isPostgresActive && (await this.ensureSchema())) {
        try {
          await this.pool.query(
            `INSERT INTO weather_warnings (id, source, severity, hazard, state, district, issued_at, valid_until, is_active, payload_json, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,NOW())
             ON CONFLICT (id) DO UPDATE SET
               source = EXCLUDED.source,
               severity = EXCLUDED.severity,
               hazard = EXCLUDED.hazard,
               state = EXCLUDED.state,
               district = EXCLUDED.district,
               issued_at = EXCLUDED.issued_at,
               valid_until = EXCLUDED.valid_until,
               is_active = EXCLUDED.is_active,
               payload_json = EXCLUDED.payload_json,
               updated_at = NOW()`,
            [
              w.id,
              w.source,
              w.severity || null,
              w.hazard || null,
              w.state || null,
              w.district || null,
              w.issuedAt || null,
              w.validUntil || null,
              w.isActive !== false,
              JSON.stringify(w),
            ]
          );
        } catch (err: any) {
          console.warn('[Mausam DB] saveWarnings fallback:', err.message);
        }
      }
    }
  }

  public async getActiveWarnings(state?: string): Promise<NormalizedWarningItem[]> {
    if (this.pool && this.isPostgresActive && (await this.ensureSchema())) {
      try {
        const res = state
          ? await this.pool.query(
              `SELECT payload_json FROM weather_warnings WHERE is_active = TRUE AND LOWER(state) = LOWER($1) ORDER BY updated_at DESC LIMIT 100`,
              [state]
            )
          : await this.pool.query(
              `SELECT payload_json FROM weather_warnings WHERE is_active = TRUE ORDER BY updated_at DESC LIMIT 100`
            );
        if (res.rows.length > 0) {
          return res.rows.map((r) => r.payload_json as NormalizedWarningItem);
        }
      } catch (err: any) {
        console.warn('[Mausam DB] getActiveWarnings fallback:', err.message);
      }
    }

    const all = Array.from(this.memWarnings.values()).filter((w) => w.isActive !== false);
    if (state) {
      const target = state.toLowerCase();
      return all.filter((w) => (w.state || '').toLowerCase() === target);
    }
    return all;
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end().catch(() => {});
      this.pool = null;
      this.isPostgresActive = false;
      this.schemaReady = false;
    }
  }
}

export const weatherDatabase = WeatherDatabaseService.getInstance();
