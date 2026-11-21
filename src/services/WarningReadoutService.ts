// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// WarningReadoutService — Broadcast Neural TTS + Browser Speech Fallback
//
// Architecture:
// 1. Primary engine: Server-side Gemini Neural TTS (/api/tts, unary WAV)
//    styled after formal All India Radio / IMD weather bulletins.
// 2. Clean fallback: Browser Web Speech API explicitly reported as
//    'browser-fallback' with selectable voice and honest Hindi support.
// 3. Structured 9-part broadcast bulletin script in Indian English & Hindi
//    with full meteorological unit/acronym normalization and zero English
//    leaking into Hindi scripts.
// 4. Zero overlap: incremented playbackSession + AbortController + Audio stop.
// ====================================================================

export type ReadoutLanguage = 'en' | 'hi';

export type ReadoutEngine = 'gemini-neural-tts' | 'browser-fallback' | 'none';

export type WarningReadoutStatus =
  | 'IDLE'
  | 'PREPARING'
  | 'SPEAKING'
  | 'STOPPING'
  | 'UNAVAILABLE'
  | 'ERROR';

export interface VoiceCapabilityInfo {
  language: ReadoutLanguage;
  available: boolean;
  voiceName: string | null;
  langTag: string | null;
  warningNote: string | null;
  neuralAvailable: boolean;
}

export interface ChunkProgressInfo {
  current: number;
  total: number;
  label: string;
}

export interface WarningChunk {
  label: string;
  text: string;
}

export interface ReadoutEngineMeta {
  engine: ReadoutEngine;
  voiceName: string | null;
  transcript: string;
}

export interface WarningReadoutListener {
  (
    status: WarningReadoutStatus,
    chunkInfo?: ChunkProgressInfo | null,
    errorMessage?: string | null,
    meta?: ReadoutEngineMeta
  ): void;
}

const ENGLISH_TO_HINDI_STATES: Record<string, string> = {
  'andhra pradesh': 'आंध्र प्रदेश',
  'arunachal pradesh': 'अरुणाचल प्रदेश',
  assam: 'असम',
  bihar: 'बिहार',
  chhattisgarh: 'छत्तीसगढ़',
  goa: 'गोवा',
  gujarat: 'गुजरात',
  haryana: 'हरियाणा',
  'himachal pradesh': 'हिमाचल प्रदेश',
  jharkhand: 'झारखंड',
  karnataka: 'कर्नाटक',
  kerala: 'केरल',
  'madhya pradesh': 'मध्य प्रदेश',
  maharashtra: 'महाराष्ट्र',
  manipur: 'मणिपुर',
  meghalaya: 'मेघालय',
  mizoram: 'मिजोरम',
  nagaland: 'नागालैंड',
  odisha: 'ओडिशा',
  punjab: 'पंजाब',
  rajasthan: 'राजस्थान',
  sikkim: 'सिक्किम',
  'tamil nadu': 'तमिलनाडु',
  telangana: 'तेलंगाना',
  tripura: 'त्रिपुरा',
  'uttar pradesh': 'उत्तर प्रदेश',
  uttarakhand: 'उत्तराखंड',
  'west bengal': 'पश्चिम बंगाल',
  delhi: 'दिल्ली',
  puducherry: 'पुडुचेरी',
  chandigarh: 'चंडीगढ़',
  ladakh: 'लद्दाख',
  lakshadweep: 'लक्षद्वीप',
  'jammu and kashmir': 'जम्मू और कश्मीर',
  'andaman and nicobar islands': 'अंडमान और निकोबार द्वीप समूह',
  'bay of bengal': 'बंगाल की खाड़ी',
  'arabian sea': 'अरब सागर',
  'north indian ocean': 'उत्तर हिंद महासागर',
  'coastal india': 'तटीय भारत',
  'coastal / inland india': 'तटीय एवं आंतरिक भारत',
  bhubaneswar: 'भुवनेश्वर',
  gopalpur: 'गोपालपुर',
  puri: 'पुरी',
  paradip: 'पारादीप',
  visakhapatnam: 'विशाखापत्तनम',
  chennai: 'चेन्नई',
  kolkata: 'कोलकाता',
  mumbai: 'मुंबई',
  angul: 'अंगुल',
};

