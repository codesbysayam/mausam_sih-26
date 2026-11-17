// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// WarningReadoutService - Canonical Grounded Speech Synthesis Engine
//
// Rules enforced:
// 1. Only two languages: English ('en') and Hindi ('hi').
// 2. Absolutely NO speech overlap - single sequential queue.
// 3. Stale callback guard using incremented playbackSession ID.
// 4. Stop actually stops immediately - cancel(), reset queue, IDLE state.
// 5. Handles long warnings by splitting into short meaningful chunks.
// 6. Sequential utterance playback - wait for onend before next chunk.
// 7. Voice loading with voiceschanged and preferred voice detection (en-IN, hi-IN).
// 8. Honest Hindi voice support (no forcing English voice to speak Hindi).
// 9. Clean spoken text without HTML, Markdown, or raw tech tokens.
// ====================================================================

import { WeatherSystemEvent } from '../types/cyclone';

export type ReadoutLanguage = 'en' | 'hi';

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

export interface WarningReadoutListener {
  (
    status: WarningReadoutStatus,
    chunkInfo?: ChunkProgressInfo | null,
    errorMessage?: string | null
  ): void;
}

/**
 * Meteorological text normalization utility for clean spoken audio
 */
export function normalizeSpokenText(text: string): string {
  if (!text) return '';
  return text
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove markdown formatting
    .replace(/[*_#`~[\]()]/g, ' ')
    // System identifiers
    .replace(/\bBOB-04\b/gi, 'Bay of Bengal system zero four')
    .replace(/\bBOB-(\d+)\b/gi, (_, n) => `Bay of Bengal system ${n.split('').join(' ')}`)
    .replace(/\bARB-(\d+)\b/gi, (_, n) => `Arabian Sea system ${n.split('').join(' ')}`)
    // Organizations
    .replace(/\bIMD\b/g, 'India Meteorological Department')
    .replace(/\bRSMC\b/g, 'Regional Specialized Meteorological Centre')
    .replace(/\bSDMA\b/g, 'State Disaster Management Authority')
    .replace(/\bNDMA\b/g, 'National Disaster Management Authority')
    .replace(/\bNDRF\b/g, 'National Disaster Response Force')
    .replace(/\bSEOC\b/g, 'State Emergency Operations Centre')
    // Meteorological units & symbols
    .replace(/\bkm\/h\b/gi, ' kilometers per hour')
    .replace(/\bhPa\b/gi, ' hectopascals')
    .replace(/\bkt\b/gi, ' knots')
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
    // Clean extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

export class WarningReadoutService {
  private static instance: WarningReadoutService;

  private status: WarningReadoutStatus = 'IDLE';
  private playbackSession: number = 0;
  private queue: WarningChunk[] = [];
  private currentChunkIndex: number = 0;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private currentLanguage: ReadoutLanguage = 'en';
  private currentVoice: SpeechSynthesisVoice | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private listeners: Set<WarningReadoutListener> = new Set();
  private errorMessage: string | null = null;
  private isBrowserSupported: boolean = false;

  private constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.isBrowserSupported = true;
      this.initVoices();
    } else {
      this.isBrowserSupported = false;
      this.status = 'UNAVAILABLE';
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

  /**
   * Retrieves available voices from browser
   */
  public getVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && this.isBrowserSupported) {
      try {
        this.voices = window.speechSynthesis.getVoices();
      } catch {
        // Ignore
      }
    }
    return this.voices;
  }

  /**
   * Discovers the best preferred voice for English or Hindi
   */
  public getVoiceCapability(lang: ReadoutLanguage): VoiceCapabilityInfo {
    if (!this.isBrowserSupported) {
      return {
        language: lang,
        available: false,
        voiceName: null,
        langTag: null,
        warningNote: 'Speech synthesis is not supported in this browser.',
      };
    }

    const available = this.getVoices();

    if (lang === 'hi') {
      const hindiVoice = available.find(
        (v) =>
          v.lang.toLowerCase() === 'hi-in' ||
          v.lang.toLowerCase().startsWith('hi') ||
          v.name.toLowerCase().includes('hindi')
      );

      if (hindiVoice) {
        return {
          language: 'hi',
          available: true,
          voiceName: hindiVoice.name,
          langTag: hindiVoice.lang,
          warningNote: null,
        };
      }

      return {
        language: 'hi',
        available: false,
        voiceName: null,
        langTag: null,
        warningNote: 'Hindi voice is unavailable in this browser.',
      };
    }

    // English: en-IN -> en-GB -> en-US -> any en
    const englishVoice =
      available.find((v) => v.lang.toLowerCase() === 'en-in') ||
      available.find((v) => v.lang.toLowerCase() === 'en-gb') ||
      available.find((v) => v.lang.toLowerCase() === 'en-us') ||
      available.find((v) => v.lang.toLowerCase().startsWith('en')) ||
      available.find((v) => v.default) ||
      available[0] ||
      null;

    if (englishVoice) {
      return {
        language: 'en',
        available: true,
        voiceName: englishVoice.name,
        langTag: englishVoice.lang,
        warningNote: null,
      };
    }

    return {
      language: 'en',
      available: false,
      voiceName: null,
      langTag: null,
      warningNote: 'English voice is unavailable in this browser.',
    };
  }

  /**
   * Prepares clean, natural speech chunks with semantic labels
   */
  public buildWarningChunks(warning: any, lang: ReadoutLanguage): WarningChunk[] {
    // If warning is a string
    if (typeof warning === 'string') {
      const normalized = normalizeSpokenText(warning);
      return [
        { label: 'Warning Announcement', text: normalized },
      ];
    }

    // If warning is WeatherSystemEvent or has structured properties
    const classification = warning.classification || warning.category || 'Synoptic System';
    const loc = warning.currentLocation || warning.location || 'North Indian Ocean';
    const states = Array.isArray(warning.affectedStates)
      ? warning.affectedStates.join(', ')
      : (warning.affectedStates || warning.region || 'Coastal Regions');
    const isRed = warning.rainfallThreat === 'RED' || warning.severity === 'RED' || warning.level === 'RED';
    const wind = warning.maxSustainedWind || warning.windSpeed || 'Normal coastal breeze';

    if (lang === 'hi') {
      const titleText = normalizeSpokenText(
        `मौसम चेतावनी बुलेटिन। ${classification === 'Deep Depression' ? 'गंभीर अवदाब' : classification === 'Depression' ? 'अवदाब प्रणाली' : 'मौसम प्रणाली'} की आधिकारिक स्थिति।`
      );

      const severityText = isRed
        ? 'लाल चेतावनी जारी की गई है। अत्यधिक सतर्क रहें।'
        : 'मौसम विभाग द्वारा निगरानी जारी है। सतर्क रहें।';

      const locationText = `प्रभावित क्षेत्र: ${states}। वर्तमान स्थिति: ${loc}।`;

      const mainWarningText = normalizeSpokenText(
        `हवा की गति ${wind}। समुद्र की स्थिति पर लगातार निगरानी रखी जा रही है।`
      );

      const validityText = warning.nextBulletinAt
        ? `अगला आधिकारिक बुलेटिन ${warning.nextBulletinAt} पर अपेक्षित है।`
        : 'नवीनतम जानकारी हेतु आधिकारिक बुलेटिन देखें।';

      const safetyText =
        'मछुआरों को समुद्र में जाने से पूर्व मौसम पूर्वानुमान जांचने की सलाह दी जाती है। आपदा प्रबंधन के निर्देशों का पालन करें।';

      return [
        { label: 'Warning Title', text: titleText },
        { label: 'Severity Alert', text: severityText },
        { label: 'Affected Location', text: locationText },
        { label: 'Synoptic Warning', text: mainWarningText },
        { label: 'Bulletin Validity', text: validityText },
        { label: 'Safety Instruction', text: safetyText },
      ];
    }

    // English
    const titleText = normalizeSpokenText(
      `MAUSAM Synoptic Advisory Readout. Official bulletin for ${classification}.`
    );

    const severityText = isRed
      ? 'Red Alert is active. Take immediate precautionary measures.'
      : 'Active synoptic surveillance. Please monitor official updates.';

    const locationText = normalizeSpokenText(
      `Target areas include ${states}. Current position: ${loc}.`
    );

    const mainWarningText = normalizeSpokenText(
      `Sustained wind conditions: ${wind}. Radar and satellite surveillance active.`
    );

    const validityText = warning.nextBulletinAt
      ? `Next official update scheduled at ${warning.nextBulletinAt}.`
      : 'Continuous 24x7 monitoring in progress.';

    const safetyText =
      'Fishermen and coastal operators are advised to follow official maritime advisories and local disaster management instructions.';

    return [
      { label: 'Warning Title', text: titleText },
      { label: 'Severity Alert', text: severityText },
      { label: 'Affected Location', text: locationText },
      { label: 'Synoptic Warning', text: mainWarningText },
      { label: 'Bulletin Validity', text: validityText },
      { label: 'Safety Instruction', text: safetyText },
    ];
  }

  /**
   * Primary canonical playback method requested by specification: play(warning)
   * Also accepts optional language parameter (defaults to currentLanguage or 'en')
   */
  public play(warning: any, lang: ReadoutLanguage = this.currentLanguage || 'en'): boolean {
    return this.playWarning(warning, lang);
  }

  /**
   * Initiates playback for a weather system in either English or Hindi
   */
  public playWarning(system: any, lang: ReadoutLanguage = 'en'): boolean {
    if (!this.isBrowserSupported) {
      this.status = 'UNAVAILABLE';
      this.errorMessage = 'Browser speech synthesis is unavailable.';
      this.notify();
      return false;
    }

    // Stop any existing speech and cancel internal queue immediately
    this.stop();

    // Check voice availability for chosen language
    const capability = this.getVoiceCapability(lang);
    if (!capability.available) {
      this.status = 'ERROR';
      this.errorMessage =
        capability.warningNote ||
        (lang === 'hi'
          ? 'Hindi voice is unavailable in this browser.'
          : 'English voice is unavailable in this browser.');
      this.notify();
      return false;
    }

    const availableVoices = this.getVoices();
    let selectedVoice: SpeechSynthesisVoice | null = null;

    if (lang === 'hi') {
      selectedVoice =
        availableVoices.find(
          (v) =>
            v.lang.toLowerCase() === 'hi-in' ||
            v.lang.toLowerCase().startsWith('hi') ||
            v.name.toLowerCase().includes('hindi')
        ) || null;

      if (!selectedVoice) {
        this.status = 'ERROR';
        this.errorMessage = 'Hindi voice is unavailable in this browser.';
        this.notify();
        return false;
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

    // Prepare fresh session with new ID
    const session = ++this.playbackSession;
    this.currentLanguage = lang;
    this.currentVoice = selectedVoice;
    this.errorMessage = null;
    this.queue = this.buildWarningChunks(system, lang);
    this.currentChunkIndex = 0;

    if (this.queue.length === 0) {
      this.status = 'IDLE';
      this.notify();
      return false;
    }

    this.status = 'PREPARING';
    const firstChunk = this.queue[0];
    this.notify({ current: 1, total: this.queue.length, label: firstChunk.label });

    // Controlled micro-delay to let browser cancel fully settle
    setTimeout(() => {
      if (session !== this.playbackSession) return;
      this.status = 'SPEAKING';
      this.speakNextChunk(session);
    }, 150);

    return true;
  }

  private speakNextChunk(session: number): void {
    if (session !== this.playbackSession) return;

    if (this.currentChunkIndex >= this.queue.length) {
      this.finishSession(session);
      return;
    }

    const chunk = this.queue[this.currentChunkIndex];
    if (!chunk || !chunk.text || chunk.text.trim().length === 0) {
      this.currentChunkIndex++;
      this.speakNextChunk(session);
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(chunk.text);
      if (this.currentVoice) {
        utterance.voice = this.currentVoice;
      }
      utterance.lang = this.currentLanguage === 'hi' ? 'hi-IN' : (this.currentVoice?.lang || 'en-IN');
      utterance.rate = 0.94;
      utterance.pitch = 1.0;
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
            this.speakNextChunk(session);
          }, 300);
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

        console.warn('[WarningReadoutService] Utterance error:', e.error);
        this.currentChunkIndex++;
        if (this.currentChunkIndex < this.queue.length) {
          this.speakNextChunk(session);
        } else {
          this.status = 'ERROR';
          this.errorMessage = 'Voice playback unavailable. Please try again.';
          this.finishSession(session, true);
        }
      };

      this.activeUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('[WarningReadoutService] Speak call exception:', err);
      if (session === this.playbackSession) {
        this.status = 'ERROR';
        this.errorMessage = 'Voice playback unavailable. Please try again.';
        this.finishSession(session, true);
      }
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

  /**
   * Stop immediately cancels browser speech, resets the queue, and invalidates session
   */
  public stop(): void {
    const wasActive = this.status !== 'IDLE';

    // Invalidate session to drop any delayed callbacks
    this.playbackSession++;

    this.queue = [];
    this.currentChunkIndex = 0;
    this.activeUtterance = null;
    this.errorMessage = null;

    if (this.isBrowserSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancel errors
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
    listener(this.status, this.getCurrentChunkInfo(), this.errorMessage);
    return () => this.listeners.delete(listener);
  }

  private notify(chunkInfo: ChunkProgressInfo | null = null): void {
    const info = chunkInfo || this.getCurrentChunkInfo();
    for (const listener of this.listeners) {
      try {
        listener(this.status, info, this.errorMessage);
      } catch (e) {
        console.error('[WarningReadoutService] Listener error:', e);
      }
    }
  }
}

export const warningReadoutService = WarningReadoutService.getInstance();
