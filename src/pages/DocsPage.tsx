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
    <div className="w-full max-w-7xl mx-auto py-4 px-3 sm:px-4 text-[#B5C3D1] space-y-5">
      <PageHeader
        eyebrow="MAUSAM Engineering Registry"
        title="Platform Documentation"
        description="Canonical product specifications, architectural topology, zero-fabrication engineering rules, and design standards."
        status="REFERENCE"
        statusLabel="Observatory v3.0.0"
        source={activeItem.filePath}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMarkdownNotice}
              className="inline-flex items-center gap-1.5 px-3 min-h-[44px] sm:min-h-[36px] rounded-lg bg-[#08131F] hover:bg-[#101F2E] border border-[#26394B] text-xs text-[#B5C3D1] hover:text-[#F3F6FA] transition-colors cursor-pointer"
              title="Copy path of canonical documentation file"
            >
              {copiedDoc ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#22C7A0]" />
                  <span className="text-[#22C7A0] text-xs">Copied Path</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#35C7E8]" />
                  <span className="text-xs font-mono">{activeItem.filePath}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-2 text-xs font-semibold min-h-[44px] sm:min-h-[36px] px-3.5 rounded-lg bg-[#101F2E] hover:bg-[#172A3D] border border-[#26394B] text-[#F3F6FA] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#35C7E8]" />
              <span>{t('returnToPortal', 'Return to Weather Portal')}</span>
            </button>
          </div>
        }
      />

      {/* Main Grid: Sidebar + Document Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <aside className="lg:col-span-3 flex flex-col gap-3">
          <DataPanel variant="surface-1" className="p-3 sm:p-4">
            <h2 className="text-[11px] font-mono uppercase text-[#8295A8] tracking-wider mb-2 px-1">
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
                        ? 'bg-[#35C7E8]/12 border border-[#35C7E8]/45 text-[#F3F6FA]'
                        : 'hover:bg-[#101F2E] border border-transparent text-[#B5C3D1] hover:text-[#F3F6FA]'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        isActive ? 'text-[#35C7E8]' : 'text-[#8295A8]'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold leading-tight flex items-center justify-between gap-1">
                        <span>{item.title}</span>
                        {isActive && <ChevronRight className="w-3 h-3 text-[#35C7E8] shrink-0" />}
                      </div>
                      <div className="text-[11px] text-[#8295A8] truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </DataPanel>

          <DataPanel variant="inset" className="text-xs">
            <div className="text-[#35C7E8] font-semibold flex items-center gap-1.5 mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Canonical Source
            </div>
            <p className="text-[#8295A8] leading-relaxed text-[11px]">
              All content is synchronized with the six primary markdown files in{' '}
              <code className="bg-[#0B1927] px-1 py-0.5 rounded text-[#B5C3D1] border border-[#26394B]">
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
      badge={<span className="text-[10px] font-mono text-[#35C7E8]">docs/PRD.md</span>}
    />

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[#F3F6FA]">1. Purpose &amp; Problem Statement</h3>
      <p className="text-xs text-[#B5C3D1] leading-relaxed">
        India spans 3.287 million km² with extreme geographical diversity—from Himalayan glaciers to tropical peninsulas. Weather events directly dictate public safety and agricultural output for 1.4 billion people.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        <div className="p-3.5 rounded-lg bg-[#08131F] border border-[#26394B]">
          <div className="text-xs font-bold text-[#EF4444] mb-1.5 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Existing Industry Failures
          </div>
          <ul className="list-disc list-inside text-[11px] text-[#B5C3D1] space-y-1">
            <li>Fragmented data scattered across uncoordinated portals.</li>
            <li>Synthetic numbers displayed when sensors experience downtime.</li>
            <li>Commercial weather paywalls restricting public access.</li>
            <li>Lack of actionable agrometeorological guidance for farmers.</li>
          </ul>
        </div>

        <div className="p-3.5 rounded-lg bg-[#08131F] border border-[#26394B]">
          <div className="text-xs font-bold text-[#22C7A0] mb-1.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            The MAUSAM Solution
          </div>
          <ul className="list-disc list-inside text-[11px] text-[#B5C3D1] space-y-1">
            <li>Coordinates-first precision for every point across India.</li>
            <li>Strict zero-fabrication mandate with transparent attribution.</li>
            <li>Open-access baseline (Open-Meteo, ECMWF, GFS, ICON).</li>
            <li>Integration with official IMD, NDMA SACHET, and CPCB protocols.</li>
          </ul>
        </div>
      </div>
    </section>

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[#F3F6FA]">2. Target User Personas</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border border-[#26394B] rounded-lg">
          <thead className="bg-[#08131F] text-[#8295A8] font-mono text-[11px]">
            <tr>
              <th className="p-2.5 border-b border-[#26394B]">Persona</th>
              <th className="p-2.5 border-b border-[#26394B]">Context &amp; Needs</th>
              <th className="p-2.5 border-b border-[#26394B]">Key Features Used</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#26394B] text-[11px]">
            <tr>
              <td className="p-2.5 font-bold text-[#F3F6FA]">Urban Commuter</td>
              <td className="p-2.5 text-[#B5C3D1]">Daily transit, precipitation timing, NAQI air quality.</td>
              <td className="p-2.5 font-mono text-[#35C7E8]">Hourly Forecast, AQI, Ask MAUSAM</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold text-[#F3F6FA]">Agricultural Producer</td>
              <td className="p-2.5 text-[#B5C3D1]">Soil moisture, spray windows, monsoon arrival, heat stress.</td>
              <td className="p-2.5 font-mono text-[#35C7E8]">AGROMET Portal, Crop Advisories</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold text-[#F3F6FA]">Coastal / Fisherfolk</td>
              <td className="p-2.5 text-[#B5C3D1]">Wave heights, swell, cyclonic storm tracks, port signals.</td>
              <td className="p-2.5 font-mono text-[#35C7E8]">Marine Intel, Cyclone Radar, Port Warnings</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold text-[#F3F6FA]">Disaster Manager (SDMA)</td>
              <td className="p-2.5 text-[#B5C3D1]">Severe weather bulletins, flash floods, radar nowcasting.</td>
              <td className="p-2.5 font-mono text-[#35C7E8]">SACHET Alerts, DWR Radar, Audio Chime</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[#F3F6FA]">3. Core Functional Capabilities</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { title: 'Surface Observations', desc: 'Temperature, humidity, pressure, dew point, wind vectors, and UV index.' },
          { title: '7-Day Synoptic Forecast', desc: 'Ensemble consensus across ECMWF IFS, GFS, ICON, and IMD models.' },
          { title: 'SACHET Disaster Warnings', desc: 'NDMA CAP protocol with official 4-tier warning color coding.' },
          { title: 'Doppler Radar Network', desc: 'Interactive reflectivity nowcasting across 37 IMD radar stations.' },
          { title: 'National AQI (CPCB)', desc: '6-tier breakpoint air quality index tracking PM2.5, PM10, NO2, and ozone.' },
          { title: 'Agrometeorology Engine', desc: 'Evapotranspiration, soil moisture index, and crop spraying windows.' },
        ].map((feat, idx) => (
          <div key={idx} className="p-3 bg-[#08131F] border border-[#26394B] rounded-lg">
            <h4 className="text-xs font-bold text-[#35C7E8] mb-1">{feat.title}</h4>
            <p className="text-[11px] text-[#8295A8] leading-relaxed">{feat.desc}</p>
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
      badge={<span className="text-[10px] font-mono text-[#35C7E8]">docs/ARCHITECTURE.md</span>}
    />

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[#F3F6FA]">1. Architectural Topology</h3>
      <div className="bg-[#08131F] p-3.5 rounded-lg border border-[#26394B] font-mono text-[11px] text-[#35C7E8] overflow-x-auto whitespace-pre">
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
│   • /api/ask-mausam (Gemini AI)   • /api/system.ts          │
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
      <h3 className="text-sm font-bold text-[#F3F6FA]">2. External Data Sources &amp; Failover Matrix</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border border-[#26394B] rounded-lg">
          <thead className="bg-[#08131F] text-[#8295A8] font-mono text-[11px]">
            <tr>
              <th className="p-2.5 border-b border-[#26394B]">Provider</th>
              <th className="p-2.5 border-b border-[#26394B]">Protocol / Feed</th>
              <th className="p-2.5 border-b border-[#26394B]">Auth Mechanism</th>
              <th className="p-2.5 border-b border-[#26394B]">Role &amp; Fallback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#26394B] text-[11px]">
            <tr>
              <td className="p-2.5 font-bold text-[#F3F6FA]">India Met Department (IMD)</td>
              <td className="p-2.5 font-mono text-[#35C7E8]">/current_wx, /cityforecast</td>
              <td className="p-2.5 font-mono text-[#F59E0B]">IMD_API_KEY</td>
              <td className="p-2.5 text-[#B5C3D1]">Primary Source. Falls back to Open-Meteo.</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold text-[#F3F6FA]">NDMA SACHET</td>
              <td className="p-2.5 font-mono text-[#35C7E8]">CAP v1.2 XML / JSON</td>
              <td className="p-2.5 text-[#22C7A0]">Public Protocol</td>
              <td className="p-2.5 text-[#B5C3D1]">Official Disaster Alerts (Floods, Storms).</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold text-[#F3F6FA]">Open-Meteo</td>
              <td className="p-2.5 font-mono text-[#35C7E8]">/v1/forecast</td>
              <td className="p-2.5 text-[#22C7A0]">Open Access</td>
              <td className="p-2.5 text-[#B5C3D1]">High-Resolution Numerical Forecast Baseline.</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold text-[#F3F6FA]">CPCB Central Registry</td>
              <td className="p-2.5 font-mono text-[#35C7E8]">CAAQMS Stations</td>
              <td className="p-2.5 text-[#22C7A0]">Public Open Data</td>
              <td className="p-2.5 text-[#B5C3D1]">Official Ground NAQI Station Telemetry.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[#F3F6FA]">3. Production Build &amp; Deployment Pipeline</h3>
      <p className="text-xs text-[#B5C3D1] leading-relaxed">
        Container cold-start latency and Node.js runtime ES Module compatibility are managed through an automated <code className="text-[#35C7E8] font-mono">esbuild</code> bundle pipeline:
      </p>
      <div className="bg-[#08131F] p-3.5 rounded-lg border border-[#26394B] font-mono text-xs text-[#F3F6FA]">
        <span className="text-[#8295A8] select-none">$ </span>
        <span className="text-[#22C7A0]">npm run build</span>
        <div className="text-[11px] text-[#8295A8] mt-1 break-all whitespace-pre-wrap">
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
      badge={<span className="text-[10px] font-mono text-[#35C7E8]">docs/RULES.md</span>}
    />

    <section className="space-y-3">
      <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/40 text-[#B5C3D1]">
        <div className="flex items-center gap-2 text-sm font-bold text-[#FCA5A5] mb-1">
          <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
          Rule 1: Non-Negotiable Zero-Fabrication Mandate
        </div>
        <p className="text-xs leading-relaxed">
          Never output synthetic, fake, or mocked numbers under the guise of real meteorological telemetry. If an upstream sensor fails or an API token is missing, the system <strong>MUST</strong> explicitly return <code className="bg-[#08131F] px-1 py-0.5 rounded text-[#F3F6FA] font-mono">UNAVAILABLE</code> or <code className="bg-[#08131F] px-1 py-0.5 rounded text-[#F3F6FA] font-mono">NOT CONFIGURED</code>. Never claim a feature is <code className="text-[#22C7A0] font-mono">LIVE</code> unless backed by a live telemetry response.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="p-3.5 bg-[#08131F] border border-[#26394B] rounded-lg">
          <h3 className="text-xs font-bold text-[#35C7E8] mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Zero Client-Side Secrets
          </h3>
          <p className="text-[11px] text-[#B5C3D1] leading-relaxed">
            All private credentials (<code className="text-[#F3F6FA] font-mono">GEMINI_API_KEY</code>, <code className="text-[#F3F6FA] font-mono">IMD_API_KEY</code>, <code className="text-[#F3F6FA] font-mono">DATABASE_URL</code>) remain strictly on the backend. Never prefix secrets with <code className="text-[#F3F6FA] font-mono">VITE_</code>.
          </p>
        </div>

        <div className="p-3.5 bg-[#08131F] border border-[#26394B] rounded-lg">
          <h3 className="text-xs font-bold text-[#35C7E8] mb-1 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Defensive Network AbortControllers
          </h3>
          <p className="text-[11px] text-[#B5C3D1] leading-relaxed">
            All outbound network requests use explicit <code className="text-[#F3F6FA] font-mono">AbortController</code> timeouts and error boundaries to prevent process hangs.
          </p>
        </div>

        <div className="p-3.5 bg-[#08131F] border border-[#26394B] rounded-lg">
          <h3 className="text-xs font-bold text-[#35C7E8] mb-1 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" />
            Tailwind CSS &amp; Token Discipline
          </h3>
          <p className="text-[11px] text-[#B5C3D1] leading-relaxed">
            Unified Observatory v3.0.0 surfaces (<code className="text-[#F3F6FA] font-mono">#07111D</code>, <code className="text-[#F3F6FA] font-mono">#0B1927</code>, <code className="text-[#F3F6FA] font-mono">#26394B</code>) and Tailwind utility classes across all pages.
          </p>
        </div>

        <div className="p-3.5 bg-[#08131F] border border-[#26394B] rounded-lg">
          <h3 className="text-xs font-bold text-[#35C7E8] mb-1 flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5" />
            Public Governance &amp; Compliance
          </h3>
          <p className="text-[11px] text-[#B5C3D1] leading-relaxed">
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
      subtitle="MAUSAM Observatory Design System v3.0.0 — Obsidian canvas, calibrated hairline surfaces, and tabular monospace telemetry."
      badge={<span className="text-[10px] font-mono text-[#35C7E8]">docs/DESIGN.md</span>}
    />

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[#F3F6FA]">1. Core Color Swatches</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { name: 'Obsidian Canvas', hex: '#07111D', role: 'Primary background canvas' },
          { name: 'Surface Panel', hex: '#0B1927', role: 'Calibrated .m-panel cards' },
          { name: 'Hairline Border', hex: '#26394B', role: '1px structural dividers' },
          { name: 'Sky Cyan Accent', hex: '#35C7E8', role: 'Active focus & highlights' },
        ].map((color, idx) => (
          <div key={idx} className="p-2.5 rounded-lg bg-[#08131F] border border-[#26394B]">
            <div
              className="w-full h-8 rounded mb-2 border border-[#26394B]"
              style={{ backgroundColor: color.hex }}
            />
            <div className="text-xs font-bold text-[#F3F6FA]">{color.name}</div>
            <div className="text-[11px] font-mono text-[#35C7E8]">{color.hex}</div>
            <div className="text-[10px] text-[#8295A8] mt-0.5">{color.role}</div>
          </div>
        ))}
      </div>
    </section>

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[#F3F6FA]">2. National Warning Severity Matrix</h3>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          { level: 'Green (Normal)', hex: '#22C7A0', label: 'No warning. Normal atmospheric conditions prevailing.' },
          { level: 'Yellow (Watch)', hex: '#F59E0B', label: 'Be updated. Keep tracking atmospheric progression.' },
          { level: 'Orange (Alert)', hex: '#F97316', label: 'Be prepared. Potential disruption to infrastructure.' },
          { level: 'Red (Warning)', hex: '#EF4444', label: 'Take action. Severe hazardous meteorological event.' },
        ].map((item, idx) => (
          <div
            key={idx}
            className="p-3 rounded-lg bg-[#08131F] border"
            style={{ borderColor: `${item.hex}66` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.hex }} />
              <span className="text-xs font-bold" style={{ color: item.hex }}>
                {item.level}
              </span>
            </div>
            <p className="text-[11px] text-[#B5C3D1] leading-relaxed">{item.label}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[#F3F6FA]">3. Typography Scale</h3>
      <p className="text-xs text-[#B5C3D1] leading-relaxed">
        Inter sans-serif for UI labels paired with <code className="font-mono text-[#35C7E8]">tabular-nums</code> monospace for numerical meteorological observations:
      </p>
      <div className="p-3.5 bg-[#08131F] border border-[#26394B] rounded-lg space-y-2">
        <div className="flex items-baseline justify-between border-b border-[#26394B] pb-1.5">
          <span className="text-lg font-bold text-[#F3F6FA]">Bhubaneswar Observatory</span>
          <span className="text-[11px] font-mono text-[#8295A8]">Station Title (18px / Bold)</span>
        </div>
        <div className="flex items-baseline justify-between border-b border-[#26394B] pb-1.5">
          <span className="text-3xl font-extrabold text-[#35C7E8] font-mono tabular-nums">31.4°C</span>
          <span className="text-[11px] font-mono text-[#8295A8]">Hero Telemetry (30px / Mono)</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-[#B5C3D1] font-mono tabular-nums">Wind: 14 km/h WSW · Pressure: 1008.2 hPa</span>
          <span className="text-[11px] font-mono text-[#8295A8]">Scientific Parameters (12px)</span>
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
    { title: 'Observatory Design System v3.0.0 unification across all modules', cat: 'Design', done: true },
    { title: 'Repository canonical documentation system (docs/*.md)', cat: 'Documentation', done: true },
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
        badge={<span className="text-[10px] font-mono text-[#35C7E8]">docs/TASKS.md</span>}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-[#08131F] border border-[#26394B] rounded-lg">
        <div className="text-xs">
          <span className="text-[#B5C3D1]">Completion Status: </span>
          <span className="font-mono tabular-nums font-bold text-[#22C7A0]">
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
                  ? 'bg-[#0B72B9] text-[#F3F6FA] font-semibold'
                  : 'text-[#B5C3D1] hover:bg-[#101F2E]'
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
                ? 'bg-[#08131F] border-[#26394B] text-[#B5C3D1]'
                : 'bg-[#101F2E] border-[#F59E0B]/40 text-[#FCD34D]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-4 h-4 rounded flex items-center justify-center text-[10px] shrink-0 ${
                  task.done
                    ? 'bg-[#22C7A0]/20 text-[#22C7A0] border border-[#22C7A0]/40'
                    : 'border border-[#8295A8]'
                }`}
              >
                {task.done ? '✓' : ''}
              </span>
              <span className={task.done ? 'text-[#F3F6FA]' : 'text-[#B5C3D1]'}>{task.title}</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B1927] text-[#8295A8] border border-[#26394B] shrink-0">
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
      badge={<span className="text-[10px] font-mono text-[#35C7E8]">docs/MEMORY.md</span>}
    />

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[#F3F6FA]">1. Key Architectural Decisions (ADRs)</h3>
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
          <div key={idx} className="p-3.5 bg-[#08131F] border border-[#26394B] rounded-lg">
            <h4 className="text-xs font-bold text-[#35C7E8] mb-0.5">{item.adr}</h4>
            <p className="text-[11px] text-[#B5C3D1] leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[#F3F6FA]">2. Non-Negotiable Directives</h3>
      <ul className="list-disc list-inside text-xs text-[#B5C3D1] space-y-1.5 p-3.5 rounded-lg bg-[#08131F] border border-[#26394B]">
        <li>
          <strong className="text-[#F3F6FA]">Preserve Governance Routes:</strong> Maintain Terms of Observation, Privacy Policy, Storage Consent, and OpenAPI specifications.
        </li>
        <li>
          <strong className="text-[#F3F6FA]">Zero Fake Data:</strong> Never fabricate weather values or simulate warnings under the guise of real sensors.
        </li>
        <li>
          <strong className="text-[#F3F6FA]">Zero Client Keys:</strong> Keep all API keys strictly on the server backend.
        </li>
      </ul>
    </section>
  </article>
);
