import React, { useEffect, useState } from 'react';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Sprout,
} from 'lucide-react';
import { ExtendedAgrometBulletin } from '../../services/agrometService';
import {
  DataPanel,
  SectionHeading,
  SourceStatus,
} from '../ui/ObservatoryPrimitives';

interface OfficialAgrometLinkItem {
  title: string;
  state: string;
  district?: string | null;
  issuingOffice: string;
  language: string;
  url: string;
  issuedAt: string | null;
  validPeriod: string | null;
  freshness: 'CURRENT' | 'RECENT' | 'STALE' | 'UNVERIFIED';
}

interface OfficialAgrometResponse {
  status: 'AVAILABLE' | 'UNAVAILABLE';
  state: string;
  district: string;
  fetchedAt: string;
  source: string;
  sourceUrl: string;
  bulletins: OfficialAgrometLinkItem[];
  portals: {
    label: string;
    authority: string;
    url: string;
  }[];
  message: string;
}

interface OfficialAgrometAdvisoriesProps {
  bulletin: ExtendedAgrometBulletin;
}

export const OfficialAgrometAdvisories: React.FC<OfficialAgrometAdvisoriesProps> = ({
  bulletin,
}) => {
  const [expandedCrop, setExpandedCrop] = useState<string | null>(bulletin.crops[0]?.cropName || null);
  const [officialData, setOfficialData] = useState<OfficialAgrometResponse | null>(null);
  const [loadingOfficial, setLoadingOfficial] = useState<boolean>(true);
  const [refreshNonce, setRefreshNonce] = useState<number>(0);

  useEffect(() => {
    setExpandedCrop(bulletin.crops[0]?.cropName || null);
  }, [bulletin.state, bulletin.district]);

  useEffect(() => {
    let cancelled = false;
    const loadOfficial = async () => {
      setLoadingOfficial(true);
      try {
        const params = new URLSearchParams({
          state: bulletin.state,
          district: bulletin.district,
        });
        if (refreshNonce > 0) params.set('force', '1');
        const res = await fetch(`/api/agromet/official?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as OfficialAgrometResponse;
        if (!cancelled) {
          setOfficialData(json);
        }
      } catch {
        if (!cancelled) {
          setOfficialData({
            status: 'UNAVAILABLE',
            state: bulletin.state,
            district: bulletin.district,
            fetchedAt: new Date().toISOString(),
            source: 'India Meteorological Department (GKMS)',
            sourceUrl: 'https://mausam.imd.gov.in/responsive/agromet_adv_ser_state_current.php',
            bulletins: [],
            portals: [
              {
                label: 'IMD Current State Agromet Advisories',
                authority: 'India Meteorological Department (GKMS)',
                url: 'https://mausam.imd.gov.in/responsive/agromet_adv_ser_state_current.php',
              },
              {
                label: 'IMD District / Block Agromet Bulletins',
                authority: 'IMD Agromet Field Units (AMFU)',
                url: 'https://mausam.imd.gov.in/imd_latest/contents/agromet/advisory/blocalmain.php',
              },
              {
                label: 'National Agromet Advisory Service (AAS) Bulletin',
                authority: 'IMD Agrimet Pune',
                url: 'https://imdagrimet.gov.in/AGNationalAasBulletinView.php',
              },
            ],
            message:
              'Official IMD district advisory currently unavailable from live proxy. Open the verified IMD GKMS portals below.',
          });
        }
      } finally {
        if (!cancelled) setLoadingOfficial(false);
      }
    };
    loadOfficial();
    return () => {
      cancelled = true;
    };
  }, [bulletin.state, bulletin.district, refreshNonce]);

  const formattedCheckedAt = officialData?.fetchedAt
    ? new Date(officialData.fetchedAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      }) + ' IST'
    : null;

  return (
    <div id="agromet-official-advisories" className="space-y-5">
      {/* 1. LIVE OFFICIAL IMD GKMS SECTION */}
      <DataPanel className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeading
            title="Official IMD Gramin Krishi Mausam Sewa (GKMS) Advisories"
            subtitle={`Live official bulletin lookup for ${bulletin.district}, ${bulletin.state} via IMD Agromet`}
            icon={<ShieldCheck className="w-4 h-4" />}
            badge={
              <SourceStatus
                status={
                  loadingOfficial
                    ? 'REFERENCE'
                    : officialData?.status === 'AVAILABLE'
                    ? 'LIVE'
                    : 'UNAVAILABLE'
                }
                labelOverride={
                  loadingOfficial
                    ? 'CHECKING IMD GKMS'
                    : officialData?.status === 'AVAILABLE'
                    ? `${officialData.bulletins.length} OFFICIAL LINK${officialData.bulletins.length === 1 ? '' : 'S'}`
                    : 'OFFICIAL PDF UNAVAILABLE'
                }
              />
            }
          />
          <button
            type="button"
            onClick={() => setRefreshNonce((n) => n + 1)}
            disabled={loadingOfficial}
            className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] text-[11px] font-mono font-bold text-[var(--m-text-secondary)] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingOfficial ? 'animate-spin' : ''}`} />
            <span>Re-check IMD</span>
          </button>
        </div>

        {loadingOfficial ? (
          <div className="m-panel-inset p-4 text-xs font-mono text-[var(--m-text-muted)]">
            Querying official IMD GKMS advisory index for {bulletin.state}…
          </div>
        ) : officialData && officialData.bulletins.length > 0 ? (
          <div className="space-y-2.5">
            <p className="text-xs text-[var(--m-text-secondary)]">
              {officialData.message}
              {formattedCheckedAt ? ` · Checked ${formattedCheckedAt}` : ''}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {officialData.bulletins.map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="m-panel-inset p-3.5 flex items-start justify-between gap-3 hover:border-[var(--m-accent)]/60 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <span className="text-xs font-bold text-[var(--m-text-primary)] block truncate">
                      {item.title}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--m-text-muted)] block">
                      {item.issuingOffice} · {item.language}
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[var(--m-accent)] shrink-0 mt-0.5" />
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div className="m-panel-inset p-4 space-y-3 border border-[var(--m-watch)]/30">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[var(--m-watch)] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-mono font-bold text-[var(--m-text-primary)] uppercase">
                  Official District Advisory PDF Currently Unavailable
                </h4>
                <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">
                  {officialData?.message ||
                    `Official IMD GKMS district bulletin could not be parsed live for ${bulletin.district}, ${bulletin.state}. MAUSAM will not display synthetic or historical August bulletins as official releases.`}
                  {formattedCheckedAt ? ` (Checked ${formattedCheckedAt})` : ''}
                </p>
              </div>
            </div>

            {officialData?.portals && officialData.portals.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {officialData.portals.map((portal) => (
                  <a
                    key={portal.url}
                    href={portal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2.5 rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] flex items-center justify-between gap-2 text-xs transition-colors"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-[var(--m-text-primary)] block truncate">
                        {portal.label}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--m-text-muted)] block truncate">
                        {portal.authority}
                      </span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--m-accent)] shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </DataPanel>

      {/* 2. CLEARLY SEPARATED WEATHER-DERIVED OPERATIONAL GUIDANCE */}
      <DataPanel className="space-y-4">
        <SectionHeading
          title="Weather-Derived Operational Crop Guidance"
          subtitle="MAUSAM agronomic checklist paired with live Open-Meteo NWP forecast — supplementary to official IMD GKMS bulletins"
          icon={<Sprout className="w-4 h-4" />}
          badge={<SourceStatus status="REFERENCE" labelOverride="DERIVED GUIDANCE" />}
        />

        <div className="m-panel-inset p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div>
            <span className="text-[var(--m-text-muted)] block text-[10px] uppercase">Guidance Classification</span>
            <span className="text-[var(--m-text-primary)] font-bold">{bulletin.bulletinNo}</span>
          </div>
          <div>
            <span className="text-[var(--m-text-muted)] block text-[10px] uppercase">Nearest Reference Node</span>
            <span className="text-[var(--m-text-primary)] font-bold truncate block" title={bulletin.amfuUnit}>
              {bulletin.amfuUnit}
            </span>
          </div>
          <div>
            <span className="text-[var(--m-text-muted)] block text-[10px] uppercase">Computed Date (IST)</span>
            <span className="text-[var(--m-text-primary)] font-bold">
              {bulletin.issueDate}
            </span>
          </div>
          <div>
            <span className="text-[var(--m-text-muted)] block text-[10px] uppercase">5-Day Outlook Window</span>
            <span className="text-[var(--m-ok)] font-bold">{bulletin.validPeriod}</span>
          </div>
        </div>

        <div className="m-panel-inset p-4 space-y-1.5">
          <h3 className="text-[11px] font-mono font-bold text-[var(--m-accent)] uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>Live Model Weather Basis</span>
          </h3>
          <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">{bulletin.weatherSummary}</p>
        </div>

        <div className="space-y-2.5">
          <h3 className="text-[11px] font-mono font-bold text-[var(--m-text-muted)] uppercase tracking-wider px-1">
            Regional Crop Field Checklists ({bulletin.crops.length} Crops · Non-Official Guidance)
          </h3>

          <div className="space-y-2.5">
            {bulletin.crops.map((crop) => {
              const isExpanded = expandedCrop === crop.cropName;

              return (
                <div
                  key={crop.cropName}
                  className="rounded-xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCrop(isExpanded ? null : crop.cropName)}
                    aria-expanded={isExpanded}
                    className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--m-surface-2)]/60 transition-colors cursor-pointer m-focus-ring"
                  >
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="text-sm font-mono font-bold text-[var(--m-text-primary)]">
                        {crop.cropName}
                      </span>
                      <span className="text-[11px] font-mono text-[var(--m-accent)] bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/25 px-2 py-0.5 rounded">
                        Stage: {crop.stage}
                      </span>
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                          crop.riskLevel === 'High'
                            ? 'bg-[var(--m-danger-soft)] border-[var(--m-danger)]/35 text-[var(--m-danger)]'
                            : 'bg-[var(--m-ok-soft)] border-[var(--m-ok)]/35 text-[var(--m-ok)]'
                        }`}
                      >
                        Risk: {crop.riskLevel}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[var(--m-text-muted)] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--m-text-muted)] shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-3 border-t border-[var(--m-border)] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="space-y-1 bg-[var(--m-surface-inset)] p-3 rounded-lg border border-[var(--m-border)]">
                        <strong className="text-[var(--m-ok)] font-mono text-[10px] block uppercase">
                          Sowing &amp; Field Prep
                        </strong>
                        <p className="text-[var(--m-text-secondary)] text-[11px] leading-relaxed">{crop.sowingAdvice}</p>
                      </div>

                      <div className="space-y-1 bg-[var(--m-surface-inset)] p-3 rounded-lg border border-[var(--m-border)]">
                        <strong className="text-[var(--m-accent)] font-mono text-[10px] block uppercase">
                          Irrigation Management
                        </strong>
                        <p className="text-[var(--m-text-secondary)] text-[11px] leading-relaxed">{crop.irrigationAdvice}</p>
                      </div>

                      <div className="space-y-1 bg-[var(--m-surface-inset)] p-3 rounded-lg border border-[var(--m-border)]">
                        <strong className="text-[var(--m-watch)] font-mono text-[10px] block uppercase">
                          Nutrient &amp; Fertilizer
                        </strong>
                        <p className="text-[var(--m-text-secondary)] text-[11px] leading-relaxed">{crop.fertilizerAdvice}</p>
                      </div>

                      <div className="space-y-1 bg-[var(--m-surface-inset)] p-3 rounded-lg border border-[var(--m-border)]">
                        <strong className="text-[var(--m-danger)] font-mono text-[10px] block uppercase">
                          Pest &amp; Disease Defense
                        </strong>
                        <p className="text-[var(--m-text-secondary)] text-[11px] leading-relaxed">{crop.pestDiseaseAdvice}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DataPanel>
    </div>
  );
};
