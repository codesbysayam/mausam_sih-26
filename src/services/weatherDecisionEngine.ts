import { CurrentWeather, HourlyForecastItem, WeatherAlert } from '../types';

export interface DecisionItem {
  key: string;
  category: 'Safety' | 'Transit' | 'Activity' | 'Health' | 'Environment';
  label: string;
  status: 'GOOD' | 'CAUTION' | 'AVOID';
  badgeColor: string; // Tailwind class
  recommendation: string;
  basisValue: string;
}

export interface TravelConditionsSummary {
  roadCondition: string;
  visibilityStatus: string;
  fogStatus: string;
  windStatus: string;
  heatStressStatus: string;
  floodRisk: string;
  thunderstormRisk: string;
  bestTravelWindow: string;
  advisoryNote: string;
}

export interface HealthWeatherSummary {
  heatStressCategory: string;
  heatIndexC: number | null;
  uvRiskLevel: string;
  coldRiskLevel: string;
  airQualityExposure: string;
  humidityDiscomfort: string;
  humidexValue: number | null;
  asthmaRespiratoryRisk: string;
  lightningCaution: string;
  pollenAdvice: string;
}

export class WeatherDecisionEngine {
  /**
   * Computes NOAA Heat Index in °C
   */
  static calculateHeatIndex(tempC: number, rh: number): number {
    if (tempC < 27) return tempC;
    // Rothfusz regression equation in Fahrenheit
    const T = (tempC * 9) / 5 + 32;
    const R = rh;
    let HI =
      -42.379 +
      2.04901523 * T +
      10.14333127 * R -
      0.22475541 * T * R -
      0.00683783 * T * T -
      0.05481717 * R * R +
      0.00122874 * T * T * R +
      0.00085282 * T * R * R -
      0.00000199 * T * T * R * R;

    const heatIndexC = ((HI - 32) * 5) / 9;
    return Math.round(heatIndexC * 10) / 10;
  }

  /**
   * Computes Canadian Humidex
   */
  static calculateHumidex(tempC: number, rh: number): number {
    const dewPoint = tempC - (100 - rh) / 5;
    const e = 6.11 * Math.exp(5417.7530 * (1 / 273.16 - 1 / (273.15 + dewPoint)));
    const h = tempC + (5 / 9) * (e - 10);
    return Math.round(h * 10) / 10;
  }

