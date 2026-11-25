import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  FileText,
  Cpu,
  ShieldCheck,
  Palette,
  CheckSquare,
  Bookmark,
  Copy,
  Check,
  Activity,
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { DataPanel, PageHeader, SectionHeading } from '../components/ui/ObservatoryPrimitives';

type DocSection = 'prd' | 'architecture' | 'rules' | 'design' | 'tasks' | 'memory';

interface DocsPageProps {
  onNavigateHome?: () => void;
  initialDoc?: DocSection;
}

interface NavItem {
  id: DocSection;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  filePath: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'prd',
    title: 'PRD & Overview',
    subtitle: 'Product vision, personas & requirements',
    icon: FileText,
    filePath: 'docs/PRD.md',
  },
  {
    id: 'architecture',
    title: 'Architecture',
    subtitle: 'System topology, pipelines & data flow',
    icon: Cpu,
    filePath: 'docs/ARCHITECTURE.md',
  },
  {
    id: 'rules',
    title: 'Engineering Rules',
    subtitle: 'Anti-fabrication, security & conventions',
    icon: ShieldCheck,
    filePath: 'docs/RULES.md',
  },
  {
    id: 'design',
    title: 'Design System',
    subtitle: 'Tokens, typography & UI console specs',
    icon: Palette,
    filePath: 'docs/DESIGN.md',
  },
  {
    id: 'tasks',
    title: 'Tasks & Roadmap',
    subtitle: 'Implemented work & active checklist',
    icon: CheckSquare,
    filePath: 'docs/TASKS.md',
  },
  {
    id: 'memory',
    title: 'Project Memory',
    subtitle: 'Key ADRs, limitations & knowledge',
    icon: Bookmark,
    filePath: 'docs/MEMORY.md',
  },
];

