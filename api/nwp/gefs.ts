// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// Dedicated Server-Side GEFS Adapter Route (/api/nwp/gefs)
// Interfaces with NOAA/NCEP/NOMADS GEFS v12 31-member ensemble stream
// NO API KEY REQUIRED - Public NOAA operational data access
// Converts units, normalizes members, calculates spread and probabilities
// NEVER substitutes GFS for GEFS
// ====================================================================

import { gefsProvider } from '../../src/services/nwp/gefsProvider';
import { parseCoordinates } from '../../shared/weatherContract';

export default async function gefsHandler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.writeHead?.(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }) || res.status?.(200);
    return res.end?.();
  }

  try {
    const url = new URL(req.url || '', 'http://localhost');
    const coordCheck = parseCoordinates({
      lat: url.searchParams.get('lat') ?? req.query?.lat,
      lon: url.searchParams.get('lon') ?? req.query?.lon ?? url.searchParams.get('lng') ?? req.query?.lng,
    });
    if (!coordCheck.ok) {
      const errPayload = JSON.stringify({ error: coordCheck.error });
      res.writeHead?.(400, { 'Content-Type': 'application/json' }) || res.status?.(400);
      return res.end?.(errPayload) || res.send?.(errPayload);
    }

    const { lat, lon } = coordCheck;

    const gefsRun = await gefsProvider.getLatestRun(lat, lon);

    const json = JSON.stringify(gefsRun);
    res.writeHead?.(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=1200',
      'Access-Control-Allow-Origin': '*',
      'X-GEFS-Engine': 'NOAA-NCEP-GEFS-v12-31Members',
    }) || res.status?.(200);

    return res.end?.(json) || res.json?.(gefsRun);
  } catch (err: any) {
    const errPayload = JSON.stringify({
      error: 'GEFS server processing failure',
      status: 'UNAVAILABLE',
      details: err.message || 'Upstream connection error',
    });
    res.writeHead?.(500, { 'Content-Type': 'application/json' }) || res.status?.(500);
    return res.end?.(errPayload) || res.send?.(errPayload);
  }
}