  /**
   * Generates practical decision center guidance based strictly on real conditions
   * for the 11 key life-impact categories using simple statuses: GOOD, CAUTION, AVOID.
   */
  static generateWhatShouldIDoNow(
    weather: CurrentWeather,
    hourly: HourlyForecastItem[] = [],
    alerts: WeatherAlert[] = []
  ): DecisionItem[] {
    const items: DecisionItem[] = [];

    const temp = typeof weather.temp === 'number' && !Number.isNaN(weather.temp) ? weather.temp : null;
    const rh = typeof weather.humidity === 'number' && !Number.isNaN(weather.humidity) ? weather.humidity : null;
    const rainMm = typeof weather.precipitation === 'number' ? weather.precipitation : 0;
    const rainProb = typeof weather.precipitationProbability === 'number' ? weather.precipitationProbability : 0;
    const isRaining = weather.isRainingNow || rainMm > 0.2;
    const windKm = typeof weather.windSpeed === 'number' ? weather.windSpeed : 0;
    const gustsKm = typeof weather.windGusts === 'number' ? weather.windGusts : windKm * 1.3;
    const aqi = typeof weather.aqi === 'number' ? weather.aqi : typeof weather.aqiIndex === 'number' ? weather.aqiIndex : null;
    const uv = typeof weather.uvIndex === 'number' ? weather.uvIndex : null;
    const visKm = typeof weather.visibilityKm === 'number' ? weather.visibilityKm : (weather.visibility ? Math.round(weather.visibility / 100) / 10 : null);
    const condLower = (weather.condition || '').toLowerCase();
    const isThunder = condLower.includes('thunder') || condLower.includes('lightning') || weather.wmoCode === 95 || weather.wmoCode === 96 || weather.wmoCode === 99;
    const isFog = condLower.includes('fog') || (visKm !== null && visKm < 1.5);
    const heatIndex = temp !== null && rh !== null ? this.calculateHeatIndex(temp, rh) : temp;

    // Helper badges
    const BADGE_GOOD = 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40';
    const BADGE_CAUTION = 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40';
    const BADGE_AVOID = 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40';

    const tempLabel = temp !== null ? `${temp}°C` : 'Temp —';
    const windLabel = typeof weather.windSpeed === 'number' ? `${windKm} km/h` : 'Wind —';

    // 1. Outdoor activity
    if (isThunder || alerts.some((a) => a.severity === 'red' || a.severity === 'severe')) {
      items.push({
        key: 'outdoor_activity',
        category: 'Activity',
        label: 'Outdoor Activity',
        status: 'AVOID',
        badgeColor: BADGE_AVOID,
        recommendation: 'Suspend outdoor activities immediately. Move inside permanent structure.',
        basisValue: isThunder ? 'Active lightning risk' : 'Severe meteorological alert in force',
      });
    } else if (isRaining || rainProb > 50 || (aqi !== null && aqi > 200) || (heatIndex !== null && heatIndex > 41) || gustsKm > 45) {
      items.push({
        key: 'outdoor_activity',
        category: 'Activity',
        label: 'Outdoor Activity',
        status: 'CAUTION',
        badgeColor: BADGE_CAUTION,
        recommendation: isRaining ? 'Rain occurring. Plan sheltered alternatives.' : aqi && aqi > 200 ? 'Poor air quality. Limit strenuous physical exertion.' : 'High thermal or wind stress. Rest in shade frequently.',
        basisValue: isRaining ? `${rainMm}mm rain / ${rainProb}% prob` : `Heat Index ${heatIndex !== null ? `${Math.round(heatIndex)}°C` : tempLabel} / AQI ${aqi ?? 'Unavailable'}`,
      });
    } else {
      items.push({
        key: 'outdoor_activity',
        category: 'Activity',
        label: 'Outdoor Activity',
        status: 'GOOD',
        badgeColor: BADGE_GOOD,
        recommendation: temp !== null ? 'Conditions favorable for recreation, field trips, and outdoor labor.' : 'Awaiting live ambient telemetry to finalize outdoor guidance.',
        basisValue: `${tempLabel}, ${windLabel}, AQI ${aqi ?? 'Unavailable'}`,
      });
    }

    // 2. Running / walking
    if (isThunder || (aqi !== null && aqi > 300) || (heatIndex !== null && heatIndex > 43)) {
      items.push({
        key: 'running_walking',
        category: 'Activity',
        label: 'Running / Walking',
        status: 'AVOID',
        badgeColor: BADGE_AVOID,
        recommendation: 'Severe risk of respiratory or heat injury. Exercise indoors.',
        basisValue: aqi && aqi > 300 ? `Severe AQI ${aqi}` : isThunder ? 'Lightning strike risk' : `Heat index ${Math.round(heatIndex!)}°C`,
      });
    } else if ((aqi !== null && aqi > 150) || (heatIndex !== null && heatIndex > 38) || isRaining || rainProb > 60) {
      items.push({
        key: 'running_walking',
        category: 'Activity',
        label: 'Running / Walking',
        status: 'CAUTION',
        badgeColor: BADGE_CAUTION,
        recommendation: 'Early morning or late evening preferred. Hydrate adequately.',
        basisValue: `AQI ${aqi ?? 'Unavailable'}, ${tempLabel}, Rain ${rainProb}%`,
      });
    } else {
      items.push({
        key: 'running_walking',
        category: 'Activity',
        label: 'Running / Walking',
        status: 'GOOD',
        badgeColor: BADGE_GOOD,
        recommendation: temp !== null ? 'Pleasant temperatures and clean air. Great time for jogging or walking.' : 'Awaiting surface temperature and wind telemetry.',
        basisValue: `${tempLabel}, ${windLabel}`,
      });
    }

    // 3. Travel / commuting
    if (isThunder || (visKm !== null && visKm < 0.8) || gustsKm > 60) {
      items.push({
        key: 'travel_commuting',
        category: 'Transit',
        label: 'Travel / Commuting',
        status: 'AVOID',
        badgeColor: BADGE_AVOID,
        recommendation: 'Hazardous transit conditions. Defer non-essential intercity trips.',
        basisValue: visKm !== null && visKm < 0.8 ? `Dense fog: ${visKm * 1000}m vis` : 'Severe storm / heavy squall',
      });
    } else if (isRaining || rainProb > 50 || (visKm !== null && visKm < 3.5) || gustsKm > 35) {
      items.push({
        key: 'travel_commuting',
        category: 'Transit',
        label: 'Travel / Commuting',
        status: 'CAUTION',
        badgeColor: BADGE_CAUTION,
        recommendation: 'Expect traffic congestion, slow train/bus speeds, and slick highways.',
        basisValue: `Visibility ${visKm ?? 'Moderate'} km, Wet roads`,
      });
    } else {
      items.push({
        key: 'travel_commuting',
        category: 'Transit',
        label: 'Travel / Commuting',
        status: 'GOOD',
        badgeColor: BADGE_GOOD,
        recommendation: 'Transit corridors operating under normal meteorological clearance.',
        basisValue: `Visibility ${visKm ?? 'Unrestricted'} km, Wind ${windKm} km/h`,
      });
    }

    // 4. Driving conditions
    if ((visKm !== null && visKm < 0.5) || isThunder || gustsKm > 65) {
      items.push({
        key: 'driving_conditions',
        category: 'Transit',
        label: 'Driving Conditions',
        status: 'AVOID',
        badgeColor: BADGE_AVOID,
        recommendation: 'Extremely dangerous road conditions. Use low-beam fog lights and pull over if visibility drops.',
        basisValue: visKm !== null && visKm < 0.5 ? `Visibility < 500m` : 'Severe weather squall',
      });
    } else if (isRaining || (visKm !== null && visKm < 3) || gustsKm > 35) {
      items.push({
        key: 'driving_conditions',
        category: 'Transit',
        label: 'Driving Conditions',
        status: 'CAUTION',
        badgeColor: BADGE_CAUTION,
        recommendation: 'Wet asphalt and reduced braking grip. Maintain double following distance.',
        basisValue: visKm !== null ? `Vis ${visKm} km, Wet pavement` : 'Wet pavement',
      });
    } else {
      items.push({
        key: 'driving_conditions',
        category: 'Transit',
        label: 'Driving Conditions',
        status: 'GOOD',
        badgeColor: BADGE_GOOD,
        recommendation: 'Road surface dry, optimal daylight visibility, and calm crosswinds.',
        basisValue: visKm !== null ? `Visibility ${visKm} km, Clear pavement` : 'Visibility unavailable',
      });
    }

    // 5. Rain protection needed?
    if (isRaining || rainMm > 1.0) {
      items.push({
        key: 'rain_protection',
        category: 'Safety',
        label: 'Rain Protection Needed?',
        status: 'AVOID',
        badgeColor: BADGE_AVOID,
        recommendation: 'Active precipitation occurring. Heavy rain protection (waterproof raincoat/umbrella) essential.',
        basisValue: `Rainfall ${rainMm} mm/h active`,
      });
    } else if (rainProb >= 35) {
      items.push({
        key: 'rain_protection',
        category: 'Safety',
        label: 'Rain Protection Needed?',
        status: 'CAUTION',
        badgeColor: BADGE_CAUTION,
        recommendation: 'Rain probability elevated today. Carry a folding umbrella or compact poncho.',
        basisValue: `${rainProb}% precipitation probability`,
      });
    } else {
      items.push({
        key: 'rain_protection',
        category: 'Safety',
        label: 'Rain Protection Needed?',
        status: 'GOOD',
        badgeColor: BADGE_GOOD,
        recommendation: 'No rain protection needed. Negligible chance of showers.',
        basisValue: `${rainProb}% precipitation probability`,
      });
    }

    // 6. Heat exposure risk
    if ((heatIndex !== null && heatIndex >= 44) || (temp !== null && temp >= 42)) {
      items.push({
        key: 'heat_exposure',
        category: 'Health',
        label: 'Heat Exposure Risk',
        status: 'AVOID',
        badgeColor: BADGE_AVOID,
        recommendation: 'Extreme heat stress risk. Danger of heat exhaustion or heat stroke. Stay in air-conditioned areas.',
        basisValue: `Heat Index ${heatIndex !== null ? Math.round(heatIndex) : temp}°C / Dry Bulb ${tempLabel}`,
      });
    } else if ((heatIndex !== null && heatIndex >= 38) || (temp !== null && temp >= 36)) {
      items.push({
        key: 'heat_exposure',
        category: 'Health',
        label: 'Heat Exposure Risk',
        status: 'CAUTION',
        badgeColor: BADGE_CAUTION,
        recommendation: 'Drink electrolytes regularly; wear light-colored cotton garments; avoid noon sun.',
        basisValue: `Heat Index ${heatIndex !== null ? Math.round(heatIndex) : temp}°C (RH ${rh ?? '—'}%)`,
      });
    } else {
      items.push({
        key: 'heat_exposure',
        category: 'Health',
        label: 'Heat Exposure Risk',
        status: 'GOOD',
        badgeColor: BADGE_GOOD,
        recommendation: temp !== null ? 'Ambient temperatures well within safe physiological comfort limits.' : 'Thermal telemetry unavailable.',
        basisValue: heatIndex !== null ? `Heat Index ${Math.round(heatIndex)}°C` : tempLabel,
      });
    }

    // 7. UV exposure risk
    if (uv !== null && uv >= 8) {
      items.push({
        key: 'uv_exposure',
        category: 'Health',
        label: 'UV Exposure Risk',
        status: 'AVOID',
        badgeColor: BADGE_AVOID,
        recommendation: 'Very High to Extreme UV radiation. Burn time < 20 mins. Broad-spectrum SPF 50+ and sunglasses required.',
        basisValue: `UV Index ${uv} (Very High)`,
      });
    } else if (uv !== null && uv >= 4) {
      items.push({
        key: 'uv_exposure',
        category: 'Health',
        label: 'UV Exposure Risk',
        status: 'CAUTION',
        badgeColor: BADGE_CAUTION,
        recommendation: 'Moderate solar irradiance. Apply sunscreen and wear protective eyewear outdoors.',
        basisValue: `UV Index ${uv} (Moderate)`,
      });
    } else {
      items.push({
        key: 'uv_exposure',
        category: 'Health',
        label: 'UV Exposure Risk',
        status: 'GOOD',
        badgeColor: BADGE_GOOD,
        recommendation: uv !== null ? 'Low UV radiation. No special sun protection required.' : 'Unavailable for this location',
        basisValue: uv !== null ? `UV Index ${uv} (Low)` : 'Unavailable',
      });
    }

    // 8. Thunderstorm safety
    if (isThunder) {
      items.push({
        key: 'thunderstorm_safety',
        category: 'Safety',
        label: 'Thunderstorm Safety',
        status: 'AVOID',
        badgeColor: BADGE_AVOID,
        recommendation: 'Cloud-to-ground lightning active. Follow "When Thunder Roars, Go Indoors". Avoid trees and metal poles.',
        basisValue: 'Active thunderstorm observation',
      });
    } else if (rainProb > 60 && temp !== null && temp > 31) {
      items.push({
        key: 'thunderstorm_safety',
        category: 'Safety',
        label: 'Thunderstorm Safety',
        status: 'CAUTION',
        badgeColor: BADGE_CAUTION,
        recommendation: 'Atmospheric instability high. Localized convective squalls or lightning possible this afternoon.',
        basisValue: `Instability: Rain prob ${rainProb}%, Temp ${temp}°C`,
      });
    } else {
      items.push({
        key: 'thunderstorm_safety',
        category: 'Safety',
        label: 'Thunderstorm Safety',
        status: 'GOOD',
        badgeColor: BADGE_GOOD,
        recommendation: 'No convective instability or lightning detected in local radar range.',
        basisValue: 'Atmospheric stability stable',
      });
    }

    // 9. Visibility risk
    if (visKm !== null && visKm < 1.0) {
      items.push({
        key: 'visibility_risk',
        category: 'Transit',
        label: 'Visibility Risk',
        status: 'AVOID',
        badgeColor: BADGE_AVOID,
        recommendation: 'Dense fog or severe smog causing critical visual impairment. Aviation and rail delays likely.',
        basisValue: `Visibility ${visKm * 1000}m (< 1 km)`,
      });
    } else if (visKm !== null && visKm < 4.0) {
      items.push({
        key: 'visibility_risk',
        category: 'Transit',
        label: 'Visibility Risk',
        status: 'CAUTION',
        badgeColor: BADGE_CAUTION,
        recommendation: 'Moderate haze or mist reducing optical distance. Drive with headlights on.',
        basisValue: `Visibility ${visKm} km (Hazy)`,
      });
    } else {
      items.push({
        key: 'visibility_risk',
        category: 'Transit',
        label: 'Visibility Risk',
        status: 'GOOD',
        badgeColor: BADGE_GOOD,
        recommendation: visKm !== null ? 'Clear optical clarity across horizon.' : 'Normal visual clarity',
        basisValue: visKm !== null ? `Visibility ${visKm} km` : 'Adequate',
      });
    }

    // 10. Flood / waterlogging risk
    const rain24h = weather.rainfallLast24h || weather.rainfall || 0;
    if (rainMm >= 25 || rain24h >= 64.5) {
      items.push({
        key: 'flood_waterlogging',
        category: 'Safety',
        label: 'Flood / Waterlogging Risk',
        status: 'AVOID',
        badgeColor: BADGE_AVOID,
        recommendation: 'Heavy precipitation exceeding drainage threshold. Severe waterlogging in low-lying underpasses.',
        basisValue: `Accumulation ${rain24h || rainMm} mm`,
      });
    } else if (rainMm >= 8 || rainProb >= 65) {
      items.push({
        key: 'flood_waterlogging',
        category: 'Safety',
        label: 'Flood / Waterlogging Risk',
        status: 'CAUTION',
        badgeColor: BADGE_CAUTION,
        recommendation: 'Potential localized ponding on urban roads and bottlenecks during peak shower.',
        basisValue: `Precip ${rainMm} mm / ${rainProb}% prob`,
      });
    } else {
      items.push({
        key: 'flood_waterlogging',
        category: 'Safety',
        label: 'Flood / Waterlogging Risk',
        status: 'GOOD',
        badgeColor: BADGE_GOOD,
        recommendation: 'Urban drainage capacity adequate; no flood or waterlogging risk.',
        basisValue: `${rainMm} mm rain`,
      });
    }

    // 11. Air-quality exposure
    if (aqi !== null && aqi > 300) {
      items.push({
        key: 'air_quality_exposure',
        category: 'Health',
        label: 'Air-Quality Exposure',
        status: 'AVOID',
        badgeColor: BADGE_AVOID,
        recommendation: 'Severe / Very Poor air quality. Vulnerable groups must remain indoors. Use HEPA purifiers and N95 masks.',
        basisValue: `CPCB Index ${aqi} (PM2.5 ${weather.aqiPm25 ?? 'High'} µg/m³)`,
      });
    } else if (aqi !== null && aqi > 100) {
      items.push({
        key: 'air_quality_exposure',
        category: 'Health',
        label: 'Air-Quality Exposure',
        status: 'CAUTION',
        badgeColor: BADGE_CAUTION,
        recommendation: 'Moderate to Poor air quality. Children and respiratory patients should reduce prolonged exertion.',
        basisValue: `CPCB Index ${aqi}`,
      });
    } else {
      items.push({
        key: 'air_quality_exposure',
        category: 'Health',
        label: 'Air-Quality Exposure',
        status: 'GOOD',
        badgeColor: BADGE_GOOD,
        recommendation: aqi !== null ? 'Satisfactory air quality. Minimal health risk.' : 'Unavailable for this location',
        basisValue: aqi !== null ? `CPCB Index ${aqi} (Good)` : 'Unavailable',
      });
    }

    return items;
  }

