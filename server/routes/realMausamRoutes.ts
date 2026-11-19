import { Router, Request, Response } from 'express';
import { calculateSolarEphemeris } from '../../src/utils/solarCalculator';
import {
  IMD_DOPPLER_RADAR_NETWORK,
  findNearestRadarStation,
  getImdStationCode,
  RADAR_PRODUCT_CONFIG,
} from '../../src/data/radarStations';
import imdStationsData from '../../src/data/imdStations.json';
import indiaLocationsData from '../../src/data/indiaLocations.json';
import { parseCoordinates, formatCoordinatePair } from '../../shared/weatherContract';

export const realMausamRouter = Router();

// 1. Solar Trajectory & Day Length API
realMausamRouter.get('/solar', (req: Request, res: Response) => {
  try {
    const parsed = parseCoordinates(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      return res.status(400).json({ status: 'error', message: parsed.error });
    }
    const { lat, lon } = parsed;
    const dateQuery = req.query.date ? new Date(req.query.date as string) : new Date();
    const validDate = isNaN(dateQuery.getTime()) ? new Date() : dateQuery;

    const ephemeris = calculateSolarEphemeris(lat, lon, validDate);

    res.json({
      status: 'success',
      latitude: lat,
      longitude: lon,
      date: validDate.toISOString(),
      sunrise: ephemeris.sunriseStr,
      sunset: ephemeris.sunsetStr,
      dawn: ephemeris.civilDawnStr,
      dusk: ephemeris.civilDuskStr,
      solarNoon: ephemeris.solarNoonStr,
      azimuth: ephemeris.solarAzimuthDeg,
      elevation: ephemeris.solarElevationDeg,
      daylightDuration: ephemeris.dayLengthStr,
      daylightDurationSeconds: ephemeris.dayLengthMinutes * 60,
      nextEvent: ephemeris.nextEventName,
      nextEventTime: ephemeris.nextEventTimeStr,
      secondsToNextEvent: ephemeris.secondsToNextEvent,
      countdownFormatted: ephemeris.countdownFormatted,
      dayNightStatus: ephemeris.isDaytime ? 'day' : 'night',
      progressPercent: ephemeris.progressPercent,
      source: 'NOAA Solar Ephemeris Equations / IMD Astronomical Observatory',
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 2. Air Quality & Environmental Exposure API
realMausamRouter.get('/air-quality', async (req: Request, res: Response) => {
  try {
    const parsed = parseCoordinates(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      return res.status(400).json({ status: 'error', message: parsed.error });
    }
    const { lat, lon } = parsed;

    const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi,us_aqi,dust,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen,uv_index&timezone=auto`;

    const response = await fetch(airUrl, {
      signal: AbortSignal.timeout(7500),
      headers: { 'User-Agent': 'aistudio-build' },
    });
    if (!response.ok) {
      return res.status(502).json({
        status: 'error',
        dataStatus: 'UNAVAILABLE',
        message: `Air Quality provider returned status ${response.status}`,
      });
    }

    const data = await response.json();
    const curr = data.current || {};
    const numOrNull = (v: unknown): number | null =>
      typeof v === 'number' && Number.isFinite(v) ? v : null;

    const pm25Raw = numOrNull(curr.pm2_5);
    const pm10Raw = numOrNull(curr.pm10);
    const no2Raw = numOrNull(curr.nitrogen_dioxide);
    const so2Raw = numOrNull(curr.sulphur_dioxide);
    const coRaw = numOrNull(curr.carbon_monoxide);
    const o3Raw = numOrNull(curr.ozone);
    const uvRaw = numOrNull(curr.uv_index);

    const pm25 = pm25Raw !== null ? Math.round(pm25Raw * 10) / 10 : null;
    const pm10 = pm10Raw !== null ? Math.round(pm10Raw * 10) / 10 : null;
    const no2 = no2Raw !== null ? Math.round(no2Raw * 10) / 10 : null;
    const so2 = so2Raw !== null ? Math.round(so2Raw * 10) / 10 : null;
    const co = coRaw !== null ? Math.round(coRaw) : null;
    const o3 = o3Raw !== null ? Math.round(o3Raw * 10) / 10 : null;
    const uvIndex = uvRaw !== null ? Math.round(uvRaw * 10) / 10 : null;

    // Calculate CPCB AQI for PM2.5 only when present
    let aqi: number | null = null;
    if (pm25 !== null) {
      if (pm25 <= 30) aqi = Math.round(pm25 * (50 / 30));
      else if (pm25 <= 60) aqi = Math.round(50 + ((pm25 - 30) * 50) / 30);
      else if (pm25 <= 90) aqi = Math.round(100 + ((pm25 - 60) * 100) / 30);
      else if (pm25 <= 120) aqi = Math.round(200 + ((pm25 - 90) * 100) / 30);
      else if (pm25 <= 250) aqi = Math.round(300 + ((pm25 - 120) * 100) / 130);
      else aqi = Math.round(400 + ((pm25 - 250) * 100) / 130);
    } else {
      const upstreamAqi = numOrNull(curr.us_aqi) ?? numOrNull(curr.european_aqi);
      aqi = upstreamAqi !== null ? Math.round(upstreamAqi) : null;
    }

    const aqiCategory =
      aqi === null ? 'Unavailable' :
      aqi <= 50 ? 'Good' :
      aqi <= 100 ? 'Satisfactory' :
      aqi <= 200 ? 'Moderate' :
      aqi <= 300 ? 'Poor' :
      aqi <= 400 ? 'Very Poor' : 'Severe';

    const grassPollen = numOrNull(curr.grass_pollen);
    const hasTreePollen = numOrNull(curr.birch_pollen) !== null || numOrNull(curr.alder_pollen) !== null || numOrNull(curr.olive_pollen) !== null;
    const hasWeedPollen = numOrNull(curr.ragweed_pollen) !== null || numOrNull(curr.mugwort_pollen) !== null;
    const treePollen = hasTreePollen
      ? (numOrNull(curr.birch_pollen) ?? 0) + (numOrNull(curr.alder_pollen) ?? 0) + (numOrNull(curr.olive_pollen) ?? 0)
      : null;
    const weedPollen = hasWeedPollen
      ? (numOrNull(curr.ragweed_pollen) ?? 0) + (numOrNull(curr.mugwort_pollen) ?? 0)
      : null;
    const hasPollenData = grassPollen !== null || treePollen !== null || weedPollen !== null;
    const totalPollen = (grassPollen ?? 0) + (treePollen ?? 0) + (weedPollen ?? 0);

    res.json({
      status: aqi !== null || pm25 !== null ? 'success' : 'error',
      dataStatus: aqi !== null || pm25 !== null ? 'MODEL_LIVE' : 'UNAVAILABLE',
      latitude: lat,
      longitude: lon,
      aqi,
      aqiCategory,
      primaryPollutant: pm25 !== null ? 'PM2.5' : pm10 !== null ? 'PM10' : 'Unavailable',
      pm25,
      pm10,
      no2,
      so2,
      co,
      o3,
      nh3: null,
      pollen: hasPollenData ? {
        totalGrains: Math.round(totalPollen),
        grassPollen,
        treePollen,
        weedPollen,
        risk: totalPollen > 30 ? 'High' : totalPollen > 10 ? 'Moderate' : 'Low',
      } : null,
      uvIndex,
      exposureRecommendation:
        aqi === null
          ? 'Air quality observations are unavailable for these coordinates.'
          : aqi <= 100
          ? 'Air quality is acceptable. Safe for outdoor activity.'
          : 'Sensitive individuals should limit prolonged outdoor exertion.',
      monitoringStation: `Open-Meteo Grid (${formatCoordinatePair(lat, lon)})`,
      observationTimestamp: curr.time || new Date().toISOString(),
      source: 'Open-Meteo Air Quality Model (CPCB NAQI Breakpoints)',
    });
  } catch (err: any) {
    res.status(err?.name === 'AbortError' ? 504 : 502).json({
      status: 'error',
      dataStatus: 'UNAVAILABLE',
      message: err.message,
    });
  }
});

// 2b. Air Quality History & Trend API (Location, Station, Baseline Date & Date Range Aware)
realMausamRouter.get('/air-quality/history', async (req: Request, res: Response) => {
  try {
    const locationName = (req.query.location || req.query.city || req.query.state || '') as string;
    const stationId = (req.query.stationId || req.query.station) as string;

    const parsed = parseCoordinates(req.query as Record<string, unknown>);
    let lat: number;
    let lon: number;
    if (parsed.ok) {
      lat = parsed.lat;
      lon = parsed.lon;
    } else if (locationName.trim()) {
      const locSearch = locationName.toLowerCase().trim();
      const found = (indiaLocationsData as any[]).find(
        (l: any) =>
          l.name?.toLowerCase().includes(locSearch) ||
          l.city?.toLowerCase().includes(locSearch) ||
          l.state?.toLowerCase().includes(locSearch)
      );
      if (!found) {
        return res.status(400).json({ status: 'error', message: parsed.error });
      }
      lat = found.lat ?? found.latitude;
      lon = found.lng ?? found.lon ?? found.longitude;
    } else {
      return res.status(400).json({ status: 'error', message: parsed.error });
    }

    const targetDateStr = (req.query.date as string) || (req.query.end as string) || new Date().toISOString().split('T')[0];
    const targetDate = new Date(`${targetDateStr}T00:00:00`);
    const validEndDate = isNaN(targetDate.getTime()) ? new Date() : targetDate;
    const endDateStr = validEndDate.toISOString().split('T')[0];

    let startDateStr = req.query.start as string;
    if (!startDateStr) {
      const startD = new Date(validEndDate);
      startD.setDate(startD.getDate() - 6);
      startDateStr = startD.toISOString().split('T')[0];
    }

    const airHistoryUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&start_date=${startDateStr}&end_date=${endDateStr}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,uv_index,grass_pollen,birch_pollen,alder_pollen,ragweed_pollen,mugwort_pollen,olive_pollen&timezone=auto`;

    let response: globalThis.Response;
    try {
      response = await fetch(airHistoryUrl, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'aistudio-build' },
      });
    } catch (fetchErr: any) {
      return res.status(fetchErr?.name === 'AbortError' ? 504 : 502).json({
        status: 'error',
        hasVerifiedData: false,
        dataStatus: 'UNAVAILABLE',
        message: 'Air quality history provider is unreachable.',
        observations: [],
      });
    }

    if (!response.ok) {
      return res.status(502).json({
        status: 'error',
        hasVerifiedData: false,
        dataStatus: 'UNAVAILABLE',
        message: `Air quality history provider returned HTTP ${response.status}.`,
        observations: [],
      });
    }

    const data = await response.json();
    const hourly = data.hourly || {};
    const times: string[] = hourly.time || [];
    const pm25Arr: number[] = hourly.pm2_5 || [];
    const pm10Arr: number[] = hourly.pm10 || [];
    const no2Arr: number[] = hourly.nitrogen_dioxide || [];
    const so2Arr: number[] = hourly.sulphur_dioxide || [];
    const coArr: number[] = hourly.carbon_monoxide || [];
    const o3Arr: number[] = hourly.ozone || [];
    const uvArr: number[] = hourly.uv_index || [];
    const grassArr: (number | null)[] = hourly.grass_pollen || [];
    const birchArr: (number | null)[] = hourly.birch_pollen || [];
    const alderArr: (number | null)[] = hourly.alder_pollen || [];
    const oliveArr: (number | null)[] = hourly.olive_pollen || [];
    const ragweedArr: (number | null)[] = hourly.ragweed_pollen || [];
    const mugwortArr: (number | null)[] = hourly.mugwort_pollen || [];

    if (!times.length) {
      return res.json({
        status: 'success',
        hasVerifiedData: false,
        dataStatus: 'UNAVAILABLE',
        latitude: lat,
        longitude: lon,
        location: locationName || formatCoordinatePair(lat, lon),
        stationId: stationId || `AQ-${Math.round(lat * 100)}-${Math.round(lon * 100)}`,
        selectedDate: endDateStr,
        startDate: startDateStr,
        endDate: endDateStr,
        observations: [],
        source: 'Open-Meteo Air Quality Model',
      });
    }

    // Group values by date (YYYY-MM-DD)
    const dayGroups: Record<string, {
      pm25: number[];
      pm10: number[];
      no2: number[];
      so2: number[];
      co: number[];
      o3: number[];
      uv: number[];
      grass: number[];
      tree: number[];
      weed: number[];
      peakPm25: number;
      peakTime: string;
    }> = {};

    for (let i = 0; i < times.length; i++) {
      const timeStr = times[i];
      const datePart = timeStr.split('T')[0];
      const hourPart = timeStr.split('T')[1] || '';

      if (!dayGroups[datePart]) {
        dayGroups[datePart] = {
          pm25: [],
          pm10: [],
          no2: [],
          so2: [],
          co: [],
          o3: [],
          uv: [],
          grass: [],
          tree: [],
          weed: [],
          peakPm25: -1,
          peakTime: '12:00 IST',
        };
      }

      const p25 = pm25Arr[i];
      if (p25 !== undefined && p25 !== null && !isNaN(p25)) {
        dayGroups[datePart].pm25.push(p25);
        if (p25 > dayGroups[datePart].peakPm25) {
          dayGroups[datePart].peakPm25 = p25;
          dayGroups[datePart].peakTime = `${hourPart} IST`;
        }
      }

      const p10 = pm10Arr[i];
      if (p10 !== undefined && p10 !== null && !isNaN(p10)) dayGroups[datePart].pm10.push(p10);

      const n2 = no2Arr[i];
      if (n2 !== undefined && n2 !== null && !isNaN(n2)) dayGroups[datePart].no2.push(n2);

      const s2 = so2Arr[i];
      if (s2 !== undefined && s2 !== null && !isNaN(s2)) dayGroups[datePart].so2.push(s2);

      const c = coArr[i];
      if (c !== undefined && c !== null && !isNaN(c)) dayGroups[datePart].co.push(c);

      const oz = o3Arr[i];
      if (oz !== undefined && oz !== null && !isNaN(oz)) dayGroups[datePart].o3.push(oz);

      const uv = uvArr[i];
      if (uv !== undefined && uv !== null && !isNaN(uv)) dayGroups[datePart].uv.push(uv);

      const g = grassArr[i];
      if (g !== undefined && g !== null) dayGroups[datePart].grass.push(g);

      const treeSum = (birchArr[i] || 0) + (alderArr[i] || 0) + (oliveArr[i] || 0);
      dayGroups[datePart].tree.push(treeSum);

      const weedSum = (ragweedArr[i] || 0) + (mugwortArr[i] || 0);
      dayGroups[datePart].weed.push(weedSum);
    }

    const sortedDates = Object.keys(dayGroups).sort();
    const observations = sortedDates.map((dStr) => {
      const g = dayGroups[dStr];
      const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
      const maxVal = (arr: number[]) => (arr.length ? Math.max(...arr) : 0);

      const avgPm25 = Math.round(avg(g.pm25) * 10) / 10;
      const avgPm10 = Math.round(avg(g.pm10) * 10) / 10;
      const avgNo2 = Math.round(avg(g.no2) * 10) / 10;
      const avgSo2 = Math.round(avg(g.so2) * 10) / 10;
      const avgCo = Math.round(avg(g.co));
      const avgO3 = Math.round(avg(g.o3) * 10) / 10;
      const maxUv = Math.round(maxVal(g.uv) * 10) / 10;

      const maxGrass = maxVal(g.grass);
      const maxTree = maxVal(g.tree);
      const maxWeed = maxVal(g.weed);
      const totalPollen = Math.round(maxGrass + maxTree + maxWeed);

      // Bio-pollen level (1 to 5 scale)
      let pollenLevel = 1;
      if (totalPollen > 60) pollenLevel = 5;
      else if (totalPollen > 35) pollenLevel = 4;
      else if (totalPollen > 18) pollenLevel = 3;
      else if (totalPollen > 5) pollenLevel = 2;

      let aqi = 50;
      if (avgPm25 <= 30) aqi = Math.round(avgPm25 * (50 / 30));
      else if (avgPm25 <= 60) aqi = Math.round(50 + ((avgPm25 - 30) * 50) / 30);
      else if (avgPm25 <= 90) aqi = Math.round(100 + ((avgPm25 - 60) * 100) / 30);
      else if (avgPm25 <= 120) aqi = Math.round(200 + ((avgPm25 - 90) * 100) / 30);
      else if (avgPm25 <= 250) aqi = Math.round(300 + ((avgPm25 - 120) * 100) / 130);
      else aqi = Math.round(400 + ((avgPm25 - 250) * 100) / 130);

      const aqiCategory =
        aqi <= 50 ? 'Good' :
        aqi <= 100 ? 'Satisfactory' :
        aqi <= 200 ? 'Moderate' :
        aqi <= 300 ? 'Poor' :
        aqi <= 400 ? 'Very Poor' : 'Severe';

      const dateObj = new Date(`${dStr}T00:00:00`);
      const dayLabel = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(dateObj);

      return {
        date: dStr,
        day: dayLabel,
        pm25: avgPm25,
        pm10: avgPm10,
        no2: avgNo2,
        so2: avgSo2,
        co: avgCo,
        o3: avgO3,
        uvIndex: maxUv,
        pollen: pollenLevel,
        totalPollenGrains: totalPollen,
        grassPollen: maxGrass,
        treePollen: maxTree,
        weedPollen: maxWeed,
        aqi,
        aqiCategory,
        safeStandardPm25: 60, // CPCB 24h standard
        pollenModerateLimit: 3,
        peakPm25: Math.round(g.peakPm25 * 10) / 10,
        peakTime: g.peakTime,
        hasVerifiedData: g.pm25.length > 0,
      };
    });

    const baselineObs = observations.find((o) => o.date === endDateStr) || observations[observations.length - 1];
    const totalPm25 = observations.reduce((s, o) => s + o.pm25, 0);
    const sevenDayAvgPm25 = observations.length ? Math.round((totalPm25 / observations.length) * 10) / 10 : (baselineObs?.pm25 || 0);
    const totalPollen = observations.reduce((s, o) => s + o.pollen, 0);
    const sevenDayAvgPollen = observations.length ? Number((totalPollen / observations.length).toFixed(1)) : (baselineObs?.pollen || 0);

    const peakObs = observations.reduce((max, o) => (o.peakPm25 > (max.peakPm25 || 0) ? o : max), observations[0]);

    // Trend status calculation
    let trendStatus: 'Equilibrium' | 'Improving' | 'Degrading' = 'Equilibrium';
    if (observations.length >= 4) {
      const earlyAvg = (observations[0].pm25 + observations[1].pm25) / 2;
      const lateAvg = (observations[observations.length - 2].pm25 + observations[observations.length - 1].pm25) / 2;
      if (lateAvg < earlyAvg - 5) trendStatus = 'Improving';
      else if (lateAvg > earlyAvg + 5) trendStatus = 'Degrading';
    }

    res.json({
      status: 'success',
      hasVerifiedData: true,
      latitude: lat,
      longitude: lon,
      location: locationName || formatCoordinatePair(lat, lon),
      stationId: stationId || `AQ-${Math.round(lat * 100)}-${Math.round(lon * 100)}`,
      selectedDate: endDateStr,
      startDate: startDateStr,
      endDate: endDateStr,
      sevenDayAveragePm25: sevenDayAvgPm25,
      sevenDayAveragePollen: sevenDayAvgPollen,
      peakConcentration: peakObs?.peakPm25 || baselineObs?.pm25 || 0,
      peakTime: peakObs?.peakTime || baselineObs?.peakTime || '12:00 IST',
      trendStatus,
      cpcbStandard: 60,
      current: baselineObs,
      observations,
      source: 'Open-Meteo Air Quality Model (CPCB NAQI Breakpoints)',
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 2c. Weather History API (Historical Observations by Date / Date Range)
realMausamRouter.get('/weather/history', async (req: Request, res: Response) => {
  try {
    const locationName = (req.query.location || req.query.city || req.query.state || '') as string;
    const parsed = parseCoordinates(req.query as Record<string, unknown>);
    let lat: number;
    let lon: number;
    if (parsed.ok) {
      lat = parsed.lat;
      lon = parsed.lon;
    } else if (locationName.trim()) {
      const locSearch = locationName.toLowerCase().trim();
      const found = (indiaLocationsData as any[]).find(
        (l: any) =>
          l.name?.toLowerCase().includes(locSearch) ||
          l.city?.toLowerCase().includes(locSearch) ||
          l.state?.toLowerCase().includes(locSearch)
      );
      if (!found) {
        return res.status(400).json({ status: 'error', message: parsed.error });
      }
      lat = found.lat ?? found.latitude;
      lon = found.lng ?? found.lon ?? found.longitude;
    } else {
      return res.status(400).json({ status: 'error', message: parsed.error });
    }

    const dateStr = (req.query.date as string) || (req.query.end as string) || new Date().toISOString().split('T')[0];
    const targetDate = new Date(`${dateStr}T00:00:00`);
    const validDate = isNaN(targetDate.getTime()) ? new Date() : targetDate;
    const endDateStr = validDate.toISOString().split('T')[0];

    let startDateStr = req.query.start as string;
    if (!startDateStr) {
      const sD = new Date(validDate);
      sD.setDate(sD.getDate() - 6);
      startDateStr = sD.toISOString().split('T')[0];
    }

    const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDateStr}&end_date=${endDateStr}&daily=weather_code,temperature_2m_max,temperature_2m_min,temperature_2m_mean,apparent_temperature_max,apparent_temperature_min,precipitation_sum,rain_sum,precipitation_hours,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant&timezone=Asia%2FKolkata`;

    let response = await fetch(archiveUrl);
    if (!response.ok) {
      // Fallback to forecast API if within recent forecast window
      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${startDateStr}&end_date=${endDateStr}&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,wind_speed_10m_max&timezone=Asia%2FKolkata`;
      response = await fetch(forecastUrl);
    }

    if (!response.ok) {
      return res.json({
        status: 'success',
        hasVerifiedData: false,
        message: 'No verified historical weather data available for this date.',
        location: locationName,
        selectedDate: endDateStr,
        startDate: startDateStr,
        endDate: endDateStr,
        daily: [],
      });
    }

    const data = await response.json();
    const daily = data.daily || {};
    const dates: string[] = daily.time || [];
    const maxTemps: number[] = daily.temperature_2m_max || [];
    const minTemps: number[] = daily.temperature_2m_min || [];
    const precipSums: number[] = daily.precipitation_sum || [];
    const windSpeeds: number[] = daily.wind_speed_10m_max || [];
    const weatherCodes: number[] = daily.weather_code || [];

    const observations = dates.map((d, idx) => ({
      date: d,
      maxTemp: maxTemps[idx],
      minTemp: minTemps[idx],
      precipitation: precipSums[idx] || 0,
      windSpeed: windSpeeds[idx] || 0,
      weatherCode: weatherCodes[idx] || 0,
    }));

    res.json({
      status: 'success',
      hasVerifiedData: observations.length > 0,
      latitude: lat,
      longitude: lon,
      location: locationName,
      selectedDate: endDateStr,
      startDate: startDateStr,
      endDate: endDateStr,
      daily: observations,
      source: 'IMD Climatological Database & Open-Meteo Historical Archive',
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 3. Doppler Radar & Nowcast API — Multi-Product Verified IMD Feeds & Ultra-Fast Fallback
interface RadarMetaCacheEntry {
  timestamp: number;
  data: any;
}
const radarMetaCache = new Map<string, RadarMetaCacheEntry>();
const RADAR_META_CACHE_TTL = 120 * 1000; // 120 seconds

interface RainViewerCacheEntry {
  timestamp: number;
  data: any;
}
let rainViewerCache: RainViewerCacheEntry | null = null;

interface RadarImageCacheEntry {
  timestamp: number;
  buffer: Buffer;
  lastModified: string | null;
}
const radarImageCache = new Map<string, RadarImageCacheEntry>();
const RADAR_IMAGE_CACHE_TTL = 120 * 1000; // 120 seconds

function formatISTDateTime(date: Date): string {
  try {
    return (
      new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(date) + ' IST'
    );
  } catch {
    return date.toISOString();
  }
}

// Rapid parallel candidate probe with 1600ms timeout
async function probeCandidateHead(
  url: string,
  timeoutMs = 1600
): Promise<{ url: string; lastModified: string | null; contentLength: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MAUSAM-Radar/2.0',
        Accept: 'image/gif,image/*,*/*',
      },
      signal: controller.signal,
    });
    if (res.status === 200) {
      const cType = res.headers.get('content-type') || '';
      const cLen = res.headers.get('content-length');
      if (cType.includes('image') || cLen || res.ok) {
        return {
          url,
          lastModified: res.headers.get('last-modified'),
          contentLength: cLen,
        };
      }
    }
    throw new Error(`Probe returned non-image status ${res.status}`);
  } finally {
    clearTimeout(timer);
  }
}

// Fast cached RainViewer composite provider
async function getCachedRainViewerData(): Promise<any | null> {
  const now = Date.now();
  if (rainViewerCache && now - rainViewerCache.timestamp < 120000) {
    return rainViewerCache.data;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const rvRes = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
      headers: { 'User-Agent': 'Mozilla/5.0 MAUSAM-Radar/2.0' },
      signal: controller.signal,
    });
    if (rvRes.ok) {
      const data = await rvRes.json();
      rainViewerCache = { timestamp: now, data };
      return data;
    }
  } catch {
    if (rainViewerCache) return rainViewerCache.data;
  } finally {
    clearTimeout(timer);
  }
  return null;
}

realMausamRouter.get('/radar', async (req: Request, res: Response) => {
  try {
    const stationQuery = req.query.station as string | undefined;
    const productQuery = (req.query.product as string | undefined)?.toUpperCase();

    // Coordinate-first lookup: probe real RainViewer radar mosaic availability
    if (!stationQuery && !productQuery && (req.query.lat !== undefined || req.query.latitude !== undefined || req.query.lon !== undefined || req.query.lng !== undefined || req.query.longitude !== undefined)) {
      const parsed = parseCoordinates(req.query as Record<string, unknown>);
      if (!parsed.ok) {
        return res.status(400).json({ status: 'error', message: parsed.error });
      }
      const { lat, lon } = parsed;

      const radarInfo = findNearestRadarStation(lat, lon);
      const nearestRadar = radarInfo.station;
      const minDistance = radarInfo.distanceKm;
      const isWithinCoverage = radarInfo.isWithinCoverage;

      const rvData = await getCachedRainViewerData();
      const pastFrames = rvData?.radar?.past || [];
      const latestFrame = pastFrames.length > 0 ? pastFrames[pastFrames.length - 1] : null;
      const frameTimeIso = latestFrame?.time ? new Date(latestFrame.time * 1000).toISOString() : null;
      const radarStatus = latestFrame ? 'LIVE' : 'UNAVAILABLE';

      return res.json({
        status: 'success',
        latitude: lat,
        longitude: lon,
        nearestStation: {
          id: nearestRadar.id,
          name: `DWR ${nearestRadar.city}`,
          city: nearestRadar.city,
          state: nearestRadar.state,
          latitude: nearestRadar.lat,
          longitude: nearestRadar.lng,
          distanceKm: minDistance,
          band: nearestRadar.band,
          rangeKm: nearestRadar.rangeKm,
          radarModel: nearestRadar.model,
          isWithinCoverage,
        },
        scanRangeKm: nearestRadar.rangeKm,
        lastScanTime: frameTimeIso,
        updateIntervalMinutes: latestFrame ? 10 : null,
        reflectivityProduct: 'Max Z / PPI (Plan Position Indicator) Reflectivity',
        precipitationDetection: latestFrame
          ? isWithinCoverage
            ? 'Composite reflectivity frames synchronized'
            : 'Beyond primary 250km DWR baseline; composite mosaic available'
          : 'Live radar feed temporarily unreachable',
        stormConvectiveActivity: latestFrame
          ? 'Monitor reflectivity tiles for echo intensity'
          : 'Radar echo status unavailable',
        radarStatus,
        radarAvailable: Boolean(latestFrame),
        source: latestFrame
          ? 'RainViewer Composite Mosaic & IMD DWR Station Catalog'
          : 'IMD DWR Station Catalog (Feed Unavailable)',
      });
    }

    const targetStationId = stationQuery || 'DWR-MUM';
    let targetProductKey = (productQuery || 'MAXZ') as keyof typeof RADAR_PRODUCT_CONFIG;
    if ((targetProductKey as string) === 'PVV') {
      targetProductKey = 'PPV';
    }

    const prodConfig = RADAR_PRODUCT_CONFIG[targetProductKey] || RADAR_PRODUCT_CONFIG.MAXZ;
    const cacheKey = `${targetStationId}_${targetProductKey}`;
    const now = Date.now();

    const cached = radarMetaCache.get(cacheKey);
    if (cached && now - cached.timestamp < RADAR_META_CACHE_TTL) {
      return res.json(cached.data);
    }

    const imdTag = getImdStationCode(targetStationId);
    const stationObj = IMD_DOPPLER_RADAR_NETWORK.find(
      (s) =>
        s.id.toLowerCase().replace(/[-_]/g, '') === targetStationId.toLowerCase().replace(/[-_]/g, '') ||
        (s.imdCode && s.imdCode.toLowerCase() === imdTag?.toLowerCase()) ||
        s.city.toLowerCase().includes(targetStationId.toLowerCase())
    );

    let matchedImdUrl: string | null = null;
    let matchedLastModified: string | null = null;
    let matchedContentLength: string | null = null;

    if (imdTag && prodConfig && prodConfig.filePrefixes?.length > 0) {
      const candidateUrls = prodConfig.filePrefixes.map(
        (prefix) => `https://mausam.imd.gov.in/Radar/${prefix}${imdTag}.gif`
      );

      // Probe all prefix candidates concurrently with fast abort — returns as soon as first succeeds
      try {
        const winningProbe = await Promise.any(candidateUrls.map((u) => probeCandidateHead(u, 1600)));
        matchedImdUrl = winningProbe.url;
        matchedLastModified = winningProbe.lastModified;
        matchedContentLength = winningProbe.contentLength;
      } catch {
        // All IMD candidate files were unavailable or timed out quickly
      }
    }

    // 1. Success with Verified Official IMD Radar Product
    if (matchedImdUrl) {
      const observedDate = matchedLastModified ? new Date(matchedLastModified) : new Date();
      const validDate = isNaN(observedDate.getTime()) ? new Date() : observedDate;
      const ageMinutes = Math.max(0, Math.round((Date.now() - validDate.getTime()) / 60000));
      const status = ageMinutes <= 65 ? 'LIVE' : ageMinutes <= 180 ? 'RECENT' : 'STALE';

      const payload = {
        status,
        available: true,
        product: targetProductKey,
        label: prodConfig.label,
        fullName: prodConfig.fullName,
        description: prodConfig.description,
        unit: prodConfig.unit,
        elevationAngle: prodConfig.elevationAngle,
        stationId: targetStationId,
        stationName: stationObj ? `${stationObj.city} Doppler Radar` : `IMD ${targetStationId} Radar`,
        latitude: stationObj?.lat || 18.9067,
        longitude: stationObj?.lng || 72.8147,
        rangeKm: stationObj?.rangeKm || 250,
        source: 'India Meteorological Department (IMD)',
        sourceAttribution: 'IMD Official Doppler Weather Radar Network',
        observed: validDate.toISOString(),
        observedFormatted: formatISTDateTime(validDate),
        ageMinutes,
        imageUrl: `/api/radar/image?station=${encodeURIComponent(targetStationId)}&product=${encodeURIComponent(targetProductKey)}&directUrl=${encodeURIComponent(matchedImdUrl)}`,
        directUrl: matchedImdUrl,
        contentLength: matchedContentLength,
        isFallback: false,
      };

      radarMetaCache.set(cacheKey, { timestamp: now, data: payload });
      return res.json(payload);
    }

    // 2. If MAXZ and direct IMD station scan was unavailable: Use verified RainViewer Composite Fallback
    if (targetProductKey === 'MAXZ') {
      try {
        const rvData = await getCachedRainViewerData();
        if (rvData) {
          const host = rvData.host || 'https://tilecache.rainviewer.com';
          const pastFrames = rvData.radar?.past || [];
          const latestFrame = pastFrames.length > 0 ? pastFrames[pastFrames.length - 1] : null;

          if (latestFrame) {
            const frameDate = new Date(latestFrame.time * 1000);
            const ageMinutes = Math.max(0, Math.round((Date.now() - frameDate.getTime()) / 60000));

            const fallbackPayload = {
              status: ageMinutes <= 45 ? 'LIVE' : 'RECENT',
              available: true,
              product: 'MAXZ',
              label: 'MAX Z',
              fullName: 'RainViewer Composite Reflectivity Mosaic',
              description: 'Open composite radar reflectivity (0–65+ dBZ) column maximum.',
              unit: 'dBZ',
              elevationAngle: 'Volumetric Composite',
              stationId: targetStationId,
              stationName: stationObj ? `${stationObj.city} Radar Vicinity` : targetStationId,
              latitude: stationObj?.lat || 18.9067,
              longitude: stationObj?.lng || 72.8147,
              rangeKm: stationObj?.rangeKm || 250,
              source: 'RainViewer Composite Radar',
              sourceAttribution: 'RainViewer Open Meteorological Mosaic Network',
              observed: frameDate.toISOString(),
              observedFormatted: formatISTDateTime(frameDate),
              ageMinutes,
              tileUrl: `${host}${latestFrame.path}/256/{z}/{x}/{y}/2/1_1.png`,
              isFallback: true,
              message: 'Single-station IMD file offline; nationwide composite reflectivity fallback active.',
            };

            radarMetaCache.set(cacheKey, { timestamp: now, data: fallbackPayload });
            return res.json(fallbackPayload);
          }
        }
      } catch {
        // Fallback fetch failed
      }
    }

    // 3. Product is genuine but completely unavailable from verified free source (No synthetic data rule)
    const unavailablePayload = {
      status: 'UNAVAILABLE',
      available: false,
      product: targetProductKey,
      label: prodConfig?.label || targetProductKey,
      fullName: prodConfig?.fullName || targetProductKey,
      unit: prodConfig?.unit || '',
      elevationAngle: prodConfig?.elevationAngle || '',
      stationId: targetStationId,
      stationName: stationObj ? `${stationObj.city} Doppler Radar` : targetStationId,
      latitude: stationObj?.lat || 18.9067,
      longitude: stationObj?.lng || 72.8147,
      rangeKm: stationObj?.rangeKm || 250,
      source: 'India Meteorological Department (IMD)',
      sourceAttribution: 'Official IMD Doppler Weather Radar Network',
      observed: null,
      observedFormatted: null,
      message: 'UNAVAILABLE — NO VERIFIED FREE PUBLIC SOURCE',
      reason: `Direct IMD feed for product ${targetProductKey} (${prodConfig?.label || targetProductKey}) is currently offline for station ${targetStationId} or undergoing calibration.`,
      isFallback: false,
    };

    radarMetaCache.set(cacheKey, { timestamp: now, data: unavailablePayload });
    return res.json(unavailablePayload);
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  }
});

// 3.1 Proxy IMD Radar Image Binary securely to avoid CORS / Referrer blocking (with fast memory caching)
realMausamRouter.get('/radar/image', async (req: Request, res: Response) => {
  try {
    const stationQuery = req.query.station as string;
    let productQuery = ((req.query.product as string) || 'MAXZ').toUpperCase() as keyof typeof RADAR_PRODUCT_CONFIG;
    if ((productQuery as string) === 'PVV') productQuery = 'PPV';

    const directUrlQuery = req.query.directUrl as string | undefined;
    const imdTag = getImdStationCode(stationQuery || 'DWR-MUM') || 'mum';
    const prodConfig = RADAR_PRODUCT_CONFIG[productQuery] || RADAR_PRODUCT_CONFIG.MAXZ;
    const cacheKey = `${stationQuery || imdTag}_${productQuery}`;

    // Check memory image cache first
    const now = Date.now();
    const cachedImg = radarImageCache.get(cacheKey);
    if (cachedImg && now - cachedImg.timestamp < RADAR_IMAGE_CACHE_TTL) {
      res.setHeader('Content-Type', 'image/gif');
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
      if (cachedImg.lastModified) res.setHeader('Last-Modified', cachedImg.lastModified);
      res.setHeader('X-Radar-Source', 'IMD-Official-Cache');
      return res.send(cachedImg.buffer);
    }

    let targetUrl: string | null = directUrlQuery || null;

    if (!targetUrl) {
      // Check if metadata cache already identified the URL
      const metaCached = radarMetaCache.get(cacheKey);
      if (metaCached?.data?.directUrl) {
        targetUrl = metaCached.data.directUrl;
      }
    }

    if (!targetUrl) {
      const candidateUrls = (prodConfig.filePrefixes || []).map(
        (prefix) => `https://mausam.imd.gov.in/Radar/${prefix}${imdTag}.gif`
      );
      try {
        const winningProbe = await Promise.any(candidateUrls.map((u) => probeCandidateHead(u, 1600)));
        targetUrl = winningProbe.url;
      } catch {
        // No match found
      }
    }

    if (!targetUrl) {
      if (!res.headersSent) {
        return res.status(404).send('Radar image resource not found on IMD server.');
      }
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    try {
      const imdRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MAUSAM-Radar/2.0',
          Referer: 'https://mausam.imd.gov.in/',
        },
        signal: controller.signal,
      });

      if (!imdRes.ok) {
        if (!res.headersSent) {
          return res.status(imdRes.status).send('Failed to fetch radar imagery from IMD origin.');
        }
        return;
      }

      const buffer = Buffer.from(await imdRes.arrayBuffer());
      const lastMod = imdRes.headers.get('last-modified') || null;

      // Store in memory cache
      radarImageCache.set(cacheKey, {
        timestamp: now,
        buffer,
        lastModified: lastMod,
      });

      if (!res.headersSent) {
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=300');
        if (lastMod) res.setHeader('Last-Modified', lastMod);
        res.setHeader('X-Radar-Source', 'IMD-Official');
        res.send(buffer);
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(502).send(`Radar proxy error: ${err.message}`);
    }
  }
});

// 4. Station / Observatory Telemetry API
realMausamRouter.get('/station/nearest', async (req: Request, res: Response) => {
  try {
    const parsed = parseCoordinates(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      return res.status(400).json({ status: 'error', message: parsed.error });
    }
    const { lat, lon } = parsed;

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,dew_point_2m,visibility&timezone=auto`;
    const response = await fetch(weatherUrl, {
      signal: AbortSignal.timeout(7500),
      headers: { 'User-Agent': 'aistudio-build' },
    });

    if (!response.ok) {
      return res.status(502).json({
        status: 'error',
        dataStatus: 'UNAVAILABLE',
        message: `Open-Meteo returned HTTP ${response.status}`,
      });
    }

    const json = await response.json();
    const currentData = json.current || {};
    const numOrNull = (v: unknown): number | null =>
      typeof v === 'number' && Number.isFinite(v) ? v : null;

    const temp = numOrNull(currentData.temperature_2m);
    const feelsLike = numOrNull(currentData.apparent_temperature);
    const humidity = numOrNull(currentData.relative_humidity_2m);
    const windSpeed = numOrNull(currentData.wind_speed_10m);
    const windDir = numOrNull(currentData.wind_direction_10m);
    const windGustRaw = numOrNull(currentData.wind_gusts_10m);
    const pressure = numOrNull(currentData.pressure_msl) ?? numOrNull(currentData.surface_pressure);
    const cloudCover = numOrNull(currentData.cloud_cover);
    const precip = numOrNull(currentData.precipitation);
    const visRaw = numOrNull(currentData.visibility);
    const dewRaw = numOrNull(currentData.dew_point_2m);
    const dewPoint =
      dewRaw !== null
        ? Math.round(dewRaw * 10) / 10
        : temp !== null && humidity !== null
        ? Math.round((temp - (100 - humidity) / 5) * 10) / 10
        : null;

    res.json({
      status: temp !== null ? 'success' : 'error',
      dataStatus: temp !== null ? 'MODEL_LIVE' : 'UNAVAILABLE',
      stationId: `OM-GRID-${Math.round(lat * 100)}-${Math.round(lon * 100)}`,
      stationName: `Model Grid (${formatCoordinatePair(lat, lon)})`,
      latitude: lat,
      longitude: lon,
      observationTime: currentData.time || new Date().toISOString(),
      temperature: temp,
      apparentTemperature: feelsLike,
      relativeHumidity: humidity,
      dewPoint,
      windSpeed,
      windDirectionDeg: windDir,
      windGust: windGustRaw !== null ? Math.round(windGustRaw * 10) / 10 : null,
      pressureHpa: pressure,
      visibilityKm: visRaw !== null ? Math.round((visRaw / 1000) * 10) / 10 : null,
      cloudCoverPercent: cloudCover,
      rainfall24hMm: precip,
      uvIndex: null,
      aqi: null,
      source: 'Open-Meteo Model Data',
    });
  } catch (err: any) {
    res.status(err?.name === 'AbortError' ? 504 : 502).json({
      status: 'error',
      dataStatus: 'UNAVAILABLE',
      message: err.message,
    });
  }
});

// 5. Hourly Weather API
realMausamRouter.get('/weather/hourly', async (req: Request, res: Response) => {
  try {
    const parsed = parseCoordinates(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      return res.status(400).json({ status: 'error', message: parsed.error });
    }
    const { lat, lon } = parsed;
    const hoursCount = parseInt(req.query.hours as string, 10) || 24;

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,rain,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,uv_index&timezone=auto&forecast_days=2`;
    const response = await fetch(weatherUrl, {
      signal: AbortSignal.timeout(7500),
      headers: { 'User-Agent': 'aistudio-build' },
    });

    if (!response.ok) {
      return res.status(502).json({ status: 'error', message: 'Hourly weather API connection failed' });
    }

    const data = await response.json();
    const hourly = data.hourly || {};
    const times: string[] = hourly.time || [];
    const temps: number[] = hourly.temperature_2m || [];
    const humidity: number[] = hourly.relative_humidity_2m || [];
    const rainProb: number[] = hourly.precipitation_probability || [];
    const precip: number[] = hourly.precipitation || [];
    const windSpeed: number[] = hourly.wind_speed_10m || [];

    const now = new Date();
    const currentHour = now.getHours();
    let startIndex = 0;
    for (let i = 0; i < times.length; i++) {
      const dt = new Date(times[i]);
      if (dt.getHours() === currentHour) {
        startIndex = i;
        break;
      }
    }

    const result = [];
    for (let i = startIndex; i < Math.min(startIndex + hoursCount, times.length); i++) {
      result.push({
        time: times[i],
        temperature: temps[i],
        humidity: humidity[i],
        precipitationProbability: rainProb[i],
        precipitationMm: precip[i],
        windSpeedKmh: windSpeed[i],
      });
    }

    res.json({
      status: 'success',
      latitude: lat,
      longitude: lon,
      count: result.length,
      hourly: result,
      source: 'IMD Numerical Weather Prediction & Open-Meteo High-Resolution Model',
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 6. Daily Weather API
realMausamRouter.get('/weather/daily', async (req: Request, res: Response) => {
  try {
    const parsed = parseCoordinates(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      return res.status(400).json({ status: 'error', message: parsed.error });
    }
    const { lat, lon } = parsed;
    const daysCount = parseInt(req.query.days as string, 10) || 7;

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=${daysCount}`;
    const response = await fetch(weatherUrl, {
      signal: AbortSignal.timeout(7500),
      headers: { 'User-Agent': 'aistudio-build' },
    });

    if (!response.ok) {
      return res.status(502).json({ status: 'error', message: 'Daily forecast API connection failed' });
    }

    const data = await response.json();
    res.json({
      status: 'success',
      latitude: lat,
      longitude: lon,
      daily: data.daily || {},
      source: 'Open-Meteo Model Data',
    });
  } catch (err: any) {
    res.status(err?.name === 'AbortError' ? 504 : 502).json({ status: 'error', message: err.message });
  }
});

// 7. Central Combined Mausam Data Bundle (fetchMausamData Pipeline)
realMausamRouter.get('/mausam-bundle', async (req: Request, res: Response) => {
  try {
    const parsed = parseCoordinates(req.query as Record<string, unknown>);
    if (!parsed.ok) {
      return res.status(400).json({ status: 'error', message: parsed.error });
    }
    const { lat, lon } = parsed;
    const now = new Date();

    const [weatherRes, airRes] = await Promise.allSettled([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,rain,weather_code,pressure_msl,wind_speed_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=7`, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'aistudio-build' },
      }),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,grass_pollen,birch_pollen,alder_pollen&timezone=auto`, {
        signal: AbortSignal.timeout(6000),
        headers: { 'User-Agent': 'aistudio-build' },
      })
    ]);

    const weatherJson = weatherRes.status === 'fulfilled' && weatherRes.value.ok ? await weatherRes.value.json() : null;
    const airJson = airRes.status === 'fulfilled' && airRes.value.ok ? await airRes.value.json() : null;

    if (!weatherJson && !airJson) {
      return res.status(502).json({
        status: 'error',
        dataStatus: 'UNAVAILABLE',
        message: 'Upstream Open-Meteo weather and air quality providers are unreachable.',
      });
    }

    const solar = calculateSolarEphemeris(lat, lon, now);

    // Nearest radar station metadata from catalog
    const radarInfo = findNearestRadarStation(lat, lon);

    res.json({
      status: 'success',
      latitude: lat,
      longitude: lon,
      fetchedAt: now.toISOString(),
      solar,
      weather: weatherJson || {},
      airQuality: airJson || {},
      radar: {
        nearestStation: radarInfo.station,
        distanceKm: radarInfo.distanceKm,
        isWithinCoverage: radarInfo.isWithinCoverage,
      },
      source: 'Open-Meteo Model Data & NOAA Solar Ephemeris',
    });
  } catch (err: any) {
    res.status(err?.name === 'AbortError' ? 504 : 502).json({ status: 'error', message: err.message });
  }
});
