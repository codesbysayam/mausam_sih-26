import { CropAdvisory, AgrometDistrictBulletin } from '../types';
import type { WeatherDataBundle } from './weatherService';

export interface CropCategory {
  id: string;
  name: string;
  crops: string[];
}

export const CROP_CATEGORIES: CropCategory[] = [
  {
    id: 'all',
    name: 'All Crops',
    crops: [
      'Rice (Paddy)',
      'Wheat',
      'Cotton',
      'Sugarcane',
      'Maize (Corn)',
      'Soybean',
      'Mustard',
      'Groundnut',
      'Gram (Chickpea)',
      'Tomato & Vegetables',
      'Potato',
    ],
  },
  {
    id: 'cereals',
    name: 'Cereals',
    crops: ['Rice (Paddy)', 'Wheat', 'Maize (Corn)', 'Barley', 'Bajra (Pearl Millet)'],
  },
  {
    id: 'pulses',
    name: 'Pulses',
    crops: ['Gram (Chickpea)', 'Arhar (Pigeon Pea)', 'Moong (Green Gram)', 'Urad (Black Gram)', 'Lentil'],
  },
  {
    id: 'oilseeds',
    name: 'Oilseeds',
    crops: ['Mustard', 'Soybean', 'Groundnut', 'Sunflower', 'Sesame'],
  },
  {
    id: 'vegetables',
    name: 'Vegetables',
    crops: ['Tomato & Vegetables', 'Potato', 'Onion', 'Chilli & Capsicum', 'Cauliflower & Cabbage'],
  },
  {
    id: 'fruits',
    name: 'Fruits',
    crops: ['Mango', 'Banana', 'Citrus & Orange', 'Apple', 'Pomegranate', 'Guava'],
  },
  {
    id: 'cash_crops',
    name: 'Cash Crops',
    crops: ['Cotton', 'Sugarcane', 'Jute', 'Tobacco', 'Tea & Plantation'],
  },
];