  /**
   * Generates travel conditions summary
   */
  static generateTravelConditions(
    weather: CurrentWeather,
    hourly: HourlyForecastItem[] = []
  ): TravelConditionsSummary {
    const visKm =
      typeof weather.visibilityKm === 'number' && !Number.isNaN(weather.visibilityKm)
        ? weather.visibilityKm
        : typeof weather.visibility === 'number' && !Number.isNaN(weather.visibility)
        ? Math.round(weather.visibility / 100) / 10
        : null;
    const rainMm = typeof weather.precipitation === 'number' && !Number.isNaN(weather.precipitation) ? weather.precipitation : 0;
    const isRaining = weather.isRainingNow || rainMm > 0.2;
    const windKm = typeof weather.windSpeed === 'number' && !Number.isNaN(weather.windSpeed) ? weather.windSpeed : null;
    const gustsKm = typeof weather.windGusts === 'number' && !Number.isNaN(weather.windGusts) ? weather.windGusts : null;
    const temp = typeof weather.temp === 'number' && !Number.isNaN(weather.temp) ? weather.temp : null;
    const rh = typeof weather.humidity === 'number' && !Number.isNaN(weather.humidity) ? weather.humidity : null;
    const heatIndex = temp !== null && rh !== null ? this.calculateHeatIndex(temp, rh) : temp;

    let roadCondition = 'Dry & Clear';
    if (isRaining && rainMm > 5.0) roadCondition = 'Waterlogged / Severe Standing Water';
    else if (isRaining) roadCondition = 'Wet & Slick';
    else if (visKm !== null && visKm < 1.0) roadCondition = 'Reduced Visibility / Fog Caution';

    let visibilityStatus = 'Unavailable';
    if (visKm !== null) {
      if (visKm < 0.5) visibilityStatus = `Very Dense Fog (${Math.round(visKm * 1000)} m)`;
      else if (visKm < 1.0) visibilityStatus = `Dense Fog (${Math.round(visKm * 1000)} m)`;
      else if (visKm < 4.0) visibilityStatus = `Moderate Mist (${visKm} km)`;
      else if (visKm < 10.0) visibilityStatus = `Clear (${visKm} km)`;
      else visibilityStatus = `Good (${visKm} km)`;
    }

    const fogStatus =
      visKm === null ? 'Unavailable' : visKm < 1.0 ? 'Dense Fog Present' : visKm < 3.0 ? 'Shallow Mist' : 'No Fog';

    const windStatus =
      gustsKm !== null && gustsKm > 50
        ? `High Crosswinds (Gusts ${gustsKm} km/h)`
        : windKm !== null
        ? `Normal (${windKm} km/h)`
        : 'Unavailable';

    const heatStressStatus =
      heatIndex === null
        ? 'Unavailable'
        : heatIndex > 42
        ? `Severe Heat (${heatIndex}°C)`
        : heatIndex > 36
        ? `Warm (${heatIndex}°C)`
        : 'Comfortable';

    const floodRisk = rainMm > 15 ? 'High Risk' : rainMm > 3 ? 'Moderate Risk in Low Areas' : 'Low / None';

    const condLower = (weather.condition || '').toLowerCase();
    const rainProb = typeof weather.precipitationProbability === 'number' ? weather.precipitationProbability : 0;
    const thunderstormRisk = condLower.includes('thunder')
      ? 'Active Thunderstorm'
      : rainProb > 60
      ? 'Moderate Convective Risk'
      : 'Low';

    // Calculate best travel window from hourly forecast
    let bestTravelWindow = hourly.length > 0 ? 'All-day window favorable' : 'Awaiting hourly feed';
    if (hourly.length > 0) {
      const rainHours = hourly.filter((h) => (h.precipitationProbability || 0) > 40);
      if (rainHours.length > 0) {
        bestTravelWindow = `Clear until ${rainHours[0].time} IST`;
      }
    }

    const advisoryNote = isRaining
      ? 'Reduce highway speeds by 15-20 km/h on wet bituminous roads. Maintain extra headlight distance.'
      : visKm !== null && visKm < 2.0
      ? 'Use yellow fog lamps; follow road lane markings carefully; avoid overtaking on unlit highways.'
      : 'Routine highway and commuter conditions across all national and state arterial routes.';

    return {
      roadCondition,
      visibilityStatus,
      fogStatus,
      windStatus,
      heatStressStatus,
      floodRisk,
      thunderstormRisk,
      bestTravelWindow,
      advisoryNote,
    };
  }

