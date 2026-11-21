import {
  WarningRecord,
  WarningFilterState,
  WarningStats,
  AlertSeverity,
  StateWarningSummary,
  EmergencyHelpline,
  IndiaMetRegion,
  HazardCategory,
} from '../types/warningTypes';
import {
  STATE_ALERT_SEVERITIES,
  EMERGENCY_HELPLINES,
  STATE_DISASTER_NUMBERS,
} from '../data/nationalWarningsData';
import { ALL_INDIA_STATES_MET_PROFILES, StateMeteorologicalProfile } from '../data/allIndiaStatesProfiles';
import { LocationRecord } from '../types';
import { formatIndianDateTime } from '../utils/dateUtils';

export interface ReconciledNationalWarnings {
  activeWarnings: WarningRecord[];
  stateSummaries: Record<string, StateWarningSummary>;
  stateSummariesList: StateWarningSummary[];
  unmappedOrNationalBulletins: WarningRecord[];
  totalBulletins: number;
  redBulletins: number;
  orangeBulletins: number;
  yellowBulletins: number;
  advisoryBulletins: number;
  redStates: number;
  orangeStates: number;
  yellowStates: number;
  advisoryStates: number;
  affectedStateCount: number;
  normalStateCount: number;
  totalStatesAndUTs: number;
  latestIssuedAt: string | null;
  isUnavailable: boolean;
}

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  red: 4,
  orange: 3,
  yellow: 2,
  purple: 1,
  green: 0,
};

// Canonical alias map for state code variations (e.g. TS -> TG, OR -> OD, UA -> UK)
const STATE_CODE_ALIASES: Record<string, string> = {
  ts: 'tg',
  or: 'od',
  ua: 'uk',
  dd: 'dnhdd',
  dn: 'dnhdd',
  dnh: 'dnhdd',
  an: 'an',
  lk: 'ld',
  po: 'py',
};

function resolveCanonicalStateProfile(
  stateName?: string,
  stateCode?: string,
  textFallback?: string
): StateMeteorologicalProfile | null {
  const cleanCode = (stateCode || '').toLowerCase().replace(/^in-/, '').trim();
  const mappedCode = STATE_CODE_ALIASES[cleanCode] || cleanCode;

  if (mappedCode && mappedCode !== 'all' && mappedCode !== 'in') {
    const byCode = ALL_INDIA_STATES_MET_PROFILES.find(
      (p) => p.code.toLowerCase() === mappedCode
    );
    if (byCode) return byCode;
  }

  const cleanName = (stateName || '').toLowerCase().trim();
  if (cleanName && cleanName !== 'all' && cleanName !== 'india' && cleanName !== 'national') {
    const exact = ALL_INDIA_STATES_MET_PROFILES.find(
      (p) =>
        p.name.toLowerCase() === cleanName ||
        p.aliases.some((a) => a.toLowerCase() === cleanName)
    );
    if (exact) return exact;

    const partial = ALL_INDIA_STATES_MET_PROFILES.find(
      (p) =>
        cleanName.includes(p.name.toLowerCase()) ||
        p.name.toLowerCase().includes(cleanName)
    );
    if (partial) return partial;
  }

  if (textFallback) {
    const lowerText = textFallback.toLowerCase();
    for (const profile of ALL_INDIA_STATES_MET_PROFILES) {
      if (lowerText.includes(profile.name.toLowerCase())) {
        return profile;
      }
    }
  }

  return null;
}

function isWarningActive(warn: WarningRecord, nowMs: number): boolean {
  const statusText = `${warn.severityLabel || ''} ${warn.title || ''}`.toLowerCase();
  if (/\b(cancelled|canceled|withdrawn|expired)\b/.test(statusText)) {
    return false;
  }
  if (typeof warn.validityTimestamp === 'number' && Number.isFinite(warn.validityTimestamp)) {
    if (warn.validityTimestamp > 0 && warn.validityTimestamp < nowMs) {
      return false;
    }
  }
  return true;
}

