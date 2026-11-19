import React, { useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { ArrowLeft, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { DataPanel, PageHeader, SectionHeading } from '../components/ui/ObservatoryPrimitives';

interface TermsOfObservationProps {
  onNavigateHome?: () => void;
}

export const TermsOfObservation: React.FC<TermsOfObservationProps> = ({ onNavigateHome }) => {
  const { t } = useLanguage();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof window !== 'undefined' && (window as any).MausamSEO?.updateMeta) {
      (window as any).MausamSEO.updateMeta('/terms');
    }
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full max-w-[920px] mx-auto py-4 px-3 sm:px-4 text-[var(--m-text-secondary)] space-y-6">
      <PageHeader
        eyebrow="Official Terms & Meteorological Disclaimers"
        title="Terms & Conditions of Observation & Service"
        description="Please review these terms carefully before accessing or relying upon telemetry from the MAUSAM National Atmospheric Intelligence & Agromet Advisory Platform."
        status="REFERENCE"
        statusLabel="MAUSAM-TERMS-V1.4"
        updatedAt="October 2026"
        actions={
          <button
            type="button"
            id="terms-back-btn"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 text-xs font-semibold min-h-[44px] sm:min-h-[36px] px-3.5 rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] text-[var(--m-text-primary)] border border-[var(--m-border)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--m-accent)]" aria-hidden="true" />
            <span>{t('returnToPortal', 'Return to Weather Portal')}</span>
          </button>
        }
      />

      {/* Table of Contents */}
      <DataPanel variant="surface-1">
        <SectionHeading
          title="Table of Contents"
          icon={<FileText className="w-4 h-4" />}
          className="mb-3"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
          {[
            { id: 'sec-1', title: '1. Acceptance of Terms' },
            { id: 'sec-2', title: '2. Description of MAUSAM Platform' },
            { id: 'sec-3', title: '3. Weather & Forecast Disclaimer' },
            { id: 'sec-4', title: '4. Official Warning & Feed Limitations' },
            { id: 'sec-5', title: '5. Emergency & Life-Safety Disclaimer' },
            { id: 'sec-6', title: '6. Third-Party Services & Radar Feeds' },
            { id: 'sec-7', title: '7. User Responsibilities & Acceptable Use' },
            { id: 'sec-8', title: '8. Intellectual Property & Open Data' },
            { id: 'sec-9', title: '9. Availability & Service Interruptions' },
            { id: 'sec-10', title: '10. Limitation of Liability' },
            { id: 'sec-11', title: '11. Changes to Terms' },
            { id: 'sec-12', title: '12. Contact Information' },
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

      {/* Main Legal Clauses */}
      <DataPanel variant="surface-1" className="p-5 sm:p-8">
        <div className="max-w-[66ch] space-y-8 leading-relaxed text-[15px]">
          <section id="sec-1" className="scroll-mt-6">
            <h2 className="text-base font-bold text-[var(--m-text-primary)] mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--m-ok)]" aria-hidden="true" />
              <span>1. Acceptance of Terms</span>
            </h2>
            <p className="text-[var(--m-text-secondary)]">
              By accessing, browsing, or utilizing the MAUSAM platform (&ldquo;MAUSAM&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), you confirm that you have read, understood, and agreed to be bound by these Terms and Conditions and our Privacy Policy.
            </p>
          </section>

          <section id="sec-2" className="pt-6 border-t border-[var(--m-border)] scroll-mt-6">
            <h2 className="text-base font-bold text-[var(--m-text-primary)] mb-2">
              2. Description of MAUSAM Platform
            </h2>
            <p className="text-[var(--m-text-secondary)]">
              MAUSAM is a public atmospheric intelligence, meteorological visualization, and agrometeorological advisory system engineered for observation across India, aggregating public feeds from IMD, NDMA SACHET, CPCB, and open earth-observation sensors.
            </p>
          </section>

          <section id="sec-3" className="pt-6 border-t border-[var(--m-border)] scroll-mt-6">
            <h2 className="text-base font-bold text-[var(--m-text-primary)] mb-2">
              3. Weather and Forecast Information Disclaimer
            </h2>
            <p className="text-[var(--m-text-secondary)]">
              Atmospheric conditions are dynamic. All forecasts, radar interpretations, air quality values, and precipitation projections are provided on an <strong className="text-[var(--m-text-primary)]">&ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo;</strong> basis without warranties of any kind.
            </p>
          </section>

          <section id="sec-4" className="pt-6 border-t border-[var(--m-border)] scroll-mt-6">
            <h2 className="text-base font-bold text-[var(--m-text-primary)] mb-2">
              4. Official Warning &amp; Data-Source Limitations
            </h2>
            <p className="text-[var(--m-text-secondary)]">
              Disaster advisories and CAP alerts originate from NDMA SACHET feeds and IMD warnings. Delivery may experience latency due to telecommunication interruptions or upstream feed outages. MAUSAM does not generate independent governmental emergency declarations.
            </p>
          </section>

          <section id="sec-5" className="pt-6 border-t border-[var(--m-border)] scroll-mt-6">
            <div className="bg-[var(--m-watch-soft)] border border-[var(--m-watch)]/40 rounded-xl p-4 sm:p-5">
              <h2 className="text-base font-bold text-[var(--m-watch)] mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[var(--m-watch)]" aria-hidden="true" />
                <span>5. Emergency &amp; Life-Safety Disclaimer</span>
              </h2>
              <p className="text-[var(--m-text-primary)] font-semibold text-sm">
                WEATHER INFORMATION FROM MAUSAM MUST NOT BE TREATED AS THE SOLE BASIS FOR EMERGENCY, EVACUATION, LIFE-SAFETY, MARITIME NAVIGATION, OR AVIATION DECISIONS.
              </p>
              <p className="text-[var(--m-text-secondary)] text-xs mt-2 leading-relaxed">
                During cyclones, storm surges, cloudbursts, severe flash flooding, or extreme heat events, citizens must follow official directives issued by NDMA, SDMAs, District Collectors, and civil defense authorities.
              </p>
            </div>
          </section>

          <section id="sec-6" className="pt-6 border-t border-[var(--m-border)] scroll-mt-6">
            <h2 className="text-base font-bold text-[var(--m-text-primary)] mb-2">
              6. Third-Party Services &amp; Radar Feeds
            </h2>
            <p className="text-[var(--m-text-secondary)]">
              The platform incorporates mapping tiles, radar mosaics, and air quality telemetry operated under their respective upstream terms of service and availability policies.
            </p>
          </section>

          <section id="sec-7" className="pt-6 border-t border-[var(--m-border)] scroll-mt-6">
            <h2 className="text-base font-bold text-[var(--m-text-primary)] mb-2">
              7. User Responsibilities &amp; Acceptable Use
            </h2>
            <ul className="list-disc list-inside space-y-1.5 mt-2 pl-2 text-[var(--m-text-secondary)]">
              <li>Do not engage in denial-of-service attacks or automated scraping exceeding rate limits.</li>
              <li>Do not attempt to bypass security headers or inject malicious payloads.</li>
              <li>Do not misrepresent MAUSAM outputs as official evacuation orders.</li>
            </ul>
          </section>

          <section id="sec-8" className="pt-6 border-t border-[var(--m-border)] scroll-mt-6">
            <h2 className="text-base font-bold text-[var(--m-text-primary)] mb-2">
              8. Intellectual Property &amp; Open Data
            </h2>
            <p className="text-[var(--m-text-secondary)]">
              Meteorological observation data from government entities is subject to the National Data Sharing and Accessibility Policy (NDSAP). Non-commercial civic re-use with proper attribution is welcomed.
            </p>
          </section>

          <section id="sec-9" className="pt-6 border-t border-[var(--m-border)] scroll-mt-6">
            <h2 className="text-base font-bold text-[var(--m-text-primary)] mb-2">
              9. Availability and Service Interruptions
            </h2>
            <p className="text-[var(--m-text-secondary)]">
              Scheduled maintenance or upstream sensor outages may temporarily disrupt access to live feeds. When an upstream feed is unreachable, affected panels display explicit <code className="font-mono text-xs text-[var(--m-danger)]">UNAVAILABLE</code> status.
            </p>
          </section>

          <section id="sec-10" className="pt-6 border-t border-[var(--m-border)] scroll-mt-6">
            <h2 className="text-base font-bold text-[var(--m-text-primary)] mb-2">10. Limitation of Liability</h2>
            <p className="text-[var(--m-text-secondary)]">
              To the maximum extent permitted by law, MAUSAM contributors shall not be liable for direct, indirect, incidental, consequential, or special damages resulting from use or inability to use this platform.
            </p>
          </section>

          <section id="sec-11" className="pt-6 border-t border-[var(--m-border)] scroll-mt-6">
            <h2 className="text-base font-bold text-[var(--m-text-primary)] mb-2">11. Changes to These Terms</h2>
            <p className="text-[var(--m-text-secondary)]">
              Revisions to these Terms &amp; Conditions are posted on this page with an updated timestamp.
            </p>
          </section>

          <section id="sec-12" className="pt-6 border-t border-[var(--m-border)] scroll-mt-6">
            <h2 className="text-base font-bold text-[var(--m-text-primary)] mb-2">12. Contact Information</h2>
            <div className="mt-3 p-4 rounded-xl bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-xs font-mono text-[var(--m-text-secondary)] space-y-1">
              <div className="text-[var(--m-text-primary)] font-semibold">MAUSAM Meteorological Technical Platform Group</div>
              <div>Smart India Hackathon 2026 Initiative</div>
              <div>
                Web Portal:{' '}
                <a href="https://mausamgovt.vercel.app" className="text-[var(--m-accent)] underline">
                  https://mausamgovt.vercel.app
                </a>
              </div>
              <div>Email: telemetry@mausam.gov.in (Prototype Technical Inquiries)</div>
            </div>
          </section>
        </div>
      </DataPanel>
    </div>
  );
};