export const INDIAN_STATES_AND_DISTRICTS: Record<string, string[]> = {
  'Punjab': ['Ludhiana', 'Amritsar', 'Patiala', 'Jalandhar', 'Bathinda', 'Sangrur', 'Firozpur', 'Hoshiarpur', 'Gurdaspur'],
  'Maharashtra': ['Nashik', 'Pune', 'Nagpur', 'Aurangabad (Chhatrapati Sambhajinagar)', 'Solapur', 'Kolhapur', 'Ahmednagar', 'Amravati', 'Jalgaon'],
  'Uttar Pradesh': ['Varanasi', 'Lucknow', 'Kanpur Nagar', 'Prayagraj', 'Meerut', 'Agra', 'Gorakhpur', 'Bareilly', 'Ayodhya', 'Jhansi'],
  'Tamil Nadu': ['Thanjavur', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore', 'Dindigul'],
  'West Bengal': ['Hooghly', 'Purba Bardhaman', 'Nadia', 'Murshidabad', 'North 24 Parganas', 'Bankura', 'Malda', 'Jalpaiguri'],
  'Odisha': ['Khordha (Bhubaneswar)', 'Cuttack', 'Sambalpur', 'Balasore', 'Ganjam', 'Puri', 'Bargarh', 'Mayurbhanj', 'Sundargarh'],
  'Karnataka': ['Mandya', 'Mysuru', 'Belagavi', 'Dharwad', 'Shivamogga', 'Tumakuru', 'Vijayapura', 'Ballari', 'Hassan'],
  'Gujarat': ['Anand', 'Rajkot', 'Surat', 'Mehsana', 'Junagadh', 'Vadodara', 'Ahmedabad', 'Banaskantha', 'Bhavnagar'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Udaipur', 'Sri Ganganagar', 'Bikaner', 'Alwar', 'Ajmer', 'Bharatpur'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Ujjain', 'Jabalpur', 'Gwalior', 'Hoshangabad (Narmadapuram)', 'Sagar', 'Chhindwara'],
  'Bihar': ['Patna', 'Muzaffarpur', 'Gaya', 'Bhagalpur', 'Samastipur', 'Darbhanga', 'Nalanda', 'Purnia', 'Rohtas'],
  'Andhra Pradesh': ['Guntur', 'Krishna (Vijayawada)', 'East Godavari', 'West Godavari', 'Kurnool', 'Visakhapatnam', 'Chittoor', 'Anantapur'],
  'Telangana': ['Warangal', 'Karimnagar', 'Nalgonda', 'Khammam', 'Nizamabad', 'Rangareddy', 'Mahabubnagar', 'Medak'],
  'Haryana': ['Karnal', 'Hisar', 'Ambala', 'Sirsa', 'Kurukshetra', 'Rohtak', 'Sonipat', 'Fatehabad'],
  'Kerala': ['Palakkad', 'Wayanad', 'Thrissur', 'Kottayam', 'Alappuzha', 'Idukki', 'Kozhikode', 'Malappuram'],
  'Assam': ['Jorhat', 'Kamrup (Guwahati)', 'Sonitpur', 'Nagaon', 'Cachar', 'Dibrugarh', 'Barpeta'],
  'Himachal Pradesh': ['Shimla', 'Kangra (Dharamshala)', 'Kullu', 'Mandi', 'Solan', 'Una'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Udham Singh Nagar (Pantnagar)', 'Nainital', 'Almora'],
  'Jharkhand': ['Ranchi', 'Hazaribagh', 'Dhanbad', 'Palamu', 'East Singhbhum (Jamshedpur)', 'Dumka'],
  'Chhattisgarh': ['Raipur', 'Durg', 'Bilaspur', 'Rajnandgaon', 'Bastar (Jagdalpur)', 'Surguja'],
};

export interface RainfallDay {
  dayName: string;
  dateStr: string;
  amountMm: number;
  probPercent: number;
  condition: string;
  isWet: boolean;
}

export interface SoilMoistureData {
  available: boolean;
  sourceNote: string;
  topsoilPct: number; // 0-15 cm
  rootZonePct: number; // 15-45 cm
  subsoilPct: number; // 45-100 cm
  overallPct: number;
  status: 'Saturated' | 'Optimal' | 'Adequate' | 'Deficit / Dry' | 'Unavailable';
  trend: 'increasing' | 'stable' | 'decreasing';
  fieldCapacityPct: number;
  wiltingPointPct: number;
  waterAvailableMm: number;
}

export interface FarmActionItem {
  id: string;
  category: 'irrigation' | 'nutrients' | 'pest' | 'operations' | 'harvest';
  title: string;
  action: string;
  reason: string;
  when: string;
  priority: 'High Priority' | 'Moderate' | 'Favorable' | 'Caution' | 'Actionable';
  icon: string;
  statusColor: 'amber' | 'emerald' | 'cyan' | 'rose' | 'indigo';
}

export interface ImpactTimelineStep {
  step: number;
  label: string;
  value: string;
  status: 'favorable' | 'caution' | 'action_needed';
  description: string;
  icon: string;
}

export interface HourlyOperationSlot {
  timeLabel: string;
  rating: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR' | 'AVOID';
  spraying: boolean;
  sowing: boolean;
  irrigation: boolean;
  harvesting: boolean;
  machinery: boolean;
  tempC: number;
  rhPct: number;
  windKmh: number;
  rainMm: number;
}

export interface FarmRiskAnalysis {
  overallScore: number; // 0 - 100
  riskLevel: 'Low Risk' | 'Moderate Risk' | 'Elevated Risk' | 'Severe Risk';
  color: 'emerald' | 'amber' | 'orange' | 'rose';
  factors: {
    rainfallRisk: { score: number; label: string; explanation: string };
    thermalStress: { score: number; label: string; explanation: string };
    windGustRisk: { score: number; label: string; explanation: string };
    pestFungalRisk: { score: number; label: string; explanation: string };
    soilWaterlogging: { score: number; label: string; explanation: string };
  };
  whyExplanation: string[];
}

export interface ExtendedAgrometBulletin extends AgrometDistrictBulletin {
  rainfall5DaysList: RainfallDay[];
  cumulativeRainfallMm: number;
  soilMoisture: SoilMoistureData;
  actionPlan: FarmActionItem[];
  impactTimeline: ImpactTimelineStep[];
  operationsTimeline: HourlyOperationSlot[];
  riskAnalysis: FarmRiskAnalysis;
  pestDiseaseWatch: {
    overallRisk: 'Low' | 'Moderate' | 'High' | 'Severe';
    primaryConcern: string;
    scientificName?: string;
    etiology: string;
    symptoms: string;
    etlThreshold: string;
    immediateAction: string;
    organicRemedy: string;
    chemicalControl: string;
    riskDrivers: { name: string; value: string; impact: 'high' | 'medium' | 'low' }[];
  };
  sevenDayCalendar: {
    day: string;
    date: string;
    icon: string;
    condition: string;
    tempMax: number;
    tempMin: number;
    rainMm: number;
    rainProb: number;
    soilCondition: string;
    farmSuitability: 'EXCELLENT' | 'GOOD' | 'LIMITED' | 'RESTRICTED';
  }[];
}

export interface RegionalCropReferenceTemplate {
  state: string;
  district: string;
  amfuUnit: string;
  crops: CropAdvisory[];
}

export const AGROMET_BULLETINS: Record<string, RegionalCropReferenceTemplate> = {
  'Punjab-Ludhiana': {
    state: 'Punjab',
    district: 'Ludhiana',
    amfuUnit: 'AMFU Ludhiana • Punjab Agricultural University (PAU)',
    crops: [
      {
        cropName: 'Rice (Paddy)',
        stage: 'Tillering to Panicle Initiation',
        sowingAdvice: 'Monitor Direct Seeded Rice (DSR) for weed emergence; maintain shallow moisture without stagnation.',
        irrigationAdvice: 'Adjust irrigation intervals strictly to measured 48-hour precipitation; maintain 2–3 cm shallow standing water only during dry spells.',
        fertilizerAdvice: 'Apply split nitrogen top-dressing only when foliage is dry and no heavy shower is forecast within 24 hours.',
        pestDiseaseAdvice: 'Scout under humid spells for Bacterial Leaf Blight & Sheath Blight; verify local PAU/AMFU spray schedules before chemical control.',
        harvestingAdvice: 'Inspect early maturing plots for lodging risk ahead of gusty wind events.',
        riskLevel: 'Moderate',
        riskAlert: 'Elevated humidity increases foliar and sheath fungal vulnerability.',
      },
      {
        cropName: 'Cotton',
        stage: 'Square Formation to Flowering',
        sowingAdvice: 'Keep field drainage channels clear to prevent water stagnation after convective showers.',
        irrigationAdvice: 'Avoid over-irrigation; irrigate only when topsoil dries during extended dry spells.',
        fertilizerAdvice: 'Apply foliar potassium nitrate (13:0:45) at flowering stage during calm, clear morning hours.',
        pestDiseaseAdvice: 'Monitor for Whitefly (ETL: 6–8 adults/leaf) and Pink Bollworm using pheromone traps @ 5/acre.',
        harvestingAdvice: 'Plan dry picking slots once bolls open cleanly.',
        riskLevel: 'High',
        riskAlert: 'Overcast humid spells elevate sucking pest scouting priority.',
      },
      {
        cropName: 'Maize (Corn)',
        stage: 'Knee-high to Tasseling',
        sowingAdvice: 'Perform inter-cultivation during dry breaks to suppress broadleaf weeds and aerate ridges.',
        irrigationAdvice: 'Avoid waterlogging; ensure prompt surface drainage in heavy soils.',
        fertilizerAdvice: 'Top dress nitrogen with zinc sulphate where deficiency symptoms appear.',
        pestDiseaseAdvice: 'Scout central whorls for Fall Armyworm (FAW) egg masses and apply IPM control when ETL is crossed.',
        harvestingAdvice: 'Harvest green cobs during dry intervals for fresh local markets.',
        riskLevel: 'Low',
        riskAlert: 'General field conditions manageable with routine drainage checks.',
      },
      {
        cropName: 'Sugarcane',
        stage: 'Grand Growth Stage',
        sowingAdvice: 'Complete earthing-up and propping to limit lodging risk during gusty winds.',
        irrigationAdvice: 'Schedule irrigation at 8–10 day intervals during dry weeks.',
        fertilizerAdvice: 'Follow PAU recommended split nutrient schedule after soil moisture stabilizes.',
        pestDiseaseAdvice: 'Scout for Top Borer and Pyrilla; prefer bio-control and need-based sprays.',
        harvestingAdvice: 'Maintain ratoon drainage channels cleanly.',
        riskLevel: 'Moderate',
        riskAlert: 'Tall cane stands require propping ahead of wind gusts.',
      },
    ],
  },
  'Odisha-Khordha (Bhubaneswar)': {
    state: 'Odisha',
    district: 'Khordha (Bhubaneswar)',
    amfuUnit: 'AMFU Bhubaneswar • Odisha University of Agriculture & Technology (OUAT)',
    crops: [
      {
        cropName: 'Rice (Paddy)',
        stage: 'Active Vegetative to Maturity (Season-Dependent)',
        sowingAdvice: 'Keep field bund outlets clear of silt and weeds to drain sudden coastal downpours quickly.',
        irrigationAdvice: 'Withhold pumping whenever 48-hour forecast indicates rain; conserve excess runoff in farm ponds.',
        fertilizerAdvice: 'Avoid broadcasting urea or DAP ahead of rain spells to prevent leaching and runoff loss.',
        pestDiseaseAdvice: 'Watch for Brown Spot, Bacterial Leaf Streak, and BPH after humid coastal spells; follow OUAT/GKMS recommended dosages.',
        harvestingAdvice: 'Move harvested paddy bundles to raised covered platforms immediately when coastal rain or depression advisories are active.',
        riskLevel: 'High',
        riskAlert: 'Coastal humidity and depression-linked showers raise lodging and fungal risk.',
      },
      {
        cropName: 'Tomato & Vegetables',
        stage: 'Vegetative & Fruiting',
        sowingAdvice: 'Use raised beds with 20 cm inter-row drainage furrows and sturdy bamboo staking.',
        irrigationAdvice: 'Withhold irrigation during wet spells; resume light watering only when topsoil dries.',
        fertilizerAdvice: 'Apply foliar micronutrient sprays only on dry foliage in calm morning windows.',
        pestDiseaseAdvice: 'Monitor nurseries and lower leaves for Damping-off and Early Blight after prolonged leaf wetness.',
        harvestingAdvice: 'Pick mature fruits during dry morning slots to avoid cracking and transit rot.',
        riskLevel: 'High',
        riskAlert: 'Excess surface moisture raises root-rot and damping-off susceptibility.',
      },
      {
        cropName: 'Groundnut',
        stage: 'Flowering, Pegging & Pod Development',
        sowingAdvice: 'Avoid soil compaction around collar zone after rain.',
        irrigationAdvice: 'Ensure rapid drainage in low-lying fields; irrigate lightly only during dry pegging intervals.',
        fertilizerAdvice: 'Apply gypsum as recommended by OUAT during dry spells prior to earthing-up.',
        pestDiseaseAdvice: 'Scout for Tikka leaf spot and Spodoptera larvae on lower foliage.',
        harvestingAdvice: 'Harvest at physiological maturity during clear dry weather for proper pod drying.',
        riskLevel: 'Moderate',
        riskAlert: 'Waterlogged clay soils hinder pod development and aeration.',
      },
    ],
  },
  'Maharashtra-Nashik': {
    state: 'Maharashtra',
    district: 'Nashik',
    amfuUnit: 'AMFU Nashik • Mahatma Phule Krishi Vidyapeeth (MPKV)',
    crops: [
      {
        cropName: 'Tomato & Vegetables',
        stage: 'Fruiting and Harvesting',
        sowingAdvice: 'Maintain raised nursery beds by 15 cm to prevent damping-off during wet spells.',
        irrigationAdvice: 'Regulate drip schedules directly against observed rainfall to avoid fruit cracking.',
        fertilizerAdvice: 'Apply foliar calcium and boron during calm, dry morning hours to support fruit firmness.',
        pestDiseaseAdvice: 'Scout for Early Blight, Downy Mildew, and Fruit Borer; apply sprays only during rain-free intervals.',
        harvestingAdvice: 'Harvest mature produce ahead of forecast heavy rain days.',
        riskLevel: 'High',
        riskAlert: 'Extended leaf wetness elevates blight and mildew pressure.',
      },
      {
        cropName: 'Soybean',
        stage: 'Pod Formation & Grain Filling',
        sowingAdvice: 'Keep ridges and furrows open to route excess runoff out of root zones.',
        irrigationAdvice: 'Provide protective irrigation only during dry pod-filling breaks.',
        fertilizerAdvice: 'Apply water-soluble foliar nutrition only in dry calm morning windows.',
        pestDiseaseAdvice: 'Scout for Girdle Beetle and Semilooper; follow MPKV ETL guidelines.',
        harvestingAdvice: 'Prepare clean drying yards and moisture checks ahead of harvest.',
        riskLevel: 'Moderate',
        riskAlert: 'Poor drainage in low plots elevates root-rot risk.',
      },
      {
        cropName: 'Sugarcane',
        stage: 'Grand Growth Stage',
        sowingAdvice: 'Practice trash mulching and lower-leaf detrashing to improve canopy airflow.',
        irrigationAdvice: 'Pause drip cycles after rainfall until topsoil moisture recedes.',
        fertilizerAdvice: 'Resume fertigation once field moisture stabilizes.',
        pestDiseaseAdvice: 'Inspect root zone for White Grub and canopy for Pyrilla.',
        harvestingAdvice: 'Keep perimeter field drains open.',
        riskLevel: 'Low',
        riskAlert: 'Routine canopy ventilation and drainage maintenance advised.',
      },
    ],
  },
  'Maharashtra-Pune': {
    state: 'Maharashtra',
    district: 'Pune',
    amfuUnit: 'AMFU Pune • College of Agriculture Pune & IMD Agrimet',
    crops: [
      {
        cropName: 'Sugarcane',
        stage: 'Tillering to Grand Growth',
        sowingAdvice: 'Prop and tie tall canes ahead of gusty wind spells.',
        irrigationAdvice: 'Avoid standing water; adjust drip runtime to daily rainfall forecast.',
        fertilizerAdvice: 'Apply recommended split nitrogen with micronutrients during dry intervals.',
        pestDiseaseAdvice: 'Scout for Woolly Aphid and Pyrilla; preserve natural predators.',
        harvestingAdvice: 'Follow local sugar-factory maturity scheduling.',
        riskLevel: 'Low',
        riskAlert: 'Monitor wind gusts and drainage in ghat-adjacent catchments.',
      },
      {
        cropName: 'Soybean',
        stage: 'Flowering to Pod Initiation',
        sowingAdvice: 'Perform shallow hoeing during dry breaks to break surface crust.',
        irrigationAdvice: 'Use supplemental irrigation only when dry spells exceed 7 days.',
        fertilizerAdvice: 'Apply foliar potassium nitrate in calm morning hours when dry.',
        pestDiseaseAdvice: 'Install yellow sticky traps and scout for Spodoptera and Leaf Miner.',
        harvestingAdvice: 'Keep harvesting and threshing tarpaulins ready.',
        riskLevel: 'Moderate',
        riskAlert: 'Humid spells increase anthracnose scouting priority.',
      },
    ],
  },
  'Uttar Pradesh-Varanasi': {
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    amfuUnit: 'AMFU Varanasi • Banaras Hindu University (BHU)',
    crops: [
      {
        cropName: 'Rice (Paddy)',
        stage: 'Active Vegetative to Grain Filling',
        sowingAdvice: 'Maintain clean bunds and uniform plant spacing for canopy airflow.',
        irrigationAdvice: 'Maintain shallow moisture during dry spells; avoid pumping before forecast rain.',
        fertilizerAdvice: 'Apply recommended split nitrogen with zinc only on dry foliage.',
        pestDiseaseAdvice: 'Watch for Yellow Stem Borer dead hearts and deploy Trichogramma cards per BHU guidance.',
        harvestingAdvice: 'Keep harvested straw and grain protected from sudden showers.',
        riskLevel: 'Low',
        riskAlert: 'Monitor thermal load and intermittent convective showers.',
      },
      {
        cropName: 'Sugarcane',
        stage: 'Grand Growth Stage',
        sowingAdvice: 'Complete earthing-up to protect stands from gusty winds.',
        irrigationAdvice: 'Irrigate at 8–10 day intervals during rain-free periods.',
        fertilizerAdvice: 'Apply split nitrogen per local soil health card.',
        pestDiseaseAdvice: 'Scout for Top Borer and Pyrilla before any intervention.',
        harvestingAdvice: 'Plan ratoon management cleanly.',
        riskLevel: 'Moderate',
        riskAlert: 'Propping advised where wind gusts exceed 20 km/h.',
      },
    ],
  },
  'Tamil Nadu-Thanjavur': {
    state: 'Tamil Nadu',
    district: 'Thanjavur',
    amfuUnit: 'AMFU Thanjavur • Tamil Nadu Rice Research Institute (TRRI)',
    crops: [
      {
        cropName: 'Rice (Paddy)',
        stage: 'Kuruvai / Samba / Thaladi (Season-Dependent)',
        sowingAdvice: 'Coordinate nursery preparation and bund drainage with Northeast / Southwest monsoon outlook.',
        irrigationAdvice: 'Regulate canal/pump irrigation strictly against 5-day rainfall forecast.',
        fertilizerAdvice: 'Follow TNAU/TRRI leaf colour chart (LCC) before nitrogen top-dressing.',
        pestDiseaseAdvice: 'Monitor base of tillers for Brown Plant Hopper (BPH) and keep bunds weed-free.',
        harvestingAdvice: 'Harvest promptly when 80% panicles mature during dry weather windows.',
        riskLevel: 'Moderate',
        riskAlert: 'Delta drainage and coastal rainfall alerts require close tracking.',
      },
      {
        cropName: 'Groundnut',
        stage: 'Pegging to Pod Development',
        sowingAdvice: 'Loosen topsoil gently around root zone to assist peg penetration.',
        irrigationAdvice: 'Maintain even moisture during pegging without waterlogging.',
        fertilizerAdvice: 'Apply gypsum per TNAU guidance followed by light hoeing.',
        pestDiseaseAdvice: 'Scout lower leaves for Tikka leaf spot and Spodoptera.',
        harvestingAdvice: 'Avoid harvesting wet pods ahead of forecast showers.',
        riskLevel: 'Low',
        riskAlert: 'Check coastal rainfall alerts before lifting mature pods.',
      },
    ],
  },
};

function formatDynamicBulletinDates() {
  const now = new Date();
  const end = new Date(now.getTime() + 4 * 86400000);
  const year = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(now);
  const weekday = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long' }).format(now);
  const issueDay: 'Tuesday' | 'Friday' = weekday === 'Friday' ? 'Friday' : 'Tuesday';
  const issueDate = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(now);
  const fmtShort = (d: Date) =>
    new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
    }).format(d);
  const validPeriod = `${fmtShort(now)} - ${fmtShort(end)} ${year}`;
  return { now, year, issueDay, issueDate, validPeriod };
}

