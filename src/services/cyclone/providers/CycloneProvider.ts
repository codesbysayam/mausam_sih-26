// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// CycloneProvider - Canonical Provider Adapter Interface
// ====================================================================

export interface CycloneProvider {
  /**
   * Human-readable provider identifier (e.g. 'IMD Authenticated API', 'IMD RSMC Public Adapter')
   */
  readonly name: string;

  /**
   * Indicates whether this provider has valid configuration to make requests
   */
  isConfigured(): boolean;

  /**
   * Fetches active tropical cyclonic systems and synoptic disturbances
   */
  fetchSystems(signal?: AbortSignal): Promise<unknown>;

  /**
   * Fetches the latest authoritative cyclone or sea area bulletin
   */
  fetchLatestBulletin(signal?: AbortSignal): Promise<unknown | null>;

  /**
   * Fetches cyclone-related regional and marine warnings
   */
  fetchWarnings(signal?: AbortSignal): Promise<unknown>;
}