export const DocsPage: React.FC<DocsPageProps> = ({ onNavigateHome, initialDoc = 'prd' }) => {
  const { t } = useLanguage();
  const [activeDoc, setActiveDoc] = useState<DocSection>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const docParam = params.get('doc');
      if (docParam && NAV_ITEMS.some((item) => item.id === docParam)) {
        return docParam as DocSection;
      }
    }
    return initialDoc;
  });

  const [copiedDoc, setCopiedDoc] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeDoc]);

  const handleSelectDoc = (id: DocSection) => {
    setActiveDoc(id);
    if (typeof window !== 'undefined' && window.history.pushState) {
      const newUrl = `${window.location.pathname}?doc=${id}`;
      window.history.pushState({ doc: id }, '', newUrl);
    }
  };

  const handleCopyMarkdownNotice = () => {
    const activeItem = NAV_ITEMS.find((n) => n.id === activeDoc);
    if (!activeItem) return;
    navigator.clipboard.writeText(`Refer to repository file: ${activeItem.filePath}`).catch(() => {});
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 2000);
  };

  const activeItem = NAV_ITEMS.find((item) => item.id === activeDoc) || NAV_ITEMS[0];

  return (
    <div className="w-full max-w-7xl mx-auto py-4 px-3 sm:px-4 text-[var(--m-text-secondary)] space-y-5">
      <PageHeader
        eyebrow="MAUSAM Engineering Registry"
        title="Platform Documentation"
        description="Canonical product specifications, architectural topology, zero-fabrication engineering rules, and design standards."
        status="REFERENCE"
        statusLabel="Editorial System v3.0.0"
        source={activeItem.filePath}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMarkdownNotice}
              className="inline-flex items-center gap-1.5 px-3 min-h-[44px] sm:min-h-[36px] rounded-lg bg-[var(--m-surface-inset)] hover:bg-[var(--m-surface-2)] border border-[var(--m-border)] text-xs text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] transition-colors cursor-pointer"
              title="Copy path of canonical documentation file"
            >
              {copiedDoc ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[var(--m-ok)]" />
                  <span className="text-[var(--m-ok)] text-xs">Copied Path</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[var(--m-accent)]" />
                  <span className="text-xs font-mono">{activeItem.filePath}</span>
                </>
              )}
            </button>
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

      {/* Main Grid: Sidebar + Document Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <aside className="lg:col-span-3 flex flex-col gap-3">
          <DataPanel variant="surface-1" className="p-3 sm:p-4">
            <h2 className="text-[11px] font-mono uppercase text-[var(--m-text-muted)] tracking-wider mb-2 px-1">
              Documentation Suite
            </h2>
            <nav className="flex flex-col gap-1.5" aria-label="Documentation sections">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeDoc === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectDoc(item.id)}
                    className={`flex items-start gap-3 p-2.5 min-h-[48px] rounded-lg text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/40 text-[var(--m-text-primary)]'
                        : 'hover:bg-[var(--m-surface-2)] border border-transparent text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)]'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        isActive ? 'text-[var(--m-accent)]' : 'text-[var(--m-text-muted)]'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold leading-tight flex items-center justify-between gap-1">
                        <span>{item.title}</span>
                        {isActive && <ChevronRight className="w-3 h-3 text-[var(--m-accent)] shrink-0" />}
                      </div>
                      <div className="text-[11px] text-[var(--m-text-muted)] truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </DataPanel>

          <DataPanel variant="inset" className="text-xs">
            <div className="text-[var(--m-accent)] font-semibold flex items-center gap-1.5 mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Canonical Source
            </div>
            <p className="text-[var(--m-text-muted)] leading-relaxed text-[11px]">
              All content is synchronized with the six primary markdown files in{' '}
              <code className="bg-[var(--m-surface-1)] px-1 py-0.5 rounded text-[var(--m-text-primary)] border border-[var(--m-border)]">
                docs/
              </code>
              . Strict zero-fabrication policy is enforced across every module.
            </p>
          </DataPanel>
        </aside>

        <main className="lg:col-span-9">
          <DataPanel variant="surface-1" className="p-5 sm:p-6">
            {activeDoc === 'prd' && <PrdSection />}
            {activeDoc === 'architecture' && <ArchitectureSection />}
            {activeDoc === 'rules' && <RulesSection />}
            {activeDoc === 'design' && <DesignSection />}
            {activeDoc === 'tasks' && <TasksSection />}
            {activeDoc === 'memory' && <MemorySection />}
          </DataPanel>
        </main>
      </div>
    </div>
  );
};

const PrdSection: React.FC = () => (
  <article className="space-y-6">
    <SectionHeading
      title="Product Requirements Document (PRD)"
      subtitle="High-precision meteorological observation, Doppler radar nowcasting, and environmental intelligence for India."
      badge={<span className="text-[10px] font-mono text-[var(--m-accent)]">docs/PRD.md</span>}
    />

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[var(--m-text-primary)]">1. Purpose &amp; Problem Statement</h3>
      <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">
        India spans 3.287 million km² with extreme geographical diversity—from Himalayan glaciers to tropical peninsulas. Weather events directly dictate public safety and agricultural output for 1.4 billion people.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        <div className="p-3.5 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)]">
          <div className="text-xs font-bold text-[var(--m-danger)] mb-1.5 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Existing Industry Failures
          </div>
          <ul className="list-disc list-inside text-[11px] text-[var(--m-text-secondary)] space-y-1">
            <li>Fragmented data scattered across uncoordinated portals.</li>
            <li>Synthetic numbers displayed when sensors experience downtime.</li>
            <li>Commercial weather paywalls restricting public access.</li>
            <li>Lack of actionable agrometeorological guidance for farmers.</li>
          </ul>
        </div>

        <div className="p-3.5 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)]">
          <div className="text-xs font-bold text-[var(--m-ok)] mb-1.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            The MAUSAM Solution
          </div>
          <ul className="list-disc list-inside text-[11px] text-[var(--m-text-secondary)] space-y-1">
            <li>Coordinates-first precision for every point across India.</li>
            <li>Strict zero-fabrication mandate with transparent attribution.</li>
            <li>Open-access baseline (Open-Meteo, ECMWF, GFS, ICON).</li>
            <li>Integration with official IMD, NDMA SACHET, and CPCB protocols.</li>
          </ul>
        </div>
      </div>
    </section>

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[var(--m-text-primary)]">2. Target User Personas</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border border-[var(--m-border)] rounded-lg">
          <thead className="bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] font-mono text-[11px]">
            <tr>
              <th className="p-2.5 border-b border-[var(--m-border)]">Persona</th>
              <th className="p-2.5 border-b border-[var(--m-border)]">Context &amp; Needs</th>
              <th className="p-2.5 border-b border-[var(--m-border)]">Key Features Used</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--m-border)] text-[11px]">
            <tr>
              <td className="p-2.5 font-bold text-[var(--m-text-primary)]">Urban Commuter</td>
              <td className="p-2.5 text-[var(--m-text-secondary)]">Daily transit, precipitation timing, NAQI air quality.</td>
              <td className="p-2.5 font-mono text-[var(--m-accent)]">Hourly Forecast, AQI, Ask MAUSAM</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold text-[var(--m-text-primary)]">Agricultural Producer</td>
              <td className="p-2.5 text-[var(--m-text-secondary)]">Soil moisture, spray windows, monsoon arrival, heat stress.</td>
              <td className="p-2.5 font-mono text-[var(--m-accent)]">AGROMET Portal, Crop Advisories</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold text-[var(--m-text-primary)]">Coastal / Fisherfolk</td>
              <td className="p-2.5 text-[var(--m-text-secondary)]">Wave heights, swell, cyclonic storm tracks, port signals.</td>
              <td className="p-2.5 font-mono text-[var(--m-accent)]">Marine Intel, Cyclone Radar, Port Warnings</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold text-[var(--m-text-primary)]">Disaster Manager (SDMA)</td>
              <td className="p-2.5 text-[var(--m-text-secondary)]">Severe weather bulletins, flash floods, radar nowcasting.</td>
              <td className="p-2.5 font-mono text-[var(--m-accent)]">SACHET Alerts, DWR Radar, Audio Chime</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[var(--m-text-primary)]">3. Core Functional Capabilities</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { title: 'Surface Observations', desc: 'Temperature, humidity, pressure, dew point, wind vectors, and UV index.' },
          { title: '7-Day Synoptic Forecast', desc: 'Ensemble consensus across ECMWF IFS, GFS, ICON, and IMD models.' },
          { title: 'SACHET Disaster Warnings', desc: 'NDMA CAP protocol with official 4-tier warning color coding.' },
          { title: 'Doppler Radar Network', desc: 'Interactive reflectivity nowcasting across 37 IMD radar stations.' },
          { title: 'National AQI (CPCB)', desc: '6-tier breakpoint air quality index tracking PM2.5, PM10, NO2, and ozone.' },
          { title: 'Agrometeorology Engine', desc: 'Evapotranspiration, soil moisture index, and crop spraying windows.' },
        ].map((feat, idx) => (
          <div key={idx} className="p-3 bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg">
            <h4 className="text-xs font-bold text-[var(--m-accent)] mb-1">{feat.title}</h4>
            <p className="text-[11px] text-[var(--m-text-muted)] leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </div>
    </section>
  </article>
);

const ArchitectureSection: React.FC = () => (
  <article className="space-y-6">
    <SectionHeading
      title="System Architecture & Data Pipeline"
      subtitle="Hybrid full-stack architecture running on Node.js (Express + Vite) and Vercel serverless edge functions."
      badge={<span className="text-[10px] font-mono text-[var(--m-accent)]">docs/ARCHITECTURE.md</span>}
    />

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[var(--m-text-primary)]">1. Architectural Topology</h3>
      <div
        data-theme="dark-workspace"
        className="bg-[var(--m-canvas)] p-3.5 rounded-lg border border-[var(--m-border)] font-mono text-[11px] text-[var(--m-accent)] overflow-x-auto whitespace-pre"
      >
{`┌─────────────────────────────────────────────────────────────┐
│                    MAUSAM React 19 Client                   │
│   (Vite 6 · Tailwind v4 · Three.js · Leaflet · Store)       │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON / HTTP (/api/*)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            HYBRID ROUTING & SERVERLESS GATEWAYS             │
│   [ Express 4.21 on Port 3000 ]   [ Vercel Edge Functions ] │
│   • server.ts                     • /api/weather.ts         │
│   • /api/warnings (NDMA / IMD)    • /api/warnings.ts        │
│   • /api/imd/* (Direct Proxy)     • /api/radar.ts           │
│   • /api/ask-mausam (Assistant)   • /api/system.ts          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      RESILIENCE LAYER        │ │   UPSTREAM DATA SOURCES    │
│ • In-Memory LRU Cache        │ │ • IMD (api.imd.gov.in)     │
│ • Request Deduplication      │ │ • NDMA SACHET CAP Alerts   │
│ • Upstash Redis REST Support │ │ • Open-Meteo Global NWP    │
│ • Stale-While-Revalidate     │ │ • CPCB National AQI        │
│ • AbortController Timeouts   │ │ • RainViewer Radar Tiles   │
└──────────────────────────────┘ └────────────────────────────┘`}
      </div>
    </section>

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[var(--m-text-primary)]">2. External Data Sources &amp; Failover Matrix</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border border-[var(--m-border)] rounded-lg">
          <thead className="bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] font-mono text-[11px]">
            <tr>
              <th className="p-2.5 border-b border-[var(--m-border)]">Provider</th>
              <th className="p-2.5 border-b border-[var(--m-border)]">Protocol / Feed</th>
              <th className="p-2.5 border-b border-[var(--m-border)]">Auth Mechanism</th>
              <th className="p-2.5 border-b border-[var(--m-border)]">Role &amp; Fallback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--m-border)] text-[11px]">
            <tr>
              <td className="p-2.5 font-bold text-[var(--m-text-primary)]">India Met Department (IMD)</td>
              <td className="p-2.5 font-mono text-[var(--m-accent)]">Public CAP RSS / RSMC</td>
              <td className="p-2.5 font-mono text-[var(--m-text-muted)]">Optional Direct Feed (Disabled)</td>
              <td className="p-2.5 text-[var(--m-text-secondary)]">Public CAP advisories active; Open-Meteo powers keyless baseline telemetry.</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold text-[var(--m-text-primary)]">NDMA SACHET</td>
              <td className="p-2.5 font-mono text-[var(--m-accent)]">CAP v1.2 XML / JSON</td>
              <td className="p-2.5 text-[var(--m-ok)]">Public Protocol</td>
              <td className="p-2.5 text-[var(--m-text-secondary)]">Official Disaster Alerts (Floods, Storms).</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold text-[var(--m-text-primary)]">Open-Meteo</td>
              <td className="p-2.5 font-mono text-[var(--m-accent)]">/v1/forecast</td>
              <td className="p-2.5 text-[var(--m-ok)]">Open Access</td>
              <td className="p-2.5 text-[var(--m-text-secondary)]">High-Resolution Numerical Forecast Baseline.</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold text-[var(--m-text-primary)]">CPCB Central Registry</td>
              <td className="p-2.5 font-mono text-[var(--m-accent)]">CAAQMS Stations</td>
              <td className="p-2.5 text-[var(--m-ok)]">Public Open Data</td>
              <td className="p-2.5 text-[var(--m-text-secondary)]">Official Ground NAQI Station Telemetry.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[var(--m-text-primary)]">3. Production Build &amp; Deployment Pipeline</h3>
      <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">
        Container cold-start latency and Node.js runtime ES Module compatibility are managed through an automated <code className="text-[var(--m-accent)] font-mono">esbuild</code> bundle pipeline:
      </p>
      <div
        data-theme="dark-workspace"
        className="bg-[var(--m-canvas)] p-3.5 rounded-lg border border-[var(--m-border)] font-mono text-xs text-[var(--m-text-primary)]"
      >
        <span className="text-[var(--m-text-muted)] select-none">$ </span>
        <span className="text-[var(--m-ok)]">npm run build</span>
        <div className="text-[11px] text-[var(--m-text-muted)] mt-1 break-all whitespace-pre-wrap">
          &gt; vite build &amp;&amp; esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs
        </div>
      </div>
    </section>
  </article>
);

const RulesSection: React.FC = () => (
  <article className="space-y-6">
    <SectionHeading
      title="Engineering Standards & Anti-Fabrication Rules"
      subtitle="Strict operational standards enforced across all engineering and data ingestion modules."
      badge={<span className="text-[10px] font-mono text-[var(--m-accent)]">docs/RULES.md</span>}
    />

    <section className="space-y-3">
      <div className="p-4 rounded-xl bg-[var(--m-danger-soft)] border border-[var(--m-danger)]/35 text-[var(--m-text-secondary)]">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--m-danger)] mb-1">
          <AlertTriangle className="w-4 h-4 text-[var(--m-danger)]" />
          Rule 1: Non-Negotiable Zero-Fabrication Mandate
        </div>
        <p className="text-xs leading-relaxed">
          Never output synthetic, fake, or mocked numbers under the guise of real meteorological telemetry. If an upstream sensor fails or an API token is missing, the system <strong>MUST</strong> explicitly return <code className="bg-[var(--m-surface-1)] px-1 py-0.5 rounded text-[var(--m-text-primary)] font-mono">UNAVAILABLE</code> or <code className="bg-[var(--m-surface-1)] px-1 py-0.5 rounded text-[var(--m-text-primary)] font-mono">NOT CONFIGURED</code>. Never substitute ambient temperature for missing apparent temperature or coerce zero readings to blank.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="p-3.5 bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg">
          <h3 className="text-xs font-bold text-[var(--m-accent)] mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Zero-Secret Keyless Runtime
          </h3>
          <p className="text-[11px] text-[var(--m-text-secondary)] leading-relaxed">
            Core MAUSAM telemetry operates completely keyless on public meteorological feeds, in-memory caching, and local grounded assistant responses. Never place credentials in client-side <code className="text-[var(--m-text-primary)] font-mono">VITE_</code> variables.
          </p>
        </div>

        <div className="p-3.5 bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg">
          <h3 className="text-xs font-bold text-[var(--m-accent)] mb-1 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Defensive Network AbortControllers
          </h3>
          <p className="text-[11px] text-[var(--m-text-secondary)] leading-relaxed">
            All outbound network requests use explicit <code className="text-[var(--m-text-primary)] font-mono">AbortController</code> timeouts and request-sequence guards to prevent stale race overwrites.
          </p>
        </div>

        <div className="p-3.5 bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg">
          <h3 className="text-xs font-bold text-[var(--m-accent)] mb-1 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" />
            Semantic Editorial Token Discipline
          </h3>
          <p className="text-[11px] text-[var(--m-text-secondary)] leading-relaxed">
            Default Warm Paper surfaces (<code className="text-[var(--m-text-primary)] font-mono">#F7F6F1</code>, <code className="text-[var(--m-text-primary)] font-mono">#FFFEFA</code>) and Deep Ink text (<code className="text-[var(--m-text-primary)] font-mono">#14212B</code>) across editorial pages, with scoped <code className="text-[var(--m-text-primary)] font-mono">[data-theme=&quot;dark-workspace&quot;]</code> for spatial map and radar stages.
          </p>
        </div>

        <div className="p-3.5 bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg">
          <h3 className="text-xs font-bold text-[var(--m-accent)] mb-1 flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5" />
            Public Governance &amp; Compliance
          </h3>
          <p className="text-[11px] text-[var(--m-text-secondary)] leading-relaxed">
            Preserves Terms of Observation, Privacy Policy, Storage Consent, OpenAPI specifications, and 404 boundaries.
          </p>
        </div>
      </div>
    </section>
  </article>
);

const DesignSection: React.FC = () => (
  <article className="space-y-6">
    <SectionHeading
      title="Design System & Visual Specification"
      subtitle="MAUSAM Editorial Atmospheric Intelligence v3.0.0 — Warm paper canvas, deep ink typography, calibrated hairlines, and scoped dark spatial stages."
      badge={<span className="text-[10px] font-mono text-[var(--m-accent)]">docs/DESIGN.md</span>}
    />

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[var(--m-text-primary)]">1. Core Color Swatches</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { name: 'Warm Paper Canvas', hex: '#F7F6F1', role: 'Primary editorial background' },
          { name: 'Elevated Paper Card', hex: '#FFFEFA', role: 'Calibrated surface-1 cards' },
          { name: 'Deep Ink Text', hex: '#14212B', role: 'Primary typography & rules' },
          { name: 'Atmospheric Blue', hex: '#1E6091', role: 'Active focus & interactive accents' },
        ].map((color, idx) => (
          <div key={idx} className="p-2.5 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)]">
            <div
              className="w-full h-8 rounded mb-2 border border-[var(--m-border)]"
              style={{ backgroundColor: color.hex }}
            />
            <div className="text-xs font-bold text-[var(--m-text-primary)]">{color.name}</div>
            <div className="text-[11px] font-mono text-[var(--m-accent)]">{color.hex}</div>
            <div className="text-[10px] text-[var(--m-text-muted)] mt-0.5">{color.role}</div>
          </div>
        ))}
      </div>
    </section>

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[var(--m-text-primary)]">2. National Warning Severity Matrix</h3>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          { level: 'Green (Normal)', hex: '#1F6F50', label: 'No warning. Normal atmospheric conditions prevailing.' },
          { level: 'Yellow (Watch)', hex: '#A46408', label: 'Be updated. Keep tracking atmospheric progression.' },
          { level: 'Orange (Alert)', hex: '#C2530A', label: 'Be prepared. Potential disruption to infrastructure.' },
          { level: 'Red (Warning)', hex: '#B92B27', label: 'Take action. Severe hazardous meteorological event.' },
        ].map((item, idx) => (
          <div
            key={idx}
            className="p-3 rounded-lg bg-[var(--m-surface-inset)] border"
            style={{ borderColor: `${item.hex}66` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.hex }} />
              <span className="text-xs font-bold" style={{ color: item.hex }}>
                {item.level}
              </span>
            </div>
            <p className="text-[11px] text-[var(--m-text-secondary)] leading-relaxed">{item.label}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[var(--m-text-primary)]">3. Typography Scale</h3>
      <p className="text-xs text-[var(--m-text-secondary)] leading-relaxed">
        DM Sans / Inter sans-serif for editorial prose paired with <code className="font-mono text-[var(--m-accent)]">tabular-nums</code> JetBrains Mono for numerical meteorological observations:
      </p>
      <div className="p-3.5 bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg space-y-2">
        <div className="flex items-baseline justify-between border-b border-[var(--m-border)] pb-1.5">
          <span className="text-lg font-bold text-[var(--m-text-primary)]">Bhubaneswar Observatory</span>
          <span className="text-[11px] font-mono text-[var(--m-text-muted)]">Station Title (18px / Bold)</span>
        </div>
        <div className="flex items-baseline justify-between border-b border-[var(--m-border)] pb-1.5">
          <span className="text-3xl font-extrabold text-[var(--m-accent)] font-mono tabular-nums">31.4°C</span>
          <span className="text-[11px] font-mono text-[var(--m-text-muted)]">Hero Telemetry (30px / Mono)</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-[var(--m-text-secondary)] font-mono tabular-nums">Wind: 14 km/h WSW · Pressure: 1008.2 hPa</span>
          <span className="text-[11px] font-mono text-[var(--m-text-muted)]">Scientific Parameters (12px)</span>
        </div>
      </div>
    </section>
  </article>
);

const TasksSection: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');

  const tasks = [
    { title: 'Coordinates-first geocoding engine', cat: 'Weather', done: true },
    { title: 'Open-Meteo multi-model ingestion baseline (ECMWF/GFS/ICON)', cat: 'Weather', done: true },
    { title: 'Official IMD REST API proxy connectors with in-flight deduplication', cat: 'Weather', done: true },
    { title: 'NDMA SACHET CAP XML/JSON warning parser', cat: 'Alerts', done: true },
    { title: 'Official emergency broadcast alert audio engine', cat: 'Alerts', done: true },
    { title: '37-station IMD Doppler Weather Radar directory & RainViewer tiles', cat: 'Radar', done: true },
    { title: 'CPCB National Air Quality Index (NAQI) 6-category engine', cat: 'AQI', done: true },
    { title: 'Agrometeorology (AGROMET) agronomic advisory engine', cat: 'Agromet', done: true },
    { title: '3D Spatial Atmosphere Globe with 2D Leaflet fallback', cat: 'UI/UX', done: true },
    { title: 'Full-stack Express + Vite hybrid deployment architecture', cat: 'Architecture', done: true },
    { title: 'Editorial Atmospheric Intelligence Design System v3.0.0 across all routes', cat: 'Design', done: true },
    { title: 'MetricValue 6-state truthful telemetry & provenance component', cat: 'Data Integrity', done: true },
    { title: 'Direct INSAT-3D/3DR satellite thermal cloud-top raster processing', cat: 'Satellite', done: false },
    { title: 'WebPush notifications for district-level red alerts', cat: 'Alerts', done: false },
    { title: 'Offline PWA service worker asset caching for critical warnings', cat: 'Offline', done: false },
  ];

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'completed') return t.done;
    if (filter === 'pending') return !t.done;
    return true;
  });

  const completedCount = tasks.filter((t) => t.done).length;

  return (
    <article className="space-y-6">
      <SectionHeading
        title="Implementation Checklist & Engineering Roadmap"
        subtitle="Verified implementation milestones and active roadmap tracking."
        badge={<span className="text-[10px] font-mono text-[var(--m-accent)]">docs/TASKS.md</span>}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg">
        <div className="text-xs">
          <span className="text-[var(--m-text-secondary)]">Completion Status: </span>
          <span className="font-mono tabular-nums font-bold text-[var(--m-ok)]">
            {completedCount} / {tasks.length} Completed ({Math.round((completedCount / tasks.length) * 100)}%)
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'completed', 'pending'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilter(mode)}
              className={`text-xs px-3 min-h-[36px] sm:min-h-[32px] rounded-lg capitalize transition-colors cursor-pointer ${
                filter === mode
                  ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)] font-semibold'
                  : 'text-[var(--m-text-secondary)] hover:bg-[var(--m-surface-2)]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filteredTasks.map((task, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between gap-3 p-3 rounded-lg border text-xs ${
              task.done
                ? 'bg-[var(--m-surface-inset)] border-[var(--m-border)] text-[var(--m-text-secondary)]'
                : 'bg-[var(--m-watch-soft)] border-[var(--m-watch)]/35 text-[var(--m-watch)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-4 h-4 rounded flex items-center justify-center text-[10px] shrink-0 ${
                  task.done
                    ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border border-[var(--m-ok)]/40'
                    : 'border border-[var(--m-text-muted)]'
                }`}
              >
                {task.done ? '✓' : ''}
              </span>
              <span className={task.done ? 'text-[var(--m-text-primary)]' : 'text-[var(--m-text-secondary)]'}>{task.title}</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--m-surface-1)] text-[var(--m-text-muted)] border border-[var(--m-border)] shrink-0">
              {task.cat}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
};

const MemorySection: React.FC = () => (
  <article className="space-y-6">
    <SectionHeading
      title="Architectural Memory & Context"
      subtitle="Persistent knowledge base, Architectural Decision Records (ADRs), and operational invariants."
      badge={<span className="text-[10px] font-mono text-[var(--m-accent)]">docs/MEMORY.md</span>}
    />

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[var(--m-text-primary)]">1. Key Architectural Decisions (ADRs)</h3>
      <div className="space-y-3">
        {[
          {
            adr: 'ADR-001: Hybrid Runtime',
            desc: 'Supports dual-mode execution: full-stack Express in local/Cloud Run containers and serverless functions in Vercel.',
          },
          {
            adr: 'ADR-002: Free-First Ingestion Hierarchy',
            desc: 'Defaults to Open-Meteo high-resolution models when governmental IMD tokens are unconfigured, maintaining zero-key public access.',
          },
          {
            adr: 'ADR-003: Emergency Alert Audio Standard',
            desc: 'Employs meteorological broadcast frequency dual tone (853Hz + 960Hz) with deduplication hashing.',
          },
          {
            adr: 'ADR-004: Independent Provider Store',
            desc: 'Isolates SACHET, IMD, RADAR, AQI, WEATHER, and NWP provider fetch lifecycles, status, errors, and timestamps independently.',
          },
        ].map((item, idx) => (
          <div key={idx} className="p-3.5 bg-[var(--m-surface-inset)] border border-[var(--m-border)] rounded-lg">
            <h4 className="text-xs font-bold text-[var(--m-accent)] mb-0.5">{item.adr}</h4>
            <p className="text-[11px] text-[var(--m-text-secondary)] leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[var(--m-text-primary)]">2. Non-Negotiable Directives</h3>
      <ul className="list-disc list-inside text-xs text-[var(--m-text-secondary)] space-y-1.5 p-3.5 rounded-lg bg-[var(--m-surface-inset)] border border-[var(--m-border)]">
        <li>
          <strong className="text-[var(--m-text-primary)]">Preserve Governance Routes:</strong> Maintain Terms of Observation, Privacy Policy, Storage Consent, and OpenAPI specifications.
        </li>
        <li>
          <strong className="text-[var(--m-text-primary)]">Zero Fake Data:</strong> Never fabricate weather values or simulate warnings under the guise of real sensors.
        </li>
        <li>
          <strong className="text-[var(--m-text-primary)]">Zero Client Keys:</strong> Keep all API keys strictly on the server backend.
        </li>
      </ul>
    </section>
  </article>
);
