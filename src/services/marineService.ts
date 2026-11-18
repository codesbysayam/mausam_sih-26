import { LocationRecord, MarineObservation } from '../types';

class MarineService {
  private cache: Map<string, { data: MarineObservation; timestamp: number }> = new Map();
  private cacheTtlMs = 15 * 60 * 1000; // 15 minutes cache

  /**
   * Identifies if a location is broadly inland based on state or geographical coordinates
   */
  isLocationCoastal(location: LocationRecord): boolean {
    if (location.coastalStatus === 'coastal') return true;
    if (location.coastalStatus === 'inland') return false;

    // Coastal states in India
    const coastalStates = [
      'Odisha',
      'West Bengal',
      'Andhra Pradesh',
      'Tamil Nadu',
      'Kerala',
      'Karnataka',
      'Goa',
      'Maharashtra',
      'Gujarat',
      'Puducherry',
      'Andaman and Nicobar',
      'Lakshadweep',
      'Daman and Diu',
    ];

    const stateMatch = coastalStates.some((s) =>
      location.state.toLowerCase().includes(s.toLowerCase())
    );

    if (!stateMatch) return false;

    // Coastal districts list
    const coastalDistricts = [
      'Puri',
      'Jagatsinghpur',
      'Kendrapara',
      'Bhadrak',
      'Baleswar',
      'Balasore',
      'Ganjam',
      'Khordha',
      'Cuttack',
      'Mumbai',
      'Mumbai Suburban',
      'Thane',
      'Raigad',
      'Ratnagiri',
      'Sindhudurg',
      'Palghar',
      'Chennai',
      'Chengalpattu',
      'Kancheepuram',
      'Cuddalore',
      'Nagapattinam',
      'Thanjavur',
      'Thiruvarur',
      'Pudukkottai',
      'Ramanathapuram',
      'Thoothukudi',
      'Tirunelveli',
      'Kanniyakumari',
      'Visakhapatnam',
      'Vizianagaram',
      'Srikakulam',
      'East Godavari',
      'West Godavari',
      'Krishna',
      'Guntur',
      'Prakasam',
      'Nellore',
      'Kolkata',
      'South 24 Parganas',
      'North 24 Parganas',
      'Purba Medinipur',
      'Thiruvananthapuram',
      'Kollam',
      'Alappuzha',
      'Ernakulam',
      'Thrissur',
      'Malappuram',
      'Kozhikode',
      'Kannur',
      'Kasaragod',
      'Dakshina Kannada',
      'Udupi',
      'Uttara Kannada',
      'South Goa',
      'North Goa',
      'Kutch',
      'Jamnagar',
      'Morbi',
      'Devbhumi Dwarka',
      'Porbandar',
      'Junagadh',
      'Gir Somnath',
      'Amreli',
      'Bhavnagar',
      'Ahmedabad',
      'Anand',
      'Bharuch',
      'Surat',
      'Navsari',
      'Valsad',
    ];

    const districtMatch = coastalDistricts.some(
      (d) =>
        location.district?.toLowerCase().includes(d.toLowerCase()) ||
        location.city?.toLowerCase().includes(d.toLowerCase()) ||
        location.displayName?.toLowerCase().includes(d.toLowerCase())
    );

    return districtMatch;
  }

  /**
   * Fetches real marine oceanographic data for a location
   */
  async getMarineData(location: LocationRecord): Promise<MarineObservation> {
    const isCoastal = this.isLocationCoastal(location);

    if (!isCoastal) {
      return {
        isApplicable: false,
        waveHeightMeters: null,
        swellHeightMeters: null,
        wavePeriodSeconds: null,
        swellPeriodSeconds: null,
        seaSurfaceTempC: null,
        currentVelocityKmh: null,
        currentDirectionDeg: null,
        currentDirectionCompass: null,
        windWaveHeightMeters: null,
        highTideTime: null,
        lowTideTime: null,
        fishingSuitability: 'Unavailable',
        beachSafetyStatus: 'Unavailable',
        source: 'INCOIS / Copernicus Marine System',
        timestampFormatted: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST',
        status: 'UNAVAILABLE',
      };
    }

    const cacheKey = location.id;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.data;
    }

