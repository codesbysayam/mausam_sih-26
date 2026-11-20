import React, { useState } from 'react';
import {
  NavigationTab,
  WeatherConditionType,
  WeatherStation,
  WeatherAlert,
  LocationRecord,
} from '../types';
import {
  ALL_INDIA_LOCATIONS,
  GROUPED_INDIA_LOCATIONS,
} from '../data/allIndiaLocations';
import { AlertTicker } from './AlertTicker';
import { IstClock } from './IstClock';
import { DemoWeatherOverride, weatherService } from '../services/weatherService';

interface TopNavBarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  weatherType: WeatherConditionType;
  setWeatherType: (type: WeatherConditionType) => void;
  selectedStation: WeatherStation;
  setSelectedStation: (station: WeatherStation) => void;
  selectedLocation?: LocationRecord;
  onSelectLocation?: (location: LocationRecord) => void;
  alerts: WeatherAlert[];
  onSelectAlert: (alert: WeatherAlert) => void;
  onOpenAskDrawer?: () => void;
  onOpenPlacesModal?: () => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
  onOpenNotifications?: () => void;
  isLiveWeather?: boolean;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeTab,
  setActiveTab,
  weatherType,
  setWeatherType,
  selectedStation,
  setSelectedStation,
  selectedLocation,
  onSelectLocation,
  alerts,
  onSelectAlert,
  onOpenAskDrawer,
  onOpenPlacesModal,
  onOpenSettings,
  onOpenHelp,
  onOpenNotifications,
  isLiveWeather = true,
}) => {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const currentDemo = weatherService.getDemoOverride();

  const weatherThemeBadges: {
    type: WeatherConditionType;
    label: string;
    icon: string;
    activeClass: string;
  }[] = [
    {
      type: 'sunny',
      label: 'Clear',
      icon: 'sunny',
      activeClass: 'bg-[#FFC93C] text-[var(--m-on-accent)] font-semibold shadow-sm',
    },
    {
      type: 'rain',
      label: 'Rain',
      icon: 'rainy',
      activeClass: 'bg-[#3A6EA5] text-[#FFFFFF] font-semibold shadow-sm',
    },
    {
      type: 'thunderstorm',
      label: 'Storm',
      icon: 'thunderstorm',
      activeClass: 'bg-[var(--m-surface-2)] text-[var(--m-text-primary)] font-semibold shadow-sm',
    },
    {
      type: 'fog',
      label: 'Fog',
      icon: 'foggy',
      activeClass: 'bg-[#B8C2CC] text-[var(--m-on-accent)] font-semibold shadow-sm',
    },
    {
      type: 'duststorm',
      label: 'Dust',
      icon: 'air',
      activeClass: 'bg-[#FFB703] text-[var(--m-on-accent)] font-semibold shadow-sm',
    },
  ];

  const handleDemoSelect = (override: DemoWeatherOverride) => {
    weatherService.setDemoOverride(override);
    setShowDemoMenu(false);
    if (selectedLocation && onSelectLocation) {
      onSelectLocation(selectedLocation);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--m-surface-1)] backdrop-blur-md border-b border-[rgba(226, 219, 200,0.12)] select-none font-sans">
      {/* 1. Dynamic Severe Weather Alert Ticker Ribbon */}
      <AlertTicker alerts={alerts} onSelectAlert={onSelectAlert} />

      {/* 2. Top Utility & Brand Ribbon */}
      <div className="max-w-[1440px] mx-auto px-4 py-2.5 flex flex-wrap justify-between items-center gap-3">
        {/* Brand & Location Switcher */}
        <div className="flex items-center gap-3.5">
          <div
            onClick={() => setActiveTab('today')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--m-accent)] flex items-center justify-center text-[#FFFFFF] shadow-md group-hover:bg-[var(--m-accent-hover)] transition-all shrink-0">
              <span className="material-symbols-outlined text-[24px] font-bold">
                cyclone
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[var(--m-text-primary)] tracking-tight leading-tight">
                  MAUSAM
                </h1>
                <span className="px-1.5 py-0.5 rounded bg-[var(--m-accent-soft)] text-[var(--m-accent)] text-[10px] font-semibold border border-[var(--m-accent)]/30">
                  OFFICIAL
                </span>
              </div>
              <p className="text-[13px] text-[var(--m-text-secondary)] leading-none mt-0.5">
                Atmospheric Intelligence &amp; Citizen Weather Platform
              </p>
            </div>
          </div>

          <div className="hidden md:block h-6 w-px bg-[rgba(226, 219, 200,0.12)]"></div>

          {/* Location & District Selector */}
          <div className="flex items-center gap-2 bg-[var(--m-surface-2)] px-3 py-1.5 rounded-lg card-border shadow-xs">
            <span className="material-symbols-outlined text-[var(--m-accent)] text-[18px]">
              location_on
            </span>
            <select
              value={selectedLocation?.id || selectedStation.id}
              onChange={(e) => {
                const loc = ALL_INDIA_LOCATIONS.find((l) => l.id === e.target.value);
                if (loc && onSelectLocation) {
                  onSelectLocation(loc);
                } else {
                  const st = ALL_INDIA_LOCATIONS.find((l) => l.id === e.target.value);
                  if (st) {
                    setSelectedStation({
                      id: st.id,
                      name: st.displayName,
                      code: st.imdStation || 'AWS-IN',
                      state: st.state,
                      district: st.district,
                      lat: st.lat,
                      lng: st.lng,
                      elevation: st.elevation || '35m ASL',
                      status: 'active',
                      pm25: 42,
                      temp: 31,
                      condition: 'Clear',
                      weatherType: 'sunny',
                    });
                  }
                }
              }}
              className="bg-transparent text-xs font-semibold text-[var(--m-text-primary)] focus:outline-none cursor-pointer max-w-[200px] sm:max-w-[260px] truncate"
            >
              {GROUPED_INDIA_LOCATIONS.map((group) => (
                <optgroup key={group.groupName} label={group.groupName}>
                  {group.locations.map((loc) => (
                    <option key={loc.id} value={loc.id} className="bg-[var(--m-surface-2)] text-[var(--m-text-primary)]">
                      {loc.displayName}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {onOpenPlacesModal && (
              <button
                type="button"
                onClick={onOpenPlacesModal}
                title="Browse All India Districts & Radar Stations"
                className="text-[var(--m-accent)] hover:text-[var(--m-text-primary)] p-0.5 rounded hover:bg-[var(--m-surface-3)] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">travel_explore</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-Time IST Clock & Utilities */}
        <div className="flex items-center gap-2.5">
          {/* Real-time IST Clock (UTC+05:30) */}
          <div className="hidden lg:block">
            <IstClock compact={true} />
          </div>

          {/* Theme / Condition Filter Controls */}
          <div className="hidden xl:flex items-center gap-1 bg-[var(--m-surface-2)] p-1 rounded-lg card-border">
            <span className="text-[11px] text-[var(--m-text-secondary)] px-1.5 font-semibold">
              Filter:
            </span>
            {weatherThemeBadges.map((badge) => {
              const isActive = weatherType === badge.type;
              return (
                <button
                  key={badge.type}
                  onClick={() => setWeatherType(badge.type)}
                  title={`Filter weather state: ${badge.label}`}
                  className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 transition-all cursor-pointer font-medium ${
                    isActive
                      ? badge.activeClass
                      : 'text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-3)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">{badge.icon}</span>
                  <span>{badge.label}</span>
                </button>
              );
            })}
          </div>

          {/* Telemetry Calibration & Demo Override Menu */}
          <div className="relative">
            <button
              onClick={() => setShowDemoMenu(!showDemoMenu)}
              title="Telemetry Calibration & Simulation"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
                currentDemo === 'LIVE'
                  ? 'bg-[var(--m-surface-2)] text-[var(--m-text-primary)] border-[rgba(226, 219, 200,0.12)] hover:bg-[var(--m-surface-3)]'
                  : 'bg-[#FFB703]/20 text-[#FFB703] border-[#FFB703]/40'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span className="hidden sm:inline">
                {currentDemo === 'LIVE' ? 'Live Telemetry' : 'Demo Mode'}
              </span>
              <span className="material-symbols-outlined text-[14px]">expand_more</span>
            </button>

            {showDemoMenu && (
              <div className="absolute right-0 mt-1 w-64 bg-[var(--m-surface-2)] card-border rounded-xl p-2 shadow-2xl z-50 animate-in fade-in duration-150">
                <div className="p-2 border-b border-[rgba(226, 219, 200,0.12)] text-[11px] font-bold text-[var(--m-accent)] uppercase tracking-wider">
                  Atmospheric Mode Calibration
                </div>
                <div className="flex flex-col gap-1 py-1 text-xs">
                  <button
                    onClick={() => handleDemoSelect('LIVE')}
                    className={`p-2 rounded text-left flex items-center justify-between cursor-pointer font-medium ${
                      currentDemo === 'LIVE' ? 'bg-[var(--m-accent)] text-[#FFFFFF] font-bold' : 'text-[#FFFFFF] hover:bg-[var(--m-surface-3)]'
                    }`}
                  >
                    <span>● Live Operational Feed</span>
                    {currentDemo === 'LIVE' && <span className="material-symbols-outlined text-[16px]">check</span>}
                  </button>
                  <button
                    onClick={() => handleDemoSelect('TEST_CLEAR_NO_RAIN')}
                    className={`p-2 rounded text-left flex items-center justify-between cursor-pointer font-medium ${
                      currentDemo === 'TEST_CLEAR_NO_RAIN' ? 'bg-[var(--m-accent)] text-[#FFFFFF] font-bold' : 'text-[#FFFFFF] hover:bg-[var(--m-surface-3)]'
                    }`}
                  >
                    <span>Test: Clear Sky (0% Rain)</span>
                  </button>
                  <button
                    onClick={() => handleDemoSelect('TEST_CLEAR_RAIN_LATER')}
                    className={`p-2 rounded text-left flex items-center justify-between cursor-pointer font-medium ${
                      currentDemo === 'TEST_CLEAR_RAIN_LATER' ? 'bg-[var(--m-accent)] text-[#FFFFFF] font-bold' : 'text-[#FFFFFF] hover:bg-[var(--m-surface-3)]'
                    }`}
                  >
                    <span>Test: Clear Now (80% Rain Later)</span>
                  </button>
                  <button
                    onClick={() => handleDemoSelect('TEST_RAIN_NOW')}
                    className={`p-2 rounded text-left flex items-center justify-between cursor-pointer font-medium ${
                      currentDemo === 'TEST_RAIN_NOW' ? 'bg-[var(--m-accent)] text-[#FFFFFF] font-bold' : 'text-[#FFFFFF] hover:bg-[var(--m-surface-3)]'
                    }`}
                  >
                    <span>Test: Active Moderate Rain Now</span>
                  </button>
                  <button
                    onClick={() => handleDemoSelect('TEST_THUNDERSTORM_NOW')}
                    className={`p-2 rounded text-left flex items-center justify-between cursor-pointer font-medium ${
                      currentDemo === 'TEST_THUNDERSTORM_NOW' ? 'bg-[var(--m-accent)] text-[#FFFFFF] font-bold' : 'text-[#FFFFFF] hover:bg-[var(--m-surface-3)]'
                    }`}
                  >
                    <span>Test: Severe Thunderstorm &amp; Squall</span>
                  </button>
                  <button
                    onClick={() => handleDemoSelect('TEST_DENSE_FOG')}
                    className={`p-2 rounded text-left flex items-center justify-between cursor-pointer font-medium ${
                      currentDemo === 'TEST_DENSE_FOG' ? 'bg-[var(--m-accent)] text-[#FFFFFF] font-bold' : 'text-[#FFFFFF] hover:bg-[var(--m-surface-3)]'
                    }`}
                  >
                    <span>Test: Dense Fog / Mist</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Top Utility Icons (Alerts, Settings, Help) */}
          <div className="flex items-center gap-1.5 border-l border-[rgba(226, 219, 200,0.12)] pl-2">
            {onOpenNotifications && (
              <button
                type="button"
                onClick={onOpenNotifications}
                title="Active Weather Bulletins & Feeds"
                className="relative p-2 rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] transition-colors cursor-pointer card-border"
              >
                <span className="material-symbols-outlined text-[18px]">notifications</span>
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E74C3C] text-[9px] font-bold text-[#FFFFFF] flex items-center justify-center animate-pulse">
                    {alerts.length}
                  </span>
                )}
              </button>
            )}

            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                title="Station Calibration & Preferences"
                className="p-2 rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] transition-colors cursor-pointer card-border"
              >
                <span className="material-symbols-outlined text-[18px]">settings</span>
              </button>
            )}

            {onOpenHelp && (
              <button
                type="button"
                onClick={onOpenHelp}
                title="Operational Guide & Sensor Calibration"
                className="p-2 rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] transition-colors cursor-pointer card-border"
              >
                <span className="material-symbols-outlined text-[18px]">help_outline</span>
              </button>
            )}
          </div>

          {/* AI Ask Assistant Button */}
          {onOpenAskDrawer && (
            <button
              onClick={onOpenAskDrawer}
              className="ask-mausam-cursor flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--m-accent)] hover:bg-[var(--m-accent-hover)] text-[#FFFFFF] text-xs font-semibold shadow-sm transition-all border border-[var(--m-accent)]/40"
            >
              <span className="material-symbols-outlined text-[16px]">smart_toy</span>
              <span className="hidden sm:inline">Ask Mausam</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Navigation Tabs Ribbon */}
      <div className="bg-[var(--m-surface-2)] border-t border-[rgba(226, 219, 200,0.12)] overflow-x-auto scrollbar-none">
        <div className="max-w-[1440px] mx-auto px-4 flex items-center gap-1 relative">
          {/* Tab 1: Today / Overview */}
          <button
            onClick={() => setActiveTab('today')}
            className={`px-3.5 py-2.5 text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'today'
                ? 'border-[var(--m-accent)] text-[var(--m-text-primary)] bg-[var(--m-surface-1)]'
                : 'border-transparent text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-3)]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">wb_sunny</span>
            <span>Overview</span>
          </button>

          {/* Tab 2: 7-Day Forecast */}
          <button
            onClick={() => setActiveTab('forecast')}
            className={`px-3.5 py-2.5 text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'forecast'
                ? 'border-[var(--m-accent)] text-[var(--m-text-primary)] bg-[var(--m-surface-1)]'
                : 'border-transparent text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-3)]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">calendar_month</span>
            <span>7-Day Forecast</span>
          </button>

          {/* Tab 3: 24h Hourly Matrix */}
          <button
            onClick={() => setActiveTab('hourly')}
            className={`px-3.5 py-2.5 text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'hourly'
                ? 'border-[var(--m-accent)] text-[var(--m-text-primary)] bg-[var(--m-surface-1)]'
                : 'border-transparent text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-3)]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">schedule</span>
            <span>24h Hourly</span>
          </button>

          {/* Tab 4: Environmental Diagnostics / Insights */}
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-3.5 py-2.5 text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'insights'
                ? 'border-[var(--m-accent)] text-[var(--m-text-primary)] bg-[var(--m-surface-1)]'
                : 'border-transparent text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-3)]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">analytics</span>
            <span>Diagnostics &amp; AQI</span>
          </button>

          {/* Tab 5: Fitness & Outdoor Physiological Activities */}
          <button
            onClick={() => setActiveTab('activities')}
            className={`px-3.5 py-2.5 text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'activities'
                ? 'border-[var(--m-accent)] text-[var(--m-text-primary)] bg-[var(--m-surface-1)]'
                : 'border-transparent text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-3)]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">cardio_load</span>
            <span>Fitness &amp; Outdoors</span>
          </button>

          {/* Tab 6: Dynamic India Radar Map */}
          <button
            onClick={() => setActiveTab('radar')}
            className={`px-3.5 py-2.5 text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'radar'
                ? 'border-[var(--m-accent)] text-[var(--m-text-primary)] bg-[var(--m-surface-1)]'
                : 'border-transparent text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-3)]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">radar</span>
            <span>Radar &amp; Maps</span>
            <span className="px-1 py-0.2 rounded bg-[#2ECC71]/20 text-[#2ECC71] text-[9px] font-bold">
              Live
            </span>
          </button>

          {/* Tab 7: Crowd Source (Citizen IMD) */}
          <button
            onClick={() => setActiveTab('crowdsource')}
            className={`px-3.5 py-2.5 text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'crowdsource'
                ? 'border-[var(--m-accent)] text-[var(--m-text-primary)] bg-[var(--m-surface-1)]'
                : 'border-transparent text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-3)]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px] text-[var(--m-accent)]">groups</span>
            <span>Citizen IMD</span>
          </button>

          {/* Tab 8: Agromet Advisories (Meghdoot) */}
          <button
            onClick={() => setActiveTab('agromet')}
            className={`px-3.5 py-2.5 text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'agromet'
                ? 'border-[#2ECC71] text-[#2ECC71] bg-[var(--m-surface-1)]'
                : 'border-transparent text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-3)]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px] text-[#2ECC71]">agriculture</span>
            <span>Agromet</span>
            <span className="px-1 py-0.2 rounded bg-[#2ECC71]/20 text-[#2ECC71] text-[9px] font-bold">
              Meghdoot
            </span>
          </button>

          {/* Tab 9: Severe Warnings & Bulletins */}
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-3.5 py-2.5 text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'alerts'
                ? 'border-[#E74C3C] text-[#E74C3C] bg-[var(--m-surface-1)]'
                : 'border-transparent text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-3)]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">crisis_alert</span>
            <span>Bulletins</span>
            {alerts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-[#E74C3C]/20 text-[#E74C3C] text-[9px] font-bold">
                {alerts.length}
              </span>
            )}
          </button>

          {/* Tab 10: Forecasting Tools */}
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-3.5 py-2.5 text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'tools'
                ? 'border-[var(--m-accent)] text-[var(--m-text-primary)] bg-[var(--m-surface-1)]'
                : 'border-transparent text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] hover:bg-[var(--m-surface-3)]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">precision_manufacturing</span>
            <span>Forecasting Tools</span>
          </button>
        </div>
      </div>
    </header>
  );
};