function inferHazardCategory(text: string): { category: HazardCategory; label: string; icon: string } {
  const lower = text.toLowerCase();
  if (/(cyclone|cyclonic|deep depression|depression|storm surge)/i.test(lower)) {
    return { category: 'cyclone', label: 'Cyclonic System / Depression', icon: 'cyclone' };
  }
  if (/(flood|inundation|flash flood)/i.test(lower)) {
    return { category: 'flood', label: 'Flood Warning', icon: 'flood' };
  }
  if (/(thunderstorm|lightning|squall|hail)/i.test(lower)) {
    return { category: 'thunderstorm', label: 'Thunderstorm & Lightning', icon: 'thunderstorm' };
  }
  if (/(heat\s*wave|warm night|extreme heat)/i.test(lower)) {
    return { category: 'heatwave', label: 'Heatwave', icon: 'local_fire_department' };
  }
  if (/(cold\s*wave|frost|ground frost|cold day)/i.test(lower)) {
    return { category: 'cold_wave', label: 'Cold Wave', icon: 'ac_unit' };
  }
  if (/(fog|visibility)/i.test(lower)) {
    return { category: 'dense_fog', label: 'Dense Fog', icon: 'foggy' };
  }
  if (/(gale|squally wind|strong wind|gust)/i.test(lower)) {
    return { category: 'strong_wind', label: 'Strong Surface Winds', icon: 'air' };
  }
  if (/(swell|high wave|fishermen|coastal|sea condition)/i.test(lower)) {
    return { category: 'coastal_warning', label: 'Coastal & Marine Warning', icon: 'tsunami' };
  }
  return { category: 'heavy_rain', label: 'Heavy Rainfall', icon: 'rainy' };
}

