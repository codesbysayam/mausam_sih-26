import React, { useState } from 'react';
import {
  CentralWeatherCondition,
  ALL_TEST_CONDITIONS,
  getConditionLabel,
  getConditionEffectType,
  isPrecipitationCondition,
} from '../../services/weatherConditions';
import { getWeatherVisualConfig } from '../../utils/weatherIcons';
import { WeatherEffects } from '../weather/WeatherEffects';
import {
  CheckCircle2,
  Eye,
  Sliders,
  RotateCcw,
} from 'lucide-react';
import { DataPanel, SectionHeading } from '../ui/ObservatoryPrimitives';

interface WeatherConditionTestBenchProps {
  currentCondition?: CentralWeatherCondition;
  onSelectCondition?: (condition: CentralWeatherCondition | 'LIVE') => void;
  isDay?: boolean;
}

export const WeatherConditionTestBench: React.FC<WeatherConditionTestBenchProps> = ({
  currentCondition = 'CLEAR_NIGHT',
  onSelectCondition,
  isDay = false,
}) => {
  const [selectedCondition, setSelectedCondition] = useState<CentralWeatherCondition>(currentCondition);
  const [testIsDay, setTestIsDay] = useState<boolean>(isDay);
  const [animationOpacity, setAnimationOpacity] = useState<number>(0.75);
  const [switchLog, setSwitchLog] = useState<Array<{ time: string; from: string; to: string }>>([]);

  const handleConditionChange = (newCond: CentralWeatherCondition) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    setSwitchLog((prev) => [
      { time: timeStr, from: selectedCondition, to: newCond },
      ...prev.slice(0, 4),
    ]);
    setSelectedCondition(newCond);
    if (newCond === 'CLEAR_NIGHT' || newCond === 'PARTLY_CLOUDY_NIGHT') {
      setTestIsDay(false);
    } else if (newCond === 'CLEAR_DAY' || newCond === 'PARTLY_CLOUDY_DAY') {
      setTestIsDay(true);
    }
    onSelectCondition?.(newCond);
  };

  const visualConfig = getWeatherVisualConfig(
    getConditionLabel(selectedCondition),
    testIsDay,
    selectedCondition
  );
  const IconComponent = visualConfig.icon;
  const effectType = getConditionEffectType(selectedCondition);

  return (
    <DataPanel
      id="weather-condition-test-bench"
      className="p-5 sm:p-6 text-[var(--m-text-primary)] space-y-5"
    >
      <SectionHeading
        title="Weather Condition & Animation Synchronization Bench"
        subtitle="Verify synchronous Text → Icon → Canvas Animation mapping across atmospheric condition keys"
        icon={<Sliders className="w-4 h-4" />}
        action={
          <button
            type="button"
            onClick={() => onSelectCondition?.('LIVE')}
            className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[var(--m-ok-soft)] text-[var(--m-ok)] border border-[var(--m-ok)]/35 text-xs font-mono font-semibold hover:bg-[var(--m-ok-soft)] transition-colors flex items-center gap-1.5 cursor-pointer m-focus-ring"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Live Feeds</span>
          </button>
        }
      />

      {/* Condition Selector Grid */}
      <div className="space-y-2">
        <div className="text-xs font-mono uppercase tracking-wider text-[var(--m-text-muted)] flex items-center justify-between">
          <span>Select Target Condition</span>
          <span className="text-[var(--m-accent)] font-semibold">{selectedCondition}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {ALL_TEST_CONDITIONS.map((cond) => {
            const isSelected = selectedCondition === cond;
            const isPrecip = isPrecipitationCondition(cond);
            return (
              <button
                key={cond}
                id={`test-condition-btn-${cond.toLowerCase()}`}
                type="button"
                onClick={() => handleConditionChange(cond)}
                className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-mono font-medium transition-colors text-left flex flex-col justify-between gap-1 border cursor-pointer m-focus-ring ${
                  isSelected
                    ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)] text-[var(--m-text-primary)]'
                    : 'bg-[var(--m-surface-inset)] border-[var(--m-border)] text-[var(--m-text-secondary)] hover:bg-[var(--m-surface-2)] hover:border-[var(--m-border-strong)]'
                }`}
              >
                <div className="flex items-center justify-between w-full gap-1">
                  <span className="truncate">{cond}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--m-accent)] shrink-0" />}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--m-text-muted)]">
                  {isPrecip ? (
                    <span className="text-[var(--m-accent)] font-semibold">Precip: YES</span>
                  ) : (
                    <span>Precip: NO</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Visual Verification Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--m-text-muted)]">
            <span className="font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              Active Canvas Output Preview
            </span>
            <span className="font-mono text-[var(--m-accent)]">
              Effect: <strong>{effectType.toUpperCase()}</strong>
            </span>
          </div>

          <div className="relative h-64 rounded-xl overflow-hidden border border-[var(--m-border)] bg-[var(--m-surface-inset)] p-5 flex flex-col justify-between">
            <WeatherEffects condition={selectedCondition} isDay={testIsDay} opacity={animationOpacity} />

            <div className="relative z-10 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[var(--m-surface-1)]/90 border border-[var(--m-border)] flex items-center justify-center">
                  <IconComponent className={`w-7 h-7 ${visualConfig.iconColor}`} />
                </div>
                <div>
                  <div className="text-[11px] uppercase font-mono text-[var(--m-text-muted)]">Resolved Label</div>
                  <div className="text-lg font-bold text-[var(--m-text-primary)]">
                    {getConditionLabel(selectedCondition)}
                  </div>
                </div>
              </div>

              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[var(--m-surface-inset)] border border-[var(--m-border)] text-[var(--m-accent)]">
                {testIsDay ? 'DAY MODE' : 'NIGHT MODE'}
              </span>
            </div>

            <div className="relative z-10 pt-3 border-t border-[var(--m-border)] flex items-center justify-between text-xs font-mono gap-2">
              <span className="text-[var(--m-text-secondary)] truncate">{visualConfig.description}</span>
              <span className="text-[var(--m-ok)] flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Synchronized
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 m-panel-inset p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--m-text-muted)] font-bold border-b border-[var(--m-border)] pb-2">
              Synchronization Audit Matrix
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)]">
                <span className="text-[var(--m-text-muted)]">1. Data Condition Key</span>
                <strong className="font-mono text-[var(--m-accent)]">{selectedCondition}</strong>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)]">
                <span className="text-[var(--m-text-muted)]">2. UI Display Label</span>
                <strong className="text-[var(--m-text-primary)]">{getConditionLabel(selectedCondition)}</strong>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)]">
                <span className="text-[var(--m-text-muted)]">3. Lucide Vector Icon</span>
                <span className="font-mono text-[var(--m-watch)] font-semibold flex items-center gap-1">
                  <IconComponent className="w-3.5 h-3.5" />
                  {IconComponent.displayName || IconComponent.name || 'LucideIcon'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)]">
                <span className="text-[var(--m-text-muted)]">4. Active Particle Engine</span>
                <strong className="font-mono text-[var(--m-accent)]">{effectType}</strong>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)]">
                <span className="text-[var(--m-text-muted)]">5. Clear-Sky Precip Guard</span>
                <strong
                  className={`font-mono ${
                    selectedCondition.includes('CLEAR') && isPrecipitationCondition(selectedCondition)
                      ? 'text-[var(--m-danger)] font-bold'
                      : 'text-[var(--m-ok)]'
                  }`}
                >
                  {selectedCondition.includes('CLEAR') && isPrecipitationCondition(selectedCondition)
                    ? 'FAIL: Precip active'
                    : 'PASS: Clear'}
                </strong>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--m-border)]">
            <div className="flex items-center justify-between text-xs text-[var(--m-text-muted)] tabular-nums">
              <span>Effect Opacity</span>
              <span className="font-mono text-[var(--m-accent)]">{Math.round(animationOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={animationOpacity}
              onChange={(e) => setAnimationOpacity(parseFloat(e.target.value))}
              aria-label="Effect opacity"
              className="w-full accent-[#35C7E8] cursor-pointer"
            />
          </div>

          {switchLog.length > 0 && (
            <div className="text-[10px] font-mono text-[var(--m-text-muted)] pt-1 tabular-nums">
              <span>Recent switch: </span>
              <span className="text-[var(--m-text-secondary)]">
                {switchLog[0].from} → {switchLog[0].to} at {switchLog[0].time}
              </span>
            </div>
          )}
        </div>
      </div>
    </DataPanel>
  );
};