/**
 * Generate an Agromet bulletin grounded in live WeatherDataBundle telemetry and regional crop advisories
 */
export function getAgrometBulletin(
  state: string,
  district: string,
  weatherBundle?: WeatherDataBundle
): ExtendedAgrometBulletin {
  const key = `${state}-${district}`;
  const dyn = formatDynamicBulletinDates();
  const storedTemplate = AGROMET_BULLETINS[key];

  const liveCurr = weatherBundle?.current;
  const liveDaily = weatherBundle?.daily || [];
  const hasLiveWeather = typeof liveCurr?.temp === 'number' && Number.isFinite(liveCurr.temp);

  let weatherSummary =
    `Weather-derived operational outlook for ${district}, ${state}. Live surface telemetry is pending; verify official IMD GKMS district advisories before field actions.`;
  let rainfallForecast5Days = 'Day 1: Nil | Day 2: Nil | Day 3: Nil | Day 4: Nil | Day 5: Nil';

  if (hasLiveWeather && liveCurr) {
    const tStr = `${Math.round(liveCurr.temp!)}°C`;
    const hiStr = typeof liveCurr.high === 'number' ? `${Math.round(liveCurr.high)}°C` : '—';
    const loStr = typeof liveCurr.low === 'number' ? `${Math.round(liveCurr.low)}°C` : '—';
    const rhStr = typeof liveCurr.humidity === 'number' ? `${Math.round(liveCurr.humidity)}%` : '—';
    const windStr = typeof liveCurr.windSpeed === 'number' ? `${Math.round(liveCurr.windSpeed)} km/h ${liveCurr.windDirection || ''}`.trim() : '—';
    weatherSummary = `${liveCurr.condition} over ${district}. Current: ${tStr} (Max ${hiStr} / Min ${loStr}), RH: ${rhStr}, Wind: ${windStr}. ${liveCurr.rainExpectedSummary || ''}`.trim();

    if (liveDaily.length > 0) {
      rainfallForecast5Days = Array.from({ length: 5 }, (_, idx) => {
        const d = liveDaily[idx];
        const mm = typeof d?.precipMm === 'number' ? Math.round(d.precipMm) : 0;
        return `Day ${idx + 1}: ${mm > 0 ? `${mm}mm` : 'Nil'}`;
      }).join(' | ');
    }
  }

  const baseBulletin: AgrometDistrictBulletin = {
    state,
    district,
    amfuUnit:
      storedTemplate?.amfuUnit ||
      `AMFU ${district} • Regional Agricultural University & IMD GKMS Node`,
    bulletinNo: 'Weather-Derived Operational Guidance',
    issueDay: dyn.issueDay,
    issueDate: dyn.issueDate,
    validPeriod: dyn.validPeriod,
    weatherSummary,
    rainfallForecast5Days,
    crops: storedTemplate?.crops || [
      {
        cropName: 'Rice (Paddy)',
        stage: 'Vegetative to Tillering',
        sowingAdvice: 'Maintain optimal plant density and clear weed seedlings from border bunds.',
        irrigationAdvice: 'Manage irrigation according to localized rain showers; avoid deep inundation.',
        fertilizerAdvice: 'Top dress balanced NPK with split nitrogen during clear weather intervals.',
        pestDiseaseAdvice: 'Inspect field weekly for leaf folders and blast lesions; practice IPM.',
        harvestingAdvice: 'Keep storage structures clean and fumigated.',
        riskLevel: 'Moderate',
        riskAlert: 'Monitor local cloudburst or localized water stagnation in low areas.',
      },
      {
        cropName: 'Cotton',
        stage: 'Squaring & Boll Formation',
        sowingAdvice: 'Clean drainage channels to prevent waterlogging around root zone.',
        irrigationAdvice: 'Avoid flooding; maintain moderate root zone moisture.',
        fertilizerAdvice: 'Apply potassium nitrate (13:0:45) @ 1.5% during boll initiation.',
        pestDiseaseAdvice: 'Install sticky traps for whitefly and jassids monitoring.',
        harvestingAdvice: 'Prepare for early picking in mature bolls.',
        riskLevel: 'Moderate',
        riskAlert: 'Moderate pest pressure due to humid afternoon spells.',
      },
      {
        cropName: 'Tomato & Vegetables',
        stage: 'Flowering & Fruiting',
        sowingAdvice: 'Provide staking for creeper vegetables and maintain clean furrows.',
        irrigationAdvice: 'Irrigate only when top 2 inches of soil feel dry to touch.',
        fertilizerAdvice: 'Apply micronutrient foliar spray (Zinc, Boron, Iron) for improved fruit set.',
        pestDiseaseAdvice: 'Spray bio-pesticides like Neem Oil 1500 ppm @ 3ml/L against sucking pests.',
        harvestingAdvice: 'Harvest early in the morning to preserve fresh market crispness.',
        riskLevel: 'Low',
        riskAlert: 'Favorable vegetative and reproductive weather conditions.',
      },
      {
        cropName: 'Maize (Corn)',
        stage: 'Knee-High to Silking',
        sowingAdvice: 'Ensure adequate plant population with timely hoeing.',
        irrigationAdvice: 'Critical moisture needed at silking and grain filling stage.',
        fertilizerAdvice: 'Apply second dose of nitrogen alongside zinc sulphate.',
        pestDiseaseAdvice: 'Scout for Fall Armyworm whorl damage; apply neem-based biopesticide.',
        harvestingAdvice: 'Plan storage with moisture below 12%.',
        riskLevel: 'Low',
        riskAlert: 'Good vegetative growth with adequate sunshine hours.',
      },
    ],
  };

  // Derive 5-day quantitative rainfall list from live daily telemetry when available
  const rainfall5DaysList = parse5DayRainfall(baseBulletin.rainfallForecast5Days, weatherBundle);
  const cumulativeRainfallMm = rainfall5DaysList.reduce((acc, curr) => acc + curr.amountMm, 0);

  // Derive Soil Moisture Model
  const soilMoisture = deriveSoilMoisture(cumulativeRainfallMm, rainfall5DaysList[0]?.amountMm || 0, weatherBundle);

  // Derive Action Plan
  const actionPlan = deriveActionPlan(baseBulletin, rainfall5DaysList, soilMoisture);

  // Derive Causal Impact Timeline
  const impactTimeline = deriveImpactTimeline(rainfall5DaysList[0]?.amountMm || 0, soilMoisture);

  // Derive Operations Timeline
  const operationsTimeline = deriveOperationsTimeline(rainfall5DaysList[0]?.amountMm || 0, weatherBundle);

  // Derive Farm Risk Analysis
  const riskAnalysis = deriveRiskAnalysis(baseBulletin, cumulativeRainfallMm, soilMoisture, weatherBundle);

  // Derive Pest & Disease Watch
  const pestDiseaseWatch = derivePestDiseaseWatch(baseBulletin.crops[0], baseBulletin, weatherBundle);

  // Derive 7-Day Farm Calendar
  const sevenDayCalendar = deriveSevenDayCalendar(rainfall5DaysList, baseBulletin, weatherBundle);

  return {
    ...baseBulletin,
    rainfall5DaysList,
    cumulativeRainfallMm,
    soilMoisture,
    actionPlan,
    impactTimeline,
    operationsTimeline,
    riskAnalysis,
    pestDiseaseWatch,
    sevenDayCalendar,
  };
}

