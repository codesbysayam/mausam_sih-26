import React from 'react';
import { ShieldCheck, Globe, Cpu } from 'lucide-react';

export const NWPFooter: React.FC = () => {
  return (
    <footer
      id="nwp-page-footer"
      className="w-full pt-6 pb-12 border-t border-[#1D5278]/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-[#AFC4D8]"
    >
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-[#1565C0] flex items-center justify-center text-white font-bold text-[10px] font-mono">
          M
        </div>
        <span className="font-semibold text-white tracking-tight">
          MAUSAM National Atmospheric Intelligence Platform
        </span>
        <span className="text-slate-600 hidden sm:inline">•</span>
        <span className="text-slate-400 hidden sm:inline">Numerical Weather Prediction Division</span>
      </div>

      <div className="flex items-center gap-4 text-[11px] font-mono">
        <span className="inline-flex items-center gap-1 text-[#00E676]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Statutory Warning Priority Active</span>
        </span>
        <span className="text-slate-600">•</span>
        <span>Open Data Physical Ingestion</span>
      </div>
    </footer>
  );
};
