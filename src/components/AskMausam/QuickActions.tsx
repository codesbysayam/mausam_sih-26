// ====================================================================
// MAUSAM - Atmospheric Intelligence Platform
// Quick Actions & Meteorological Query Chips
// ====================================================================

import React from 'react';

interface QuickActionsProps {
  onSelectPrompt: (prompt: string) => void;
  currentLocationName?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onSelectPrompt,
  currentLocationName,
}) => {
  const loc = currentLocationName || 'Current Location';

  const actionChips = [
    { label: 'Current Weather', prompt: `What is the current weather in ${loc}?` },
    { label: 'Rain Tomorrow?', prompt: `Will it rain in ${loc} tomorrow?` },
    { label: '7-Day Forecast', prompt: `Show 7-day weather forecast for ${loc}` },
    { label: 'Active Warnings', prompt: `Are there any active weather warnings for ${loc}?` },
    { label: 'Air Quality (AQI)', prompt: `What is the Air Quality Index (AQI) in ${loc}?` },
    { label: 'Agriculture / Crops', prompt: `Is it safe to spray pesticides or irrigate crops in ${loc} today?` },
    { label: 'Travel Safety', prompt: `Is it safe for highway travel and outdoor activity in ${loc}?` },
    { label: 'Health & Outdoor', prompt: `Is it safe to go for a run or outdoor exercise in ${loc}?` },
  ];

  return (
    <div className="flex flex-col gap-1.5 pb-2">
      <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-[var(--m-text-muted)] uppercase tracking-wider">
        <span>Quick Inquiries</span>
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {actionChips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => onSelectPrompt(chip.prompt)}
            className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-2)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] border border-[var(--m-border)] hover:border-[var(--m-border-strong)] transition-colors cursor-pointer m-focus-ring"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
};
