// ====================================================================
// MAUSAM Structured Location Title Formatter
// Deduplicates administrative units (city / district / state / country)
// so headings never repeat regions such as
// "Bhubaneswar, Khordha, Odisha, Odisha".
// ====================================================================

export interface LocationLabelInput {
  name?: string | null;
  displayName?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  country?: string | null;
}

export interface FormatLocationOptions {
  includeCountry?: boolean;
  fallback?: string;
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

function deduplicateParts(parts: string[]): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const key = part.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(part);
    }
  }

  return unique;
}

/**
 * Formats a clean, deduplicated location title preferring structured
 * city, district, and state fields. If only a pre-formatted name/displayName
 * string is available, splits and deduplicates comma-separated tokens cleanly.
 */
export function formatLocationTitle(
  location?: LocationLabelInput | string | null,
  options: FormatLocationOptions = {}
): string {
  const fallback = options.fallback ?? 'Selected location';
  if (!location) return fallback;

  if (typeof location === 'string') {
    const deduped = deduplicateParts(splitCleanParts(location));
    return deduped.join(', ') || fallback;
  }

  const hasStructuredFields = Boolean(
    cleanPart(location.city) || cleanPart(location.district) || cleanPart(location.state)
  );

  const rawParts: string[] = hasStructuredFields
    ? [
        ...splitCleanParts(location.city ?? location.name),
        ...splitCleanParts(location.district),
        ...splitCleanParts(location.state),
        ...(options.includeCountry ? splitCleanParts(location.country) : []),
      ]
    : [
        ...splitCleanParts(location.displayName),
        ...splitCleanParts(location.name),
        ...(options.includeCountry ? splitCleanParts(location.country) : []),
      ];

  const unique = deduplicateParts(rawParts);
  return unique.join(', ') || fallback;
}

/**
 * Compact 2-part title (City, State) for compact headers and chips
 * without duplicating identical city/state names (e.g. "Delhi, Delhi" -> "Delhi").
 */
export function formatLocationShort(
  location?: LocationLabelInput | string | null,
  fallback = 'Selected location'
): string {
  if (!location) return fallback;
  if (typeof location === 'string') {
    return formatLocationTitle(location, { fallback });
  }

  const primary = cleanPart(location.city) ?? cleanPart(location.name);
  const state = cleanPart(location.state);

  const unique = deduplicateParts([...splitCleanParts(primary), ...splitCleanParts(state)]);
  return unique.join(', ') || formatLocationTitle(location, { fallback });
}
