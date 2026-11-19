import React, { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, GitBranch } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { DataPanel, PageHeader, SectionHeading } from '../components/ui/ObservatoryPrimitives';

interface OpenDataApiProps {
  onNavigateHome?: () => void;
}

export const OpenDataApi: React.FC<OpenDataApiProps> = ({ onNavigateHome }) => {
  const { t } = useLanguage();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full max-w-[960px] mx-auto py-4 px-3 sm:px-4 text-[var(--m-text-secondary)] space-y-6">
      <PageHeader
        eyebrow="MAUSAM Open Data Specification · v3.0"
        title="Open Data API"
        description="Structured REST/JSON weather and environmental data interface combining government observational networks, open NWP datasets, and verified spatial feeds."
        status="REFERENCE"
        statusLabel="MAUSAM-OPENAPI-V1"
        source="Internal /api/* Telemetry Gateways"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/docs/api_specification.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[var(--m-accent-soft)] hover:bg-[var(--m-accent)] border border-[var(--m-accent)]/40 text-[var(--m-accent)] hover:text-white px-3.5 min-h-[44px] sm:min-h-[36px] rounded-lg text-xs font-mono font-semibold transition-colors"
              title="Open full interactive OpenAPI & WMO data interchange specification"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>WMO &amp; OpenAPI HTML ↗</span>
            </a>
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-2 text-xs font-semibold min-h-[44px] sm:min-h-[36px] px-3.5 rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] text-[var(--m-text-primary)] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              <span>{t('returnToPortal', 'Return to Weather Portal')}</span>
            </button>
          </div>
        }
      />

      {/* Table of Contents */}
      <DataPanel variant="surface-1">
        <SectionHeading
          title="API Specification Index"
          icon={<GitBranch className="w-4 h-4" />}
          className="mb-3"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
          {[
            { id: 'api-overview', title: '1. API Overview' },
            { id: 'api-current', title: '2. Current Weather Endpoint' },
            { id: 'api-aqi', title: '3. Air Quality Endpoint' },
            { id: 'api-pollen', title: '4. Pollen & Allergens Endpoint' },
            { id: 'api-forecast', title: '5. Forecast Endpoint' },
            { id: 'api-warnings', title: '6. Weather Warnings Endpoint' },
            { id: 'api-sources', title: '7. Data Sources' },
            { id: 'api-usage', title: '8. API Usage & Security' },
            { id: 'api-attribution', title: '9. Data Attribution' },
            { id: 'api-disclaimer', title: '10. Disclaimer' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className="text-left min-h-[38px] sm:min-h-[32px] px-2.5 rounded-lg hover:bg-[var(--m-surface-2)] text-[var(--m-accent)] hover:text-[var(--m-text-primary)] transition-colors cursor-pointer"
            >
              {item.title}
            </button>
          ))}
        </div>
      </DataPanel>

      {/* Main API Documentation Sections */}
      <DataPanel variant="surface-1" className="p-5 sm:p-7 space-y-8 leading-[1.75] text-sm">
        <section id="api-overview" className="scroll-mt-6">
          <h2 className="text-base font-bold text-[var(--m-text-primary)] mb-2 flex items-center justify-between">
            <span>1. API OVERVIEW</span>
            <span className="text-[11px] font-mono text-[var(--m-text-muted)]">REST / JSON</span>
          </h2>
          <p className="text-[var(--m-text-secondary)] leading-relaxed">
            The MAUSAM API architecture provides structured weather and environmental telemetry for client applications, spatial layers, and research workflows.
          </p>
          <p className="text-[var(--m-text-secondary)] leading-relaxed mt-2">Exposed operational datasets include:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-xs">
            {[
              'Current weather',
              'Temperature',
              'Humidity',
              'Wind',
              'Atmospheric pressure',
              'Visibility',
              'Rainfall',
              'Forecast & NWP',
              'AQI (NAQI / US)',
              'Pollen',
              'UV index',
              'SACHET & IMD warnings',
              'Location metadata',
            ].map((d, i) => (
              <div
                key={i}
                className="p-2.5 bg-[var(--m-surface-inset)] rounded-lg border border-[var(--m-border)] text-[var(--m-text-primary)] font-medium"
              >
                • {d}
              </div>
            ))}
          </div>
        </section>

        <section id="api-current" className="pt-6 border-t border-[var(--m-border)] scroll-mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-[var(--m-text-primary)]">2. CURRENT WEATHER</h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--m-accent-soft)] text-[var(--m-accent)] border border-[var(--m-accent)]/35 font-mono">
              Schema Example
            </span>
          </div>
          <p className="text-xs text-[var(--m-text-muted)] mb-2">
            Retrieve surface observational parameters for an Indian coordinate or station:
          </p>
          <div className="bg-[var(--m-surface-inset)] rounded-lg border border-[var(--m-border)] p-3 font-mono text-xs mb-3 flex items-center justify-between gap-2">
            <span className="text-[var(--m-accent)] truncate">
              GET /api/weather?lat=20.2961&amp;lon=85.8245
            </span>
            <button
              type="button"
              onClick={() => handleCopy('GET /api/weather?lat=20.2961&lon=85.8245', 'cur-ep')}
              className="text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] text-xs px-2 min-h-[32px] rounded bg-[var(--m-surface-1)] border border-[var(--m-border)] shrink-0 cursor-pointer"
            >
              {copiedSection === 'cur-ep' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <span className="text-xs font-bold text-[var(--m-text-primary)] block mb-1">Example Payload:</span>
          <pre
            data-theme="dark-workspace"
            className="bg-[var(--m-canvas)] rounded-lg border border-[var(--m-border)] p-4 text-xs font-mono text-[var(--m-text-secondary)] overflow-x-auto leading-relaxed"
          >
{`{
  "location": {
    "state": "Odisha",
    "city": "Bhubaneswar"
  },
  "temperature": 29,
  "unit": "C",
  "humidity": 78,
  "wind_speed": 14,
  "wind_unit": "km/h",
  "pressure": 1008,
  "visibility": 8,
  "weather": "Cloudy"
}`}
          </pre>
        </section>

        <section id="api-aqi" className="pt-6 border-t border-[var(--m-border)] scroll-mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-[var(--m-text-primary)]">3. AIR QUALITY</h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--m-accent-soft)] text-[var(--m-accent)] border border-[var(--m-accent)]/35 font-mono">
              Schema Example
            </span>
          </div>
          <p className="text-xs text-[var(--m-text-muted)] mb-2">
            Query National Air Quality Index (NAQI) and particulate channels:
          </p>
          <div className="bg-[var(--m-surface-inset)] rounded-lg border border-[var(--m-border)] p-3 font-mono text-xs mb-3 flex items-center justify-between gap-2">
            <span className="text-[var(--m-accent)] truncate">
              GET /api/weather?mode=air&amp;state=Odisha&amp;city=Bhubaneswar
            </span>
            <button
              type="button"
              onClick={() =>
                handleCopy('GET /api/weather?mode=air&state=Odisha&city=Bhubaneswar', 'aqi-ep')
              }
              className="text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] text-xs px-2 min-h-[32px] rounded bg-[var(--m-surface-1)] border border-[var(--m-border)] shrink-0 cursor-pointer"
            >
              {copiedSection === 'aqi-ep' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre
            data-theme="dark-workspace"
            className="bg-[var(--m-canvas)] rounded-lg border border-[var(--m-border)] p-4 text-xs font-mono text-[var(--m-text-secondary)] overflow-x-auto leading-relaxed"
          >
{`{
  "location": "Bhubaneswar",
  "aqi": 82,
  "category": "Satisfactory",
  "pm25": 38,
  "pm10": 72
}`}
          </pre>
        </section>

        <section id="api-pollen" className="pt-6 border-t border-[var(--m-border)] scroll-mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-[var(--m-text-primary)]">4. POLLEN</h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--m-accent-soft)] text-[var(--m-accent)] border border-[var(--m-accent)]/35 font-mono">
              Schema Example
            </span>
          </div>
          <p className="text-xs text-[var(--m-text-muted)] mb-2">
            Query aero-allergenic pollen distribution:
          </p>
          <div className="bg-[var(--m-surface-inset)] rounded-lg border border-[var(--m-border)] p-3 font-mono text-xs mb-3 flex items-center justify-between gap-2">
            <span className="text-[var(--m-accent)] truncate">
              GET /api/environment/pollen?location=Bhubaneswar
            </span>
            <button
              type="button"
              onClick={() =>
                handleCopy('GET /api/environment/pollen?location=Bhubaneswar', 'pol-ep')
              }
              className="text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] text-xs px-2 min-h-[32px] rounded bg-[var(--m-surface-1)] border border-[var(--m-border)] shrink-0 cursor-pointer"
            >
              {copiedSection === 'pol-ep' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre
            data-theme="dark-workspace"
            className="bg-[var(--m-canvas)] rounded-lg border border-[var(--m-border)] p-4 text-xs font-mono text-[var(--m-text-secondary)] overflow-x-auto leading-relaxed"
          >
{`{
  "location": "Bhubaneswar",
  "tree": 1,
  "grass": 2,
  "weed": 3,
  "level": "Moderate"
}`}
          </pre>
        </section>

        <section id="api-forecast" className="pt-6 border-t border-[var(--m-border)] scroll-mt-6">
          <h2 className="text-base font-bold text-[var(--m-text-primary)] mb-2">5. FORECAST &amp; NWP</h2>
          <p className="text-xs text-[var(--m-text-muted)] mb-2">
            Parameters: <code className="text-[var(--m-accent)]">model</code> (ALL | WRF | GEFS | ECMWF),{' '}
            <code className="text-[var(--m-accent)]">lat</code>, <code className="text-[var(--m-accent)]">lon</code>
          </p>
          <div className="bg-[var(--m-surface-inset)] rounded-lg border border-[var(--m-border)] p-3 font-mono text-xs flex items-center justify-between gap-2">
            <span className="text-[var(--m-accent)] truncate">
              GET /api/nwp?model=ALL&amp;lat=20.2961&amp;lon=85.8245
            </span>
            <button
              type="button"
              onClick={() =>
                handleCopy('GET /api/nwp?model=ALL&lat=20.2961&lon=85.8245', 'fc-ep')
              }
              className="text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] text-xs px-2 min-h-[32px] rounded bg-[var(--m-surface-1)] border border-[var(--m-border)] shrink-0 cursor-pointer"
            >
              {copiedSection === 'fc-ep' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </section>

        <section id="api-warnings" className="pt-6 border-t border-[var(--m-border)] scroll-mt-6">
          <h2 className="text-base font-bold text-[var(--m-text-primary)] mb-2">6. WEATHER WARNINGS</h2>
          <p className="text-xs text-[var(--m-text-muted)] mb-2">
            Official NDMA SACHET CAP and IMD severe weather alerts:
          </p>
          <div className="bg-[var(--m-surface-inset)] rounded-lg border border-[var(--m-border)] p-3 font-mono text-xs mb-3 flex items-center justify-between gap-2">
            <span className="text-[var(--m-accent)] truncate">GET /api/warnings</span>
            <button
              type="button"
              onClick={() => handleCopy('GET /api/warnings', 'warn-ep')}
              className="text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] text-xs px-2 min-h-[32px] rounded bg-[var(--m-surface-1)] border border-[var(--m-border)] shrink-0 cursor-pointer"
            >
              {copiedSection === 'warn-ep' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <ul className="list-disc list-inside space-y-1 text-xs pl-2 text-[var(--m-text-secondary)]">
            <li>Warning level (Green, Yellow, Orange, Red)</li>
            <li>Official title and description</li>
            <li>Affected states &amp; districts</li>
            <li>Effective / expiration timestamps</li>
            <li>Source &amp; CAP identifier</li>
          </ul>
        </section>

        <section id="api-sources" className="pt-6 border-t border-[var(--m-border)] scroll-mt-6">
          <h2 className="text-base font-bold text-[var(--m-text-primary)] mb-2">7. DATA SOURCES</h2>
          <p className="text-[var(--m-text-secondary)] leading-relaxed mb-3">
            MAUSAM integrates data from verified meteorological and environmental channels:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs pl-2 text-[var(--m-text-secondary)]">
            <li>India Meteorological Department (IMD) &amp; NDMA SACHET CAP</li>
            <li>CPCB Central Registry &amp; Open-Meteo Chemistry</li>
            <li>Open-Meteo NWP (ECMWF IFS, NOAA GFS/GEFS, DWD ICON)</li>
            <li>RainViewer Doppler Precipitation Mosaic &amp; JTWC / RSMC Cyclone feeds</li>
          </ul>
          <p className="text-xs text-[var(--m-text-muted)] mt-3 italic">
            Each endpoint attaches explicit provider provenance and distinguishes live observations from modelled or unavailable feeds.
          </p>
        </section>

        <section id="api-usage" className="pt-6 border-t border-[var(--m-border)] scroll-mt-6">
          <h2 className="text-base font-bold text-[var(--m-text-primary)] mb-2">8. API USAGE &amp; SECURITY</h2>
          <p className="text-[var(--m-text-secondary)] leading-relaxed mb-3">
            Upstream credentials remain server-side behind <code className="font-mono text-[var(--m-accent)]">/api/*</code> gateways with AbortController timeouts and response caching.
          </p>
          <div className="p-3.5 bg-[var(--m-surface-inset)] rounded-lg border border-[var(--m-border)] text-xs font-mono text-[var(--m-text-secondary)]">
            Public read-only telemetry gateways do not expose server secrets to client code.
          </div>
        </section>

        <section id="api-attribution" className="pt-6 border-t border-[var(--m-border)] scroll-mt-6">
          <h2 className="text-base font-bold text-[var(--m-text-primary)] mb-2">9. DATA ATTRIBUTION</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              { source: 'IMD', accent: 'text-[var(--m-text-primary)]' },
              { source: 'NDMA SACHET', accent: 'text-[var(--m-text-primary)]' },
              { source: 'CPCB', accent: 'text-[var(--m-text-primary)]' },
              { source: 'Open-Meteo', accent: 'text-[var(--m-accent)]' },
            ].map((item) => (
              <div key={item.source} className="p-2.5 bg-[var(--m-surface-inset)] rounded-lg border border-[var(--m-border)]">
                <span className="text-[10px] text-[var(--m-text-muted)] block">Source</span>
                <span className={`font-bold ${item.accent}`}>{item.source}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="api-disclaimer" className="pt-6 border-t border-[var(--m-border)] scroll-mt-6">
          <h2 className="text-base font-bold text-[var(--m-text-primary)] mb-2">10. DISCLAIMER</h2>
          <div className="p-4 bg-[var(--m-surface-inset)] rounded-lg border border-[var(--m-border)] text-xs text-[var(--m-text-secondary)] leading-relaxed">
            MAUSAM is a meteorological intelligence platform developed for observation and research purposes. Weather and environmental data should not be treated as a substitute for official emergency directives issued by NDMA, SDMA, or local civil authorities.
          </div>
        </section>
      </DataPanel>
    </div>
  );
};
