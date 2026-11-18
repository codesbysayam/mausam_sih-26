import React, { useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Shield, ArrowLeft, Lock, FileText, CheckCircle2 } from 'lucide-react';
import { DataPanel, PageHeader, SectionHeading } from '../components/ui/ObservatoryPrimitives';

interface PrivacyPolicyProps {
  onNavigateHome?: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onNavigateHome }) => {
  const { t } = useLanguage();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof window !== 'undefined' && (window as any).MausamSEO?.updateMeta) {
      (window as any).MausamSEO.updateMeta('/privacy');
    }
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full max-w-[960px] mx-auto py-4 px-3 sm:px-4 text-[#B5C3D1] space-y-6">
      <PageHeader
        eyebrow="National Open Data & Citizen Privacy Framework"
        title="MAUSAM Privacy Policy"
        description="Transparency, zero-key public architecture, and non-commercial citizen data handling across the MAUSAM atmospheric intelligence network."
        status="REFERENCE"
        statusLabel="MAUSAM-PRIVACY-V1.4"
        updatedAt="October 2026"
        actions={
          <button
            type="button"
            id="privacy-back-btn"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 text-xs font-semibold min-h-[44px] sm:min-h-[36px] px-3.5 rounded-lg bg-[#101F2E] hover:bg-[#172A3D] text-[#F3F6FA] border border-[#26394B] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#35C7E8]" aria-hidden="true" />
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
            { id: 'sec-1', title: '1. What MAUSAM Is' },
            { id: 'sec-2', title: '2. Information We Collect' },
            { id: 'sec-3', title: '3. Location & Geolocation Handling' },
            { id: 'sec-4', title: '4. Weather Queries & Caching' },
            { id: 'sec-5', title: '5. Cookies & Browser Local Storage' },
            { id: 'sec-6', title: '6. Privacy-Conscious Analytics' },
            { id: 'sec-7', title: '7. Third-Party Services & Feeds' },
            { id: 'sec-8', title: '8. Maps & Interactive Imagery' },
            { id: 'sec-9', title: '9. Data Retention Policy' },
            { id: 'sec-10', title: '10. Data Security & Encryption' },
            { id: 'sec-11', title: '11. User Rights & Data Control' },
            { id: 'sec-12', title: "12. Children's Privacy" },
            { id: 'sec-13', title: '13. Changes to this Policy' },
            { id: 'sec-14', title: '14. Contact Information' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className="text-left min-h-[38px] sm:min-h-[32px] px-2.5 rounded-lg hover:bg-[#101F2E] text-[#35C7E8] hover:text-[#F3F6FA] transition-colors cursor-pointer"
            >
              {item.title}
            </button>
          ))}
        </div>
      </DataPanel>

      {/* Content */}
      <DataPanel variant="surface-1" className="p-5 sm:p-7 space-y-8 leading-relaxed text-sm">
        <section id="sec-1" className="scroll-mt-6">
          <h2 className="text-base font-bold text-[#F3F6FA] mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#22C7A0]" aria-hidden="true" />
            <span>1. WHAT MAUSAM IS</span>
          </h2>
          <p className="text-[#B5C3D1]">
            MAUSAM is a public meteorological observation, disaster early-warning, and agrometeorological advisory platform engineered for India. Designed around an open, privacy-by-design model, MAUSAM delivers live weather telemetry without requiring citizen registration, account creation, or user tracking.
          </p>
        </section>

        <section id="sec-2" className="pt-6 border-t border-[#26394B] scroll-mt-6">
          <h2 className="text-base font-bold text-[#F3F6FA] mb-2">2. INFORMATION WE COLLECT</h2>
          <p className="text-[#B5C3D1]">We follow strict data minimization principles. MAUSAM does NOT collect:</p>
          <ul className="list-disc list-inside space-y-1.5 mt-2 pl-2 text-[#B5C3D1]">
            <li>Personal names, phone numbers, or residential addresses</li>
            <li>Government identification numbers or Aadhaar numbers</li>
            <li>Financial, credit card, or payment data</li>
            <li>Device biometric fingerprints or persistent advertising IDs</li>
          </ul>
          <p className="text-[#B5C3D1] mt-3">
            The only information processed is transient technical metadata required for HTTP delivery and preferences chosen directly by you (such as your preferred city or language).
          </p>
        </section>

        <section id="sec-3" className="pt-6 border-t border-[#26394B] scroll-mt-6">
          <h2 className="text-base font-bold text-[#F3F6FA] mb-2">
            3. LOCATION &amp; GEOLOCATION HANDLING
          </h2>
          <p className="text-[#B5C3D1]">
            When you click &ldquo;Use My Current Location&rdquo;, your browser prompts you for standard geolocation permission.
          </p>
          <ul className="list-disc list-inside space-y-1.5 mt-2 pl-2 text-[#B5C3D1]">
            <li>Device coordinates are resolved client-side in your browser to match the nearest official IMD observatory.</li>
            <li>Your exact latitude and longitude are never permanently stored on our servers or linked to your identity.</li>
            <li>Geolocation is completely optional; you can search any of India&apos;s 36 States and 700+ districts manually without granting location permission.</li>
          </ul>
        </section>

        <section id="sec-4" className="pt-6 border-t border-[#26394B] scroll-mt-6">
          <h2 className="text-base font-bold text-[#F3F6FA] mb-2">4. WEATHER QUERIES &amp; CACHING</h2>
          <p className="text-[#B5C3D1]">
            When you view weather or radar for a city, an anonymous query is sent to our backend proxy. Meteorological results are cached in memory to minimize strain on upstream meteorological networks. Search queries are not associated with personal profiles.
          </p>
        </section>

        <section id="sec-5" className="pt-6 border-t border-[#26394B] scroll-mt-6">
          <h2 className="text-base font-bold text-[#F3F6FA] mb-2">
            5. COOKIES &amp; BROWSER LOCAL STORAGE
          </h2>
          <p className="text-[#B5C3D1]">
            MAUSAM uses HTML5 Local Storage instead of third-party tracking cookies:
          </p>
          <ul className="list-disc list-inside space-y-1.5 mt-2 pl-2 text-[#B5C3D1]">
            <li>
              <code className="text-[#35C7E8] font-mono">mausam_selected_location</code>: Your selected station so you don&apos;t have to re-search on reload.
            </li>
            <li>
              <code className="text-[#35C7E8] font-mono">mausam_cookie_consent</code>: Your preference regarding optional anonymous analytics.
            </li>
            <li>
              <code className="text-[#35C7E8] font-mono">mausam_recent_searches</code>: Recent locations looked up, stored strictly inside your browser.
            </li>
          </ul>
        </section>

        <section id="sec-6" className="pt-6 border-t border-[#26394B] scroll-mt-6">
          <h2 className="text-base font-bold text-[#F3F6FA] mb-2">6. PRIVACY-CONSCIOUS ANALYTICS</h2>
          <p className="text-[#B5C3D1]">
            Optional anonymous telemetry records coarse aggregate counts only after explicit consent and never collects IP addresses, search terms, or device serials.
          </p>
        </section>

        <section id="sec-7" className="pt-6 border-t border-[#26394B] scroll-mt-6">
          <h2 className="text-base font-bold text-[#F3F6FA] mb-2">
            7. THIRD-PARTY SERVICES &amp; FEEDS
          </h2>
          <ul className="list-disc list-inside space-y-1.5 mt-2 pl-2 text-[#B5C3D1]">
            <li>
              <strong className="text-[#F3F6FA]">IMD (India Meteorological Department):</strong> Surface observations, Doppler radar scans, agromet bulletins.
            </li>
            <li>
              <strong className="text-[#F3F6FA]">NDMA SACHET:</strong> Common Alerting Protocol (CAP) disaster feeds.
            </li>
            <li>
              <strong className="text-[#F3F6FA]">CPCB (Central Pollution Control Board):</strong> National Air Quality Index (NAQI) monitoring stations.
            </li>
          </ul>
        </section>

        <section id="sec-8" className="pt-6 border-t border-[#26394B] scroll-mt-6">
          <h2 className="text-base font-bold text-[#F3F6FA] mb-2">8. MAPS &amp; INTERACTIVE IMAGERY</h2>
          <p className="text-[#B5C3D1]">
            Map background tiles are loaded over encrypted HTTPS. No personally identifiable information is transmitted during tile downloads.
          </p>
        </section>

        <section id="sec-9" className="pt-6 border-t border-[#26394B] scroll-mt-6">
          <h2 className="text-base font-bold text-[#F3F6FA] mb-2">9. DATA RETENTION POLICY</h2>
          <p className="text-[#B5C3D1]">
            Operational logs used solely for network diagnostics are rotated automatically on a maximum 14-day schedule. Local browser storage persists until you clear your cache.
          </p>
        </section>

        <section id="sec-10" className="pt-6 border-t border-[#26394B] scroll-mt-6">
          <h2 className="text-base font-bold text-[#F3F6FA] mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#35C7E8]" aria-hidden="true" />
            <span>10. DATA SECURITY &amp; ENCRYPTION</span>
          </h2>
          <p className="text-[#B5C3D1]">
            All communications between your device and MAUSAM are secured using Transport Layer Security (TLS 1.3 / HTTPS) with HSTS and strict cross-origin protections.
          </p>
        </section>

        <section id="sec-11" className="pt-6 border-t border-[#26394B] scroll-mt-6">
          <h2 className="text-base font-bold text-[#F3F6FA] mb-2">11. USER RIGHTS &amp; DATA CONTROL</h2>
          <p className="text-[#B5C3D1]">
            Because MAUSAM does not maintain accounts or store personally identifiable citizen records, there are no profiles to delete. You have full autonomous control over local browser preferences.
          </p>
        </section>

        <section id="sec-12" className="pt-6 border-t border-[#26394B] scroll-mt-6">
          <h2 className="text-base font-bold text-[#F3F6FA] mb-2">12. CHILDREN&apos;S PRIVACY</h2>
          <p className="text-[#B5C3D1]">
            MAUSAM is an educational and public meteorological service accessible to students and citizens of all ages. We do not knowingly collect personal data from anyone, including children under 13 years of age.
          </p>
        </section>

        <section id="sec-13" className="pt-6 border-t border-[#26394B] scroll-mt-6">
          <h2 className="text-base font-bold text-[#F3F6FA] mb-2">13. CHANGES TO THIS POLICY</h2>
          <p className="text-[#B5C3D1]">
            Modifications to this privacy framework are reflected on this page with an updated timestamp.
          </p>
        </section>

        <section id="sec-14" className="pt-6 border-t border-[#26394B] scroll-mt-6">
          <h2 className="text-base font-bold text-[#F3F6FA] mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#35C7E8]" aria-hidden="true" />
            <span>14. CONTACT INFORMATION</span>
          </h2>
          <div className="mt-3 p-4 rounded-xl bg-[#08131F] border border-[#26394B] text-xs font-mono text-[#B5C3D1] space-y-1">
            <div className="text-[#F3F6FA] font-semibold">MAUSAM Open Data &amp; Privacy Office</div>
            <div>Smart India Hackathon 2026 Initiative</div>
            <div>
              Web:{' '}
              <a href="https://mausamgovt.vercel.app/privacy" className="text-[#35C7E8] underline">
                https://mausamgovt.vercel.app/privacy
              </a>
            </div>
            <div>Inquiries: privacy@mausam.gov.in (Prototype Governance Contact)</div>
          </div>
        </section>
      </DataPanel>
    </div>
  );
};