export const getExtendedAgrometBulletin = getAgrometBulletin;

function parse5DayRainfall(rawString: string, weatherBundle?: WeatherDataBundle): RainfallDay[] {
  const now = new Date();
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const liveDaily = weatherBundle?.daily || [];

  const parts = rawString.split('|').map((s) => s.trim());
  return Array.from({ length: 5 }, (_, idx) => {
    const dt = new Date(now.getTime() + idx * 86400000);
    const dName = idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : weekdays[dt.getDay()];
    const dateStr = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
    }).format(dt);

    const liveDay = liveDaily[idx];
    let amount = 0;
    let probPercent = 0;
    let condition = 'Telemetry Pending';

    if (liveDay) {
      amount = typeof liveDay.precipMm === 'number' ? Math.round(liveDay.precipMm * 10) / 10 : 0;
      probPercent = typeof liveDay.rainProb === 'number' ? Math.round(liveDay.rainProb) : 0;
      condition = liveDay.condition || 'Forecast';
    } else {
      const rawPart = parts[idx] || '';
      const match = rawPart.match(/(\d+)\s*mm/i);
      if (match) {
        amount = parseInt(match[1], 10);
      } else {
        amount = 0;
      }
      probPercent = amount >= 20 ? 85 : amount >= 10 ? 65 : amount > 0 ? 40 : 10;
      condition = amount >= 25 ? 'Heavy Showers' : amount >= 10 ? 'Moderate Rain' : amount > 0 ? 'Light Drizzle' : 'Partly Cloudy';
    }

    return {
      dayName: dName,
      dateStr: liveDay?.date || dateStr,
      amountMm: amount,
      probPercent,
      condition,
      isWet: amount > 2 || probPercent >= 60,
    };
  });
}

