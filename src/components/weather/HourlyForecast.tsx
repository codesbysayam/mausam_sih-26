import React from 'react';
import { HourlyForecastItem } from '../../types';
import { SectionHeader } from '../common/SectionHeader';
import { useLanguage } from '../../i18n/LanguageContext';

interface HourlyForecastProps {
  hourly: HourlyForecastItem[];
  modelType?: 'WRF' | 'GEFS' | 'ECMWF';
  modelSubtitle?: string;
}

export const HourlyForecast: React.FC<HourlyForecastProps> = ({
  hourly,
  modelType = 'WRF',
  modelSubtitle,
}) => {
  const { t, tCondition, language } = useLanguage();
  const displayItems = hourly.slice(0, 12);

  const modelLabels = {
    WRF: 'IMD-WRF 3km Mesoscale High-Res Model',
    GEFS: 'Global Ensemble Forecast System (GEFS 12km)',
    ECMWF: 'ECMWF Integrated Forecasting System (IFS 9km HRES)',
  };

  const defaultSubtitle = `Nowcasting projection calibrated via ${modelLabels[modelType]}`;

  return (
    <div className="mausam-card">
      <SectionHeader
        title={t('hourlyForecast', '24-Hour Synoptic Hourly Forecast')}
        subtitle={modelSubtitle || defaultSubtitle}
        icon="schedule"
      />

      <div className="overflow-x-auto pb-2 scrollbar-thin snap-x snap-mandatory">
        <div className="flex gap-2.5 min-w-max">
          {displayItems.map((item, idx) => {
            const rainVal =
              typeof item.precipitationProbability === 'number' && Number.isFinite(item.precipitationProbability)
                ? Math.round(item.precipitationProbability)
                : typeof item.rainProb === 'number' && Number.isFinite(item.rainProb)
                ? Math.round(item.rainProb)
                : null;
            const windVal =
              typeof item.windSpeed === 'number' && Number.isFinite(item.windSpeed)
                ? Math.round(item.windSpeed)
                : null;
            return (
              <div
                key={idx}
                className={`snap-start bg-[var(--m-surface-2)] border rounded-lg p-3 flex flex-col items-center text-center justify-between min-w-[116px] w-[120px] shrink-0 ${
                  item.isNow
                    ? 'border-[var(--m-accent)] bg-[var(--m-accent-soft)]'
                    : 'border-[var(--m-border-strong)]'
                }`}
              >
                <div className="text-xs font-bold font-mono tabular-nums text-[var(--m-text-primary)]">
                  {item.time}
                  {item.isNow && (
                    <span className="block text-[10px] font-sans text-[var(--m-accent)] font-semibold">
                      ({language === 'hi' ? 'अब' : language === 'or' ? 'ଏବେ' : 'Now'})
                    </span>
                  )}
                </div>

                <div className="my-2.5 flex flex-col items-center">
                  <span className="text-lg font-bold text-[var(--m-text-primary)] font-mono tabular-nums">
                    {typeof item.temp === 'number' && Number.isFinite(item.temp) ? `${Math.round(item.temp)}°C` : '—'}
                  </span>
                  <span className="text-[11px] text-[var(--m-text-secondary)] line-clamp-1 mt-0.5 max-w-[96px]">
                    {item.condition ? tCondition(item.condition) : '—'}
                  </span>
                </div>

                <div className="w-full pt-1.5 border-t border-[var(--m-border-strong)] text-[11px] text-[var(--m-text-secondary)] flex flex-col gap-0.5 font-mono tabular-nums">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-sans">{language === 'hi' ? 'वर्षा' : language === 'or' ? 'ବର୍ଷା' : 'Rain'}</span>
                    <span className="text-[var(--m-accent)] font-bold">
                      {rainVal !== null ? `${rainVal}%` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-sans">{language === 'hi' ? 'हवा' : language === 'or' ? 'ପବନ' : 'Wind'}</span>
                    <span className="text-[var(--m-text-primary)]">
                      {windVal !== null ? `${windVal} km/h` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
