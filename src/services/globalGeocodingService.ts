// ====================================================================
// MAUSAM - Planet-Wide Location Search & Reverse Geocoding Service
// Combines instant local matching (42 global anchors + Indian network),
// coordinate parsing, and live keyless Open-Meteo Global Geocoding API.
// Never forces international queries into India.
// ====================================================================

import type { LocationRecord } from '../types';
import { GLOBAL_MAJOR_ANCHORS } from '../config/globalMapConfig';
import { parseCoordinateSearchQuery } from '../utils/globalMapCamera';
import { locationService } from './locationService';

const searchCache = new Map<string, LocationRecord[]>();

function mapOpenMeteoGeoResult(item: any): LocationRecord | null {
  const lat = Number(item?.latitude);
  const lng = Number(item?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const city = String(item?.name || '').trim();
  const admin1 = String(item?.admin1 || '').trim();
  const country = String(item?.country || '').trim();
  const countryCode = String(item?.country_code || '').trim().toUpperCase();
  if (!city && !country) return null;

  const stateLabel = admin1 || country || 'Global';
  const parts = [city, admin1 && admin1 !== city ? admin1 : '', country && country !== city ? country : ''].filter(Boolean);
  const displayName = parts.join(', ');

  return {
    id: `geo-${countryCode.toLowerCase() || 'wd'}-${item?.id || `${lat.toFixed(2)}-${lng.toFixed(2)}`}`,
    city: city || country,
    district: admin1 || city || country,
    state: stateLabel,
    country: country || stateLabel,
    name: displayName,
    displayName,
    lat,
    lng,
    timezone: String(item?.timezone || 'UTC'),
    elevation:
      typeof item?.elevation === 'number' && Number.isFinite(item.elevation)
        ? `${Math.round(item.elevation)}m ASL`
        : undefined,
    weatherStation: `${city || country} Global Grid`,
  };
}

/**
 * Synchronous instant search across global anchors, Indian stations, and direct coordinates.
 */
export function searchGlobalLocationsSync(query: string): LocationRecord[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return GLOBAL_MAJOR_ANCHORS.slice(0, 10);
  }

  // 1. Direct coordinate search (e.g. "35.68, 139.77" or "51.5N 0.12W")
  const coords = parseCoordinateSearchQuery(trimmed);
  if (coords) {
    const label = `${Math.abs(coords.lat).toFixed(2)}°${coords.lat >= 0 ? 'N' : 'S'}, ${Math.abs(coords.lng).toFixed(2)}°${coords.lng >= 0 ? 'E' : 'W'}`;
    return [
      {
        id: `coords-${coords.lat.toFixed(3)}-${coords.lng.toFixed(3)}`,
        city: label,
        district: 'Coordinates',
        state: 'Global Coordinates',
        country: 'Global',
        name: label,
        displayName: `Coordinates (${label})`,
        lat: coords.lat,
        lng: coords.lng,
        timezone: 'UTC',
        weatherStation: 'Open-Meteo Coordinate Grid',
      },
    ];
  }

  const q = trimmed.toLowerCase();

  // 2. Match curated global hubs first (cities, countries, continents, IATA aliases)
  const globalMatches = GLOBAL_MAJOR_ANCHORS.filter(
    (a) =>
      a.city.toLowerCase().includes(q) ||
      (a.country || '').toLowerCase().includes(q) ||
      a.state.toLowerCase().includes(q) ||
      a.continent.toLowerCase().includes(q) ||
      a.iso2.toLowerCase() === q ||
      a.displayName.toLowerCase().includes(q) ||
      (a.aliases || []).some((al) => al.toLowerCase().includes(q))
  );

  // 3. Also include local catalog matches (preserving full India search too)
  const localMatches = locationService.searchLocations(trimmed);

  // Merge deduplicated by normalized city + approx coordinates
  const seen = new Set<string>();
  const combined: LocationRecord[] = [];
  for (const loc of [...globalMatches, ...localMatches]) {
    const key = `${loc.city.toLowerCase()}:${loc.lat.toFixed(1)}:${loc.lng.toFixed(1)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(loc);
    if (combined.length >= 12) break;
  }

  return combined;
}

/**
 * Live worldwide geocoding via Open-Meteo Geocoding API merged with local matches.
 */
export async function searchGlobalLocationsAsync(query: string): Promise<LocationRecord[]> {
  const trimmed = query.trim();
  const syncResults = searchGlobalLocationsSync(trimmed);
  if (trimmed.length < 2 || parseCoordinateSearchQuery(trimmed)) {
    return syncResults;
  }

  const cacheKey = trimmed.toLowerCase();
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      trimmed
    )}&count=8&language=en&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return syncResults;

    const data = await res.json();
    const remoteItems: LocationRecord[] = Array.isArray(data?.results)
      ? data.results
          .map(mapOpenMeteoGeoResult)
          .filter((r: LocationRecord | null): r is LocationRecord => Boolean(r))
      : [];

    const seen = new Set<string>();
    const merged: LocationRecord[] = [];
    for (const loc of [...syncResults, ...remoteItems]) {
      const key = `${loc.city.toLowerCase()}:${loc.lat.toFixed(1)}:${loc.lng.toFixed(1)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(loc);
      if (merged.length >= 10) break;
    }

    searchCache.set(cacheKey, merged);
    return merged;
  } catch {
    return syncResults;
  }
}

/**
 * Resolves any clicked lat/lng on Earth to a readable Country / Region / City LocationRecord.
 * Uses keyless BigDataCloud reverse geocode with clean coordinate fallback if offline.
 */
export async function reverseGeocodeGlobalPoint(
  lat: number,
  lng: number,
  hintName?: string
): Promise<LocationRecord> {
  const safeLat = Math.max(-85, Math.min(85, lat));
  const safeLng = ((lng + 180) % 360 + 360) % 360 - 180;
  const coordLabel = `${Math.abs(safeLat).toFixed(2)}°${safeLat >= 0 ? 'N' : 'S'}, ${Math.abs(safeLng).toFixed(2)}°${safeLng >= 0 ? 'E' : 'W'}`;

  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${safeLat.toFixed(
      4
    )}&longitude=${safeLng.toFixed(4)}&localityLanguage=en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (res.ok) {
      const data = await res.json();
      const city = String(data?.city || data?.locality || hintName || '').trim();
      const region = String(data?.principalSubdivision || '').trim();
      const country = String(data?.countryName || '').trim();

      if (city || country) {
        const displayName = [city, region && region !== city ? region : '', country && country !== city ? country : '']
          .filter(Boolean)
          .join(', ');
        return {
          id: `map-${safeLat.toFixed(2)}-${safeLng.toFixed(2)}`,
          city: city || country,
          district: region || city || country,
          state: region || country || 'Oceanic Sector',
          country: country || 'International Waters',
          name: displayName || coordLabel,
          displayName: displayName || coordLabel,
          lat: safeLat,
          lng: safeLng,
          timezone: 'UTC',
          weatherStation: country ? `${city || country} Global Grid` : 'Open-Meteo Marine Grid',
        };
      }
    }
  } catch {
    // Graceful fallback below
  }

  const label = hintName?.trim() || coordLabel;
  return {
    id: `map-${safeLat.toFixed(2)}-${safeLng.toFixed(2)}`,
    city: label,
    district: 'Global Point',
    state: hintName ? 'Selected Region' : 'Global Sector',
    country: hintName || 'Global',
    name: label,
    displayName: hintName ? `${hintName} (${coordLabel})` : coordLabel,
    lat: safeLat,
    lng: safeLng,
    timezone: 'UTC',
    weatherStation: 'Open-Meteo Global Grid',
  };
}
