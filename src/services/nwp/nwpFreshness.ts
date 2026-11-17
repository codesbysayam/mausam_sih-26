// ====================================================================
// MAUSAM Atmospheric Intelligence Platform
// NWP Freshness & Staleness Evaluator
// Strictly computes real data age from verified initialization and fetch timestamps.
// Never displays 'LIVE' merely because HTTP 200 was returned.
// ====================================================================

import { NWPModelId } from '../../data/nwpModels';
import { NWPModelStatus } from '../../types/nwp';

export function evaluateNWPStatus(
  model: NWPModelId,
  runTimeStr?: string,
  fetchedAtStr?: string,
  pointsCount = 0
): { status: NWPModelStatus; ageHours: number; ageLabel: string; nextUpdateLabel: string } {
  if (pointsCount === 0 || !runTimeStr) {
    return {
      status: 'UNAVAILABLE',
      ageHours: 999,
      ageLabel: 'No verified run data',
      nextUpdateLabel: 'Cycle pending',
    };
  }

  const runDate = new Date(runTimeStr).getTime();
  if (isNaN(runDate)) {
    return {
      status: 'UNAVAILABLE',
      ageHours: 999,
      ageLabel: 'Invalid run timestamp',
      nextUpdateLabel: 'Unknown',
    };
  }

  const now = Date.now();
  const diffMs = Math.max(0, now - runDate);
  const ageHours = diffMs / (1000 * 60 * 60);

  let status: NWPModelStatus = 'LIVE';
  if (ageHours > 36) {
    status = 'STALE';
  } else if (ageHours > 14) {
    status = 'RECENT';
  } else {
    status = 'LIVE';
  }

  // Format relative age
  let ageLabel = '';
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  if (diffMinutes < 60) {
    ageLabel = `${diffMinutes} min ago`;
  } else {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    ageLabel = mins > 0 ? `${hours}h ${mins}m ago` : `${hours}h ago`;
  }

  // Determine next expected update cycle based on real meteorological schedules
  let nextUpdateLabel = 'Next cycle: +6h';
  if (model === 'ECMWF') {
    nextUpdateLabel = 'Cycles: 00Z & 12Z (operational ~07Z / 19Z UTC)';
  } else if (model === 'GEFS') {
    nextUpdateLabel = 'Cycles: 00Z, 06Z, 12Z, 18Z (4x daily)';
  } else if (model === 'WRF') {
    nextUpdateLabel = 'Cycles: 00Z & 12Z operational HPC pipeline';
  }

  return {
    status,
    ageHours: Math.round(ageHours * 10) / 10,
    ageLabel,
    nextUpdateLabel,
  };
}