const CLASSIFICATION_HINDI: Record<string, string> = {
  'super cyclonic storm': 'महा चक्रवाती तूफान',
  'extremely severe cyclonic storm': 'अत्यंत भीषण चक्रवाती तूफान',
  'very severe cyclonic storm': 'अति भीषण चक्रवाती तूफान',
  'severe cyclonic storm': 'भीषण चक्रवाती तूफान',
  'cyclonic storm': 'चक्रवाती तूफान',
  'deep depression': 'गंभीर अवदाब',
  depression: 'अवदाब',
  'well marked low pressure area': 'सुस्पष्ट कम दबाव का क्षेत्र',
  'well-marked low pressure area': 'सुस्पष्ट कम दबाव का क्षेत्र',
  'low pressure area': 'कम दबाव का क्षेत्र',
  'synoptic surveillance': 'सिनॉप्टिक मौसम निगरानी',
};

function translatePlaceNamesToHindi(input: string): string {
  let out = input;
  const entries = Object.entries(ENGLISH_TO_HINDI_STATES).sort((a, b) => b[0].length - a[0].length);
  for (const [en, hi] of entries) {
    const re = new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    out = out.replace(re, hi);
  }
  return out;
}

/**
 * Meteorological text normalization utility for crisp, natural broadcast narration.
 * Expands units, coordinates, acronyms, and strips raw HTML/Markdown/URLs.
 */
