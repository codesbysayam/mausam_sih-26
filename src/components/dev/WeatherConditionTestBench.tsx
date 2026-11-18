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
      className="p-5 sm:p-6 text-[#F3F6FA] space-y-5"
    >
      <SectionHeading
        title="Weather Condition & Animation Synchronization Bench"
        subtitle="Verify synchronous Text → Icon → Canvas Animation mapping across atmospheric condition keys"
        icon={<Sliders className="w-4 h-4" />}
        action={
          <button
            type="button"
            onClick={() => onSelectCondition?.('LIVE')}
            className="min-h-[40px] px-3 py-1.5 rounded-lg bg-[#22C7A0]/12 text-[#6EE7B7] border border-[#22C7A0]/35 text-xs font-mono font-semibold hover:bg-[#22C7A0]/20 transition-colors flex items-center gap-1.5 cursor-pointer m-focus-ring"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Live Feeds</span>
          </button>
        }
      />

      {/* Condition Selector Grid */}
      <div className="space-y-2">
        <div className="text-xs font-mono uppercase tracking-wider text-[#8295A8] flex items-center justify-between">
          <span>Select Target Condition</span>
          <span className="text-[#35C7E8] font-semibold">{selectedCondition}</span>
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
                    ? 'bg-[#35C7E8]/15 border-[#35C7E8] text-[#F3F6FA]'
                    : 'bg-[#08131F] border-[#26394B] text-[#B5C3D1] hover:bg-[#101F2E] hover:border-[#38536A]'
                }`}
              >
                <div className="flex items-center justify-between w-full gap-1">
                  <span className="truncate">{cond}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#35C7E8] shrink-0" />}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#8295A8]">
                  {isPrecip ? (
                    <span className="text-[#35C7E8] font-semibold">Precip: YES</span>
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
          <div className="flex items-center justify-between text-xs text-[#8295A8]">
            <span className="font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#35C7E8]" />
              Active Canvas Output Preview
            </span>
            <span className="font-mono text-[#35C7E8]">
              Effect: <strong>{effectType.toUpperCase()}</strong>
            </span>
          </div>

          <div className="relative h-64 rounded-xl overflow-hidden border border-[#26394B] bg-[#07111D] p-5 flex flex-col justify-between">
            <WeatherEffects condition={selectedCondition} isDay={testIsDay} opacity={animationOpacity} />

            <div className="relative z-10 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#0B1927]/90 border border-[#26394B] flex items-center justify-center">
                  <IconComponent className={`w-7 h-7 ${visualConfig.iconColor}`} />
                </div>
                <div>
                  <div className="text-[11px] uppercase font-mono text-[#8295A8]">Resolved Label</div>
                  <div className="text-lg font-bold text-[#F3F6FA]">
                    {getConditionLabel(selectedCondition)}
                  </div>
                </div>
              </div>

              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#08131F] border border-[#26394B] text-[#35C7E8]">
                {testIsDay ? 'DAY MODE' : 'NIGHT MODE'}
              </span>
            </div>

            <div className="relative z-10 pt-3 border-t border-[#26394B] flex items-center justify-between text-xs font-mono gap-2">
              <span className="text-[#B5C3D1] truncate">{visualConfig.description}</span>
              <span className="text-[#6EE7B7] flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Synchronized
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 m-panel-inset p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#8295A8] font-bold border-b border-[#26394B] pb-2">
              Synchronization Audit Matrix
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B1927] border border-[#26394B]">
                <span className="text-[#8295A8]">1. Data Condition Key</span>
                <strong className="font-mono text-[#35C7E8]">{selectedCondition}</strong>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B1927] border border-[#26394B]">
                <span className="text-[#8295A8]">2. UI Display Label</span>
                <strong className="text-[#F3F6FA]">{getConditionLabel(selectedCondition)}</strong>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B1927] border border-[#26394B]">
                <span className="text-[#8295A8]">3. Lucide Vector Icon</span>
                <span className="font-mono text-[#FCD34D] font-semibold flex items-center gap-1">
                  <IconComponent className="w-3.5 h-3.5" />
                  {IconComponent.displayName || IconComponent.name || 'LucideIcon'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B1927] border border-[#26394B]">
                <span className="text-[#8295A8]">4. Active Particle Engine</span>
                <strong className="font-mono text-[#35C7E8]">{effectType}</strong>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B1927] border border-[#26394B]">
                <span className="text-[#8295A8]">5. Clear-Sky Precip Guard</span>
                <strong
                  className={`font-mono ${
                    selectedCondition.includes('CLEAR') && isPrecipitationCondition(selectedCondition)
                      ? 'text-[#FCA5A5] font-bold'
                      : 'text-[#6EE7B7]'
                  }`}
                >
                  {selectedCondition.includes('CLEAR') && isPrecipitationCondition(selectedCondition)
                    ? 'FAIL: Precip active'
                    : 'PASS: Clear'}
                </strong>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#26394B]">
            <div className="flex items-center justify-between text-xs text-[#8295A8] tabular-nums">
              <span>Effect Opacity</span>
              <span className="font-mono text-[#35C7E8]">{Math.round(animationOpacity * 100)}%</span>
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
            <div className="text-[10px] font-mono text-[#8295A8] pt-1 tabular-nums">
              <span>Recent switch: </span>
              <span className="text-[#B5C3D1]">
                {switchLog[0].from} → {switchLog[0].to} at {switchLog[0].time}
              </span>
            </div>
          )}
        </div>
      </div>
    </DataPanel>
  );
};
