import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { LocationRecord } from '../../types';
import { locationService } from '../../services/locationService';
import { LocatingPhase } from '../../services/geolocationService';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageSelector } from '../common/LanguageSelector';
import { MobileNavDrawer } from './MobileNavDrawer';
import { MainNavTab } from './MainNavigation';
import { FooterView } from './FooterNavigation';
import { UseMyLocationButton } from '../location/UseMyLocationButton';
import { BrandLogo } from './BrandLogo';
import { AudioAlertToggle } from '../common/AudioAlertToggle';

interface GovernmentHeaderProps {
  selectedLocation: LocationRecord;
  onSelectLocation: (loc: LocationRecord) => void;
  onOpenAskMausam?: () => void;
  activeTab?: string;
  onNavigateTab?: (tab: MainNavTab | FooterView) => void;
  activeAlertCount?: number;
  onDetectLocation?: (forceRefresh?: boolean) => Promise<any>;
  onRefreshAll?: () => Promise<void> | void;
  isRefreshing?: boolean;
  isLocating?: boolean;
  locatePhase?: LocatingPhase;
  locationSource?: 'DEVICE_GPS' | 'MANUAL_SEARCH';
  onOpenLocationCenter?: () => void;
  onOpenPrivacyModal?: () => void;
}

export const GovernmentHeader: React.FC<GovernmentHeaderProps> = ({
  selectedLocation,
  onSelectLocation,
  onOpenAskMausam,
  activeTab = 'home',
  onNavigateTab,
  activeAlertCount = 0,
  onDetectLocation,
  isLocating = false,
  locatePhase = 'idle',
  locationSource = 'MANUAL_SEARCH',
  onOpenLocationCenter,
}) => {
  const { t } = useLanguage();
  const [now, setNow] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const istTimeString = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);

  const smartResults = searchQuery.trim()
    ? locationService.smartSearch(searchQuery)
    : [];

  const handleAdjustFontSize = (delta: number) => {
    const next = Math.min(Math.max(fontSizeMultiplier + delta, 0.9), 1.2);
    setFontSizeMultiplier(next);
    document.documentElement.style.fontSize = `${16 * next}px`;
  };

  const handleResetFontSize = () => {
    setFontSizeMultiplier(1);
    document.documentElement.style.fontSize = '16px';
  };

  const handleMyLocationClick = async () => {
    if (onDetectLocation) {
      try {
        await onDetectLocation(true);
      } catch (err) {
        console.debug('[GovernmentHeader] Location detect handled error:', err);
      } finally {
        setIsSearchOpen(false);
      }
    }
  };

  const handleSearchSubmit = () => {
    if (smartResults.length > 0) {
      const top = smartResults[0];
      onSelectLocation(top.location);
      if (onNavigateTab && top.intentTab) {
        onNavigateTab(top.intentTab);
      }
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <header className="w-full bg-[#0B1219]/95 backdrop-blur-md border-b border-white/10 sticky top-0 z-40 select-none">
        <div className="max-w-[1560px] mx-auto px-3 sm:px-4 lg:px-6">
          <div className="h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
            {/* Left: Brand Identity */}
            <BrandLogo onClick={() => onNavigateTab && onNavigateTab('home')} />

            {/* Center: Search + Active Location Selector (Desktop/Tablet) */}
            <div className="relative hidden md:flex items-center flex-1 max-w-xl mx-2 min-w-0 gap-2">
              <div className="relative flex-1 min-w-0">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8EA3B8] text-[18px] pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  id="station-search-input-desktop"
                  placeholder={t('searchPlaceholder', 'Search city, state, or PIN code...')}
                  value={searchQuery}
                  onFocus={() => setIsSearchOpen(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchSubmit();
                    }
                  }}
                  className="w-full h-10 bg-[#101B26] border border-white/12 hover:border-[#38BDF8]/40 focus:border-[#38BDF8] rounded-lg text-[#F4F7FA] placeholder-[#8EA3B8] text-xs pl-9 pr-16 focus:outline-none transition-colors"
                  aria-label={t('searchPlaceholder', 'Search city, state, or PIN code...')}
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-1 text-[#8EA3B8] hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
                      aria-label="Clear search"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                  {onDetectLocation && (
                    <button
                      type="button"
                      id="search-gps-locate-btn"
                      onClick={handleMyLocationClick}
                      disabled={isLocating}
                      title={locationSource === 'DEVICE_GPS' ? 'GPS Active — Refresh coordinates' : 'Detect My Location (GPS)'}
                      className="p-1.5 rounded text-[#38BDF8] hover:text-white hover:bg-[#1499E8]/20 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
                      aria-label="Detect GPS Location"
                    >
                      <span className={`material-symbols-outlined text-[17px] ${isLocating ? 'animate-spin' : ''}`}>
                        {isLocating ? 'progress_activity' : 'my_location'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Desktop Search Dropdown */}
                {isSearchOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsSearchOpen(false)}
                    />
                    <div className="absolute top-11 left-0 right-0 bg-[#101B26] border border-white/15 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto scrollbar-thin">
                      {onDetectLocation && (
                        <div className="p-2 border-b border-white/10 bg-[#0B1219]">
                          <UseMyLocationButton
                            onDetect={handleMyLocationClick}
                            isLocating={isLocating}
                            phase={locatePhase}
                            variant="compact"
                            className="w-full justify-center"
                          />
                        </div>
                      )}

                      <div className="px-3 py-2 border-b border-white/10 text-[11px] text-[#8EA3B8] font-medium flex justify-between">
                        <span>{t('selectStation', 'Select Location')}</span>
                        <span className="text-[#B6C7D8] truncate max-w-[180px]">
                          {selectedLocation.city}, {selectedLocation.state}
                        </span>
                      </div>
                      {smartResults.length > 0 ? (
                        smartResults.slice(0, 10).map((res, idx) => (
                          <div
                            key={`${res.location.id}-${idx}`}
                            onClick={() => {
                              onSelectLocation(res.location);
                              if (onNavigateTab && res.intentTab) {
                                onNavigateTab(res.intentTab);
                              }
                              setIsSearchOpen(false);
                              setSearchQuery('');
                            }}
                            className={`px-3 py-2.5 text-xs hover:bg-[#162331] cursor-pointer flex justify-between items-center border-b border-white/5 transition-colors ${
                              selectedLocation.id === res.location.id ? 'bg-[#1499E8]/15 text-[#F4F7FA] font-semibold' : 'text-[#F4F7FA]'
                            }`}
                          >
                            <div className="flex-1 pr-2 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-[#F4F7FA] truncate">{res.displayTitle}</span>
                                {res.matchedParameter && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1499E8]/20 text-[#38BDF8] font-semibold uppercase">
                                    {res.matchedParameter}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#8EA3B8] truncate">{res.displaySubtitle}</div>
                            </div>
                            <div className="text-[11px] text-[#8EA3B8] shrink-0">{res.location.state}</div>
                          </div>
                        ))
                      ) : searchQuery ? (
                        <div className="p-4 text-xs text-[#8EA3B8] text-center">
                          {t('noStationsFound', 'No matching locations found.')}
                        </div>
                      ) : (
                        <div>
                          <div className="px-3 py-1.5 text-[10px] text-[#8EA3B8] font-semibold uppercase tracking-wider bg-[#162331]/70">
                            Major Indian Cities
                          </div>
                          {[
                            { city: 'New Delhi', state: 'Delhi NCR', id: 'delhi-safdarjung' },
                            { city: 'Bhubaneswar', state: 'Odisha', id: 'odisha-bhubaneswar' },
                            { city: 'Mumbai', state: 'Maharashtra', id: 'mumbai-colaba' },
                            { city: 'Kolkata', state: 'West Bengal', id: 'kolkata-alipore' },
                            { city: 'Chennai', state: 'Tamil Nadu', id: 'chennai-meenambakkam' },
                            { city: 'Bengaluru', state: 'Karnataka', id: 'bengaluru-city' },
                          ].map((hub) => (
                            <div
                              key={hub.id}
                              onClick={() => {
                                const matched =
                                  locationService.findLocationById(hub.id) ||
                                  locationService.findLocationByName(hub.city) ||
                                  locationService.getLocationById(hub.id);
                                if (matched) {
                                  onSelectLocation(matched);
                                }
                                setIsSearchOpen(false);
                                setSearchQuery('');
                              }}
                              className="px-3 py-2 text-xs text-[#B6C7D8] hover:text-[#F4F7FA] hover:bg-[#162331] cursor-pointer flex justify-between items-center transition-colors"
                            >
                              <span className="font-medium">{hub.city}</span>
                              <span className="text-[#8EA3B8] text-[11px]">{hub.state}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Active Location Trigger Button */}
              {onOpenLocationCenter && (
                <button
                  type="button"
                  onClick={onOpenLocationCenter}
                  className="hidden lg:flex items-center gap-1.5 h-10 px-3 rounded-lg bg-[#101B26] hover:bg-[#162331] border border-white/12 text-xs text-[#F4F7FA] transition-colors shrink-0 max-w-[200px] cursor-pointer"
                  title="Switch active location or manage saved places"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                  <span className="truncate font-medium">{selectedLocation.city}</span>
                </button>
              )}
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="hidden 2xl:flex items-center gap-1.5 text-xs font-mono tabular-nums text-[#8EA3B8] pr-2.5 border-r border-white/10">
                <span className="text-[#F4F7FA] font-medium">{istTimeString}</span>
                <span>IST</span>
              </div>

              {onOpenAskMausam && (
                <button
                  type="button"
                  id="header-ask-mausam-button"
                  onClick={onOpenAskMausam}
                  className="flex items-center gap-1.5 h-9 sm:h-10 px-2.5 sm:px-3 rounded-lg bg-[#101B26] hover:bg-[#162331] border border-white/14 hover:border-[#38BDF8]/40 text-[#F4F7FA] text-xs font-semibold transition-colors shrink-0 cursor-pointer"
                  title={t('askMausam', 'Ask MAUSAM')}
                >
                  <span className="material-symbols-outlined text-[16px] text-[#38BDF8]">
                    auto_awesome
                  </span>
                  <span className="hidden sm:inline whitespace-nowrap">Ask MAUSAM</span>
                </button>
              )}

              <div className="hidden sm:flex items-center shrink-0">
                <AudioAlertToggle variant="pill" showLabel={false} />
              </div>

              <div className="hidden sm:flex items-center shrink-0">
                <LanguageSelector
                  stateOrRegion={selectedLocation?.state || selectedLocation?.city}
                  idPrefix="header"
                />
              </div>

              {/* Mobile Location & Drawer Buttons (>= 44px touch targets) */}
              {onOpenLocationCenter && (
                <button
                  type="button"
                  onClick={onOpenLocationCenter}
                  className="md:hidden h-11 px-2.5 rounded-lg bg-[#101B26] border border-white/12 text-[#F4F7FA] flex items-center gap-1 text-xs font-medium max-w-[120px] cursor-pointer"
                  aria-label="Change active city"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                  <span className="truncate">{selectedLocation.city}</span>
                </button>
              )}

              <button
                type="button"
                id="mobile-menu-toggle-btn"
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden w-11 h-11 rounded-lg bg-[#101B26] border border-white/12 text-[#F4F7FA] flex items-center justify-center cursor-pointer transition-colors relative shrink-0"
                aria-label="Open Navigation Menu"
              >
                <span className="material-symbols-outlined text-[20px]">menu</span>
                {activeAlertCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#EF4444] ring-2 ring-[#0B1219]" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Compact Search Strip */}
          <div className="md:hidden pb-2.5 relative">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#8EA3B8] text-[18px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                id="station-search-input-mobile"
                placeholder={t('searchPlaceholder', 'Search city, district, or PIN...')}
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchSubmit();
                  }
                }}
                className="w-full h-11 bg-[#101B26] border border-white/12 rounded-lg text-[#F4F7FA] placeholder-[#8EA3B8] text-xs pl-9 pr-16 focus:outline-none focus:border-[#38BDF8]"
                aria-label={t('searchPlaceholder', 'Search city, district, or PIN...')}
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="w-9 h-9 flex items-center justify-center text-[#8EA3B8] hover:text-white rounded-lg"
                    aria-label="Clear search"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
                {onDetectLocation && (
                  <button
                    type="button"
                    id="search-gps-locate-btn-mobile"
                    onClick={handleMyLocationClick}
                    disabled={isLocating}
                    className="w-9 h-9 rounded-lg text-[#38BDF8] hover:bg-[#1499E8]/20 flex items-center justify-center cursor-pointer disabled:opacity-50"
                    aria-label="Detect GPS Location"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isLocating ? 'animate-spin' : ''}`}>
                      {isLocating ? 'progress_activity' : 'my_location'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Search Dropdown */}
            {isSearchOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsSearchOpen(false)}
                />
                <div className="absolute top-12 left-0 right-0 bg-[#101B26] border border-white/15 rounded-xl shadow-2xl z-50 max-h-[60vh] overflow-y-auto">
                  {onDetectLocation && (
                    <div className="p-2 border-b border-white/10 bg-[#0B1219]">
                      <UseMyLocationButton
                        onDetect={handleMyLocationClick}
                        isLocating={isLocating}
                        phase={locatePhase}
                        variant="compact"
                        className="w-full justify-center min-h-[44px]"
                      />
                    </div>
                  )}

                  {smartResults.length > 0 ? (
                    smartResults.map((res, idx) => (
                      <div
                        key={`${res.location.id}-${idx}`}
                        onClick={() => {
                          onSelectLocation(res.location);
                          if (onNavigateTab && res.intentTab) {
                            onNavigateTab(res.intentTab);
                          }
                          setIsSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="px-3 py-2.5 text-xs hover:bg-[#162331] cursor-pointer flex justify-between items-center border-b border-white/5 min-h-[44px]"
                      >
                        <div className="flex-1 pr-2 min-w-0">
                          <div className="font-semibold text-[#F4F7FA] truncate">{res.displayTitle}</div>
                          <div className="text-[11px] text-[#8EA3B8] truncate">{res.displaySubtitle}</div>
                        </div>
                        <div className="text-[11px] text-[#8EA3B8] shrink-0">{res.location.state}</div>
                      </div>
                    ))
                  ) : searchQuery ? (
                    <div className="p-4 text-xs text-[#8EA3B8] text-center">
                      {t('noStationsFound', 'No matching locations found.')}
                    </div>
                  ) : (
                    <div>
                      <div className="px-3 py-1.5 text-[10px] text-[#8EA3B8] font-semibold uppercase tracking-wider bg-[#162331]">
                        Major Cities
                      </div>
                      {[
                        { city: 'New Delhi', state: 'Delhi NCR', id: 'delhi-safdarjung' },
                        { city: 'Bhubaneswar', state: 'Odisha', id: 'odisha-bhubaneswar' },
                        { city: 'Mumbai', state: 'Maharashtra', id: 'mumbai-colaba' },
                        { city: 'Kolkata', state: 'West Bengal', id: 'kolkata-alipore' },
                        { city: 'Chennai', state: 'Tamil Nadu', id: 'chennai-meenambakkam' },
                        { city: 'Bengaluru', state: 'Karnataka', id: 'bengaluru-city' },
                      ].map((hub) => (
                        <div
                          key={hub.id}
                          onClick={() => {
                            const matched =
                              locationService.findLocationById(hub.id) ||
                              locationService.findLocationByName(hub.city) ||
                              locationService.getLocationById(hub.id);
                            if (matched) {
                              onSelectLocation(matched);
                            }
                            setIsSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="px-3 py-2.5 text-xs text-[#B6C7D8] hover:bg-[#162331] cursor-pointer flex justify-between items-center border-b border-white/5 min-h-[44px]"
                        >
                          <span className="font-medium">{hub.city}</span>
                          <span className="text-[#8EA3B8] text-[11px]">{hub.state}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <MobileNavDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeTab={activeTab}
        onNavigateTab={(tab) => {
          if (onNavigateTab) onNavigateTab(tab);
          setIsMobileMenuOpen(false);
        }}
        activeAlertCount={activeAlertCount}
        selectedLocation={selectedLocation}
        onOpenAskMausam={onOpenAskMausam}
        fontSizeMultiplier={fontSizeMultiplier}
        onAdjustFontSize={handleAdjustFontSize}
        onResetFontSize={handleResetFontSize}
        onDetectLocation={onDetectLocation}
        isLocating={isLocating}
        locatePhase={locatePhase}
        locationSource={locationSource}
        onOpenLocationCenter={onOpenLocationCenter}
      />
    </>
  );
};