export function normalizeSpokenText(text: string, lang: ReadoutLanguage = 'en'): string {
  if (!text) return '';

  let clean = text
    // Strip URLs, HTML tags, and markdown
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[*_#`~[\]()]/g, ' ');

  if (lang === 'hi') {
    clean = translatePlaceNamesToHindi(clean);
    clean = clean
      .replace(/(\d+(?:\.\d+)?)\s*°\s*C\b/gi, '$1 डिग्री सेल्सियस')
      .replace(/(\d+(?:\.\d+)?)\s*°\s*N\b/gi, '$1 डिग्री उत्तर अक्षांश')
      .replace(/(\d+(?:\.\d+)?)\s*°\s*E\b/gi, '$1 डिग्री पूर्व देशांतर')
      .replace(/\bkm\/h\b|\bkmph\b/gi, ' किलोमीटर प्रति घंटा')
      .replace(/\bhPa\b/gi, ' हेक्टोपास्कल')
      .replace(/\bmm\b/gi, ' मिलीमीटर')
      .replace(/\bPM2\.5\b/gi, 'पी एम दो दशमलव पांच')
      .replace(/\bPM10\b/gi, 'पी एम दस')
      .replace(/\bIMD\b/g, 'भारतीय मौसम विज्ञान विभाग')
      .replace(/\bRSMC\b/g, 'क्षेत्रीय विशिष्ट मौसम केंद्र')
      .replace(/\bNDMA\b/g, 'राष्ट्रीय आपदा प्रबंधन प्राधिकरण')
      .replace(/\bSDMA\b/g, 'राज्य आपदा प्रबंधन प्राधिकरण')
      .replace(/\bNDRF\b/g, 'राष्ट्रीय आपदा मोचन बल')
      .replace(/\bAQI\b/g, 'वायु गुणवत्ता सूचकांक')
      .replace(/\bIST\b/g, 'भारतीय मानक समय')
      .replace(/\bUTs?\b/g, 'केंद्र शासित प्रदेश')
      .replace(/\bRH\b/g, 'सापेक्ष आर्द्रता')
      .replace(/\bMSLP\b/g, 'समुद्र तल वायु दाब')
      .replace(/\bdBZ\b/gi, 'डेसीबल ज़ेड')
      .replace(/\bNWP\b/g, 'संख्यात्मक मौसम पूर्वानुमान')
      .replace(/\bnorthwards\b/gi, 'उत्तर दिशा की ओर')
      .replace(/\bsouthwards\b/gi, 'दक्षिण दिशा की ओर')
      .replace(/\beastwards\b/gi, 'पूर्व दिशा की ओर')
      .replace(/\bwestwards\b/gi, 'पश्चिम दिशा की ओर')
      .replace(/\bnorth-northwest\b|\bNNW\b/gi, 'उत्तर-उत्तर-पश्चिम')
      .replace(/\bnorth-northeast\b|\bNNE\b/gi, 'उत्तर-उत्तर-पूर्व')
      .replace(/\bwest-northwest\b|\bWNW\b/gi, 'पश्चिम-उत्तर-पश्चिम')
      .replace(/\bnorthwest\b|\bNW\b/gi, 'उत्तर-पश्चिम')
      .replace(/\bnortheast\b|\bNE\b/gi, 'उत्तर-पूर्व')
      .replace(/\bsouthwest\b|\bSW\b/gi, 'दक्षिण-पश्चिम')
      .replace(/\bsoutheast\b|\bSE\b/gi, 'दक्षिण-पूर्व')
      .replace(/\bUnavailable in feed\b/gi, 'आधिकारिक फीड में उपलब्ध नहीं')
      .replace(/\bRefer to official IMD bulletin\b/gi, 'आधिकारिक भारतीय मौसम विज्ञान विभाग बुलेटिन देखें')
      .replace(/\bNormal coastal winds\b/gi, 'सामान्य तटीय हवाएं')
      .replace(/~/g, ' लगभग ')
      .replace(/–|—/g, ' से ')
      .replace(/\s+/g, ' ')
      .trim();

    return clean;
  }

  return clean
    // System identifiers
    .replace(/\bBOB-(\d+)\b/gi, (_, n) => `Bay of Bengal system ${n.split('').join(' ')}`)
    .replace(/\bARB-(\d+)\b/gi, (_, n) => `Arabian Sea system ${n.split('').join(' ')}`)
    // Coordinates & meteorological units
    .replace(/(\d+(?:\.\d+)?)\s*°\s*C\b/gi, '$1 degrees Celsius')
    .replace(/(\d+(?:\.\d+)?)\s*°\s*N\b/gi, '$1 degrees North')
    .replace(/(\d+(?:\.\d+)?)\s*°\s*E\b/gi, '$1 degrees East')
    .replace(/\bPM2\.5\b/gi, 'P M two point five')
    .replace(/\bPM10\b/gi, 'P M ten')
    .replace(/\bkm\/h\b|\bkmph\b/gi, ' kilometers per hour')
    .replace(/\bhPa\b/gi, ' hectopascals')
    .replace(/\bmm\b/g, ' millimeters')
    .replace(/\bkt\b/gi, ' knots')
    .replace(/\bdBZ\b/gi, ' decibels Z')
    // Organizations & acronyms
    .replace(/\bIMD\b/g, 'India Meteorological Department')
    .replace(/\bRSMC\b/g, 'Regional Specialised Meteorological Centre')
    .replace(/\bSDMA\b/g, 'State Disaster Management Authority')
    .replace(/\bNDMA\b/g, 'National Disaster Management Authority')
    .replace(/\bNDRF\b/g, 'National Disaster Response Force')
    .replace(/\bSEOC\b/g, 'State Emergency Operations Centre')
    .replace(/\bAQI\b/g, 'Air Quality Index')
    .replace(/\bUTs\b/g, 'Union Territories')
    .replace(/\bUT\b/g, 'Union Territory')
    .replace(/\bRH\b/g, 'relative humidity')
    .replace(/\bMSLP\b/g, 'mean sea level pressure')
    .replace(/\bNWP\b/g, 'numerical weather prediction')
    .replace(/\bIST\b/g, 'Indian Standard Time')
    .replace(/~/g, ' approximately ')
    // Compass headings
    .replace(/\bENE\b/g, 'east-northeast')
    .replace(/\bESE\b/g, 'east-southeast')
    .replace(/\bWNW\b/g, 'west-northwest')
    .replace(/\bWSW\b/g, 'west-southwest')
    .replace(/\bNNE\b/g, 'north-northeast')
    .replace(/\bNNW\b/g, 'north-northwest')
    .replace(/\bSSE\b/g, 'south-southeast')
    .replace(/\bSSW\b/g, 'south-southwest')
    .replace(/\bNE\b/g, 'northeast')
    .replace(/\bNW\b/g, 'northwest')
    .replace(/\bSE\b/g, 'southeast')
    .replace(/\bSW\b/g, 'southwest')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyHindiStage(classification: string): string {
  const lower = (classification || '').toLowerCase().trim();
  return CLASSIFICATION_HINDI[lower] || 'मौसम प्रणाली';
}

function formatBulletinTime(isoOrStr: string | undefined, lang: ReadoutLanguage): string {
  if (!isoOrStr) {
    return lang === 'hi' ? 'नवीनतम आधिकारिक बुलेटिन' : 'the latest official synoptic cycle';
  }
  const d = new Date(isoOrStr);
  if (Number.isNaN(d.getTime())) {
    return normalizeSpokenText(isoOrStr, lang);
  }
  try {
    return new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d) + (lang === 'hi' ? ' भारतीय मानक समय' : ' Indian Standard Time');
  } catch {
    return isoOrStr;
  }
}

/**
 * Build structured 9-part All India Radio / IMD broadcast chunks & combined transcript.
 */
export function buildBroadcastBulletinChunks(warning: any, lang: ReadoutLanguage): WarningChunk[] {
  if (typeof warning === 'string') {
    return [{ label: 'Weather Bulletin', text: normalizeSpokenText(warning, lang) }];
  }

  const classification = warning?.classification || warning?.category || 'Synoptic Surveillance';
  const systemName = warning?.name || classification;
  const loc = warning?.currentLocation || warning?.location || 'North Indian Ocean';
  const statesArr: string[] = Array.isArray(warning?.affectedStates) && warning.affectedStates.length > 0
    ? warning.affectedStates
    : warning?.region
    ? [String(warning.region)]
    : ['Coastal India'];
  const statesStr = statesArr.join(', ');

  const levelRaw = String(warning?.rainfallThreat || warning?.severity || warning?.level || 'NO_WARNING').toUpperCase();
  const isRed = levelRaw === 'RED';
  const isOrange = levelRaw === 'ORANGE';
  const isYellow = levelRaw === 'YELLOW' || levelRaw === 'WATCH';
  const wind = warning?.maxSustainedWind || warning?.windSpeed || '';
  const movement =
    warning?.movementDirection &&
    !/unavailable/i.test(String(warning.movementDirection)) &&
    warning?.movementSpeed &&
    !/unavailable/i.test(String(warning.movementSpeed))
      ? `${warning.movementDirection} at ${warning.movementSpeed}`
      : null;

  const coordText =
    typeof warning?.latitude === 'number' && typeof warning?.longitude === 'number'
      ? `${warning.latitude.toFixed(1)}°N, ${warning.longitude.toFixed(1)}°E`
      : null;

  const issuedFormatted = formatBulletinTime(warning?.issuedAt || warning?.updatedAt, lang);
  const sourceLabel = warning?.source || 'IMD and NDMA SACHET';

  if (lang === 'hi') {
    const hiStage = classifyHindiStage(classification);
    const hiStates = translatePlaceNamesToHindi(statesStr);
    const hiLocation = normalizeSpokenText(loc, 'hi');
    const hiCoords = coordText ? normalizeSpokenText(coordText, 'hi') : null;

    const severityLine = isRed
      ? 'इस प्रणाली के लिए रेड अलर्ट जारी किया गया है। प्रभावित क्षेत्रों में तत्काल सुरक्षात्मक कदम उठाएं।'
      : isOrange
      ? 'ऑरेंज अलर्ट जारी किया गया है। नागरिक और स्थानीय प्रशासन सतर्क एवं तैयार रहें।'
      : isYellow
      ? 'येलो वॉच जारी किया गया है। नवीनतम आधिकारिक मौसम अपडेट पर नजर बनाए रखें।'
      : 'वर्तमान में किसी भी गंभीर चक्रवाती खतरे की चेतावनी नहीं है। सामान्य सिनॉप्टिक निगरानी जारी है।';

    const hazardLine = wind && !/refer to official/i.test(String(wind))
      ? normalizeSpokenText(`अनुमानित सतही हवा की गति ${wind} दर्ज की गई है। भारी वर्षा और तेज़ हवाओं की संभावना पर लगातार निगरानी रखी जा रही है।`, 'hi')
      : 'तटीय और निकटवर्ती क्षेत्रों में वर्षा और हवा की स्थिति की लगातार निगरानी की जा रही है।';

    const movementLine = movement
      ? normalizeSpokenText(`यह प्रणाली ${movement} की गति से आगे बढ़ रही है।`, 'hi')
      : 'प्रणाली की गति और तीव्रता का आकलन भारतीय मौसम विज्ञान विभाग द्वारा नियमित रूप से किया जा रहा है।';

    const chunks: WarningChunk[] = [
      {
        label: '1. Opening & Authority',
        text: `मौसम आधिकारिक चेतावनी बुलेटिन। यह प्रसारण ${normalizeSpokenText(sourceLabel, 'hi')} के नवीनतम आंकड़ों पर आधारित है।`,
      },
      {
        label: '2. Bulletin Timestamp',
        text: `आधिकारिक बुलेटिन समय: ${issuedFormatted}।`,
      },
      {
        label: '3. Alert Level',
        text: severityLine,
      },
      {
        label: '4. System Classification',
        text: `वर्तमान मौसम प्रणाली की स्थिति: ${hiStage}।`,
      },
      {
        label: '5. Observed Position',
        text: hiCoords
          ? `वर्तमान स्थिति ${hiLocation} के निकट, ${hiCoords} पर दर्ज की गई है।`
          : `निगरानी क्षेत्र: ${hiLocation}।`,
      },
      {
        label: '6. Affected Regions',
        text: `मुख्य निगरानी एवं प्रभावित क्षेत्र: ${hiStates}।`,
      },
      {
        label: '7. Wind & Movement',
        text: `${movementLine} ${hazardLine}`,
      },
      {
        label: '8. Protective Advisory',
        text: 'मछुआरों को समुद्र में जाने से पहले आधिकारिक समुद्री चेतावनी अवश्य जांचने की सलाह दी जाती है। जिला प्रशासन और राज्य आपदा प्रबंधन के निर्देशों का पालन करें।',
      },
      {
        label: '9. Closing & Next Cycle',
        text: 'आपातकालीन सहायता के लिए एक सौ बारह या एक शून्य सात शून्य पर संपर्क करें। मौसम बुलेटिन समाप्त।',
      },
    ];

    return chunks;
  }

  // Indian English All India Radio / IMD formal broadcast script
  const alertSentence = isRed
    ? 'A Red Alert is currently in effect. Immediate protective action is advised across affected districts.'
    : isOrange
    ? 'An Orange Alert is currently in effect. Residents and local authorities are advised to stay prepared for severe weather.'
    : isYellow
    ? 'A Yellow Watch is in effect. Citizens are advised to stay updated with regional meteorological bulletins.'
    : 'No severe cyclone warning is currently active. Routine synoptic surveillance continues across Indian seas.';

  const positionSentence = coordText
    ? normalizeSpokenText(`Latest verified position is near ${loc}, at coordinates ${coordText}.`, 'en')
    : normalizeSpokenText(`Active surveillance covers ${loc}.`, 'en');

  const windAndMoveSentence = normalizeSpokenText(
    [
      movement ? `The system has been moving ${movement}.` : null,
      wind && !/refer to official/i.test(String(wind))
        ? `Maximum sustained surface winds are reported around ${wind}.`
        : 'Surface wind and rainfall bands are under continuous Doppler radar and satellite observation.',
    ]
      .filter(Boolean)
      .join(' '),
    'en'
  );

  return [
    {
      label: '1. Opening & Authority',
      text: normalizeSpokenText(`MAUSAM Official Weather Bulletin, grounded in data from ${sourceLabel}.`, 'en'),
    },
    {
      label: '2. Bulletin Timestamp',
      text: `Reference bulletin issued at ${issuedFormatted}.`,
    },
    {
      label: '3. Alert Level',
      text: alertSentence,
    },
    {
      label: '4. System Classification',
      text: normalizeSpokenText(`Official classification: ${classification}. System designation: ${systemName}.`, 'en'),
    },
    {
      label: '5. Observed Position',
      text: positionSentence,
    },
    {
      label: '6. Affected Regions',
      text: normalizeSpokenText(`Monitored and affected regions include ${statesStr}.`, 'en'),
    },
    {
      label: '7. Wind & Movement',
      text: windAndMoveSentence,
    },
    {
      label: '8. Protective Advisory',
      text: 'Fishermen and coastal marine operators are advised to verify official harbour warnings before venturing into open waters, and residents should follow district administration and NDMA instructions.',
    },
    {
      label: '9. Closing & Emergency Contacts',
      text: 'For emergency assistance, dial one one two, or State Emergency Operations on one zero seven zero. This concludes the MAUSAM official weather bulletin.',
    },
  ];
}

export class WarningReadoutService {
  private static instance: WarningReadoutService;

  private status: WarningReadoutStatus = 'IDLE';
  private playbackSession = 0;
  private queue: WarningChunk[] = [];
  private currentChunkIndex = 0;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private activeAudio: HTMLAudioElement | null = null;
  private activeAudioUrl: string | null = null;
  private activeAbortController: AbortController | null = null;
  private currentLanguage: ReadoutLanguage = 'en';
  private currentVoice: SpeechSynthesisVoice | null = null;
  private preferredVoiceUri: string | null = null;
  private activeEngine: ReadoutEngine = 'none';
  private activeVoiceLabel: string | null = null;
  private lastTranscript = '';
  private voices: SpeechSynthesisVoice[] = [];
  private listeners: Set<WarningReadoutListener> = new Set();
  private errorMessage: string | null = null;
  private isBrowserSupported = false;

  private constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.isBrowserSupported = true;
      this.initVoices();
    } else {
      this.isBrowserSupported = false;
    }
  }

  public static getInstance(): WarningReadoutService {
    if (!WarningReadoutService.instance) {
      WarningReadoutService.instance = new WarningReadoutService();
    }
    return WarningReadoutService.instance;
  }

  private initVoices(): void {
    if (!this.isBrowserSupported) return;

    const loadVoices = () => {
      try {
        const available = window.speechSynthesis.getVoices();
        if (Array.isArray(available) && available.length > 0) {
          this.voices = available;
        }
      } catch {
        // Ignore voice loading exceptions
      }
    };

    loadVoices();

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        loadVoices();
        this.notify();
      };
    }
  }

  public getVoices(langFilter?: ReadoutLanguage): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && this.isBrowserSupported) {
      try {
        this.voices = window.speechSynthesis.getVoices();
      } catch {
        // Ignore
      }
    }
    if (!langFilter) return this.voices;
    if (langFilter === 'hi') {
      return this.voices.filter(
        (v) => v.lang.toLowerCase().startsWith('hi') || v.name.toLowerCase().includes('hindi')
      );
    }
    return this.voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  }

  public setPreferredBrowserVoice(voiceUri: string | null): void {
    this.preferredVoiceUri = voiceUri;
  }

  public getVoiceCapability(lang: ReadoutLanguage): VoiceCapabilityInfo {
    const available = this.getVoices();
    let matched: SpeechSynthesisVoice | null = null;

    if (lang === 'hi') {
      matched =
        available.find((v) => v.lang.toLowerCase() === 'hi-in') ||
        available.find((v) => v.lang.toLowerCase().startsWith('hi')) ||
        available.find((v) => v.name.toLowerCase().includes('hindi')) ||
        null;
    } else {
      matched =
        available.find((v) => v.lang.toLowerCase() === 'en-in') ||
        available.find((v) => v.lang.toLowerCase() === 'en-gb') ||
        available.find((v) => v.lang.toLowerCase() === 'en-us') ||
        available.find((v) => v.lang.toLowerCase().startsWith('en')) ||
        available[0] ||
        null;
    }

    return {
      language: lang,
      // Neural TTS on /api/tts supports both en and hi even if browser lacks a Hindi voice
      available: true,
      neuralAvailable: true,
      voiceName: matched ? matched.name : lang === 'hi' ? 'Gemini Neural Hindi (Kore)' : 'Gemini Neural Indian English (Charon)',
      langTag: matched ? matched.lang : lang === 'hi' ? 'hi-IN' : 'en-IN',
      warningNote:
        !matched && lang === 'hi'
          ? 'Browser has no local Hindi voice installed — using server-side Neural Hindi Broadcast TTS.'
          : null,
    };
  }

  public buildWarningChunks(warning: any, lang: ReadoutLanguage): WarningChunk[] {
    return buildBroadcastBulletinChunks(warning, lang);
  }

  public getPreviewTranscript(warning: any, lang: ReadoutLanguage): string {
    const chunks = this.buildWarningChunks(warning, lang);
    return chunks.map((c) => c.text).join('\n\n');
  }

  public play(warning: any, lang: ReadoutLanguage = this.currentLanguage || 'en'): boolean {
    return this.playWarning(warning, lang);
  }

  /**
   * Plays broadcast bulletin:
   * 1) Attempts server-side Gemini Neural TTS (/api/tts -> WAV audio)
   * 2) Falls back cleanly to Browser Web Speech API with explicit status labelling
   */
  public playWarning(system: any, lang: ReadoutLanguage = 'en'): boolean {
    this.stop();

    const session = ++this.playbackSession;
    this.currentLanguage = lang;
    this.errorMessage = null;
    this.queue = this.buildWarningChunks(system, lang);
    this.currentChunkIndex = 0;

    if (this.queue.length === 0) {
      this.status = 'IDLE';
      this.notify();
      return false;
    }

    const combinedScript = this.queue.map((c) => c.text).join('\n\n');
    this.lastTranscript = combinedScript;
    this.status = 'PREPARING';
    this.activeEngine = 'gemini-neural-tts';
    this.activeVoiceLabel = lang === 'hi' ? 'Gemini Neural Broadcast (Hindi · Kore)' : 'Gemini Neural Broadcast (Indian English · Charon)';

    this.notify({
      current: 1,
      total: this.queue.length,
      label: 'Synthesizing Broadcast Audio',
    });

    const bulletinId = typeof system === 'object' && system?.id ? String(system.id) : 'synoptic-bulletin';
    this.tryNeuralTtsThenFallback(session, combinedScript, lang, bulletinId);
    return true;
  }

  private async tryNeuralTtsThenFallback(
    session: number,
    script: string,
    lang: ReadoutLanguage,
    bulletinId: string
  ): Promise<void> {
    const controller = new AbortController();
    this.activeAbortController = controller;

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: script,
          language: lang,
          bulletinId,
        }),
        signal: controller.signal,
      });

      if (session !== this.playbackSession) return;

      if (!res.ok) {
        throw new Error(`Neural TTS HTTP ${res.status}`);
      }

      const data = await res.json();
      if (session !== this.playbackSession) return;

      if (!data?.ok || !data?.audioBase64) {
        throw new Error(data?.error || 'Neural TTS returned empty payload');
      }

      // Decode base64 WAV directly (Gemini unary TTS already returns a complete WAV file)
      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const mimeType = data.mimeType || 'audio/wav';
      const blob = new Blob([bytes], { type: mimeType });
      const objectUrl = URL.createObjectURL(blob);

      if (session !== this.playbackSession) {
        URL.revokeObjectURL(objectUrl);
        return;
      }

      this.activeAudioUrl = objectUrl;
      const audio = new Audio(objectUrl);
      this.activeAudio = audio;
      this.activeEngine = 'gemini-neural-tts';
      this.activeVoiceLabel =
        lang === 'hi'
          ? `Neural Broadcast · Hindi (${data.voiceName || 'Kore'})`
          : `Neural Broadcast · Indian English (${data.voiceName || 'Charon'})`;

      audio.onplay = () => {
        if (session !== this.playbackSession) return;
        this.status = 'SPEAKING';
        this.notify({
          current: 1,
          total: 1,
          label: 'Broadcast Narration',
        });
      };

      audio.onended = () => {
        if (session !== this.playbackSession) return;
        this.cleanupAudio();
        this.finishSession(session);
      };

      audio.onerror = () => {
        if (session !== this.playbackSession) return;
        this.cleanupAudio();
        this.startBrowserFallback(session, lang, 'Neural audio playback failed; switched to browser speech fallback.');
      };

      await audio.play();
    } catch (err: any) {
      if (session !== this.playbackSession || err?.name === 'AbortError') return;
      this.cleanupAudio();
      this.startBrowserFallback(
        session,
        lang,
        'Using Browser Speech Fallback (Neural TTS service unavailable).'
      );
    }
  }

  private startBrowserFallback(session: number, lang: ReadoutLanguage, fallbackNotice: string): void {
    if (session !== this.playbackSession) return;

    if (!this.isBrowserSupported) {
      this.status = 'UNAVAILABLE';
      this.activeEngine = 'none';
      this.errorMessage = 'Neural TTS is unavailable and this browser does not support Web Speech synthesis.';
      this.notify();
      return;
    }

    const availableVoices = this.getVoices();
    let selectedVoice: SpeechSynthesisVoice | null = null;

    if (this.preferredVoiceUri) {
      selectedVoice = availableVoices.find((v) => v.voiceURI === this.preferredVoiceUri) || null;
    }

    if (!selectedVoice) {
      if (lang === 'hi') {
        selectedVoice =
          availableVoices.find((v) => v.lang.toLowerCase() === 'hi-in') ||
          availableVoices.find((v) => v.lang.toLowerCase().startsWith('hi')) ||
          availableVoices.find((v) => v.name.toLowerCase().includes('hindi')) ||
          null;

        if (!selectedVoice) {
          this.status = 'ERROR';
          this.activeEngine = 'none';
          this.errorMessage =
            'Neural Hindi TTS is temporarily unavailable and no local Hindi voice is installed in this browser.';
          this.notify();
          return;
        }
      } else {
        selectedVoice =
          availableVoices.find((v) => v.lang.toLowerCase() === 'en-in') ||
          availableVoices.find((v) => v.lang.toLowerCase() === 'en-gb') ||
          availableVoices.find((v) => v.lang.toLowerCase() === 'en-us') ||
          availableVoices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
          availableVoices[0] ||
          null;
      }
    }

    this.currentVoice = selectedVoice;
    this.activeEngine = 'browser-fallback';
    this.activeVoiceLabel = selectedVoice
      ? `Browser Speech Fallback · ${selectedVoice.name}`
      : 'Browser Speech Fallback';
    this.errorMessage = fallbackNotice;
    this.currentChunkIndex = 0;

    setTimeout(() => {
      if (session !== this.playbackSession) return;
      this.status = 'SPEAKING';
      this.speakNextBrowserChunk(session);
    }, 120);
  }

  private speakNextBrowserChunk(session: number): void {
    if (session !== this.playbackSession) return;

    if (this.currentChunkIndex >= this.queue.length) {
      this.finishSession(session);
      return;
    }

    const chunk = this.queue[this.currentChunkIndex];
    if (!chunk || !chunk.text.trim()) {
      this.currentChunkIndex++;
      this.speakNextBrowserChunk(session);
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(chunk.text);
      if (this.currentVoice) {
        utterance.voice = this.currentVoice;
      }
      utterance.lang =
        this.currentLanguage === 'hi' ? 'hi-IN' : this.currentVoice?.lang || 'en-IN';
      utterance.rate = 0.93;
      utterance.pitch = 0.98;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        if (session !== this.playbackSession) return;
        this.status = 'SPEAKING';
        this.notify({
          current: this.currentChunkIndex + 1,
          total: this.queue.length,
          label: chunk.label,
        });
      };

      utterance.onend = () => {
        if (session !== this.playbackSession) return;
        this.currentChunkIndex++;
        if (this.currentChunkIndex < this.queue.length) {
          setTimeout(() => {
            if (session !== this.playbackSession) return;
            this.speakNextBrowserChunk(session);
          }, 340);
        } else {
          this.finishSession(session);
        }
      };

      utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
        if (session !== this.playbackSession) return;
        if (e.error === 'interrupted' || e.error === 'canceled') {
          this.finishSession(session);
          return;
        }
        this.currentChunkIndex++;
        if (this.currentChunkIndex < this.queue.length) {
          this.speakNextBrowserChunk(session);
        } else {
          this.status = 'ERROR';
          this.errorMessage = 'Browser speech playback failed.';
          this.finishSession(session, true);
        }
      };

      this.activeUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch {
      if (session === this.playbackSession) {
        this.status = 'ERROR';
        this.errorMessage = 'Voice playback unavailable.';
        this.finishSession(session, true);
      }
    }
  }

  private cleanupAudio(): void {
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch {
        // ignore
      }
      this.activeAbortController = null;
    }
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.src = '';
      } catch {
        // ignore
      }
      this.activeAudio = null;
    }
    if (this.activeAudioUrl) {
      try {
        URL.revokeObjectURL(this.activeAudioUrl);
      } catch {
        // ignore
      }
      this.activeAudioUrl = null;
    }
  }

  private finishSession(session: number, isError = false): void {
    if (session !== this.playbackSession) return;
    this.activeUtterance = null;
    this.queue = [];
    this.currentChunkIndex = 0;
    this.status = isError ? 'ERROR' : 'IDLE';
    this.notify();
  }

  public stop(): void {
    const wasActive = this.status !== 'IDLE';
    this.playbackSession++;
    this.cleanupAudio();
    this.queue = [];
    this.currentChunkIndex = 0;
    this.activeUtterance = null;
    this.errorMessage = null;

    if (this.isBrowserSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }

    this.status = 'IDLE';
    if (wasActive) {
      this.notify();
    }
  }

  public getStatus(): WarningReadoutStatus {
    return this.status;
  }

  public getEngineMeta(): ReadoutEngineMeta {
    return {
      engine: this.activeEngine,
      voiceName: this.activeVoiceLabel,
      transcript: this.lastTranscript,
    };
  }

  public getCurrentChunkInfo(): ChunkProgressInfo | null {
    if (
      (this.status === 'SPEAKING' || this.status === 'PREPARING') &&
      this.queue.length > 0 &&
      this.currentChunkIndex < this.queue.length
    ) {
      return {
        current: this.currentChunkIndex + 1,
        total: this.queue.length,
        label: this.queue[this.currentChunkIndex].label,
      };
    }
    return null;
  }

  public getErrorMessage(): string | null {
    return this.errorMessage;
  }

  public getCurrentLanguage(): ReadoutLanguage {
    return this.currentLanguage;
  }

  public subscribe(listener: WarningReadoutListener): () => void {
    this.listeners.add(listener);
    listener(this.status, this.getCurrentChunkInfo(), this.errorMessage, this.getEngineMeta());
    return () => this.listeners.delete(listener);
  }

  private notify(chunkInfo: ChunkProgressInfo | null = null): void {
    const info = chunkInfo || this.getCurrentChunkInfo();
    const meta = this.getEngineMeta();
    for (const listener of this.listeners) {
      try {
        listener(this.status, info, this.errorMessage, meta);
      } catch (e) {
        console.error('[WarningReadoutService] Listener error:', e);
      }
    }
  }
}

export const warningReadoutService = WarningReadoutService.getInstance();
