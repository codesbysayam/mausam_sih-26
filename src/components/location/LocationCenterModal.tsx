import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  ShieldCheck,
  Radio,
  Clock,
  Crosshair,
  Navigation,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Pin,
  Wind,
  Droplets,
  Loader2,
} from 'lucide-react';
import { LocationRecord, WeatherPin } from '../../types';
import { locationService } from '../../services/locationService';
import { UseMyLocationButton } from './UseMyLocationButton';
import { LocatingPhase } from '../../hooks/useUserLocation';
import { GeolocationServiceError, NearestStationResult } from '../../services/geolocationService';
import { formatCoordinatePair } from '../../../shared/weatherContract';

function formatWeatherCondition(code?: number): string {
  if (code === undefined || code === null) return '—';
  if (code === 0) return 'Clear Sky';
  if (code === 1) return 'Mainly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Foggy';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Fair';
}

interface LocationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLocation: LocationRecord;
  locationSource: 'DEVICE_GPS' | 'MANUAL_SEARCH';
  isLocating: boolean;
  locatePhase: LocatingPhase;
  locateError: GeolocationServiceError | null;
  accuracyMeters: number | null;
  lastDetectedAt: Date | null;
  nearestStationInfo: NearestStationResult | null;
  onDetectLocation: (forceRefresh?: boolean) => Promise<any>;
  onSelectLocation: (loc: LocationRecord) => void;
  onClearSavedLocation: () => void;
  onOpenPrivacyModal: () => void;
}

const POPULAR_HUBS = [
  { name: 'New Delhi', id: 'delhi-safdarjung', state: 'Delhi NCR' },
  { name: 'Bhubaneswar', id: 'od-bhubaneswar', state: 'Odisha' },
  { name: 'Mumbai', id: 'mh-mumbai', state: 'Maharashtra' },
  { name: 'Kolkata', id: 'wb-kolkata', state: 'West Bengal' },
  { name: 'Bengaluru', id: 'ka-bengaluru', state: 'Karnataka' },
  { name: 'Chennai', id: 'tn-chennai', state: 'Tamil Nadu' },
  { name: 'Hyderabad', id: 'ts-hyderabad', state: 'Telangana' },
  { name: 'Guwahati', id: 'as-guwahati', state: 'Assam' },
  { name: 'Srinagar', id: 'jk-srinagar', state: 'Jammu & Kashmir' },
  { name: 'Jaipur', id: 'rj-jaipur', state: 'Rajasthan' },
  { name: 'Lucknow', id: 'up-lucknow', state: 'Uttar Pradesh' },
  { name: 'Ahmedabad', id: 'gj-ahmedabad', state: 'Gujarat' },
];