class WarningService {
  /**
   * Parse official CAP RSS XML (SACHET / IMD CAP) into structured WarningRecord entries.
   * Strictly represents official government bulletins only — never contextual news wires.
   */
  parseCapRssFeedXml(xml: string, sourceLabel = 'NDMA SACHET / IMD CAP Feed'): WarningRecord[] {
    if (!xml || !xml.includes('<item')) return [];
    const records: WarningRecord[] = [];
    const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
    let m: RegExpExecArray | null;
    let idx = 0;

    const extractTag = (block: string, tag: string): string => {
      const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const match = block.match(re);
      if (!match) return '';
      return match[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
    };

    while ((m = itemRegex.exec(xml)) !== null) {
      const block = m[1];
      const title = extractTag(block, 'title');
      const description = extractTag(block, 'description') || title;
      const pubDate = extractTag(block, 'pubDate');
      const guid = extractTag(block, 'guid') || extractTag(block, 'link') || `cap-rss-${idx++}`;
      const category = extractTag(block, 'category');

      if (!title) continue;
      const combined = `${title} ${description} ${category}`;
      const lower = combined.toLowerCase();

      let severity: AlertSeverity = 'yellow';
      let severityLabel = 'YELLOW WATCH — BE UPDATED';
      if (/(red\s*(alert|warning)|extreme|take action|severe cyclonic|super cyclonic)/i.test(lower)) {
        severity = 'red';
        severityLabel = 'RED ALERT — TAKE ACTION';
      } else if (/(orange\s*(alert|warning)|severe|be prepared|deep depression|cyclone warning)/i.test(lower)) {
        severity = 'orange';
        severityLabel = 'ORANGE ALERT — BE PREPARED';
      } else if (/(advisory|information|statement)/i.test(lower) && !/(watch|yellow|warning|alert)/i.test(lower)) {
        severity = 'purple';
        severityLabel = 'ADVISORY BULLETIN';
      }

      const profile = resolveCanonicalStateProfile(undefined, undefined, combined);
      const hazard = inferHazardCategory(combined);
      const parsedDate = pubDate ? new Date(pubDate) : null;
      const issuedAt =
        parsedDate && !Number.isNaN(parsedDate.getTime())
          ? formatIndianDateTime(parsedDate)
          : 'Timestamp unavailable';

      records.push({
        id: `cap-${idx}-${guid.slice(-18).replace(/[^a-zA-Z0-9_-]/g, '')}`,
        bulletinNo: guid.slice(0, 48),
        title,
        severity,
        severityLabel,
        hazardCategory: hazard.category,
        hazardLabel: hazard.label,
        hazardIcon: hazard.icon,
        state: profile?.name || 'India (Multi-State)',
        stateCode: profile ? `in-${profile.code.toLowerCase()}` : 'in-all',
        subdivision: profile?.rmcMc || 'National Synoptic Sector',
        region: 'all',
        affectedDistricts: [],
        affectedAreaText: profile ? profile.name : 'Multi-State / Regional Sector',
        issuedAt,
        validFrom: issuedAt,
        validUntil: 'As per active CAP validity window',
        description,
        impacts: [],
        recommendedActions: [
          'Follow official IMD and State Disaster Management Authority advisories.',
        ],
        expectedConditions: {},
        timeline: [],
        source: sourceLabel,
        authorityAgency: 'India Meteorological Department / NDMA SACHET',
        emergencyContact: {
          title: 'National Emergency Helpline',
          number: '112 / 1070',
          description: '24x7 Disaster & Emergency Operations',
        },
        isRedAlert: severity === 'red',
      });
    }

    return records;
  }

  /**
   * Single canonical reconciliation shared across NationalAlertStatus, NationalWarningMap,
   * StateWatchlistPanel, and AlertsPage.
   * - Filters expired/cancelled bulletins.
   * - Resolves all state aliases (OR->OD, TS->TG, UA->UK, etc.) onto the 36 States & UTs.
   * - Separates bulletin counts from state/UT counts so 7 bulletins across 2 states is crystal clear.
   * - Never falls back to static STATE_ALERT_SEVERITIES or marks unverified states as normal when offline.
   */
  reconcileNationalWarnings(
    warnings: WarningRecord[],
    options?: { isUnavailable?: boolean; nowMs?: number }
  ): ReconciledNationalWarnings {
    const isUnavailable = Boolean(options?.isUnavailable);
    const nowMs = options?.nowMs ?? Date.now();
    const totalStatesAndUTs = ALL_INDIA_STATES_MET_PROFILES.length; // 36

    const activeWarnings = isUnavailable
      ? []
      : (warnings || []).filter((w) => isWarningActive(w, nowMs));

    const groupedByCode = new Map<string, WarningRecord[]>();
    const unmappedOrNationalBulletins: WarningRecord[] = [];

    let redBulletins = 0;
    let orangeBulletins = 0;
    let yellowBulletins = 0;
    let advisoryBulletins = 0;
    let latestIssuedAt: string | null = null;

    for (const warn of activeWarnings) {
      if (warn.severity === 'red') redBulletins++;
      else if (warn.severity === 'orange') orangeBulletins++;
      else if (warn.severity === 'yellow') yellowBulletins++;
      else if (warn.severity === 'purple') advisoryBulletins++;

      if (!latestIssuedAt && warn.issuedAt && warn.issuedAt !== 'Unavailable') {
        latestIssuedAt = warn.issuedAt;
      }

      if (warn.severity === 'green') continue;

      const profile = resolveCanonicalStateProfile(
        warn.state,
        warn.stateCode,
        `${warn.affectedAreaText || ''} ${warn.subdivision || ''} ${warn.title || ''}`
      );

      if (profile) {
        const key = profile.code.toLowerCase();
        const existing = groupedByCode.get(key) || [];
        existing.push(warn);
        groupedByCode.set(key, existing);
      } else {
        unmappedOrNationalBulletins.push(warn);
      }
    }

    const stateSummaries: Record<string, StateWarningSummary> = {};
    let redStates = 0;
    let orangeStates = 0;
    let yellowStates = 0;
    let advisoryStates = 0;

    for (const profile of ALL_INDIA_STATES_MET_PROFILES) {
      const key = profile.code.toLowerCase();
      const matched = groupedByCode.get(key) || [];

      if (matched.length > 0 && !isUnavailable) {
        const sorted = [...matched].sort(
          (a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0)
        );
        const top = sorted[0];

        if (top.severity === 'red') redStates++;
        else if (top.severity === 'orange') orangeStates++;
        else if (top.severity === 'yellow') yellowStates++;
        else if (top.severity === 'purple') advisoryStates++;

        stateSummaries[key] = {
          stateCode: `in-${key}`,
          stateName: profile.name,
          capital: profile.capital,
          highestSeverity: top.severity,
          activeCount: matched.length,
          primaryHazard: top.hazardCategory,
          primaryHazardLabel: top.hazardLabel,
          representativeStation: profile.representativeStation,
          bulletinHeadline: top.title,
          validityRange: top.validUntil,
        };
      } else {
        stateSummaries[key] = {
          stateCode: `in-${key}`,
          stateName: profile.name,
          capital: profile.capital,
          highestSeverity: 'green',
          activeCount: 0,
          primaryHazard: 'agromet_advisory',
          primaryHazardLabel: isUnavailable ? 'Feed Unverified' : 'Normal Seasonal Conditions',
          representativeStation: profile.representativeStation,
          bulletinHeadline: isUnavailable
            ? 'Official SACHET / IMD feed unreachable — status unverified.'
            : 'No active severe weather warning',
          validityRange: isUnavailable ? 'Unavailable' : 'Routine Synoptic Cycle',
        };
      }
    }

    const stateSummariesList = Object.values(stateSummaries).sort((a, b) => {
      const rankDiff = (SEVERITY_RANK[b.highestSeverity] ?? 0) - (SEVERITY_RANK[a.highestSeverity] ?? 0);
      if (rankDiff !== 0) return rankDiff;
      if (b.activeCount !== a.activeCount) return b.activeCount - a.activeCount;
      return a.stateName.localeCompare(b.stateName);
    });

    const affectedStateCount = redStates + orangeStates + yellowStates + advisoryStates;
    const normalStateCount = isUnavailable ? 0 : Math.max(0, totalStatesAndUTs - affectedStateCount);
    const totalBulletins = redBulletins + orangeBulletins + yellowBulletins + advisoryBulletins;

    return {
      activeWarnings,
      stateSummaries,
      stateSummariesList,
      unmappedOrNationalBulletins,
      totalBulletins,
      redBulletins,
      orangeBulletins,
      yellowBulletins,
      advisoryBulletins,
      redStates,
      orangeStates,
      yellowStates,
      advisoryStates,
      affectedStateCount,
      normalStateCount,
      totalStatesAndUTs,
      latestIssuedAt,
      isUnavailable,
    };
  }

  /**
   * Filter the warnings database based on user selections
   */
  filterWarnings(
    warnings: WarningRecord[],
    filter: WarningFilterState
  ): WarningRecord[] {
    return warnings.filter((warn) => {
      // Region filter
      if (filter.region !== 'all' && warn.region !== filter.region) {
        return false;
      }

      // State filter
      if (filter.state && filter.state !== 'all') {
        const target = filter.state.toLowerCase();
        const warnState = warn.state.toLowerCase();
        const warnCode = warn.stateCode.toLowerCase();
        if (warnState !== target && warnCode !== target && !warnState.includes(target)) {
          return false;
        }
      }

      // Hazard Category filter
      if (filter.hazard !== 'all' && warn.hazardCategory !== filter.hazard) {
        return false;
      }

      // Severity filter
      if (filter.severity !== 'all' && warn.severity !== filter.severity) {
        return false;
      }

      // Validity filter
      if (filter.validity !== 'all') {
        const now = Date.now();
        if (filter.validity === 'active_now') {
          if (warn.validityTimestamp && warn.validityTimestamp < now) {
            return false;
          }
        }
      }

      // Search query filter (matches title, state, district, hazard, description, bulletin)
      if (filter.searchQuery.trim()) {
        const query = filter.searchQuery.toLowerCase().trim();
        const matchTitle = warn.title.toLowerCase().includes(query);
        const matchState = warn.state.toLowerCase().includes(query);
        const matchSubdiv = warn.subdivision.toLowerCase().includes(query);
        const matchHazard = warn.hazardLabel.toLowerCase().includes(query);
        const matchDistricts = warn.affectedDistricts.some((d) =>
          d.toLowerCase().includes(query)
        );
        const matchBulletin = warn.bulletinNo.toLowerCase().includes(query);
        const matchDesc = warn.description.toLowerCase().includes(query);

        if (
          !matchTitle &&
          !matchState &&
          !matchSubdiv &&
          !matchHazard &&
          !matchDistricts &&
          !matchBulletin &&
          !matchDesc
        ) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Calculate reconciled real-time stats across national bulletins & 36 States/UTs
   */
  calculateStats(warnings: WarningRecord[], isUnavailable = false): WarningStats {
    const rec = this.reconcileNationalWarnings(warnings, { isUnavailable });
    const now = new Date();
    const lastUpdatedIst = formatIndianDateTime(now);

    return {
      totalActive: rec.totalBulletins,
      statesAffected: rec.affectedStateCount,
      severeRed: rec.redBulletins,
      moderateOrange: rec.orangeBulletins,
      advisoryYellow: rec.yellowBulletins,
      infoPurple: rec.advisoryBulletins,
      greenNormalStates: rec.normalStateCount,
      lastUpdatedIst,
    };
  }

  /**
   * Get overall highest national alert status derived strictly from reconciled live records
   */
  getNationalOverallStatus(warnings: WarningRecord[]): {
    severity: AlertSeverity;
    badgeLabel: string;
    headline: string;
    description: string;
    statusColor: string;
  } {
    const rec = this.reconcileNationalWarnings(warnings);
    const formatAffectedList = (sev: AlertSeverity): string => {
      const names = rec.stateSummariesList
        .filter((s) => s.highestSeverity === sev)
        .map((s) => s.stateName);
      if (names.length === 0) return 'monitored subdivisions';
      if (names.length <= 3) return names.join(', ');
      return `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;
    };

    if (rec.redBulletins > 0) {
      return {
        severity: 'red',
        badgeLabel: 'RED ALERT — ACTIVE SEVERE WEATHER',
        headline: 'NATIONAL WEATHER WARNING: SEVERE ADVISORIES ACTIVE',
        description: `${rec.redBulletins} official Red Warning bulletin${rec.redBulletins === 1 ? '' : 's'} active across ${formatAffectedList('red')} (${rec.affectedStateCount} of ${rec.totalStatesAndUTs} States & UTs alerted). Follow NDMA SACHET and IMD protective directives immediately.`,
        statusColor: '#C94F4B',
      };
    }

    if (rec.orangeBulletins > 0) {
      return {
        severity: 'orange',
        badgeLabel: 'ORANGE ALERT — BE PREPARED',
        headline: 'NATIONAL WEATHER STATUS: MODERATE WARNINGS IN EFFECT',
        description: `${rec.orangeBulletins} official Orange Alert bulletin${rec.orangeBulletins === 1 ? '' : 's'} active across ${formatAffectedList('orange')} (${rec.affectedStateCount} of ${rec.totalStatesAndUTs} States & UTs alerted). Public advised to stay prepared and monitor regional IMD bulletins.`,
        statusColor: '#D98548',
      };
    }

    if (rec.yellowBulletins > 0) {
      return {
        severity: 'yellow',
        badgeLabel: 'YELLOW WATCH — BE UPDATED',
        headline: 'NATIONAL WEATHER STATUS: SCATTERED ADVISORIES ISSUED',
        description: `${rec.yellowBulletins} active Yellow Watch bulletin${rec.yellowBulletins === 1 ? '' : 's'} across ${formatAffectedList('yellow')} (${rec.affectedStateCount} of ${rec.totalStatesAndUTs} States & UTs alerted${rec.unmappedOrNationalBulletins.length > 0 ? `, plus ${rec.unmappedOrNationalBulletins.length} regional bulletin(s)` : ''}). Stay updated with official releases.`,
        statusColor: '#D8B14F',
      };
    }

    if (rec.advisoryBulletins > 0) {
      return {
        severity: 'purple',
        badgeLabel: 'ADVISORY — ROUTINE BULLETIN',
        headline: 'NATIONAL WEATHER STATUS: INFORMATIONAL ADVISORIES ACTIVE',
        description: `${rec.advisoryBulletins} informational bulletin${rec.advisoryBulletins === 1 ? '' : 's'} published in the active CAP feed. No severe Orange or Red weather warnings are currently in force.`,
        statusColor: '#A7C5C5',
      };
    }

    return {
      severity: 'green',
      badgeLabel: 'GREEN — NORMAL / NO SEVERE WEATHER',
      headline: 'NATIONAL WEATHER STATUS: NO ACTIVE SEVERE WARNINGS',
      description:
        'No active severe weather warnings were returned by the official NDMA SACHET / IMD CAP feed across all 36 States & Union Territories.',
      statusColor: '#5C9A79',
    };
  }

  /**
   * Match warnings specifically for a selected location record
   */
  getWarningsForLocation(
    warnings: WarningRecord[],
    location?: LocationRecord
  ): WarningRecord[] {
    if (!location) return [];

    const locState = (location.state || '').toLowerCase();
    const locDistrict = (location.district || '').toLowerCase();
    const locCity = (location.city || '').toLowerCase();

    return warnings.filter((w) => {
      const wState = w.state.toLowerCase();
      const stateMatch =
        wState === locState ||
        wState.includes(locState) ||
        locState.includes(wState);

      if (!stateMatch) return false;

      // Check if location district or city matches affected districts
      const districtMatch = w.affectedDistricts.some((d) => {
        const dl = d.toLowerCase();
        return (
          dl === locDistrict ||
          dl === locCity ||
          locDistrict.includes(dl) ||
          locCity.includes(dl)
        );
      });

      return stateMatch || districtMatch;
    });
  }

  /**
   * Get all live state summaries for map rendering
   */
  getAllStateSummaries(): Record<string, StateWarningSummary> {
    return STATE_ALERT_SEVERITIES;
  }

  /**
   * Resolve official state disaster contact number
   */
  getStateDisasterContact(stateCodeOrName: string) {
    const code = stateCodeOrName.toLowerCase();
    for (const [k, v] of Object.entries(STATE_DISASTER_NUMBERS)) {
      if (
        k === code ||
        v.stateName.toLowerCase() === code ||
        v.stateName.toLowerCase().includes(code) ||
        code.includes(v.stateName.toLowerCase())
      ) {
        return v;
      }
    }
    return {
      stateName: 'State Disaster Management',
      number: '1070 (Toll-Free All-State Helpline)',
      directTel: '1070',
      agency: 'State Emergency Operations Centre',
    };
  }

  /**
   * Get visual styles for a given severity
   */
  getSeverityTheme(severity: AlertSeverity): {
    color: string;
    borderClass: string;
    bgBadgeClass: string;
    textBadgeClass: string;
    icon: string;
    label: string;
  } {
    switch (severity) {
      case 'red':
        return {
          color: '#FF0000',
          borderClass: 'border-[#FF0000]',
          bgBadgeClass: 'bg-[#FF0000]/20 border border-[#FF0000]/60',
          textBadgeClass: 'text-[#FF4D4D]',
          icon: 'warning',
          label: 'RED ALERT — TAKE ACTION',
        };
      case 'orange':
        return {
          color: '#FFA500',
          borderClass: 'border-[#FFA500]',
          bgBadgeClass: 'bg-[#FFA500]/20 border border-[#FFA500]/60',
          textBadgeClass: 'text-[#FFA500]',
          icon: 'priority_high',
          label: 'ORANGE ALERT — BE PREPARED',
        };
      case 'yellow':
        return {
          color: '#FFFF00',
          borderClass: 'border-[#FFFF00]',
          bgBadgeClass: 'bg-[#FFFF00]/20 border border-[#FFFF00]/60',
          textBadgeClass: 'text-[#FFFF00]',
          icon: 'lightbulb',
          label: 'YELLOW WATCH — BE UPDATED',
        };
      case 'purple':
        return {
          color: '#C5A46D',
          borderClass: 'border-[var(--m-accent)]',
          bgBadgeClass: 'bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/60',
          textBadgeClass: 'text-[var(--m-text-primary)]',
          icon: 'info',
          label: 'ADVISORY BULLETIN',
        };
      case 'green':
      default:
        return {
          color: '#008000',
          borderClass: 'border-[#008000]',
          bgBadgeClass: 'bg-[#008000]/20 border border-[#008000]/60',
          textBadgeClass: 'text-[#008000]',
          icon: 'verified',
          label: 'GREEN CODE — NO WARNING',
        };
    }
  }

  private broadcastChannel: BroadcastChannel | null = null;
  private memoryCache: Map<string, { data: StandardizedWarningResponse; timestamp: number }> = new Map();
  private nationalCache: { data: any; timestamp: number } | null = null;
  private readonly CACHE_TTL_MS = 60 * 1000; // 60s cache

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('mausam-data');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'WARNING_DATA' && event.data.cacheKey && event.data.data) {
            this.memoryCache.set(event.data.cacheKey, {
              data: event.data.data,
              timestamp: event.data.timestamp || Date.now(),
            });
          }
        };
      } catch (err) {
        console.warn('[WarningService] BroadcastChannel init error:', err);
      }
    }
  }

  /**
   * Fetch verified real-time warning data for a specific location from /api/warnings or /api/warnings/current
   */
  async fetchLocationWarning(
    location?: LocationRecord,
    forceRefresh = false
  ): Promise<StandardizedWarningResponse> {
    const cacheKey = `${location?.city || ''}|${location?.district || ''}|${location?.state || ''}|${location?.coordinates?.lat || ''}|${location?.coordinates?.lng || ''}`.toLowerCase();
    const now = Date.now();

    // Check cross-tab / in-memory cache
    if (!forceRefresh) {
      const cached = this.memoryCache.get(cacheKey);
      if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
        return cached.data;
      }
    }

    try {
      const query = new URLSearchParams();
      if (location?.city) query.set('city', location.city);
      if (location?.district) query.set('district', location.district);
      if (location?.state) query.set('state', location.state);
      if (location?.country) query.set('country', location.country);
      if (location?.coordinates?.lat) query.set('lat', String(location.coordinates.lat));
      if (location?.coordinates?.lng) query.set('lng', String(location.coordinates.lng));
      if (forceRefresh) query.set('refresh', 'true');

      query.set('mode', 'current');
      const res = await fetch(`/api/warnings?${query.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: StandardizedWarningResponse = await res.json();

      // Store in cache
      this.memoryCache.set(cacheKey, { data, timestamp: now });

      // Broadcast to other tabs
      try {
        this.broadcastChannel?.postMessage({
          type: 'WARNING_DATA',
          cacheKey,
          data,
          timestamp: now,
        });
      } catch {
        // ignore broadcast errors
      }

      return data;
    } catch (err: any) {
      return {
        state: 'DATA_UNAVAILABLE',
        severity: 'neutral',
        severityLabel: 'DATA UNAVAILABLE',
        hazardHeadline: 'WARNING DATA TEMPORARILY UNAVAILABLE',
        affectedAreasHeadline: location?.city || location?.district || 'Selected Location',
        affectedDistricts: [],
        description: 'Official real-time warning feed is currently unreachable. Surface telemetry and NWP forecasts remain active.',
        validUntil: 'Unavailable',
        issuedAt: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
        source: 'NDMA/SACHET',
        updatedAt: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
        status: 'UNAVAILABLE',
        isLocal: false,
      };
    }
  }

  /**
   * Fetch nationwide warning summary across all 28 states and 8 UTs
   */
  async fetchNationalWarnings(forceRefresh = false): Promise<any> {
    const now = Date.now();
    if (!forceRefresh && this.nationalCache && now - this.nationalCache.timestamp < this.CACHE_TTL_MS) {
      return this.nationalCache.data;
    }
    try {
      const res = await fetch('/api/warnings?mode=national');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.nationalCache = { data, timestamp: now };
      return data;
    } catch (err: any) {
      return {
        status: 'UNAVAILABLE',
        timestamp: new Date().toISOString(),
        regions: [],
        error: err.message,
      };
    }
  }
}

export interface StandardizedWarningResponse {
  state:
    | 'NO_ACTIVE_WARNING'
    | 'WATCH_ADVISORY'
    | 'ORANGE_ALERT'
    | 'RED_ALERT'
    | 'DATA_UNAVAILABLE'
    | 'NOT_APPLICABLE';
  severity: 'green' | 'yellow' | 'orange' | 'red' | 'neutral';
  severityLabel: string;
  hazardHeadline: string;
  hazardCode?: number;
  hazardLabel?: string;
  affectedAreasHeadline: string;
  affectedDistricts: string[];
  description: string;
  validUntil: string;
  issuedAt: string;
  source: 'IMD' | 'NDMA/SACHET' | 'None';
  updatedAt: string;
  status: 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE' | 'Routine';
  isLocal: boolean;
  recommendedActions?: string[];
  emergencyContact?: {
    title: string;
    number: string;
  };
  additionalActiveCount?: number;
  metadata?: {
    lat?: number;
    lng?: number;
    resolvedDistrict?: string;
    resolvedState?: string;
    subdivision?: string;
    isInternational?: boolean;
  };
}

export const warningService = new WarningService();
