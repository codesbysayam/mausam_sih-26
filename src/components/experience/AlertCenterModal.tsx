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
  alerts,
  onOpenFullWarningsPage,
}) => {
  const { isAlertDrawerOpen, setIsAlertDrawerOpen } = useExperience();
  const { state: sachetState, refresh: refreshSachet } = useProvider('SACHET');
  const sachetAvailability = getAlertFeedAvailability(sachetState);

  if (!isAlertDrawerOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Official Meteorological Warnings & SACHET Feed"
      className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end bg-black/55 p-3 sm:p-4"
      onClick={() => setIsAlertDrawerOpen(false)}
    >
      <div
        className="w-full max-w-md spatial-hud-surface-elevated rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 max-h-[85dvh] overflow-y-auto scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#84A8CC]/15">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#35C7E8]">
              NDMA SACHET CAP · IMD Bulletins
            </span>
            <h2 className="text-base font-bold text-white mt-0.5">
              Hazard Posture — {selectedLocation.state}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => refreshSachet(true)}
              title="Refresh SACHET alert feed"
              className="p-1.5 rounded-lg text-[#B8C7D9] hover:text-white hover:bg-white/5 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${sachetState.status === 'LOADING' ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsAlertDrawerOpen(false)}
              aria-label="Close alerts drawer"
              className="p-1.5 rounded-lg text-[#7F93A8] hover:text-white hover:bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Truthful Feed Status Banner */}
        {sachetAvailability === 'UNAVAILABLE' ? (
          <div className="rounded-xl bg-[#E8B64D]/10 border border-[#E8B64D]/35 p-3.5 text-xs text-[#FDE68A]">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#E8B64D]" />
              <span>SACHET / Official Feed Unavailable</span>
            </div>
            <p className="mt-1 text-[#B8C7D9] leading-relaxed">
              {sachetState.error || 'NDMA SACHET / IMD alert feed is currently unreachable.'} Please verify local advisories via the Analyze Warnings console or retry sync.
            </p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-xl bg-[#26B982]/10 border border-[#26B982]/35 p-3.5 text-xs">
            <div className="font-semibold text-[#26B982] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>No Severe Weather Warnings Reported</span>
            </div>
            <p className="mt-1 text-[#B8C7D9] leading-relaxed">
              Verified SACHET / IMD feed currently reports zero active severe warnings for {selectedLocation.displayName}.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl bg-[#07111D]/85 border border-[#84A8CC]/20 p-3 text-xs flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white">{alert.title}</span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#F28B45]/20 text-[#FDBA74] shrink-0">
                    {alert.severity}
                  </span>
                </div>
                <p className="text-[#B8C7D9] leading-relaxed">{alert.description}</p>
                {alert.affectedDistricts?.length > 0 && (
                  <div className="text-[11px] text-[#7F93A8]">
                    Districts: {alert.affectedDistricts.slice(0, 5).join(', ')}
                  </div>
                )}
                <div className="text-[10px] font-mono text-[#7F93A8] flex items-center justify-between pt-1 border-t border-[#84A8CC]/10">
                  <span>{alert.agency}</span>
                  <span>Valid until {alert.validUntil}</span>
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
          className="w-full py-2.5 px-4 rounded-xl bg-[#35C7E8] text-[#05101C] text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-95 cursor-pointer"
        >
          <span>Open Full Hazard Matrix in Analyze Mode</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
