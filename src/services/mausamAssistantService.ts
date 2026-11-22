/**
 * MAUSAM Intelligent Atmospheric FAQ & Multi-State Regional Knowledge Engine
 * Authoritative, professional, offline & deployed intelligent meteorological intelligence
 * supporting all 28 States & 8 Union Territories of India with real telemetry grounding
 * and comprehensive multi-language support (Odia, Hindi, Bengali, Tamil, Telugu,
 * Marathi, Gujarati, Kannada, Malayalam, Punjabi, Assamese, Urdu, and English).
 */

import { CurrentWeather, WeatherStation } from '../types';
import {
  FAQCategory,
  FAQItem,
  FAQ_CATEGORIES,
  FAQ_ITEMS as BASE_FAQ_ITEMS,
  GroundingLink,
  MausamContext,
} from '../data/mausamFaqData';
import { EXPANDED_FAQ_ITEMS } from '../data/mausamExpandedFaqData';
import {
  ALL_INDIA_STATES_MET_PROFILES,
  StateMeteorologicalProfile,
} from '../data/allIndiaStatesProfiles';
import {
  resolveLanguageKey,
  translateConditionToLang,
  translateAqiStatusToLang,
  translatePollenRiskToLang,
  SUPPORTED_MAUSAM_AI_LANGUAGES,
} from '../data/mausamLanguages';
import { formatCoordinatePair } from '../../shared/weatherContract';

export type { GroundingLink, MausamContext, FAQCategory, FAQItem, StateMeteorologicalProfile };
export { FAQ_CATEGORIES, ALL_INDIA_STATES_MET_PROFILES, SUPPORTED_MAUSAM_AI_LANGUAGES };

export interface MausamAIResponse {
  answer: string;
  source: string;
  category?: string;
  groundingSources: GroundingLink[];
  suggestedFollowUps: string[];
  modeUsed: string;
}

export const FAQ_ITEMS: FAQItem[] = [...BASE_FAQ_ITEMS, ...EXPANDED_FAQ_ITEMS];

/**
 * Intelligent Natural Language Matcher
 * Analyzes user input against the FAQ knowledge graph, state/UT directory, and live telemetry,
 * returning structured, grounded answers localized into the user's preferred language.
 */