function deriveSoilMoisture(
  _cumulativeRain: number,
  todayRain: number,
  weatherBundle?: WeatherDataBundle
): SoilMoistureData {
  const rawSm = weatherBundle?.current?.soilMoisture;
  const hasRealSoilTelemetry = typeof rawSm === 'number' && Number.isFinite(rawSm) && rawSm >= 0;

  if (!hasRealSoilTelemetry) {
    return {
      available: false,
      sourceNote: 'Direct soil moisture telemetry unavailable in current weather payload',
      topsoilPct: 0,
      rootZonePct: 0,
      subsoilPct: 0,
      overallPct: 0,
      status: 'Unavailable',
      trend: 'stable',
      fieldCapacityPct: 82,
      wiltingPointPct: 28,
      waterAvailableMm: 0,
    };
  }

  const overall = Math.max(10, Math.min(95, Math.round(rawSm * 100 * 2.1)));
  const topsoilPct = Math.min(95, Math.round(overall * (todayRain > 5 ? 1.08 : 0.96)));
  const rootZonePct = Math.round(overall);
  const subsoilPct = Math.max(15, Math.round(overall * 0.92));

  let status: SoilMoistureData['status'] = 'Optimal';
  if (overall > 82) status = 'Saturated';
  else if (overall >= 60) status = 'Optimal';
  else if (overall >= 45) status = 'Adequate';
  else status = 'Deficit / Dry';

  const trend: SoilMoistureData['trend'] = todayRain > 5 ? 'increasing' : todayRain > 0 ? 'stable' : 'decreasing';

  return {
    available: true,
    sourceNote: 'Open-Meteo NWP soil moisture model estimate (not in-situ field probe)',
    topsoilPct,
    rootZonePct,
    subsoilPct,
    overallPct: overall,
    status,
    trend,
    fieldCapacityPct: 82,
    wiltingPointPct: 28,
    waterAvailableMm: Math.round(overall * 0.65),
  };
}

