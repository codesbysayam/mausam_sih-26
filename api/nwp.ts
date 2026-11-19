// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// Consolidated NWP Gateway (/api/nwp)
// Handles multi-model requests (WRF, GEFS, ECMWF) server-side
// Enforces timeouts, validates responses, and prevents cross-model failures.
// ====================================================================

import { nwpService } from '../src/services/nwp/nwpService';
import { NWPModelId } from '../src/data/nwpModels';
import { parseCoordinates } from '../shared/weatherContract';

export default async function nwpHandler(req: any, res: any) {
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
    const nameParam = url.searchParams.get('name') || req.query?.name || 'Selected Station';
    const modelsParam = url.searchParams.get('models') || req.query?.models || 'WRF,GEFS,ECMWF';

    const requestedModels = modelsParam
      .split(',')
      .map((m: string) => m.trim().toUpperCase())
      .filter((m: string): m is NWPModelId => m === 'WRF' || m === 'GEFS' || m === 'ECMWF');

    const modelsToFetch: NWPModelId[] = requestedModels.length > 0 ? requestedModels : ['WRF', 'GEFS', 'ECMWF'];

    const dataset = await nwpService.getFullDataset(lat, lon, nameParam, modelsToFetch);

    const json = JSON.stringify(dataset);
    res.writeHead?.(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600',
      'Access-Control-Allow-Origin': '*',
      'X-NWP-Engine': 'MAUSAM-NWP-v3',
    }) || res.status?.(200);

    return res.end?.(json) || res.json?.(dataset);
  } catch (err: any) {
    const errPayload = JSON.stringify({
      error: 'NWP server processing failure',
      details: err.message || 'Unknown error',
    });
    res.writeHead?.(500, { 'Content-Type': 'application/json' }) || res.status?.(500);
    return res.end?.(errPayload) || res.send?.(errPayload);
  }
}
