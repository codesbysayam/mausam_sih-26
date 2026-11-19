import React, { useState } from 'react';
import { DataPanel, SectionHeading } from '../ui/ObservatoryPrimitives';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Droplets,
  Gauge,
  Thermometer,
  CloudRain,
  HeartPulse,
  Radar,
  Sun,
} from 'lucide-react';

interface ExplainerItem {
  id: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  practicalTip: string;
  icon: React.ReactNode;
}

const EXPLAINER_ITEMS: ExplainerItem[] = [
  {
    id: 'dew_point',
    title: 'Dew Point (°C)',
    shortDesc: 'Exact temperature at which atmospheric water vapor condenses into dew.',
    fullDesc:
      'Unlike relative humidity (which varies inversely with air temperature), dew point is an absolute measure of atmospheric moisture. Above 24°C feels oppressive; below 15°C feels crisp.',
    practicalTip:
      'When dew point is within 2°C of ambient temperature, fog, heavy dew, or stratus formation becomes likely.',
    icon: <Droplets className="w-4 h-4 text-[var(--m-accent)]" />,
  },
  {
    id: 'pressure_tendency',
    title: 'Surface Barometric Pressure (hPa)',
    shortDesc: 'Weight of the atmospheric column reduced to Mean Sea Level.',
    fullDesc:
      'Standard sea-level pressure is 1013.25 hPa. Rapid pressure falls (>1.0 hPa over 3 hours) accompany approaching troughs, squall lines, or cyclonic depressions.',
    practicalTip:
      'Monitor sharp 3-hour barometric drops ahead of convective squalls or monsoon lows.',
    icon: <Gauge className="w-4 h-4 text-[var(--m-accent)]" />,
  },
  {
    id: 'rain_probability',
    title: 'Precipitation Probability (PoP %)',
    shortDesc: 'Statistical likelihood of measurable rainfall (≥0.1 mm) at this point.',
    fullDesc:
      'Probability of Precipitation equals forecaster confidence multiplied by expected areal coverage over the target grid cell during the forecast period.',
    practicalTip:
      '60% PoP means a 6-in-10 chance of measurable rain at your station location—not 60% of the day.',
    icon: <CloudRain className="w-4 h-4 text-[#818CF8]" />,
  },
  {
    id: 'heat_index',
    title: 'Heat Index & Apparent Temp (°C)',
    shortDesc: 'Combined thermal load when ambient humidity slows sweat evaporation.',
    fullDesc:
      'High relative humidity slows evaporative skin cooling. A 34°C dry-bulb air temperature at 75% RH imposes an apparent physiological load exceeding 44°C.',
    practicalTip:
      'Avoid strenuous midday outdoor exertion when Apparent Temperature exceeds 40°C.',
    icon: <Thermometer className="w-4 h-4 text-[var(--m-danger)]" />,
  },
  {
    id: 'aqi',
    title: 'National Air Quality Index (NAQI)',
    shortDesc: 'Composite air-pollution rating driven by the worst sub-index pollutant.',
    fullDesc:
      'India CPCB NAQI evaluates PM2.5, PM10, NO2, SO2, CO, O3, NH3, and Pb. Categories: 0–50 Good, 51–100 Satisfactory, 101–200 Moderate, 201–300 Poor, 301–400 Very Poor, >400 Severe.',
    practicalTip:
      'Sensitive respiratory groups should curb prolonged outdoor exercise once AQI exceeds 200.',
    icon: <HeartPulse className="w-4 h-4 text-[var(--m-ok)]" />,
  },
  {
    id: 'radar_dbz',
    title: 'Radar Reflectivity (dBZ)',
    shortDesc: 'Microwave echo intensity returned by hydrometeors in storm cells.',
    fullDesc:
      '15–25 dBZ corresponds to light rain or drizzle; 30–45 dBZ indicates moderate-to-heavy rain; >50 dBZ marks severe convective cores with hail potential.',
    practicalTip:
      'Track cells exceeding 45 dBZ on the Doppler Radar page to anticipate downdraft gusts.',
    icon: <Radar className="w-4 h-4 text-[var(--m-watch)]" />,
  },
  {
    id: 'uv_index',
    title: 'Solar Ultraviolet (UV) Index',
    shortDesc: 'Standardized erythemal solar radiation intensity scale (0–11+).',
    fullDesc:
      'UV 0–2 is Low, 3–5 Moderate, 6–7 High, 8–10 Very High, and 11+ Extreme.',
    practicalTip:
      'Seek shade and use broad-spectrum sun protection between 11:00 and 15:00 IST when UV ≥ 6.',
    icon: <Sun className="w-4 h-4 text-[var(--m-watch)]" />,
  },
  {
    id: 'relative_humidity',
    title: 'Relative Humidity (%)',
    shortDesc: 'Current water vapor content relative to saturation capacity at air temp.',
    fullDesc:
      'Warm air holds substantially more moisture than cold air. 100% RH indicates complete saturation where condensation into fog, dew, or cloud occurs.',
    practicalTip:
      'Indoor RH between 40% and 60% supports respiratory comfort.',
    icon: <Droplets className="w-4 h-4 text-[var(--m-accent)]" />,
  },
];

export const WeatherDataExplainer: React.FC = () => {
  const [openItem, setOpenItem] = useState<string | null>(null);

  return (
    <DataPanel id="weather-data-explainer" className="space-y-4">
      <SectionHeading
        title="Meteorological Parameter Guide"
        subtitle="Operational definitions for surface, radar, and air-quality telemetry"
        icon={<HelpCircle className="w-4 h-4" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {EXPLAINER_ITEMS.map((item) => {
          const isOpen = openItem === item.id;
          return (
            <div
              key={item.id}
              className="m-panel-inset hover:border-[var(--m-border-strong)] transition-colors overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenItem(isOpen ? null : item.id)}
                className="w-full p-3 flex items-center justify-between gap-3 text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0">{item.icon}</div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[var(--m-text-primary)]">{item.title}</div>
                    <div className="text-[11px] text-[var(--m-text-muted)] truncate">{item.shortDesc}</div>
                  </div>
                </div>
                <div className="shrink-0 text-[var(--m-text-muted)]">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 pt-2 border-t border-[var(--m-border)] space-y-2 text-xs text-[var(--m-text-secondary)]">
                  <p className="leading-relaxed">{item.fullDesc}</p>
                  <div className="p-2.5 bg-[var(--m-surface-1)] rounded-md border border-[var(--m-border)] text-[11px] text-[var(--m-text-muted)]">
                    <strong className="text-[var(--m-accent)]">Operational Rule: </strong>
                    {item.practicalTip}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DataPanel>
  );
};