function deriveActionPlan(
  bulletin: AgrometDistrictBulletin,
  rainfallList: RainfallDay[],
  soil: SoilMoistureData
): FarmActionItem[] {
  const rainToday = rainfallList[0]?.amountMm || 0;
  const rainTomorrow = rainfallList[1]?.amountMm || 0;
  const willRainSoon = rainToday + rainTomorrow >= 8;

  const actions: FarmActionItem[] = [];

  // 1. Irrigation
  if (willRainSoon || (soil.available && soil.overallPct > 70)) {
    actions.push({
      id: 'act-irrigation',
      category: 'irrigation',
      title: 'IRRIGATION MANAGEMENT',
      action: 'POSTPONE / WAIT',
      reason: soil.available
        ? `Forecast rainfall (${Math.round((rainToday + rainTomorrow) * 10) / 10} mm in 48h) and modelled soil moisture (${soil.overallPct}%) cover immediate water demand.`
        : `Forecast rainfall (${Math.round((rainToday + rainTomorrow) * 10) / 10} mm in 48h) supports holding irrigation until rain clears; verify topsoil manually.`,
      when: 'Next 24–48 Hours',
      priority: 'High Priority',
      icon: 'water_drop',
      statusColor: 'cyan',
    });
  } else {
    actions.push({
      id: 'act-irrigation',
      category: 'irrigation',
      title: 'IRRIGATION MANAGEMENT',
      action: soil.available ? 'LIGHT IRRIGATION RECOMMENDED' : 'CHECK TOPSOIL BEFORE IRRIGATING',
      reason: soil.available
        ? `Modelled soil moisture at ${soil.overallPct}% with low 48h rainfall. Provide shallow watering in cool morning hours.`
        : `Low 48h rainfall forecast (${Math.round((rainToday + rainTomorrow) * 10) / 10} mm). Direct soil moisture telemetry is unavailable — inspect top 5 cm of field soil before pumping.`,
      when: 'Morning 06:30 – 09:30 AM',
      priority: 'Actionable',
      icon: 'water_drop',
      statusColor: 'emerald',
    });
  }

  // 2. Nutrients
  if (willRainSoon) {
    actions.push({
      id: 'act-nutrients',
      category: 'nutrients',
      title: 'NUTRIENT & FERTILIZER',
      action: 'HOLD BROADCAST APPLICATION',
      reason: 'Foliar washing and nitrogen leaching likely under wet canopy. Apply next split after rain spell ceases and surface dries.',
      when: 'After rain spell (Day 3)',
      priority: 'Moderate',
      icon: 'eco',
      statusColor: 'amber',
    });
  } else {
    actions.push({
      id: 'act-nutrients',
      category: 'nutrients',
      title: 'NUTRIENT & FERTILIZER',
      action: 'SUITABLE FOR FOLIAR SPRAY',
      reason: 'Optimal canopy absorption under stable surface conditions. Apply micronutrient/potash spray.',
      when: '08:00 AM – 11:00 AM',
      priority: 'Favorable',
      icon: 'eco',
      statusColor: 'emerald',
    });
  }

  // 3. Pest Monitoring
  actions.push({
    id: 'act-pest',
    category: 'pest',
    title: 'PEST & DISEASE SURVEILLANCE',
    action: 'INSPECT LOWER CANOPY',
    reason: 'Morning dew & boundary-layer humidity require routine canopy scouting for fungal lesions and sucking pests.',
    when: 'Morning Scout (07:30 – 10:00 AM)',
    priority: 'High Priority',
    icon: 'pest_control',
    statusColor: 'rose',
  });

  // 4. Field Operations
  if (rainToday > 15) {
    actions.push({
      id: 'act-ops',
      category: 'operations',
      title: 'FIELD OPERATIONS & SPRAYING',
      action: 'SUSPEND TRACTOR & SPRAYING',
      reason: 'Heavy rain creates muddy topsoil prone to compaction and chemical dilution. Ensure field drainage bunds are unclogged.',
      when: 'Restricted today',
      priority: 'Caution',
      icon: 'precision_manufacturing',
      statusColor: 'rose',
    });
  } else {
    actions.push({
      id: 'act-ops',
      category: 'operations',
      title: 'FIELD OPERATIONS & SPRAYING',
      action: 'CHECK WIND BEFORE SPRAYING',
      reason: 'Confirm surface wind remains below 15 km/h during morning window before chemical or bio-pesticide spraying.',
      when: '08:00 AM – 11:30 AM',
      priority: 'Actionable',
      icon: 'precision_manufacturing',
      statusColor: 'indigo',
    });
  }

  return actions;
}

function deriveImpactTimeline(todayRain: number, soil: SoilMoistureData): ImpactTimelineStep[] {
  return [
    {
      step: 1,
      label: 'RAINFALL OUTLOOK',
      value: todayRain > 0 ? `${todayRain} mm Expected` : 'Dry / Low Rain',
      status: todayRain > 15 ? 'caution' : 'favorable',
      description: todayRain > 0 ? 'Showers replenishing topsoil profile' : 'Dry interval suitable for planned field work',
      icon: 'cloud',
    },
    {
      step: 2,
      label: 'SOIL MOISTURE',
      value: soil.available ? `${soil.overallPct}% (${soil.status})` : 'Telemetry Unavailable',
      status: soil.available && soil.overallPct > 80 ? 'caution' : 'favorable',
      description: soil.available
        ? 'NWP model root-zone moisture estimate for crop transpiration'
        : 'Direct soil probe telemetry unavailable; inspect field topsoil manually',
      icon: 'grass',
    },
    {
      step: 3,
      label: 'DISEASE RISK',
      value: (soil.available && soil.overallPct > 70) || todayRain > 10 ? 'Elevated Fungal Risk' : 'Routine Scouting',
      status: (soil.available && soil.overallPct > 70) || todayRain > 10 ? 'caution' : 'favorable',
      description: 'Surface leaf wetness & humidity determine spore germination rate',
      icon: 'bug_report',
    },
    {
      step: 4,
      label: 'IRRIGATION NEED',
      value: todayRain > 5 || (soil.available && soil.overallPct > 65) ? 'POSTPONE 24-48H' : 'VERIFY TOPSOIL',
      status: 'favorable',
      description: 'Align farm pumping with real forecast precipitation',
      icon: 'water_drop',
    },
    {
      step: 5,
      label: 'FIELD MACHINERY',
      value: todayRain > 10 ? 'WAIT 12-24 HOURS' : 'ACCESSIBLE NOW',
      status: todayRain > 10 ? 'caution' : 'favorable',
      description: 'Prevent tyre rutting & soil compaction in wet tracts',
      icon: 'agriculture',
    },
  ];
}

