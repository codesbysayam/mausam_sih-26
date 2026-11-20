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

      <div className="overflow-x-auto pb-2 scrollbar-thin">
        <div className="flex gap-2 min-w-[720px]">
          {displayItems.map((item, idx) => (
            <div
              key={idx}
              className={`flex-1 bg-[var(--m-surface-2)] border rounded p-2.5 flex flex-col items-center text-center justify-between min-w-[85px] ${
                item.isNow
                  ? 'border-[var(--m-accent)] bg-[var(--m-accent-soft)]'
                  : 'border-[var(--m-border-strong)]'
              }`}
            >
              <div className="text-xs font-bold text-[var(--m-text-primary)]">
                {item.time}
                {item.isNow && (
                  <span className="block text-[10px] text-[var(--m-accent)] font-normal">
                    ({language === 'hi' ? 'अब' : language === 'or' ? 'ଏବେ' : 'Now'})
                  </span>
                )}
              </div>

              <div className="my-2 flex flex-col items-center">
                <span className="text-lg font-bold text-white font-mono">
                  {typeof item.temp === 'number' && !Number.isNaN(item.temp) ? `${Math.round(item.temp)}°C` : '—'}
                </span>
                <span className="text-[11px] text-[var(--m-text-secondary)] line-clamp-1 mt-0.5 max-w-[80px]">
                  {tCondition(item.condition)}
                </span>
              </div>

              <div className="w-full pt-1.5 border-t border-[var(--m-border-strong)] text-[11px] text-[var(--m-text-secondary)] flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span>{language === 'hi' ? 'वर्षा' : language === 'or' ? 'ବର୍ଷା' : 'Rain'}</span>
                  <span className="text-[var(--m-accent)] font-bold font-mono">
                    {item.precipitationProbability || 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span>{language === 'hi' ? 'हवा' : language === 'or' ? 'ପବନ' : 'Wind'}</span>
                  <span className="text-[var(--m-text-primary)] font-mono">
                    {item.windSpeed || 10}k
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
