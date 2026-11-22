// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Reusable Server-Side Meteorological Assistant Service
// Graceful 429 rate-limit handling, no API key exposure, no crash
// ====================================================================

import {
  MausamAssistantService,
  AskMausamParams,
  AskMausamResult,
} from '../../../lib/providers/ai';

export class AIService {
  private static instance: AIService;
  private lastRateLimitTime: number = 0;
  private cooldownDurationMs: number = 60 * 1000; // 60s cooldown if 429 occurs

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  public async ask(params: AskMausamParams): Promise<AskMausamResult> {
    const now = Date.now();
    if (now - this.lastRateLimitTime < this.cooldownDurationMs) {
      return {
        response:
          'MAUSAM conversational assistant is in a brief rate-limit cooldown. Verified surface telemetry, radar sweeps, and official warnings remain directly accessible in the live tabs.',
        source: 'MAUSAM Telemetry Safe Mode',
        groundingSources: [],
        modeUsed: 'cooldown',
      };
    }

    try {
      const result = await MausamAssistantService.askMausam(params);
      if (result.error && (result.error.includes('429') || result.error.toLowerCase().includes('rate'))) {
        this.lastRateLimitTime = Date.now();
      }
      return result;
    } catch (err: any) {
      const errMsg = err?.message || '';
      if (errMsg.includes('429') || errMsg.toLowerCase().includes('rate')) {
        this.lastRateLimitTime = Date.now();
        return {
          response:
            'Conversational meteorological assistant is temporarily rate-limited. Real-time observational readings and alert feeds remain active.',
          source: 'MAUSAM Automated Advisory',
          groundingSources: [],
          modeUsed: 'rate_limited',
        };
      }

      return {
        response:
          'Conversational meteorological assistant is currently offline. Real-time surface telemetry and radar feeds remain available.',
        source: 'MAUSAM Fallback Telemetry',
        groundingSources: [],
        modeUsed: 'offline',
        error: errMsg,
      };
    }
  }
}

export const aiService = AIService.getInstance();