function deriveOperationsTimeline(
  todayRain: number,
  weatherBundle?: WeatherDataBundle
): HourlyOperationSlot[] {
  const hourly = weatherBundle?.hourly || [];
  if (hourly.length >= 6) {
    return hourly.slice(0, 6).map((h) => {
      const w = typeof h.windSpeed === 'number' ? Math.round(h.windSpeed) : 0;
      const rh = typeof h.humidity === 'number' ? Math.round(h.humidity) : 0;
      const rainMm = typeof h.precipitation === 'number' ? Math.round(h.precipitation * 10) / 10 : 0;
      const prob = typeof h.rainProb === 'number' ? h.rainProb : 0;
      const isWetSlot = rainMm > 1 || prob > 55;
      const isWindySlot = w > 18;
      const rating: HourlyOperationSlot['rating'] = isWetSlot
        ? 'AVOID'
        : isWindySlot
        ? 'POOR'
        : w <= 12 && prob < 30
        ? 'EXCELLENT'
        : 'GOOD';

      return {
        timeLabel: h.time,
        rating,
        spraying: !isWetSlot && !isWindySlot && h.temp <= 35,
        sowing: !isWetSlot,
        irrigation: !isWetSlot && w <= 20,
        harvesting: !isWetSlot,
        machinery: rainMm <= 4,
        tempC: Math.round(h.temp),
        rhPct: rh,
        windKmh: w,
        rainMm,
      };
    });
  }

  // Fallback empty-safe structure when live hourly series has not arrived yet
  return [];
}

function deriveRiskAnalysis(
  bulletin: AgrometDistrictBulletin,
  cumulativeRain: number,
  soil: SoilMoistureData,
  weatherBundle?: WeatherDataBundle
): FarmRiskAnalysis {
  const curr = weatherBundle?.current;
  const temp = typeof curr?.temp === 'number' ? curr.temp : null;
  const wind = typeof curr?.windSpeed === 'number' ? curr.windSpeed : null;
  const hum = typeof curr?.humidity === 'number' ? curr.humidity : null;

  const rainScore = Math.min(100, Math.round(cumulativeRain * 1.8 + 10));
  const thermalScore =
    temp === null ? 25 : temp >= 40 ? 85 : temp >= 36 ? 62 : temp <= 8 ? 55 : 26;
  const windScore =
    wind === null ? 25 : wind >= 35 ? 80 : wind >= 22 ? 55 : Math.max(15, Math.round(wind * 1.8));
  const pestScore = hum !== null ? (hum > 78 ? 72 : hum > 60 ? 48 : 28) : cumulativeRain > 25 ? 60 : 35;
  const waterloggingScore = soil.available
    ? soil.overallPct > 80
      ? 68
      : 30
    : cumulativeRain > 40
    ? 64
    : 28;

  const overallScore = Math.round(
    rainScore * 0.25 +
      thermalScore * 0.15 +
      windScore * 0.15 +
      pestScore * 0.25 +
      waterloggingScore * 0.2
  );

  let riskLevel: FarmRiskAnalysis['riskLevel'] = 'Moderate Risk';
  let color: FarmRiskAnalysis['color'] = 'amber';

  if (overallScore >= 75) {
    riskLevel = 'Severe Risk';
    color = 'rose';
  } else if (overallScore >= 55) {
    riskLevel = 'Elevated Risk';
    color = 'orange';
  } else if (overallScore >= 35) {
    riskLevel = 'Moderate Risk';
    color = 'amber';
  } else {
    riskLevel = 'Low Risk';
    color = 'emerald';
  }

  const hiLowNote =
    typeof curr?.high === 'number' && typeof curr?.low === 'number'
      ? `Thermal bounds (Max ${Math.round(curr.high)}°C / Min ${Math.round(curr.low)}°C) factored into stress scoring.`
      : temp !== null
      ? `Ambient temperature (${Math.round(temp)}°C) factored into crop heat stress.`
      : `Awaiting live surface thermal readings.`;

  const whyExplanation = [
    `5-day precipitation forecast (${Math.round(cumulativeRain * 10) / 10} mm) contributes ${rainScore}/100 to rainfall risk.`,
    `${hum !== null ? `Measured humidity (${Math.round(hum)}%)` : 'Precipitation proxy'} yields fungal pressure score ${pestScore}/100.`,
    soil.available
      ? `Modelled root-zone saturation stands at ${soil.overallPct}% (waterlogging score ${waterloggingScore}/100).`
      : `Direct soil moisture telemetry is unavailable; drainage caution (${waterloggingScore}/100) is inferred from 5-day rainfall only.`,
    hiLowNote,
  ];

  return {
    overallScore,
    riskLevel,
    color,
    factors: {
      rainfallRisk: {
        score: rainScore,
        label: rainScore > 50 ? 'Elevated Rain Influx' : 'Normal Precipitation',
        explanation: `${Math.round(cumulativeRain * 10) / 10} mm expected over 5 days.`,
      },
      thermalStress: {
        score: thermalScore,
        label: thermalScore > 55 ? 'Elevated Thermal Load' : 'Within Optimal Bounds',
        explanation: temp !== null ? `Current surface temperature ${Math.round(temp)}°C.` : 'Awaiting thermal feed.',
      },
      windGustRisk: {
        score: windScore,
        label: windScore > 55 ? 'Brisk Surface Winds' : 'Safe Spraying Breeze',
        explanation: wind !== null ? `Current wind ${Math.round(wind)} km/h.` : 'Awaiting wind speed feed.',
      },
      pestFungalRisk: {
        score: pestScore,
        label: pestScore > 60 ? 'Elevated Spore Microclimate' : 'Manageable Pest Pressure',
        explanation: 'Driven by ambient relative humidity and leaf wetness persistence.',
      },
      soilWaterlogging: {
        score: waterloggingScore,
        label: waterloggingScore > 50 ? 'Surface Drainage Caution' : 'Adequate Soil Aeration',
        explanation: 'Based on modelled topsoil moisture & cumulative rain.',
      },
    },
    whyExplanation,
  };
}

