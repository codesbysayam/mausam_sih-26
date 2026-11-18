import React from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  Trash2,
  X,
  MapPin,
  HelpCircle,
} from 'lucide-react';

interface LocationPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearSavedLocation?: () => void;
  hasSavedLocation?: boolean;
}

export const LocationPrivacyModal: React.FC<LocationPrivacyModalProps> = ({
  isOpen,
  onClose,
  onClearSavedLocation,
  hasSavedLocation = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-privacy-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        id="location-privacy-dialog"
        className="relative w-full max-w-2xl bg-[#0B1927] border border-[#26394B] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#26394B] bg-[#08131F]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#35C7E8]/15 border border-[#35C7E8]/35 flex items-center justify-center text-[#35C7E8]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 id="location-privacy-title" className="text-base font-bold text-[#F3F6FA] tracking-tight">
                Location Privacy &amp; Data Transparency
              </h2>
              <p className="text-[11px] font-mono text-[#8295A8]">
                MAUSAM National Atmospheric Intelligence Platform
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] rounded-lg bg-[#101F2E] hover:bg-[#172A3D] border border-[#26394B] text-[#8295A8] hover:text-[#F3F6FA] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close Privacy Dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-[#B5C3D1] leading-relaxed">
          <div className="p-4 rounded-xl bg-[#0B72B9]/15 border border-[#35C7E8]/35 text-[#F3F6FA] space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-[#35C7E8]">
              <Lock className="w-4 h-4" />
              <span>Zero Continuous Tracking · User-Controlled Geolocation</span>
            </div>
            <p className="text-[11px] text-[#B5C3D1]">
              MAUSAM uses your location <strong>only</strong> when you explicitly click “Use My Location” to find the nearest meteorological observation station and provide accurate local forecasts.
            </p>
          </div>

          <div className="space-y-3">
            <div className="border border-[#26394B] rounded-xl p-3.5 bg-[#101F2E] space-y-1">
              <h3 className="font-bold text-[#F3F6FA] flex items-center gap-2 text-xs">
                <MapPin className="w-3.5 h-3.5 text-[#22C7A0]" />
                1. What data is collected when I click “Use My Location”?
              </h3>
              <p className="text-[#8295A8] pl-5">
                Only the latitude, longitude, and approximate horizontal accuracy provided by your browser&apos;s Geolocation API. We do not track IP addresses for ad profiling or store continuous background location traces.
              </p>
            </div>

            <div className="border border-[#26394B] rounded-xl p-3.5 bg-[#101F2E] space-y-1">
              <h3 className="font-bold text-[#F3F6FA] flex items-center gap-2 text-xs">
                <Eye className="w-3.5 h-3.5 text-[#35C7E8]" />
                2. How is my location used?
              </h3>
              <p className="text-[#8295A8] pl-5">
                Your coordinates are reverse-geocoded to identify your State, District, and City, and to compute the nearest IMD Automatic Weather Station (AWS), Doppler radar sector, and agricultural advisory cluster.
              </p>
            </div>

            <div className="border border-[#26394B] rounded-xl p-3.5 bg-[#101F2E] space-y-1">
              <h3 className="font-bold text-[#F3F6FA] flex items-center gap-2 text-xs">
                <Lock className="w-3.5 h-3.5 text-[#F59E0B]" />
                3. Where is my location saved?
              </h3>
              <p className="text-[#8295A8] pl-5">
                Your detected location is stored solely in your browser&apos;s client-side local cache so you don&apos;t have to re-locate on every page navigation. It is never transmitted to third-party ad networks or tracking servers.
              </p>
            </div>

            <div className="border border-[#26394B] rounded-xl p-3.5 bg-[#101F2E] space-y-1">
              <h3 className="font-bold text-[#F3F6FA] flex items-center gap-2 text-xs">
                <HelpCircle className="w-3.5 h-3.5 text-[#35C7E8]" />
                4. How do I enable or revoke location permissions?
              </h3>
              <div className="text-[#8295A8] pl-5 space-y-1">
                <p>You can manage permissions directly in your browser:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  <li><strong>Chrome / Edge / Brave:</strong> Click the padlock / settings icon next to the URL bar → Permissions → Location.</li>
                  <li><strong>Safari (iOS / macOS):</strong> Settings → Safari → Location → Allow / Ask / Deny.</li>
                  <li><strong>Firefox:</strong> Click the permissions icon in the address bar → Clear location exception.</li>
                </ul>
              </div>
            </div>
          </div>

          {hasSavedLocation && onClearSavedLocation && (
            <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-[#FCA5A5] block">Stored Location Cached in Browser</span>
                <span className="text-[11px] text-[#8295A8]">Clear cached coordinates and reset to national primary hub.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClearSavedLocation();
                  onClose();
                }}
                className="px-3 min-h-[40px] sm:min-h-[34px] rounded-lg bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#FCA5A5] border border-[#EF4444]/40 font-semibold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Saved Location</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#26394B] bg-[#08131F] flex items-center justify-between gap-3">
          <span className="text-[10px] font-mono text-[#8295A8]">
            Compliant with Digital Personal Data Protection (DPDP) Guidelines
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 min-h-[44px] sm:min-h-[36px] rounded-xl bg-[#0B72B9] hover:bg-[#0B72B9]/85 text-[#F3F6FA] font-semibold text-xs transition-colors cursor-pointer shrink-0"
          >
            Understood &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
