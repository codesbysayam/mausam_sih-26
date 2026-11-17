// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// Cyclone Service (Delegates to canonical CycloneLiveDataService)
// ====================================================================

import {
  CycloneLiveDataService,
  cycloneLiveDataService,
} from './CycloneLiveDataService';
import { CyclonePayload } from '../types/cyclone';

export class CycloneService {
  private static instance: CycloneService;

  public static getInstance(): CycloneService {
    if (!CycloneService.instance) {
      CycloneService.instance = new CycloneService();
    }
    return CycloneService.instance;
  }

  public getCachedPayload(): CyclonePayload | null {
    return cycloneLiveDataService.getCachedPayload();
  }

  public async fetchCycloneData(forceRefresh = false): Promise<CyclonePayload> {
    return cycloneLiveDataService.fetchCycloneData(forceRefresh);
  }

  public subscribe(listener: (data: CyclonePayload) => void): () => void {
    return cycloneLiveDataService.subscribe(listener);
  }
}

export const cycloneService = CycloneService.getInstance();
export { cycloneLiveDataService, CycloneLiveDataService };
export * from './cyclone/providers';