function derivePestDiseaseWatch(
  crop: CropAdvisory | undefined,
  bulletin: AgrometDistrictBulletin,
  weatherBundle?: WeatherDataBundle
) {
  const cropName = crop?.cropName || 'Rice (Paddy)';
  const curr = weatherBundle?.current;
  const rhStr = typeof curr?.humidity === 'number' ? `${Math.round(curr.humidity)}%` : '—';
  const tempStr = typeof curr?.temp === 'number' ? `${Math.round(curr.temp * 10) / 10}°C` : '—';
  const windStr = typeof curr?.windSpeed === 'number' ? `${Math.round(curr.windSpeed)} km/h` : '—';
  const cloudStr = typeof curr?.cloudCover === 'number' ? `${Math.round(curr.cloudCover)}%` : '—';
  const highHumidity = typeof curr?.humidity === 'number' && curr.humidity >= 75;

  if (cropName.includes('Rice')) {
    return {
      overallRisk: (highHumidity ? 'High' : 'Moderate') as 'High' | 'Moderate',
      primaryConcern: 'Bacterial Leaf Blight & Sheath Blight',
      scientificName: 'Xanthomonas oryzae / Rhizoctonia solani',
      etiology: 'Persistent high humidity with wet canopy accelerates bacterial exudate spread.',
      symptoms: 'Water-soaked lesions turning straw-colored on leaf margins; snake-skin lesions on sheath near waterline.',
      etlThreshold: '1-2 lesions per hill on 5% sampled hills across diagonal transect.',
      immediateAction: 'Drain standing water for 48 hours to aerate crop base; avoid excess nitrogen top-dressing.',
      organicRemedy: 'Spray Pseudomonas fluorescens @ 10g/L at 10-day intervals.',
      chemicalControl: 'Streptocycline (30g) + Copper Oxychloride (500g) in 200L water per acre under calm skies.',
      riskDrivers: [
        { name: 'Relative Humidity', value: rhStr, impact: (highHumidity ? 'high' : 'medium') as 'high' | 'medium' },
        { name: 'Air Temperature', value: tempStr, impact: 'medium' as const },
        { name: 'Wind Velocity', value: windStr, impact: 'low' as const },
      ],
    };
  }

  if (cropName.includes('Cotton')) {
    return {
      overallRisk: 'High' as const,
      primaryConcern: 'Whitefly & Pink Bollworm Infestation',
      scientificName: 'Bemisia tabaci / Pectinophora gossypiella',
      etiology: 'Warm intermittent cloud cover triggers whitefly nymph multiplication on leaf undersides.',
      symptoms: 'Yellowing and upward curling of leaves, sooty mold on honey-dew secretions, rosette flowers.',
      etlThreshold: 'Whitefly: 6-8 adults per leaf; Pink Bollworm: 1 larva per 20 green bolls.',
      immediateAction: 'Install yellow sticky traps @ 10/acre and pheromone traps @ 5/acre for monitoring.',
      organicRemedy: 'Neem seed kernel extract (NSKE 5%) or Neem oil 1500 ppm @ 3-5 ml/L.',
      chemicalControl: 'Diafenthiuron 50 WP @ 1.2 g/L or Pyriproxyfen 10 EC @ 2 ml/L on border rows.',
      riskDrivers: [
        { name: 'Cloud Cover Overcast', value: cloudStr, impact: 'medium' as const },
        { name: 'Ambient Temperature', value: tempStr, impact: 'high' as const },
        { name: 'Surface Wind', value: windStr, impact: 'low' as const },
      ],
    };
  }

  return {
    overallRisk: 'Moderate' as const,
    primaryConcern: 'Foliar Early Blight & Sucking Pests',
    scientificName: 'Alternaria solani / Sucking Aphids',
    etiology: 'Conducive temperature-humidity profile encourages spore germination in dense lower canopies.',
    symptoms: 'Concentric ring target-spots on older leaves and curling of fresh shoots.',
    etlThreshold: '10% foliar coverage on lower branches.',
    immediateAction: 'Remove infected lower leaves; improve air circulation between rows.',
    organicRemedy: 'Bio-fungicide Trichoderma harzianum @ 5g/L foliar spray.',
    chemicalControl: 'Mancozeb 75 WP @ 2.5 g/L or Azoxystrobin 23 SC @ 1 ml/L during calm morning hours.',
    riskDrivers: [
      { name: 'Relative Humidity', value: rhStr, impact: (highHumidity ? 'high' : 'medium') as 'high' | 'medium' },
      { name: 'Air Temperature', value: tempStr, impact: 'medium' as const },
      { name: 'Wind Velocity', value: windStr, impact: 'low' as const },
    ],
  };
}

function deriveSevenDayCalendar(
  rainfallList: RainfallDay[],
  bulletin: AgrometDistrictBulletin,
  weatherBundle?: WeatherDataBundle
) {
  const now = new Date();
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const liveDaily = weatherBundle?.daily || [];

  return Array.from({ length: 7 }, (_, idx) => {
    const dt = new Date(now.getTime() + idx * 86400000);
    const liveDay = liveDaily[idx];
    const rain = liveDay?.precipMm ?? rainfallList[idx]?.amountMm ?? 0;
    const rainProb = liveDay?.rainProb ?? rainfallList[idx]?.probPercent ?? 0;
    const isHeavyRain = rain > 15 || rainProb >= 80;
    const isModerateRain = rain > 4 || rainProb >= 50;

    const condition = liveDay?.condition || (isHeavyRain ? 'Heavy Showers' : isModerateRain ? 'Scattered Rain' : rain > 0 ? 'Light Drizzle' : 'Clear / Dry');
    const icon = liveDay?.icon || (isHeavyRain ? 'rain_heavy' : isModerateRain ? 'rain' : rain > 0 ? 'cloudy' : 'sunny');

    const tempMax = typeof liveDay?.high === 'number' ? liveDay.high : 0;
    const tempMin = typeof liveDay?.low === 'number' ? liveDay.low : 0;

    let soilCondition = 'Normal Moisture';
    let farmSuitability: 'EXCELLENT' | 'GOOD' | 'LIMITED' | 'RESTRICTED' = 'GOOD';

    if (rain > 15 || rainProb >= 80) {
      soilCondition = 'Saturated / Wet';
      farmSuitability = 'RESTRICTED';
    } else if (rain > 5 || rainProb >= 50) {
      soilCondition = 'Adequate Moisture';
      farmSuitability = 'LIMITED';
    } else if (rain === 0 && idx > 1) {
      soilCondition = 'Dry / Workable Topsoil';
      farmSuitability = 'EXCELLENT';
    }

    return {
      day: idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : weekdays[dt.getDay()],
      date:
        liveDay?.date ||
        new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
        }).format(dt),
      icon,
      condition,
      tempMax,
      tempMin,
      rainMm: rain,
      rainProb,
      soilCondition,
      farmSuitability,
    };
  });
}
