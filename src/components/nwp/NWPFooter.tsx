import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const NWPFooter: React.FC = () => {
  return (
    <footer
      id="nwp-page-footer"
      className="w-full pt-5 pb-8 border-t border-[var(--m-border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--m-text-muted)]"
    >
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-[var(--m-accent)] flex items-center justify-center text-white font-bold text-[10px] font-mono">
          M
        </div>
        <span className="font-semibold text-[var(--m-text-primary)] tracking-tight">
          MAUSAM Atmospheric Intelligence Platform
        </span>
        <span className="text-[#26394B] hidden sm:inline">·</span>
        <span className="text-[var(--m-text-muted)] hidden sm:inline">Numerical Weather Prediction</span>
      </div>

      <div className="flex items-center gap-3 text-[11px] font-mono">
        <span className="inline-flex items-center gap-1.5 text-[var(--m-ok)]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Statutory Warning Priority Active</span>
        </span>
        <span className="text-[#26394B]">·</span>
        <span>Open Data Physical Ingestion</span>
      </div>
    </footer>
  );
};