export const LocationCenterModal: React.FC<LocationCenterModalProps> = ({
  isOpen,
  onClose,
  selectedLocation,
  locationSource,
  isLocating,
  locatePhase,
  locateError,
  accuracyMeters,
  lastDetectedAt,
  nearestStationInfo,
  onDetectLocation,
  onSelectLocation,
  onClearSavedLocation,
  onOpenPrivacyModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentPins, setRecentPins] = useState<WeatherPin[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('mausam_recent_pins_v1');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isSnapping, setIsSnapping] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [snapshotSuccess, setSnapshotSuccess] = useState<string | null>(null);

  const takeSnapshot = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setSnapshotError('Browser geolocation is not supported in this environment.');
      return;
    }

    setIsSnapping(true);
    setSnapshotError(null);
    setSnapshotSuccess(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);

        try {
          let temp: number | null = null;
          let feelsLike: number | null = null;
          let condition = '—';
          let humidity: number | null = null;
          let windSpeed: number | null = null;
          let city = '';
          let district = '';
          let state = '';

          try {
            const res = await fetch(`/api/weather?mode=current&lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}`);
            if (res.ok) {
              const json = await res.json();
              const wData = json.data || json;
              if (wData) {
                const rawTemp = wData.temperature ?? wData.temp;
                temp = typeof rawTemp === 'number' && Number.isFinite(rawTemp) ? Math.round(rawTemp) : null;
                const rawFeels = wData.feelsLike;
                feelsLike =
                  typeof rawFeels === 'number' && Number.isFinite(rawFeels)
                    ? Math.round(rawFeels)
                    : temp;
                condition = wData.condition || formatWeatherCondition(wData.weatherCode);
                humidity =
                  typeof wData.humidity === 'number' && Number.isFinite(wData.humidity)
                    ? Math.round(wData.humidity)
                    : null;
                windSpeed =
                  typeof wData.windSpeed === 'number' && Number.isFinite(wData.windSpeed)
                    ? Math.round(wData.windSpeed)
                    : null;
                city = wData.location?.city || wData.location?.name || '';
                district = wData.location?.district || '';
                state = wData.location?.state || '';
              }
            } else {
              throw new Error('API returned status ' + res.status);
            }
          } catch {
            const omRes = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`
            );
            if (omRes.ok) {
              const omJson = await omRes.json();
              const curr = omJson.current || {};
              temp =
                typeof curr.temperature_2m === 'number' && Number.isFinite(curr.temperature_2m)
                  ? Math.round(curr.temperature_2m)
                  : null;
              feelsLike =
                typeof curr.apparent_temperature === 'number' && Number.isFinite(curr.apparent_temperature)
                  ? Math.round(curr.apparent_temperature)
                  : temp;
              condition = formatWeatherCondition(curr.weather_code);
              humidity =
                typeof curr.relative_humidity_2m === 'number' && Number.isFinite(curr.relative_humidity_2m)
                  ? Math.round(curr.relative_humidity_2m)
                  : null;
              windSpeed =
                typeof curr.wind_speed_10m === 'number' && Number.isFinite(curr.wind_speed_10m)
                  ? Math.round(curr.wind_speed_10m)
                  : null;
            }
          }

          if (temp === null) {
            setSnapshotError('Live atmospheric telemetry unavailable for this coordinate right now.');
            return;
          }

          const label = city || district || formatCoordinatePair(lat, lng, 3);
          const formattedTime =
            new Intl.DateTimeFormat('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            }).format(new Date()) + ' IST';

          const newPin: WeatherPin = {
            id: `pin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            lat,
            lng,
            label,
            city: city || label,
            district: district || city || label,
            state: state || 'India',
            temperature: temp,
            feelsLike: feelsLike ?? temp,
            condition,
            humidity: humidity ?? undefined,
            windSpeed: windSpeed ?? undefined,
            accuracyMeters: accuracy,
            timestamp: formattedTime,
            rawTimestamp: Date.now(),
          };

          setRecentPins((prev) => {
            const filtered = prev.filter((p) => Math.abs(p.lat - lat) > 0.005 || Math.abs(p.lng - lng) > 0.005);
            const updated = [newPin, ...filtered].slice(0, 10);
            try {
              localStorage.setItem('mausam_recent_pins_v1', JSON.stringify(updated));
            } catch {}
            return updated;
          });

          setSnapshotSuccess(`Pinned ${label} · ${temp}°C (${condition})`);
          setTimeout(() => setSnapshotSuccess(null), 4500);
        } catch (err: any) {
          setSnapshotError(err?.message || 'Failed to capture weather snapshot.');
        } finally {
          setIsSnapping(false);
        }
      },
      (err) => {
        setIsSnapping(false);
        if (err.code === err.PERMISSION_DENIED) {
          setSnapshotError('Geolocation permission was denied. Please allow location access in your browser.');
        } else if (err.code === err.TIMEOUT) {
          setSnapshotError('Location request timed out. Please retry.');
        } else {
          setSnapshotError('Could not acquire GPS position (' + err.message + ').');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSelectPin = (pin: WeatherPin) => {
    const loc: LocationRecord = {
      id: `pin-${pin.lat.toFixed(4)}-${pin.lng.toFixed(4)}`,
      displayName: `${pin.label} (Pinned Snapshot)`,
      name: pin.label,
      city: pin.city || pin.label,
      district: pin.district || pin.city || pin.label,
      state: pin.state || 'India',
      lat: pin.lat,
      lng: pin.lng,
      weatherStation: `${pin.label} Observation Point`,
      timezone: 'Asia/Kolkata',
    };
    onSelectLocation(loc);
    onClose();
  };

  const handleDeletePin = (pinId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentPins((prev) => {
      const updated = prev.filter((p) => p.id !== pinId);
      try {
        localStorage.setItem('mausam_recent_pins_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClearAllPins = () => {
    setRecentPins([]);
    try {
      localStorage.removeItem('mausam_recent_pins_v1');
    } catch {}
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return locationService.searchLocations(searchQuery).slice(0, 8);
  }, [searchQuery]);

  if (!isOpen) return null;

  const isGps = locationSource === 'DEVICE_GPS';

  const formatISTTime = (d: Date | null) => {
    if (!d) return '—';
    return (
      d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }) + ' IST'
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-center-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div
        id="location-center-dialog"
        className="relative w-full max-w-2xl bg-[var(--m-surface-1)] border border-[var(--m-border)] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--m-border)] bg-[var(--m-surface-inset)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/35 flex items-center justify-center text-[var(--m-accent)]">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h2 id="location-center-title" className="text-base font-bold text-[var(--m-text-primary)] tracking-tight">
                Location &amp; Station Management
              </h2>
              <p className="text-[11px] font-mono text-[var(--m-text-muted)]">
                Configure Active Meteorological Observation Point
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] rounded-lg bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close Location Dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[var(--m-text-secondary)]">
          {/* Active Location Card */}
          <div className="p-4 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border)] relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 ${
                      isGps
                        ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35'
                        : 'bg-[var(--m-accent-soft)] text-[var(--m-accent)] border-[var(--m-accent)]/35'
                    }`}
                  >
                    {isGps ? (
                      <>
                        <Crosshair className="w-3 h-3" />
                        DEVICE GPS LOCATION
                      </>
                    ) : (
                      <>
                        <Search className="w-3 h-3" />
                        MANUAL STATION SELECTION
                      </>
                    )}
                  </span>
                  <span className="text-[10px] text-[var(--m-ok)] bg-[var(--m-ok-soft)] px-2 py-0.5 rounded border border-[var(--m-ok)]/30 font-mono">
                    ACTIVE
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[var(--m-text-primary)] tracking-tight">
                  {selectedLocation.city || selectedLocation.district}
                </h3>
                <p className="text-xs text-[var(--m-text-muted)]">
                  {selectedLocation.district}, {selectedLocation.state}, India
                  {selectedLocation.pincode ? ` · PIN ${selectedLocation.pincode}` : ''}
                </p>
              </div>

              {/* Coordinates & Accuracy */}
              <div className="text-right sm:self-start bg-[var(--m-surface-inset)] p-2.5 rounded-lg border border-[var(--m-border)] text-[11px] font-mono tabular-nums shrink-0">
                <div className="text-[var(--m-accent)]">
                  {formatCoordinatePair(selectedLocation.lat, selectedLocation.lng, 4)}
                </div>
                {accuracyMeters !== null && (
                  <div className="text-[var(--m-ok)] text-[10px] mt-0.5">
                    Accuracy: ±{accuracyMeters} m
                  </div>
                )}
                <div className="text-[var(--m-text-muted)] text-[10px] mt-0.5">
                  Elev: {selectedLocation.elevation || '—'}
                </div>
              </div>
            </div>

            {/* Nearest Observation Telemetry Station Info */}
            <div className="mt-3.5 pt-3 border-t border-[var(--m-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-2 text-[var(--m-text-muted)]">
                <Radio className="w-3.5 h-3.5 text-[var(--m-accent)]" />
                <span>
                  Nearest IMD Observatory:{' '}
                  <strong className="text-[var(--m-text-primary)]">
                    {nearestStationInfo?.name || selectedLocation.weatherStation || selectedLocation.displayName}
                  </strong>
                </span>
              </div>
              {nearestStationInfo && (
                <span className="text-[var(--m-accent)] font-mono tabular-nums">
                  {nearestStationInfo.distanceKm} km from position
                </span>
              )}
            </div>

            {/* Observation Timestamp */}
            <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--m-text-muted)] font-mono tabular-nums">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Detection Time: {formatISTTime(lastDetectedAt)}</span>
              </div>
              <span>Data: IMD AWS Network / Open-Meteo</span>
            </div>
          </div>

          {/* Action Row: Primary Use My Location CTA & Snapshot Button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-[var(--m-accent-soft)] border border-[var(--m-accent)]/30 flex flex-col justify-between gap-3">
              <div>
                <span className="font-bold text-[var(--m-text-primary)] text-xs flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-[var(--m-accent)]" />
                  Automatic Detection
                </span>
                <span className="text-[11px] text-[var(--m-text-muted)] mt-1 block">
                  Resolve device position to the nearest official IMD observatory.
                </span>
              </div>

              <UseMyLocationButton
                onDetectLocation={onDetectLocation}
                isLocating={isLocating}
                locatePhase={locatePhase}
                locateError={locateError}
                locationSource={locationSource}
                variant="primary"
              />
            </div>

            <div className="p-4 rounded-xl bg-[var(--m-ok-soft)] border border-[var(--m-ok)]/30 flex flex-col justify-between gap-3">
              <div>
                <span className="font-bold text-[var(--m-text-primary)] text-xs flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[var(--m-ok)]" />
                  Coordinate Snapshot
                </span>
                <span className="text-[11px] text-[var(--m-text-muted)] mt-1 block">
                  Grab browser GPS coordinates, fetch live weather summary, and save to Recent Pins.
                </span>
              </div>

              <button
                id="location-center-snapshot-btn"
                type="button"
                onClick={takeSnapshot}
                disabled={isSnapping}
                className="w-full px-4 min-h-[44px] sm:min-h-[38px] rounded-xl bg-[#22C7A0] hover:opacity-95 text-[#07111D] font-bold text-xs flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 cursor-pointer"
              >
                {isSnapping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Snapping Weather…</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Snapshot</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {snapshotError && (
            <div className="p-3 rounded-xl bg-[var(--m-danger-soft)] border border-[var(--m-danger)]/35 flex items-center justify-between text-xs text-[var(--m-danger)]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--m-danger)]" />
                <span>{snapshotError}</span>
              </div>
              <button
                type="button"
                onClick={() => setSnapshotError(null)}
                aria-label="Dismiss error"
                className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {snapshotSuccess && (
            <div className="p-3 rounded-xl bg-[var(--m-ok-soft)] border border-[var(--m-ok)]/35 flex items-center justify-between text-xs text-[var(--m-ok)]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{snapshotSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setSnapshotSuccess(null)}
                aria-label="Dismiss confirmation"
                className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Recent Pins Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pin className="w-3.5 h-3.5 text-[var(--m-accent)]" />
                <span className="font-bold text-[var(--m-text-primary)] text-xs">Recent Pins</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums bg-[var(--m-surface-2)] text-[var(--m-accent)] border border-[var(--m-border)]">
                  {recentPins.length}
                </span>
              </div>

              {recentPins.length > 0 && (
                <button
                  id="btn-clear-recent-pins"
                  type="button"
                  onClick={handleClearAllPins}
                  className="text-[11px] text-[var(--m-text-muted)] hover:text-[var(--m-danger)] flex items-center gap-1 transition-colors cursor-pointer min-h-[36px] px-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All Pins</span>
                </button>
              )}
            </div>

            {recentPins.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[var(--m-border)] bg-[var(--m-surface-inset)] text-center text-[var(--m-text-muted)]">
                <Pin className="w-5 h-5 mx-auto mb-1.5 opacity-40 text-[var(--m-accent)]" />
                <p className="text-xs text-[var(--m-text-primary)] font-medium">No Pinned Weather Snapshots Yet</p>
                <p className="text-[11px] text-[var(--m-text-muted)] mt-0.5">
                  Click the <strong className="text-[var(--m-ok)]">Snapshot</strong> button above to capture coordinate weather metrics and pin them here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {recentPins.map((pin) => (
                  <div
                    key={pin.id}
                    id={`pin-card-${pin.id}`}
                    className="p-3 rounded-xl bg-[var(--m-surface-2)] border border-[var(--m-border)] hover:border-[var(--m-accent)]/50 transition-colors text-left flex flex-col justify-between gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectPin(pin)}
                        className="min-w-0 flex-1 text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[var(--m-text-primary)] text-xs truncate group-hover:text-[var(--m-accent)] transition-colors">
                            {pin.label}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-[var(--m-surface-inset)] text-[var(--m-text-muted)] border border-[var(--m-border)]">
                            {pin.state}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono tabular-nums text-[var(--m-text-muted)] mt-0.5">
                          {formatCoordinatePair(pin.lat, pin.lng, 3)}
                          {pin.accuracyMeters ? ` · ±${pin.accuracyMeters}m` : ''}
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-sm font-bold text-[var(--m-text-primary)] font-mono tabular-nums">
                          {typeof pin.temperature === 'number' ? `${pin.temperature}°C` : '—'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeletePin(pin.id, e)}
                          title="Remove Pin"
                          className="w-7 h-7 rounded-md hover:bg-[var(--m-danger-soft)] text-[var(--m-text-muted)] hover:text-[var(--m-danger)] flex items-center justify-center transition-colors cursor-pointer"
                          aria-label={`Remove pin for ${pin.label}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] border-t border-[var(--m-border)] pt-2 text-[var(--m-text-muted)]">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--m-accent)] bg-[var(--m-accent-soft)] px-1.5 py-0.5 rounded font-medium">
                          {pin.condition}
                        </span>
                        {pin.humidity !== undefined && (
                          <span className="flex items-center gap-0.5 font-mono tabular-nums">
                            <Droplets className="w-2.5 h-2.5 text-[var(--m-accent)]" />
                            {pin.humidity}%
                          </span>
                        )}
                        {pin.windSpeed !== undefined && (
                          <span className="flex items-center gap-0.5 font-mono tabular-nums">
                            <Wind className="w-2.5 h-2.5 text-[var(--m-ok)]" />
                            {pin.windSpeed} km/h
                          </span>
                        )}
                      </div>

                      <span className="text-[9px] font-mono tabular-nums">{pin.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manual Location Search Input */}
          <div className="space-y-2">
            <label htmlFor="modal-location-search" className="block font-bold text-[var(--m-text-primary)] text-xs">
              Search City, District, or Weather Station Manually
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--m-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="modal-location-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across 1,000+ national locations (e.g. Bhubaneswar, Safdarjung, Pune, Shimla)…"
                className="w-full bg-[var(--m-surface-inset)] border border-[var(--m-border)] focus:border-[var(--m-accent)] rounded-xl pl-10 pr-10 min-h-[44px] sm:min-h-[40px] text-xs text-[var(--m-text-primary)] placeholder-[var(--m-text-muted)] outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[32px] min-h-[32px] flex items-center justify-center text-[var(--m-text-muted)] hover:text-[var(--m-text-primary)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="border border-[var(--m-border)] rounded-xl bg-[var(--m-surface-2)] divide-y divide-[var(--m-border)] max-h-48 overflow-y-auto mt-1">
                {searchResults.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      onSelectLocation(loc);
                      setSearchQuery('');
                      onClose();
                    }}
                    className="w-full text-left px-3.5 min-h-[44px] py-2 hover:bg-[var(--m-surface-1)] flex items-center justify-between text-xs transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-[var(--m-text-primary)] block">{loc.city}</span>
                      <span className="text-[11px] text-[var(--m-text-muted)]">
                        {loc.district}, {loc.state}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--m-accent)] bg-[var(--m-accent-soft)] px-2 py-0.5 rounded border border-[var(--m-accent)]/25">
                      {loc.state}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Hub Switcher */}
          <div className="space-y-2">
            <span className="block font-bold text-[var(--m-text-primary)] text-xs">
              Popular National Weather Hubs
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {POPULAR_HUBS.map((hub) => (
                <button
                  key={hub.id}
                  type="button"
                  onClick={() => {
                    const loc = locationService.getLocationById(hub.id);
                    if (loc) {
                      onSelectLocation(loc);
                      onClose();
                    }
                  }}
                  className={`p-2.5 min-h-[48px] rounded-xl border text-left transition-colors cursor-pointer ${
                    selectedLocation.id === hub.id
                      ? 'bg-[var(--m-accent-soft)] border-[var(--m-accent)] text-[var(--m-text-primary)]'
                      : 'bg-[var(--m-surface-2)] border-[var(--m-border)] hover:border-[var(--m-border-strong)] text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)]'
                  }`}
                >
                  <span className="font-bold block text-xs truncate">{hub.name}</span>
                  <span className="text-[10px] text-[var(--m-text-muted)] block truncate">{hub.state}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--m-border)] bg-[var(--m-surface-inset)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-3">
            <button
              type="button"
              onClick={onOpenPrivacyModal}
              className="text-[var(--m-accent)] hover:underline text-xs flex items-center gap-1 transition-colors cursor-pointer min-h-[40px] sm:min-h-[32px]"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Location Privacy &amp; Data Transparency</span>
            </button>

            {isGps && (
              <button
                type="button"
                onClick={() => {
                  onClearSavedLocation();
                  onClose();
                }}
                className="text-[var(--m-danger)] hover:underline text-xs flex items-center gap-1 transition-colors cursor-pointer min-h-[40px] sm:min-h-[32px]"
              >
                <Trash2 className="w-3 h-3" />
                <span>Reset to Default</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 min-h-[44px] sm:min-h-[36px] rounded-xl bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-3)] border border-[var(--m-border)] text-[var(--m-text-primary)] font-semibold text-xs transition-colors self-end sm:self-auto cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