  /**
   * Generates health and physiological weather indicators
   */
  static generateHealthWeather(weather: CurrentWeather): HealthWeatherSummary {
    const temp = typeof weather.temp === 'number' && !Number.isNaN(weather.temp) ? weather.temp : null;
    const rh = typeof weather.humidity === 'number' && !Number.isNaN(weather.humidity) ? weather.humidity : null;
    const heatIndex = temp !== null && rh !== null ? this.calculateHeatIndex(temp, rh) : temp;
    const humidex = temp !== null && rh !== null ? this.calculateHumidex(temp, rh) : null;
    const uv = typeof weather.uvIndex === 'number' && !Number.isNaN(weather.uvIndex) ? weather.uvIndex : null;
    const aqi =
      typeof weather.aqi === 'number' && !Number.isNaN(weather.aqi)
        ? weather.aqi
        : typeof weather.aqiIndex === 'number' && !Number.isNaN(weather.aqiIndex)
        ? weather.aqiIndex
        : null;

    let heatStressCategory = 'Unavailable';
    if (heatIndex !== null) {
      if (heatIndex >= 45) heatStressCategory = 'Extreme Danger';
      else if (heatIndex >= 40) heatStressCategory = 'Danger';
      else if (heatIndex >= 35) heatStressCategory = 'Extreme Caution';
      else if (heatIndex >= 30) heatStressCategory = 'Caution';
      else heatStressCategory = 'Normal';
    }

    let uvRiskLevel = 'Unavailable';
    if (uv !== null) {
      if (uv >= 11) uvRiskLevel = 'Extreme';
      else if (uv >= 8) uvRiskLevel = 'Very High';
      else if (uv >= 6) uvRiskLevel = 'High';
      else if (uv >= 3) uvRiskLevel = 'Moderate';
      else uvRiskLevel = 'Low';
    }

    const coldRiskLevel =
      temp === null ? 'Unavailable' : temp < 5 ? 'Cold Wave Warning' : temp < 12 ? 'Mild Cold Discomfort' : 'None';

    const airQualityExposure =
      aqi === null
        ? 'Unavailable'
        : aqi > 300
        ? 'Severe Health Threat'
        : aqi > 200
        ? 'Unhealthy for All'
        : aqi > 100
        ? 'Unhealthy for Sensitive'
        : 'Satisfactory';

    const humidityDiscomfort =
      humidex === null
        ? 'Unavailable'
        : humidex > 45
        ? 'Dangerous Discomfort'
        : humidex > 38
        ? 'General Discomfort'
        : humidex > 30
        ? 'Moderate Discomfort'
        : 'Little to No Discomfort';

    const asthmaRespiratoryRisk =
      aqi === null && !weather.pollen
        ? 'Unavailable'
        : (aqi !== null && aqi > 180) || weather.pollen === 'High' || weather.pollen === 'Very High'
        ? 'Elevated Respiratory Alert'
        : 'Normal Baseline';

    const condLower = (weather.condition || '').toLowerCase();
    const lightningCaution = condLower.includes('thunder')
      ? 'Stay Indoors - Active Electrical Discharges'
      : 'No Lightning Risk';

    const pollenAdvice =
      weather.pollenCount !== null && weather.pollenCount !== undefined
        ? `${weather.pollenCount} grains/m³ (${weather.pollen || 'Low'} risk)`
        : 'Pollen telemetry unavailable for this station.';

    return {
      heatStressCategory,
      heatIndexC: heatIndex,
      uvRiskLevel,
      coldRiskLevel,
      airQualityExposure,
      humidityDiscomfort,
      humidexValue: humidex,
      asthmaRespiratoryRisk,
      lightningCaution,
      pollenAdvice,
    };
  }
}
