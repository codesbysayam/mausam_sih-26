import React, { useEffect } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Clock,
  History,
  MapPin,
  Phone,
  Radar,
  ShieldCheck,
  X,
} from 'lucide-react';
import { WarningRecord } from '../../types/warningTypes';

interface WarningDetailDrawerProps {
  warning: WarningRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const WarningDetailDrawer: React.FC<WarningDetailDrawerProps> = ({
  warning,
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !warning) return null;

  const badgeStyle =
    warning.severity === 'red'
      ? 'bg-[#EF4444]/15 border-[#EF4444]/45 text-[#FCA5A5]'
      : warning.severity === 'orange'
      ? 'bg-[#F97316]/15 border-[#F97316]/45 text-[#FDBA74]'
      : warning.severity === 'yellow'
      ? 'bg-[#EAB308]/15 border-[#EAB308]/45 text-[#FDE047]'
      : warning.severity === 'purple'
      ? 'bg-[#35C7E8]/15 border-[#35C7E8]/45 text-[#7DD3FC]'
      : 'bg-[#22C7A0]/15 border-[#22C7A0]/45 text-[#6EE7B7]';

  return (
    <div
      id="warning-detail-drawer-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="warning-detail-drawer-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-warning-title"
        className="w-full max-w-2xl h-full bg-[#07111D] border-l border-[#26394B] shadow-2xl flex flex-col justify-between overflow-hidden"
      >
        <div className="p-4 sm:p-5 bg-[#0B1927] border-b border-[#26394B] flex items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-[11px] font-bold uppercase tracking-wider ${badgeStyle}`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{warning.severityLabel}</span>
            </span>

            <span className="text-xs font-mono text-[#8295A8] truncate">
              {warning.bulletinNo}
            </span>
          </div>

          <button
            id="btn-close-warning-drawer"
            type="button"
            onClick={onClose}
            aria-label="Close details drawer"
            className="w-10 h-10 rounded-lg bg-[#08131F] hover:bg-[#101F2E] text-[#B5C3D1] hover:text-[#F3F6FA] border border-[#26394B] flex items-center justify-center transition-colors cursor-pointer shrink-0 m-focus-ring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-[#B5C3D1]">
          <div className="space-y-1.5 pb-4 border-b border-[#26394B]">
            <div className="flex items-center gap-1.5 text-[#35C7E8] text-xs font-mono font-semibold uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5" />
              <span>
                {warning.state} · {warning.subdivision}
              </span>
            </div>

            <h2
              id="drawer-warning-title"
              className="text-xl sm:text-2xl font-bold text-[#F3F6FA] tracking-tight"
            >
              {warning.title}
            </h2>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-[#8295A8]">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#6EE7B7]" />
                <span>
                  Issued:{' '}
                  <strong className="text-[#F3F6FA] font-mono tabular-nums">
                    {warning.issuedAt}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-[#FDBA74]" />
                <span>
                  Valid until:{' '}
                  <strong className="text-[#F3F6FA] font-mono tabular-nums">
                    {warning.validUntil}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold text-[#8295A8] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#35C7E8]" />
              <span>Designated Affected Districts ({warning.affectedDistricts.length})</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {warning.affectedDistricts.map((district, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded bg-[#08131F] border border-[#26394B] text-xs font-medium text-[#F3F6FA]"
                >
                  {district}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-[#0B1927] border border-[#26394B] rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-mono font-bold text-[#F3F6FA] uppercase tracking-wider flex items-center gap-1.5">
              <Radar className="w-4 h-4 text-[#35C7E8]" />
              <span>Synoptic Warning Bulletin</span>
            </h4>
            <p className="text-xs sm:text-sm leading-relaxed text-[#B5C3D1]">
              {warning.description}
            </p>
            {warning.meteorologicalSynopsys && (
              <p className="text-xs text-[#8295A8] pt-2 border-t border-[#26394B]">
                {warning.meteorologicalSynopsys}
              </p>
            )}
          </div>

          {warning.expectedConditions && (
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-[#8295A8] uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-[#35C7E8]" />
                <span>Expected Meteorological Quantities</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {warning.expectedConditions.rainfall && (
                  <div className="bg-[#08131F] border border-[#26394B] rounded-lg p-3">
                    <span className="text-[10px] text-[#8295A8] uppercase">24h Precipitation</span>
                    <div className="text-xs font-bold font-mono tabular-nums text-[#F3F6FA] mt-0.5">
                      {warning.expectedConditions.rainfall}
                    </div>
                  </div>
                )}

                {warning.expectedConditions.windSpeed && (
                  <div className="bg-[#08131F] border border-[#26394B] rounded-lg p-3">
                    <span className="text-[10px] text-[#8295A8] uppercase">Sustained Wind</span>
                    <div className="text-xs font-bold font-mono tabular-nums text-[#F3F6FA] mt-0.5">
                      {warning.expectedConditions.windSpeed}
                    </div>
                  </div>
                )}

                {warning.expectedConditions.windGusts && (
                  <div className="bg-[#08131F] border border-[#26394B] rounded-lg p-3">
                    <span className="text-[10px] text-[#8295A8] uppercase">Peak Gusts</span>
                    <div className="text-xs font-bold font-mono tabular-nums text-[#FDBA74] mt-0.5">
                      {warning.expectedConditions.windGusts}
                    </div>
                  </div>
                )}

                {warning.expectedConditions.visibility && (
                  <div className="bg-[#08131F] border border-[#26394B] rounded-lg p-3">
                    <span className="text-[10px] text-[#8295A8] uppercase">Visibility</span>
                    <div className="text-xs font-bold font-mono tabular-nums text-[#F3F6FA] mt-0.5">
                      {warning.expectedConditions.visibility}
                    </div>
                  </div>
                )}

                {warning.expectedConditions.waveHeight && (
                  <div className="bg-[#08131F] border border-[#26394B] rounded-lg p-3">
                    <span className="text-[10px] text-[#8295A8] uppercase">Sea Wave Height</span>
                    <div className="text-xs font-bold font-mono tabular-nums text-[#7DD3FC] mt-0.5">
                      {warning.expectedConditions.waveHeight}
                    </div>
                  </div>
                )}

                {warning.expectedConditions.temperature && (
                  <div className="bg-[#08131F] border border-[#26394B] rounded-lg p-3">
                    <span className="text-[10px] text-[#8295A8] uppercase">Temperature</span>
                    <div className="text-xs font-bold font-mono tabular-nums text-[#F3F6FA] mt-0.5">
                      {warning.expectedConditions.temperature}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {warning.impacts && warning.impacts.length > 0 && (
            <div className="space-y-2 bg-[#0B1927] border border-[#F97316]/35 rounded-xl p-4">
              <h4 className="text-xs font-mono font-bold text-[#FDBA74] uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Hazard Impact Assessment</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-[#B5C3D1]">
                {warning.impacts.map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#FDBA74] font-bold">·</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {warning.recommendedActions && warning.recommendedActions.length > 0 && (
            <div className="space-y-2 bg-[#0B1927] border border-[#22C7A0]/35 rounded-xl p-4">
              <h4 className="text-xs font-mono font-bold text-[#6EE7B7] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Actionable Public Advisory &amp; SOPs</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-[#B5C3D1]">
                {warning.recommendedActions.map((act, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#6EE7B7] font-bold">·</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {warning.timeline && warning.timeline.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-[#8295A8] uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#35C7E8]" />
                <span>Bulletin Progression Timeline</span>
              </h4>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#26394B]">
                {warning.timeline.map((evt, idx) => (
                  <div key={idx} className="relative">
                    <div
                      className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 ${
                        evt.status === 'completed'
                          ? 'bg-[#22C7A0] border-[#07111D]'
                          : evt.status === 'current'
                          ? 'bg-[#EF4444] border-[#F3F6FA]'
                          : 'bg-[#26394B] border-[#07111D]'
                      }`}
                    />
                    <div className="text-[11px] font-mono text-[#8295A8] tabular-nums">
                      {evt.date} · {evt.time}
                    </div>
                    <div className="font-bold text-[#F3F6FA] text-xs">{evt.title}</div>
                    <div className="text-[11px] text-[#B5C3D1]">{evt.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-[#0B1927] border border-[#26394B] rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <div className="text-[10px] text-[#8295A8] uppercase">Issuing Authority</div>
                <div className="font-bold text-[#F3F6FA]">{warning.source}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#8295A8] uppercase">Tracking Radar</div>
                <div className="font-mono text-[#7DD3FC]">
                  {warning.radarTrackingStation || 'IMD DWR Network'}
                </div>
              </div>
            </div>

            {warning.emergencyContact && (
              <div className="pt-2.5 border-t border-[#26394B] flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold text-[#FDBA74] uppercase">
                    {warning.emergencyContact.title}
                  </div>
                  <div className="text-sm font-bold font-mono text-[#F3F6FA]">
                    {warning.emergencyContact.number}
                  </div>
                </div>

                <a
                  href={`tel:${warning.emergencyContact.number.split('/')[0].trim()}`}
                  className="px-3.5 py-2 min-h-[40px] rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Helpline</span>
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-[#0B1927] border-t border-[#26394B] flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-[#8295A8] font-mono">
            National Meteorological Feed · Verified CAP Record
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 min-h-[40px] rounded-lg bg-[#08131F] hover:bg-[#101F2E] text-[#F3F6FA] text-xs font-semibold border border-[#26394B] transition-colors cursor-pointer m-focus-ring"
          >
            Close Bulletin
          </button>
        </div>
      </div>
    </div>
  );
};
