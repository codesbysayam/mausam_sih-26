import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

export type FooterView = 'terms' | 'privacy' | 'api' | 'debug' | 'docs';

interface FooterNavigationProps {
  activeTab: string;
  onNavigate: (view: FooterView) => void;
}

interface FooterLinkItem {
  id: FooterView;
  labelKey: 'termsOfObservation' | 'privacyPolicy' | 'openDataApi' | 'apiDebug' | 'projectDocs';
  defaultLabel: string;
}

const FOOTER_LINKS: FooterLinkItem[] = [
  { id: 'docs', labelKey: 'projectDocs', defaultLabel: 'Documentation' },
  { id: 'terms', labelKey: 'termsOfObservation', defaultLabel: 'Terms of Observation' },
  { id: 'privacy', labelKey: 'privacyPolicy', defaultLabel: 'Privacy Policy' },
  { id: 'api', labelKey: 'openDataApi', defaultLabel: 'Open Data API' },
  { id: 'debug', labelKey: 'apiDebug', defaultLabel: 'Data & Sources' },
];

export const FooterNavigation: React.FC<FooterNavigationProps> = ({
  activeTab,
  onNavigate,
}) => {
  const { t } = useLanguage();

  return (
    <nav
      aria-label="Legal and API Links"
      className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center md:justify-end"
    >
      {FOOTER_LINKS.map((link, index) => {
        const isActive = activeTab === link.id;
        const translatedLabel =
          link.id === 'debug' ? 'Data & Sources' : t(link.labelKey, link.defaultLabel);

        return (
          <React.Fragment key={link.id}>
            {index > 0 && (
              <span className="text-[#38536A] select-none hidden sm:inline" aria-hidden="true">
                •
              </span>
            )}
            <button
              type="button"
              id={`footer-link-${link.id}`}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(link.id);
              }}
              className={`transition-colors cursor-pointer text-xs min-h-[44px] sm:min-h-[32px] px-1.5 rounded focus:outline-none focus:ring-1 focus:ring-[#35C7E8] ${
                isActive
                  ? 'text-[#35C7E8] font-semibold underline underline-offset-2'
                  : 'text-[#8295A8] hover:text-[#F3F6FA] hover:underline'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {translatedLabel}
            </button>
          </React.Fragment>
        );
      })}
      <span className="text-[#38536A] select-none hidden sm:inline" aria-hidden="true">
        •
      </span>
      <button
        type="button"
        id="footer-link-storage-preferences"
        onClick={(e) => {
          e.preventDefault();
          if (typeof window !== 'undefined' && (window as any).MausamConsent?.openPreferences) {
            (window as any).MausamConsent.openPreferences();
          }
        }}
        className="transition-colors cursor-pointer text-xs min-h-[44px] sm:min-h-[32px] px-1.5 rounded text-[#8295A8] hover:text-[#35C7E8] hover:underline focus:outline-none focus:ring-1 focus:ring-[#35C7E8]"
      >
        Privacy &amp; Storage Preferences
      </button>
    </nav>
  );
};
