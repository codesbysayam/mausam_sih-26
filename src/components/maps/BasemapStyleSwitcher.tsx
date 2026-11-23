import React from 'react';
import { Globe, Map as MapIcon, Mountain, Sun } from 'lucide-react';
import {
  BASEMAP_STYLES,
  BASEMAP_STYLE_ORDER,
  type BasemapStyleId,
} from '../../utils/mapBasemaps';

export interface BasemapStyleSwitcherProps {
  value: BasemapStyleId;
  onChange: (style: BasemapStyleId) => void;
  compact?: boolean;
  className?: string;
}

const STYLE_ICONS: Record<BasemapStyleId, React.ReactNode> = {
  dark: <MapIcon className="w-3.5 h-3.5 shrink-0" />,
  satellite: <Globe className="w-3.5 h-3.5 shrink-0" />,
  terrain: <Mountain className="w-3.5 h-3.5 shrink-0" />,
  light: <Sun className="w-3.5 h-3.5 shrink-0" />,
};

export const BasemapStyleSwitcher: React.FC<BasemapStyleSwitcherProps> = ({
  value,
  onChange,
  compact = false,
  className = '',
}) => {
  return (
    <div
      role="group"
      aria-label="Map basemap style selector"
      className={`inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-[var(--m-surface-inset)]/95 backdrop-blur-md border border-[var(--m-border)] shadow-lg ${className}`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {BASEMAP_STYLE_ORDER.map((styleId) => {
        const spec = BASEMAP_STYLES[styleId];
        const active = value === styleId;
        return (
          <button
            key={styleId}
            type="button"
            onClick={() => onChange(styleId)}
            aria-pressed={active}
            title={`Switch basemap to ${spec.name}`}
            className={`inline-flex items-center justify-center gap-1 rounded-md font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap m-focus-ring ${
              compact ? 'h-8 px-2 text-[10px]' : 'h-8 px-2.5 text-[11px]'
            } ${
              active
                ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)]'
                : 'text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-1)]'
            }`}
          >
            {STYLE_ICONS[styleId]}
            <span className={compact ? 'hidden sm:inline' : ''}>{spec.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
};

export default BasemapStyleSwitcher;
