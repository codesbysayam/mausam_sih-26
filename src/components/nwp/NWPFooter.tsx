import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const NWPFooter: React.FC = () => {
  return (
    <footer
      id="nwp-page-footer"
      className="w-full pt-5 pb-8 border-t border-[#26394B] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8295A8]"
    >
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-[#0B72B9] flex items-center justify-center text-white font-bold text-[10px] font-mono">
          M
        </div>
        <span className="font-semibold text-[#F3F6FA] tracking-tight">
          MAUSAM Atmospheric Intelligence Platform
        </span>
        <span className="text-[#26394B] hidden sm:inline">·</span>
        <span className="text-[#8295A8] hidden sm:inline">Numerical Weather Prediction</span>
      </div>

      <div className="flex items-center gap-3 text-[11px] font-mono">
        <span className="inline-flex items-center gap-1.5 text-[#6EE7B7]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Statutory Warning Priority Active</span>
        </span>
        <span className="text-[#26394B]">·</span>
        <span>Open Data Physical Ingestion</span>
      </div>
    </footer>
  );
};
