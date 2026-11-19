// ====================================================================
// MAUSAM Structured Location Title Formatter
// Deduplicates administrative units (city / district / state) so titles
// never repeat regions such as "Bhubaneswar, Khordha, Odisha, Odisha".
// ====================================================================

export interface LocationLabelInput {
  name?: string | null;
  displayName?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  country?: string | null;
}

function cleanPart(value?: string | null): string | null {
  const cleaned = value?.trim().replace(/\s+/g, ' ');
  return cleaned ? cleaned : null;
}

function splitCleanParts(value?: string | null): string[] {
  const cleaned = cleanPart(value);
  if (!cleaned) return [];
  return cleaned
    .split(',')
    .map((segment) => cleanPart(segment))
    .filter((segment): segment is string => Boolean(segment));
}

/**
 * Formats a clean, deduplicated location title preferring structured
 * city, district, and state fields. If only a pre-formatted name/displayName
 * string is available, splits and deduplicates comma-separated tokens cleanly.
 */
export function formatLocationTitle(location?: LocationLabelInput | null): string {
  if (!location) return 'Selected location';

  const hasStructuredFields = Boolean(
    cleanPart(location.city) || cleanPart(location.district) || cleanPart(location.state)
  );

  const rawParts: string[] = hasStructuredFields
    ? [
        ...splitCleanParts(location.city ?? location.name),
        ...splitCleanParts(location.district),
        ...splitCleanParts(location.state),
      ]
    : [
        ...splitCleanParts(location.displayName),
        ...splitCleanParts(location.name),
      ];

  const unique: string[] = [];
  const seen = new Set<string>();

  for (const part of rawParts) {
    const key = part.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(part);
    }
  }

  return unique.join(', ') || 'Selected location';
}

/**
 * Compact 2-part title (City, State) for headers that prefer brevity
 * without duplicating identical city/state names (e.g. "Delhi, Delhi" -> "Delhi").
 */
export function formatLocationShort(location?: LocationLabelInput | null): string {
  if (!location) return 'Selected location';

  const primary = cleanPart(location.city) ?? cleanPart(location.name);
  const state = cleanPart(location.state);

  const parts = [...splitCleanParts(primary), ...splitCleanParts(state)];
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const key = part.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(part);
    }
  }

  return unique.join(', ') || formatLocationTitle(location);
}
