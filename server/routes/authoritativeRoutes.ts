import { Router, Request, Response } from 'express';
import { AuthoritativeService } from '../authoritative/authoritativeService';
import { parseCoordinates } from '../../shared/weatherContract';

export const authoritativeRouter = Router();

// Full Persona Intelligence Bundle for the active station
authoritativeRouter.get('/persona-bundle', async (req: Request, res: Response) => {
  try {
    const parsed = parseCoordinates(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      return res.status(400).json({ status: 'error', message: parsed.error });
    }
    const { lat, lon: lng } = parsed;
    const city = (req.query.city as string) || 'Selected Location';
    const state = (req.query.state as string) || 'Region';
    const stationName = (req.query.stationName as string) || `${city} Observatory`;

    const parseOptNum = (v: unknown): number | undefined => {
      if (v === undefined || v === null || String(v).trim() === '') return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    const temp = parseOptNum(req.query.temp);
    const humidity = parseOptNum(req.query.humidity);
    const windSpeed = parseOptNum(req.query.windSpeed);
    const windDir = req.query.windDir as string | undefined;
    const uvIndex = parseOptNum(req.query.uvIndex);
    const isRaining = req.query.isRaining === 'true';
    const visibilityKm = parseOptNum(req.query.visibilityKm);
    const sunrise = req.query.sunrise as string | undefined;
    const sunset = req.query.sunset as string | undefined;

    const data = await AuthoritativeService.getPersonaBundle(lat, lng, city, state, stationName, {
      temp,
      humidity,
      windSpeed,
      windDir,
      uvIndex,
      isRaining,
      visibilityKm,
      sunrise,
      sunset,
    });

    res.json({
      status: 'success',
      source: 'MAUSAM Multi-Provider Model Engine',
      fetchedAt: new Date().toISOString(),
      data,
    });
  } catch (err: any) {
    console.error('[authoritativeRouter] Error in /persona-bundle:', err);
    res.status(500).json({
      status: 'error',
      message: err.message || 'Failed to assemble authoritative persona bundle',
    });
  }
});

// Standalone CPCB / Model AQI Endpoint
authoritativeRouter.get('/cpcb-aqi', async (req: Request, res: Response) => {
  try {
    const parsed = parseCoordinates(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      return res.status(400).json({ status: 'error', message: parsed.error });
    }
    const { lat, lon: lng } = parsed;
    const city = (req.query.city as string) || 'Selected Location';
    const stationName = (req.query.stationName as string) || city;

    const aqi = await AuthoritativeService.fetchCPCBOrOpenMeteoAQI(lat, lng, stationName, city);
    res.json({
      status: aqi.aqi !== null ? 'success' : 'error',
      source: aqi.source,
      fetchedAt: new Date().toISOString(),
      data: aqi,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Standalone Marine Waves & SST Endpoint
authoritativeRouter.get('/marine', async (req: Request, res: Response) => {
  try {
    const parsed = parseCoordinates(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      return res.status(400).json({ status: 'error', message: parsed.error });
    }
    const { lat, lon: lng } = parsed;
    const city = (req.query.city as string) || '';
    const state = (req.query.state as string) || '';
    const isCoastal = AuthoritativeService.isLocationCoastal(lat, lng, state, city);

    const marine = await AuthoritativeService.fetchMarineData(lat, lng, isCoastal);
    res.json({
      status: 'success',
      isCoastal,
      data: marine,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Standalone Tides Endpoint
authoritativeRouter.get('/tides', async (req: Request, res: Response) => {
  try {
    const parsed = parseCoordinates(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      return res.status(400).json({ status: 'error', message: parsed.error });
    }
    const { lat, lon: lng } = parsed;
    const stationName = (req.query.stationName as string) || 'Coastal Station';
    const city = (req.query.city as string) || '';
    const state = (req.query.state as string) || '';
    const isCoastal = AuthoritativeService.isLocationCoastal(lat, lng, state, city);

    const tides = await AuthoritativeService.fetchTideData(lat, lng, stationName, isCoastal);
    res.json({
      status: 'success',
      isCoastal,
      data: tides,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Standalone Severe Alerts Endpoint
authoritativeRouter.get('/alerts', async (req: Request, res: Response) => {
  try {
    const parsed = parseCoordinates(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      return res.status(400).json({ status: 'error', message: parsed.error });
    }
    const { lat, lon: lng } = parsed;
    const city = (req.query.city as string) || 'Selected Location';
    const state = (req.query.state as string) || 'Region';

    const alerts = await AuthoritativeService.fetchSevereAlerts(lat, lng, city, state);
    res.json({
      status: 'success',
      data: alerts,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});