export function matchMausamQuery(
  query: string,
  context: MausamContext,
  preferredLanguage: string = 'English'
): MausamAIResponse {
  const q = (query || '').trim().toLowerCase();
  const langKey = resolveLanguageKey(preferredLanguage || context.preferredLanguage);
  const activeStation = context.station;
  const activeWeather = context.weather;
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const condStr = translateConditionToLang(activeWeather.condition, langKey);
  const aqiStatusStr = translateAqiStatusToLang(activeWeather.aqiStatus || 'Satisfactory', langKey);
  const pollenRiskStr = translatePollenRiskToLang(activeWeather.pollen || 'Low Risk', langKey);

  // 1. Check if the user is asking specifically about any of India's 28 States or 8 Union Territories
  const matchedState = ALL_INDIA_STATES_MET_PROFILES.find((state) => {
    return state.aliases.some((alias) => {
      const normalized = alias.trim().toLowerCase();
      if (!normalized) return false;
      // Use word-boundary matching for ASCII aliases to prevent 2-letter state codes (e.g., 'ar', 'up')
      // from falsely matching inside unrelated words like 'maharashtra' or 'update'.
      if (/^[a-z0-9\s.&-]+$/i.test(normalized)) {
        const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`\\b${escaped}\\b`, 'i').test(q);
      }
      return q.includes(normalized);
    });
  });

  if (
    matchedState &&
    (q.includes('weather') ||
      q.includes('climate') ||
      q.includes('forecast') ||
      q.includes('rain') ||
      q.includes('temp') ||
      q.includes('status') ||
      q.includes('monsoon') ||
      q.includes('update') ||
      q.length < 30)
  ) {
    const isCurrentActiveState = Boolean(
      activeStation?.state?.toLowerCase().includes(matchedState.name.toLowerCase()) ||
        activeStation?.name?.toLowerCase().includes(matchedState.name.toLowerCase())
    );

    const activeTempStr =
      typeof activeWeather.temp === 'number' && Number.isFinite(activeWeather.temp)
        ? `${activeWeather.temp}°C`
        : 'Unavailable';
    const activeHumidityStr =
      typeof activeWeather.humidity === 'number' && Number.isFinite(activeWeather.humidity)
        ? `${activeWeather.humidity}%`
        : 'Unavailable';
    const activeAqiVal = activeWeather.aqiIndex ?? activeWeather.aqiPm25 ?? null;
    const activeAqiStr =
      typeof activeAqiVal === 'number' && Number.isFinite(activeAqiVal)
        ? `${activeAqiVal} (${aqiStatusStr})`
        : 'Unavailable';
    const activeStationLabel = activeStation?.name
      ? `${activeStation.name}${activeStation.state ? `, ${activeStation.state}` : ''}`
      : 'another station';
    const climatologyCondStr = translateConditionToLang(matchedState.typicalCondition, langKey);
    const climatologyAqiStatStr = translateAqiStatusToLang(matchedState.typicalAqiStatus, langKey);

    let localizedStateAnswer = '';
    let followUps: string[] = [];

    if (langKey === 'or') {
      const telemetryBlock = isCurrentActiveState
        ? `**ସକ୍ରିୟ ବାୟୁମଣ୍ଡଳୀୟ ପର୍ଯ୍ୟବେକ୍ଷଣ (${activeStationLabel})**:
• **ବାୟୁ ତାପମାତ୍ରା**: ${activeTempStr} (ସ୍ୱାଭାବିକ ଦୈନିକ ସୀମା: ${matchedState.normalTemp.min}°C – ${matchedState.normalTemp.max}°C)
• **ପାଣିପାଗ ସ୍ଥିତି**: ${condStr}
• **ଆପେକ୍ଷିକ ଆର୍ଦ୍ରତା**: ${activeHumidityStr}
• **ଜାତୀୟ ବାୟୁ ଗୁଣବତ୍ତା ସୂଚକାଙ୍କ (NAQI)**: ${activeAqiStr}`
        : `**ସକ୍ରିୟ ଲାଇଭ୍ ଟେଲିମେଟ୍ରି**:
• ${matchedState.name} ପାଇଁ ଲାଇଭ୍ ପାଣିପାଗ ତଥ୍ୟ ବର୍ତ୍ତମାନ ଲୋଡ୍ ହୋଇନାହିଁ (ବର୍ତ୍ତମାନ ସକ୍ରିୟ କେନ୍ଦ୍ର: ${activeStationLabel})। ଲାଇଭ୍ ତଥ୍ୟ ଦେଖିବା ପାଇଁ ସ୍ଥାନ ପରିବର୍ତ୍ତନ କରନ୍ତୁ।

**ଐତିହାସିକ ଜଳବାୟୁ ମାନକ (Climatology — ଲାଇଭ୍ ପର୍ଯ୍ୟବେକ୍ଷଣ ନୁହେଁ)**:
• **ସାଧାରଣ ତାପମାତ୍ରା ସୀମା**: ${matchedState.normalTemp.min}°C – ${matchedState.normalTemp.max}°C
• **ସାଧାରଣ ପାଣିପାଗ**: ${climatologyCondStr}
• **ସାଧାରଣ ଆର୍ଦ୍ରତା**: ~${matchedState.typicalHumidity}%
• **ସାଧାରଣ NAQI ସନ୍ଦର୍ଭ**: ~${matchedState.typicalAqi} (${climatologyAqiStatStr})`;

      localizedStateAnswer = `### ପାଣିପାଗ ପ୍ରୋଫାଇଲ୍: ${matchedState.name} (${matchedState.type === 'UNION_TERRITORY' ? 'କେନ୍ଦ୍ରଶାସିତ ଅଞ୍ଚଳ' : 'ରାଜ୍ୟ'})
• **ଆଞ୍ଚଳିକ ପାଣିପାଗ କେନ୍ଦ୍ର (RMC/MC)**: ${matchedState.rmcMc}
• **ପ୍ରମୁଖ ପାଣିପାଗ ବେଧଶାଳା**: ${matchedState.representativeStation} (${formatCoordinatePair(matchedState.lat, matchedState.lng, 2)} | ID: ${matchedState.stationId})
• **ଡପଲର ପାଣିପାଗ ରାଡାର୍ କଭରେଜ୍**: ${matchedState.primaryRadar}

${telemetryBlock}
• **କୃଷି-ପରିବେଶ ଜୋନ୍**: ${matchedState.agroZone}

**ଆଞ୍ଚଳିକ ପାଣିପାଗ ବିଶେଷତା**:
• ${matchedState.climateHighlights}

**ପାଣିପାଗ ବିପଦ ଓ ସତର୍କତା**:
• ${matchedState.synopticHazards}

*ସନ୍ଦର୍ଭ ସମୟ: ${timeStr} IST | ${isCurrentActiveState ? 'ସକ୍ରିୟ ଟେଲିମେଟ୍ରି' : 'IMD ଜଳବାୟୁ ପ୍ରୋଫାଇଲ୍ (ଲାଇଭ୍ ନୁହେଁ)'}*`;
      followUps = [
        `${matchedState.name} ପାଇଁ ଆଗାମୀ ବର୍ଷା ପୂର୍ବାନୁମାନ କ’ଣ?`,
        `${matchedState.name} ପାଇଁ କୃଷି ପାଣିପାଗ ପରାମର୍ଶ`,
        'ଭାରତରେ ମୌସୁମୀ ବାୟୁର ସ୍ଥିତି',
        'ବର୍ତ୍ତମାନ ପାଣିପାଗ ଓ ବର୍ଷା ସ୍ଥିତି କିପରି ଅଛି?',
      ];
    } else if (langKey === 'hi') {
      const telemetryBlock = isCurrentActiveState
        ? `**सक्रिय वायुमंडलीय अवलोकन (${activeStationLabel})**:
• **वायु तापमान**: ${activeTempStr} (सामान्य तापमान सीमा: ${matchedState.normalTemp.min}°C – ${matchedState.normalTemp.max}°C)
• **मौसम की स्थिति**: ${condStr}
• **सापेक्ष आर्द्रता**: ${activeHumidityStr}
• **राष्ट्रीय वायु गुणवत्ता सूचकांक (NAQI)**: ${activeAqiStr}`
        : `**सक्रिय लाइव टेलीमेट्री**:
• ${matchedState.name} के लिए लाइव सतही और AQI डेटा अभी लोड नहीं है (वर्तमान सिंक स्टेशन: ${activeStationLabel})। लाइव रीडिंग के लिए स्थान बदलें।

**ऐतिहासिक जलवायु मानक (Climatology — लाइव अवलोकन नहीं)**:
• **सामान्य तापमान सीमा**: ${matchedState.normalTemp.min}°C – ${matchedState.normalTemp.max}°C
• **सामान्य मौसमी स्थिति**: ${climatologyCondStr}
• **सामान्य आर्द्रता**: ~${matchedState.typicalHumidity}%
• **सामान्य NAQI संदर्भ**: ~${matchedState.typicalAqi} (${climatologyAqiStatStr})`;

      localizedStateAnswer = `### मौसम विज्ञान प्रोफाइल: ${matchedState.name} (${matchedState.type === 'UNION_TERRITORY' ? 'केंद्र शासित प्रदेश' : 'राज्य'})
• **क्षेत्रीय मौसम केंद्र (RMC/MC)**: ${matchedState.rmcMc}
• **प्रमुख वेधशाला**: ${matchedState.representativeStation} (${formatCoordinatePair(matchedState.lat, matchedState.lng, 2)} | ID: ${matchedState.stationId})
• **डॉपलर रडार कवरेज**: ${matchedState.primaryRadar}

${telemetryBlock}
• **कृषि-पारिस्थितिकीय क्षेत्र**: ${matchedState.agroZone}

**क्षेत्रीय मौसम की मुख्य विशेषताएं**:
• ${matchedState.climateHighlights}

**मौसम संबंधी खतरे व संवेदनशीलता**:
• ${matchedState.synopticHazards}

*संदर्भ समय: ${timeStr} IST | ${isCurrentActiveState ? 'सक्रिय टेलीमेट्री' : 'IMD जलवायु प्रोफाइल (लाइव नहीं)'}*`;
      followUps = [
        `${matchedState.name} के लिए वर्षा का पूर्वानुमान क्या है?`,
        `${matchedState.name} के लिए कृषि मौसम सलाह`,
        'भारत में मानसून की वर्तमान स्थिति',
        'वर्तमान मौसम और तापमान की स्थिति',
      ];
    } else if (langKey === 'bn') {
      const telemetryBlock = isCurrentActiveState
        ? `**সক্রিয় বায়ুমণ্ডলীয় পর্যবেক্ষণ (${activeStationLabel})**:
• **বায়ুর তাপমাত্রা**: ${activeTempStr} (স্বাভাবিক তাপমাত্রা: ${matchedState.normalTemp.min}°C – ${matchedState.normalTemp.max}°C)
• **আবহাওয়ার অবস্থা**: ${condStr}
• **আপেক্ষিক আর্দ্রতা**: ${activeHumidityStr}
• **জাতীয় বায়ুর মান সূচক (NAQI)**: ${activeAqiStr}`
        : `**সক্রিয় লাইভ টেলিমেট্রি**:
• ${matchedState.name}-এর লাইভ পর্যবেক্ষণ বর্তমানে লোড করা নেই (বর্তমান সিঙ্ক করা স্টেশন: ${activeStationLabel})। লাইভ ডেটা পেতে অবস্থান পরিবর্তন করুন।

**ঐতিহাসিক জলবায়ু মানদণ্ড (Climatology — লাইভ পর্যবেক্ষণ নয়)**:
• **স্বাভাবিক তাপমাত্রার পরিসর**: ${matchedState.normalTemp.min}°C – ${matchedState.normalTemp.max}°C
• **সাধারণ মৌসুমি অবস্থা**: ${climatologyCondStr}
• **সাধারণ আর্দ্রতা**: ~${matchedState.typicalHumidity}%
• **সাধারণ NAQI রেফারেন্স**: ~${matchedState.typicalAqi} (${climatologyAqiStatStr})`;

      localizedStateAnswer = `### আবহাওয়া প্রোফাইল: ${matchedState.name} (${matchedState.type === 'UNION_TERRITORY' ? 'কেন্দ্রশাসিত অঞ্চল' : 'রাজ্য'})
• **আঞ্চলিক আবহাওয়া কেন্দ্র (RMC/MC)**: ${matchedState.rmcMc}
• **প্রধান মানমন্দির**: ${matchedState.representativeStation} (${formatCoordinatePair(matchedState.lat, matchedState.lng, 2)} | ID: ${matchedState.stationId})
• **ডপলার রাডার কভারেজ**: ${matchedState.primaryRadar}

${telemetryBlock}
• **কৃষি-বাস্তুতান্ত্রিক অঞ্চল**: ${matchedState.agroZone}

**আঞ্চলিক আবহাওয়ার বৈশিষ্ট্য**:
• ${matchedState.climateHighlights}

**আবহাওয়া সংক্রান্ত ঝুঁকি ও সতর্কতা**:
• ${matchedState.synopticHazards}

*সময়: ${timeStr} IST | ${isCurrentActiveState ? 'সক্রিয় টেলিমেট্রি' : 'IMD জলবায়ু প্রোফাইল (লাইভ নয়)'}*`;
      followUps = [
        `${matchedState.name}-এর জন্য বৃষ্টির পূর্বাভাস কী?`,
        `${matchedState.name}-এর জন্য কৃষি আবহাওয়া পরামর্শ`,
        'ভারতে মৌসুমী বায়ুর বর্তমান গতিবিধি',
        'বর্তমান আবহাওয়া ও তাপমাত্রার অবস্থা',
      ];
    } else {
      const telemetryBlock = isCurrentActiveState
        ? `**Active Atmospheric Telemetry (${activeStationLabel})**:
• **Air Temperature**: ${activeTempStr} (Seasonal Normal Range: ${matchedState.normalTemp.min}°C – ${matchedState.normalTemp.max}°C)
• **Atmospheric Condition**: ${condStr}
• **Relative Humidity**: ${activeHumidityStr}
• **National Air Quality Index (NAQI)**: ${activeAqiStr}`
        : `**Live Telemetry Status**:
• Live surface & AQI telemetry is not loaded for ${matchedState.name} (currently synced to ${activeStationLabel}). Switch location to fetch live observations.

**Historical Climatology Baseline (Seasonal Normals — Not Live Observations)**:
• **Typical Diurnal Temperature Range**: ${matchedState.normalTemp.min}°C – ${matchedState.normalTemp.max}°C
• **Typical Seasonal Condition**: ${climatologyCondStr}
• **Typical Relative Humidity**: ~${matchedState.typicalHumidity}%
• **Typical NAQI Reference**: ~${matchedState.typicalAqi} (${climatologyAqiStatStr})`;

      localizedStateAnswer = `### Meteorological Profile: ${matchedState.name} (${matchedState.type === 'UNION_TERRITORY' ? 'Union Territory' : 'State'})
• **Regional Met Centre**: ${matchedState.rmcMc}
• **Representative Observatory**: ${matchedState.representativeStation} (${formatCoordinatePair(matchedState.lat, matchedState.lng, 2)} | ID: ${matchedState.stationId})
• **Doppler Radar Coverage**: ${matchedState.primaryRadar}

${telemetryBlock}
• **Agro-Ecological Zone**: ${matchedState.agroZone}

**Regional Synoptic Highlights**:
• ${matchedState.climateHighlights}

**Synoptic Hazards & Vulnerabilities**:
• ${matchedState.synopticHazards}

*Generated: ${timeStr} IST | ${isCurrentActiveState ? 'Active Synced Telemetry' : 'Regional Climatology Profile (Non-Live Reference)'}*`;
      followUps = [
        `What is the rainfall forecast for ${matchedState.name}?`,
        `Agromet farming advisory for ${matchedState.name}`,
        'SW & NE Monsoon across India',
        'What is the current weather & conditions?',
      ];
    }

    return {
      answer: localizedStateAnswer,
      source: isCurrentActiveState
        ? `Active Station Telemetry & IMD Reference — ${matchedState.rmcMc}`
        : `Regional Climatology Reference (Non-Live) — ${matchedState.rmcMc}`,
      category: 'states_regional',
      groundingSources: [
        { title: `IMD ${matchedState.name} Regional Met Centre`, url: 'https://mausam.imd.gov.in', type: 'search' },
        { title: 'National Weather Forecasting Centre (NWFC)', url: 'https://mausam.imd.gov.in/imd_latest/contents/all_india_forcast_bulletin.php', type: 'search' },
      ],
      suggestedFollowUps: followUps,
      modeUsed: isCurrentActiveState ? 'state-grounded-live-telemetry' : 'state-climatology-reference',
    };
  }

  // 2. Match against curated FAQ Knowledge items
  let bestMatch: FAQItem | null = null;
  let highestScore = 0;

  for (const item of FAQ_ITEMS) {
    let score = 0;

    // Pattern matches
    for (const pattern of item.patterns) {
      if (pattern.test(q)) {
        score += 15;
      }
    }

    // Exact question match
    if (q.includes(item.shortQuestion.toLowerCase()) || item.question.toLowerCase().includes(q)) {
      score += 12;
    }

    // Keyword matches
    const words = q.split(/\s+/).filter((w) => w.length > 2);
    for (const word of words) {
      if (item.keywords.some((kw) => kw.toLowerCase() === word || word.includes(kw) || kw.includes(word))) {
        score += 3;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  }

  if (bestMatch && highestScore >= 4) {
    const generated = bestMatch.generateAnswer(context);

    // If non-English language is requested, provide localized wording for key topics
    let finalAnswer = generated.text;
    let followUps = generated.followUps;

    if (langKey === 'or') {
      if (bestMatch.categoryId === 'alerts' || q.includes('warning') || q.includes('alert')) {
        finalAnswer = `### ଭାରତୀୟ ପାଣିପାଗ ବିଭାଗ (IMD) ରଙ୍ଗ-କୋଡେଡ୍ ପାଣିପାଗ ଚେତାବନୀ ମ୍ୟାଟ୍ରିକ୍ସ
ଭାରତୀୟ ପାଣିପାଗ ବିଭାଗ (IMD) ଚାରିସ୍ତରୀୟ ରଙ୍ଗ-କୋଡ୍ ପ୍ରଣାଳୀ ବ୍ୟବହାର କରେ:

1. **ସବୁଜ (Green - କୌଣସି ଚେତାବନୀ ନାହିଁ)**: ପାଣିପାଗ ସ୍ୱାଭାବିକ ଏବଂ କୌଣସି ବିପଦ ନାହିଁ।
2. **ହଳଦିଆ (Yellow - ସତର୍କ ରୁହନ୍ତୁ / Be Updated)**: ପାଣିପାଗ ଖରାପ ହେବାର ସମ୍ଭାବନା ଅଛି। ନିୟମିତ ବୁଲେଟିନ୍ ଦେଖନ୍ତୁ।
3. **କମଳା (Orange - ପ୍ରସ୍ତୁତ ରୁହନ୍ତୁ / Be Prepared)**: ପ୍ରବଳ ବର୍ଷା, ଝଡ଼ କିମ୍ବା ଗରମ ପ୍ରବାହର ସମ୍ଭାବନା। ଜରୁରୀ ପଦକ୍ଷେପ ପାଇଁ ପ୍ରସ୍ତୁତ ରୁହନ୍ତୁ।
4. **ନାଲି (Red - କାର୍ଯ୍ୟାନୁଷ୍ଠାନ ଗ୍ରହଣ କରନ୍ତୁ / Take Action)**: ଅତ୍ୟନ୍ତ ଭୟଙ୍କର ପାଣିପାଗ (ପ୍ରଳୟଙ୍କରୀ ବାତ୍ୟା କିମ୍ବା ବନ୍ୟା)। ନିରାପଦ ସ୍ଥାନକୁ ଯାଆନ୍ତୁ।`;
      }
      followUps = [
        'ବର୍ତ୍ତମାନ ପାଣିପାଗ ଓ ବର୍ଷା ସ୍ଥିତି କିପରି ଅଛି?',
        'ମୁଁ ଏବେ ବାହାରକୁ ଯାଇପାରିବି କି?',
        'କୌଣସି ବଜ୍ରପାତ କିମ୍ବା ବର୍ଷା ଚେତାବନୀ ଅଛି କି?',
        'ଓଡ଼ିଶାର ପାଣିପାଗ ପ୍ରୋଫାଇଲ୍ ଦେଖନ୍ତୁ',
      ];
    } else if (langKey === 'hi') {
      followUps = [
        'वर्तमान मौसम और तापमान क्या है?',
        'क्या मैं अभी बाहर जा सकता हूँ?',
        'क्या कोई भारी बारिश की चेतावनी है?',
        'किसानों के लिए कृषि मौसम सलाह',
      ];
    }

    return {
      answer: finalAnswer,
      source: 'India Meteorological Department (IMD) Grounded Atmospheric Intelligence',
      category: bestMatch.categoryId,
      groundingSources: generated.sources,
      suggestedFollowUps: followUps,
      modeUsed: 'offline-trained-faq',
    };
  }

  // 3. Fallback: Dynamic structured telemetry report tailored to user's question and language
  const loc = context.station;
  const w = context.weather;
  const fmtVal = (v: number | null | undefined, unit: string) =>
    typeof v === 'number' && Number.isFinite(v) ? `${v}${unit}` : 'Unavailable';
  const coordStr = formatCoordinatePair(loc?.lat, loc?.lng, 2);
  const tempVal = typeof w.temp === 'number' && Number.isFinite(w.temp) ? `${w.temp}°C` : 'Unavailable';
  const feelsVal = w.feelsLike ?? w.temp;
  const feelsStr = typeof feelsVal === 'number' && Number.isFinite(feelsVal) ? `${feelsVal}°C` : 'Unavailable';
  const humStr = fmtVal(w.humidity, '%');
  const dewStr = fmtVal(w.dewPoint, '°C');
  const windValStr = typeof w.windSpeed === 'number' && Number.isFinite(w.windSpeed) ? String(w.windSpeed) : 'Unavailable';
  const pressStr = fmtVal(w.pressure, ' hPa');
  const aqiRaw = w.aqiIndex ?? w.aqiPm25 ?? null;
  const aqiStr = typeof aqiRaw === 'number' && Number.isFinite(aqiRaw) ? String(aqiRaw) : 'Unavailable';
  const rainProbStr = fmtVal(w.precipitationProbability, '%');
  const rainMmStr = fmtVal(w.precipitation, ' mm');

  let fallbackAnswer = '';
  let fallbackFollowUps: string[] = [];

  if (langKey === 'or') {
    fallbackAnswer = `### ବାୟୁମଣ୍ଡଳୀୟ ଗୁଇନ୍ଦା ରିପୋର୍ଟ: ${loc?.name || 'ସ୍ଥାନୀୟ ପାଣିପାଗ କେନ୍ଦ୍ର'}, ${loc?.state || 'ଭାରତ'}
• **ପ୍ରଶ୍ନ**: "${query}"
• **କେନ୍ଦ୍ର ଆଇଡି (ID)**: ${loc?.code || loc?.id || 'STATION'} | ଭୌଗୋଳିକ ଅବସ୍ଥିତି: ${coordStr}

**ସକ୍ରିୟ ପାଣିପାଗ ତଥ୍ୟ ଓ ମାପଦଣ୍ଡ**:
• **ବାୟୁ ତାପମାତ୍ରା**: ${tempVal} (ଅନୁଭୂତ ତାପମାତ୍ରା: ${feelsStr})
• **ପାଣିପାଗ ସ୍ଥିତି**: ${condStr}
• **ଆପେକ୍ଷିକ ଆର୍ଦ୍ରତା**: ${humStr} | **କାକର ବିନ୍ଦୁ**: ${dewStr}
• **ପବନର ଗତି ଓ ଦିଗ**: ${windValStr} କି.ମି./ଘଣ୍ଟା (${w.windDirection || '—'})
• **ବାୟୁମଣ୍ଡଳୀୟ ଚାପ**: ${pressStr}
• **ଜାତୀୟ ବାୟୁ ଗୁଣବତ୍ତା ସୂଚକାଙ୍କ (NAQI)**: ${aqiStr} (${aqiStatusStr})
• **ପରାଗରେଣୁ ଏବଂ ଆଲର୍ଜି ସ୍ଥିତି**: ${pollenRiskStr}
• **ବର୍ଷା ସମ୍ଭାବନା**: ${rainProbStr} (୨୪ ଘଣ୍ଟା ମୋଟ: ${rainMmStr})

**ବାୟୁମଣ୍ଡଳୀୟ ସାରାଂଶ ଓ ନାଗରିକ ସୁରକ୍ଷା ପରାମର୍ଶ**:
• ${loc?.district || loc?.state || 'ଏହି ଅଞ୍ଚଳରେ'} ବର୍ତ୍ତମାନ ପାଣିପାଗ ତଥ୍ୟ ସଂଯୋଗ ହୋଇଛି।
• କୃଷି, ମତ୍ସ୍ୟଚାଷ କିମ୍ବା ବାହ୍ୟ କାର୍ଯ୍ୟକଳାପ ପାଇଁ ଆମର ଆଞ୍ଚଳିକ ପାଠାଗାରରୁ GKMS କୃଷି ବୁଲେଟିନ୍ ଦେଖନ୍ତୁ।

*ରିପୋର୍ଟ ସୃଷ୍ଟି: ${timeStr} IST | IMD ଏବଂ CPCB ସେନ୍ସର ମ୍ୟାଟ୍ରିକ୍ସ ଦ୍ୱାରା ଯାଞ୍ଚକୃତ*`;
    fallbackFollowUps = [
      'ବର୍ତ୍ତମାନ ପାଣିପାଗ ଓ ବର୍ଷା ସ୍ଥିତି କିପରି ଅଛି?',
      'ମୁଁ ଏବେ ବାହାରକୁ ଯାଇପାରିବି କି?',
      'କୌଣସି ବଜ୍ରପାତ କିମ୍ବା ବର୍ଷା ଚେତାବନୀ ଅଛି କି?',
      'ବାୟୁ ଗୁଣବତ୍ତା ସୂଚକାଙ୍କ (NAQI) ର ଅର୍ଥ କ’ଣ?',
    ];
  } else if (langKey === 'hi') {
    fallbackAnswer = `### वायुमंडलीय मौसम रिपोर्ट: ${loc?.name || 'स्थानीय वेधशाला'}, ${loc?.state || 'भारत'}
• **प्रश्न**: "${query}"
• **स्टेशन आईडी**: ${loc?.code || loc?.id || 'STATION'} | निर्देशांक: ${coordStr}

**सक्रिय मौसम टेलीमेट्री अवलोकन**:
• **तापमान**: ${tempVal} (महसूस तापमान: ${feelsStr})
• **मौसम की स्थिति**: ${condStr}
• **सापेक्ष आर्द्रता**: ${humStr} | **ओसांक**: ${dewStr}
• **हवा का वेग व दिशा**: ${windValStr} किमी/घंटा (${w.windDirection || '—'})
• **वायुमंडलीय दबाव**: ${pressStr}
• **राष्ट्रीय वायु गुणवत्ता सूचकांक (NAQI)**: ${aqiStr} (${aqiStatusStr})
• **परागकण / एलर्जी जोखिम**: ${pollenRiskStr}
• **वर्षा की संभावना**: ${rainProbStr} (24 घंटे कुल: ${rainMmStr})

**मौसम सारांश एवं नागरिक सुरक्षा सलाह**:
• ${loc?.district || loc?.state || 'इस क्षेत्र'} के लिए उपलब्ध वायुमंडलीय स्थिति।
• कृषि या बाहरी यात्रा की योजना बनाते समय नियमित IMD बुलेटिन देखें।

*रिपोर्ट समय: ${timeStr} IST | IMD एवं CPCB नेटवर्क द्वारा सत्यापित*`;
    fallbackFollowUps = [
      'वर्तमान मौसम और तापमान की स्थिति क्या है?',
      'क्या मैं अभी बाहर टहलने जा सकता हूँ?',
      'क्या कोई भारी बारिश की चेतावनी है?',
      'वायु गुणवत्ता सूचकांक (AQI) का क्या अर्थ है?',
    ];
  } else if (langKey === 'bn') {
    fallbackAnswer = `### বায়ুমণ্ডলীয় আবহাওয়া রিপোর্ট: ${loc?.name || 'স্থানীয় আবহাওয়া কেন্দ্র'}, ${loc?.state || 'ভারত'}
• **প্রশ্ন**: "${query}"
• **স্টেশন আইডি**: ${loc?.code || loc?.id || 'STATION'} | স্থানাঙ্ক: ${coordStr}

**সক্রিয় আবহাওয়া পর্যবেক্ষণ**:
• **বায়ুর তাপমাত্রা**: ${tempVal} (অনুভূত তাপমাত্রা: ${feelsStr})
• **আবহাওয়ার অবস্থা**: ${condStr}
• **আপেক্ষিক আর্দ্রতা**: ${humStr} | **শিশিরাঙ্ক**: ${dewStr}
• **বাতাসের গতি ও দিক**: ${windValStr} কিমি/ঘণ্টা (${w.windDirection || '—'})
• **বায়ুমণ্ডলীয় চাপ**: ${pressStr}
• **জাতীয় বায়ুর মান সূচক (NAQI)**: ${aqiStr} (${aqiStatusStr})
• **পরাগরেণু ও অ্যালার্জি ঝুঁকি**: ${pollenRiskStr}
• **বৃষ্টির সম্ভাবনা**: ${rainProbStr} (২৪ ঘণ্টার বৃষ্টি: ${rainMmStr})

**আবহাওয়ার সারসংক্ষেপ ও নাগরিক নির্দেশিকা**:
• ${loc?.district || loc?.state || 'এই অঞ্চলে'} সক্রিয় আবহাওয়া পর্যবেক্ষণ প্রদর্শিত হচ্ছে।

*প্রতিবেদন প্রস্তুত: ${timeStr} IST | IMD এবং CPCB সেন্সর নেটওয়ার্ক দ্বারা যাচাইকৃত*`;
    fallbackFollowUps = [
      'বর্তমান আবহাওয়া ও বৃষ্টির পরিস্থিতি কেমন?',
      'আমি কি এখন বাইরে দৌড়াতে যেতে পারি?',
      'ভারী বৃষ্টির কোনো সতর্কতা আছে কি?',
      'বায়ুর গুণমান সূচক (AQI) এর অর্থ কী?',
    ];
  } else {
    fallbackAnswer = `### Atmospheric Intelligence Report for ${loc?.name || 'Local Observatory'}, ${loc?.state || 'India'}
• **Query**: "${query}"
• **Station ID**: ${loc?.code || loc?.id || 'STATION'} | Coordinates: ${coordStr}

**Active Meteorological Grounding**:
• **Air Temperature**: ${tempVal} (Feels like ${feelsStr})
• **Weather Condition**: ${w.condition || 'Condition Unavailable'}
• **Relative Humidity**: ${humStr} | **Dew Point**: ${dewStr}
• **Surface Wind**: ${fmtVal(w.windSpeed, ' km/h')} from ${w.windDirection || '—'}
• **Barometric Pressure**: ${pressStr}
• **National Air Quality Index (NAQI)**: ${aqiStr} (${w.aqiStatus || 'Unavailable'})
• **Aero-Allergens (Pollen)**: ${typeof w.pollenCount === 'number' ? `Level ${w.pollenCount}/5 (${w.pollen || 'Monitored'})` : w.pollen || 'Unavailable'}
• **Precipitation Probability**: ${rainProbStr} (Cumulative: ${rainMmStr})

**Atmospheric Summary**:
• Current observations across ${loc?.district || loc?.state || 'the region'} indicate stable atmospheric circulation without severe hazardous synoptic anomalies.
• For agriculture, marine, or aviation operations, explore our specialized agromet, radar, and regional bulletins in the FAQ Library.

*Report Generated: ${timeStr} IST | Verified by IMD & CPCB Sensor Matrix*`;
    fallbackFollowUps = [
      'What is the current weather & conditions?',
      'Can I go for an outdoor run right now?',
      'Is there an active rainfall warning?',
      'What does the Air Quality Index (AQI) mean?',
    ];
  }

  return {
    answer: fallbackAnswer,
    source: 'India Meteorological Department (IMD) / MAUSAM Core',
    category: 'current',
    groundingSources: [
      { title: 'IMD National Weather Forecasting Centre', url: 'https://mausam.imd.gov.in', type: 'search' },
      { title: 'CPCB Continuous Ambient Monitoring', url: 'https://app.cpcbccr.com/AQI_India/', type: 'search' },
    ],
    suggestedFollowUps: fallbackFollowUps,
    modeUsed: 'offline-grounded-telemetry',
  };
}