    try {
      const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${location.lat}&longitude=${location.lng}&current=wave_height,wave_direction,wave_period,wind_wave_height,wind_wave_direction,swell_wave_height,swell_wave_direction,swell_wave_period,ocean_current_velocity,ocean_current_direction,sea_surface_temperature&timezone=Asia%2FKolkata`;
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Marine API HTTP ${res.status}`);
      }

      const json = await res.json();
      const current = json.current || {};

      const waveHeight = current.wave_height !== null && current.wave_height !== undefined
        ? Math.round(current.wave_height * 10) / 10
        : null;

      if (waveHeight === null) {
        // Location coordinates point to land within marine boundary grid
        return {
          isApplicable: false,
          waveHeightMeters: null,
          swellHeightMeters: null,
          wavePeriodSeconds: null,
          swellPeriodSeconds: null,
          seaSurfaceTempC: null,
          currentVelocityKmh: null,
          currentDirectionDeg: null,
          currentDirectionCompass: null,
          windWaveHeightMeters: null,
          highTideTime: null,
          lowTideTime: null,
          fishingSuitability: 'Unavailable',
          beachSafetyStatus: 'Unavailable',
          source: 'INCOIS / Copernicus Marine System',
          timestampFormatted: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST',
          status: 'UNAVAILABLE',
        };
      }

      const swellHeight =
        typeof current.swell_wave_height === 'number' && Number.isFinite(current.swell_wave_height)
          ? Math.round(current.swell_wave_height * 10) / 10
          : null;

      const wavePeriod =
        typeof current.wave_period === 'number' && Number.isFinite(current.wave_period)
          ? Math.round(current.wave_period)
          : null;
      const swellPeriod =
        typeof current.swell_wave_period === 'number' && Number.isFinite(current.swell_wave_period)
          ? Math.round(current.swell_wave_period)
          : null;
      const sst =
        typeof current.sea_surface_temperature === 'number' && Number.isFinite(current.sea_surface_temperature)
          ? Math.round(current.sea_surface_temperature * 10) / 10
          : null;

      const currentVelocity =
        typeof current.ocean_current_velocity === 'number' && Number.isFinite(current.ocean_current_velocity)
          ? Math.round(current.ocean_current_velocity * 3.6 * 10) / 10
          : null;

      const currentDirDeg =
        typeof current.ocean_current_direction === 'number' && Number.isFinite(current.ocean_current_direction)
          ? Math.round(current.ocean_current_direction)
          : null;
      const currentDirCompass = currentDirDeg !== null ? this.degToCompass(currentDirDeg) : null;

      const windWaveHeight =
        typeof current.wind_wave_height === 'number' && Number.isFinite(current.wind_wave_height)
          ? Math.round(current.wind_wave_height * 10) / 10
          : null;

      // Derive fishing suitability
      let fishingSuitability: MarineObservation['fishingSuitability'] = 'Favorable';
      if (waveHeight >= 3.5 || (swellHeight !== null && swellHeight >= 2.5)) {
        fishingSuitability = 'Prohibited';
      } else if (waveHeight >= 2.5 || (swellHeight !== null && swellHeight >= 1.8)) {
        fishingSuitability = 'Advisory - Restrict Navigation';
      } else if (waveHeight >= 1.5 || (currentVelocity !== null && currentVelocity >= 3.5)) {
        fishingSuitability = 'Caution';
      } else {
        fishingSuitability = 'Favorable';
      }

      // Derive beach safety status
      let beachSafetyStatus: MarineObservation['beachSafetyStatus'] = 'Safe';
      if (waveHeight >= 2.2) {
        beachSafetyStatus = 'Hazardous Surf';
      } else if (waveHeight >= 1.3) {
        beachSafetyStatus = 'Caution - Moderate Rip Currents';
      } else {
        beachSafetyStatus = 'Safe';
      }

      const now = new Date();
      const result: MarineObservation = {
        isApplicable: true,
        waveHeightMeters: waveHeight,
        swellHeightMeters: swellHeight,
        wavePeriodSeconds: wavePeriod,
        swellPeriodSeconds: swellPeriod,
        seaSurfaceTempC: sst,
        currentVelocityKmh: currentVelocity,
        currentDirectionDeg: currentDirDeg,
        currentDirectionCompass: currentDirCompass,
        windWaveHeightMeters: windWaveHeight,
        highTideTime: null,
        lowTideTime: null,
        fishingSuitability,
        beachSafetyStatus,
        source: 'Open-Meteo Marine Telemetry',
        timestampFormatted:
          now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST',
        status: 'LIVE',
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (e) {
      console.warn('[MarineService] Live oceanographic fetch failed:', e);
      return {
        isApplicable: false,
        waveHeightMeters: null,
        swellHeightMeters: null,
        wavePeriodSeconds: null,
        swellPeriodSeconds: null,
        seaSurfaceTempC: null,
        currentVelocityKmh: null,
        currentDirectionDeg: null,
        currentDirectionCompass: null,
        windWaveHeightMeters: null,
        highTideTime: null,
        lowTideTime: null,
        fishingSuitability: 'Unavailable',
        beachSafetyStatus: 'Unavailable',
        source: 'INCOIS / Copernicus Marine System',
        timestampFormatted: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST',
        status: 'UNAVAILABLE',
      };
    }
  }

  private degToCompass(deg: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round((deg % 360) / 22.5) % 16;
    return directions[idx];
  }
}

export const marineService = new MarineService();
