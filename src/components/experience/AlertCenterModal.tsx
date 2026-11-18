// ====================================================================
// MAUSAM Floating Alert Center Drawer / Modal
// Renders real SACHET/NDMA and IMD warning status cleanly inside Explore
// mode without replacing the spatial scene, and offers one-click transition
// into the full Analyze Warnings Matrix.
// ====================================================================

import React from 'react';
import { AlertTriangle, ShieldCheck, X, ArrowUpRight, RefreshCw } from 'lucide-react';
import type { LocationRecord, WeatherAlert } from '../../types';
import { useProvider } from '../../store/providerStore';
import { getAlertFeedAvailability } from '../../services/providers/providerStatus';
import { useExperience } from '../../context/ExperienceContext';

interface AlertCenterModalProps {
  selectedLocation: LocationRecord;
  alerts: WeatherAlert[];
  onOpenFullWarningsPage: () => void;
}

export const AlertCenterModal: React.FC<AlertCenterModalProps> = ({
  selectedLocation,
  alerts = [],
  onOpenFullWarningsPage,
}) => {
  const { isAlertDrawerOpen, setIsAlertDrawerOpen } = useExperience();
  const { state: sachetState, refresh: refreshSachet } = useProvider('SACHET');
  const sachetAvailability = getAlertFeedAvailability(sachetState);
  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  if (!isAlertDrawerOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Official Meteorological Warnings & SACHET Feed"
      className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end bg-black/65 p-3 sm:p-4"
      onClick={() => setIsAlertDrawerOpen(false)}
    >
      <div
        className="w-full max-w-md spatial-hud-surface-elevated rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 max-h-[85dvh] overflow-y-auto scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#26394B]">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#35C7E8]">
              NDMA SACHET CAP · IMD Bulletins
            </span>
            <h2 className="text-base font-bold text-[#F3F6FA] mt-0.5">
              Hazard Posture — {selectedLocation.state}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => refreshSachet(true)}
              title="Refresh SACHET alert feed"
              aria-label="Refresh SACHET alert feed"
              className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-[#B5C3D1] hover:text-[#F3F6FA] hover:bg-[#101F2E] cursor-pointer spatial-focus-ring"
            >
              <RefreshCw className={`w-4 h-4 ${sachetState.status === 'LOADING' ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsAlertDrawerOpen(false)}
              aria-label="Close alerts drawer"
              className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-[#8295A8] hover:text-[#F3F6FA] hover:bg-[#101F2E] cursor-pointer spatial-focus-ring"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Truthful Feed Status Banner */}
        {sachetAvailability === 'UNAVAILABLE' ? (
          <div className="rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/35 p-3.5 text-xs text-[#FDE68A]">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
              <span>SACHET / Official Feed Unavailable</span>
            </div>
            <p className="mt-1 text-[#B5C3D1] leading-relaxed">
              {sachetState.error || 'NDMA SACHET / IMD alert feed is currently unreachable.'} Please verify local advisories via the Analyze Warnings console or retry sync.
            </p>
          </div>
        ) : safeAlerts.length === 0 ? (
          <div className="rounded-xl bg-[#22C7A0]/10 border border-[#22C7A0]/35 p-3.5 text-xs">
            <div className="font-semibold text-[#22C7A0] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>No Severe Weather Warnings Reported</span>
            </div>
            <p className="mt-1 text-[#B5C3D1] leading-relaxed">
              Verified SACHET / IMD feed currently reports zero active severe warnings for {selectedLocation.displayName}.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {safeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl bg-[#08131F] border border-[#26394B] p-3 text-xs flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#F3F6FA]">{alert.title}</span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#F97316]/15 border border-[#F97316]/35 text-[#FDBA74] shrink-0">
                    {alert.severity}
                  </span>
                </div>
                <p className="text-[#B5C3D1] leading-relaxed">{alert.description}</p>
                {Array.isArray(alert.affectedDistricts) && alert.affectedDistricts.length > 0 && (
                  <div className="text-[11px] text-[#8295A8]">
                    Districts: {alert.affectedDistricts.slice(0, 5).join(', ')}
                  </div>
                )}
                <div className="text-[10px] font-mono text-[#8295A8] flex items-center justify-between pt-1 border-t border-[#26394B]">
                  <span>{alert.agency}</span>
                  <span>Valid until {alert.validUntil || 'Ongoing'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setIsAlertDrawerOpen(false);
            onOpenFullWarningsPage();
          }}
          className="w-full min-h-[44px] sm:min-h-[40px] px-4 rounded-xl bg-[#35C7E8] text-[#07111D] text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-95 cursor-pointer spatial-focus-ring"
        >
          <span>Open Full Hazard Matrix in Analyze Mode</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
