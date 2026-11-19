import React, { useState, useEffect } from 'react';
import { AuthoritativeAlert, SavedDestination, authoritativeClient } from '../../../services/authoritativeService';
import {
  Luggage,
  BookmarkCheck,
  BookmarkPlus,
  PlaneTakeoff,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

interface TravelerCardProps {
  activeAlerts: AuthoritativeAlert[];
  packingSuggestions: string[];
  travelSafetyRating: 'Favorable' | 'Minor Delays Expected' | 'Caution Advised' | 'Hazardous';
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export const TravelerCard: React.FC<TravelerCardProps> = ({
  activeAlerts,
  packingSuggestions,
  travelSafetyRating,
  city,
  state,
  lat,
  lng,
}) => {
  const [destinations, setDestinations] = useState<SavedDestination[]>([]);
  const [newCityName, setNewCityName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    setDestinations(authoritativeClient.getSavedDestinations());
  }, []);

  const handleBookmarkCurrent = () => {
    const updated = authoritativeClient.addDestination(city, state, lat, lng);
    setDestinations(updated);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityName.trim()) return;
    const updated = authoritativeClient.addDestination(newCityName.trim(), 'Travel Destination', 20.0, 78.0);
    setDestinations(updated);
    setNewCityName('');
    setShowAddModal(false);
  };

  const handleRemove = (id: string) => {
    const updated = authoritativeClient.removeDestination(id);
    setDestinations(updated);
  };

  const ratingBadgeColor =
    travelSafetyRating === 'Favorable'
      ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35'
      : travelSafetyRating === 'Minor Delays Expected'
      ? 'bg-[var(--m-watch-soft)] text-[var(--m-watch)] border-[var(--m-watch)]/35'
      : travelSafetyRating === 'Caution Advised'
      ? 'bg-[var(--m-alert-soft)] text-[var(--m-alert)] border-[var(--m-alert)]/35'
      : 'bg-[var(--m-danger-soft)] text-[var(--m-danger)] border-[var(--m-danger)]/35';

  const isCurrentBookmarked = destinations.some(
    (d) =>
      d.name.toLowerCase() === city.toLowerCase() ||
      (Math.abs(d.lat - lat) < 0.05 && Math.abs(d.lng - lng) < 0.05)
  );

  return (
    <div className="m-panel-inset p-4 sm:p-5 flex flex-col justify-between h-full">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--m-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--m-surface-1)] text-[#A78BFA] flex items-center justify-center border border-[var(--m-border)]">
              <Luggage className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--m-text-primary)] uppercase tracking-wide">
                Travelers &amp; Destination Intel
              </h3>
              <p className="text-[11px] text-[var(--m-text-muted)]">
                En-Route Bulletins &amp; Packing Guide • {city}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBookmarkCurrent}
              disabled={isCurrentBookmarked}
              className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 border cursor-pointer ${
                isCurrentBookmarked
                  ? 'bg-[var(--m-ok-soft)] text-[var(--m-ok)] border-[var(--m-ok)]/35 cursor-default'
                  : 'bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-2)] text-[var(--m-accent)] border-[var(--m-border)]'
              }`}
            >
              {isCurrentBookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
              <span>{isCurrentBookmarked ? 'Saved' : 'Save City'}</span>
            </button>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${ratingBadgeColor}`}>
              {travelSafetyRating}
            </span>
          </div>
        </div>

        <div className="mt-4 p-3.5 rounded-lg bg-[var(--m-surface-1)] border border-[var(--m-border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[var(--m-text-primary)] uppercase tracking-wide">
              Packing Checklist ({city})
            </span>
            <span className="text-[10px] text-[var(--m-text-muted)]">Forecast Derived</span>
          </div>
          <ul className="space-y-1.5 text-xs text-[var(--m-text-secondary)]">
            {packingSuggestions.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--m-ok)] shrink-0 mt-0.5" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[var(--m-text-primary)] uppercase tracking-wide flex items-center gap-1.5">
              <PlaneTakeoff className="w-3.5 h-3.5 text-[var(--m-accent)]" />
              Saved Destinations
            </span>
            <button
              type="button"
              onClick={() => setShowAddModal(!showAddModal)}
              className="text-[11px] text-[var(--m-accent)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Destination</span>
            </button>
          </div>

          {showAddModal && (
            <form onSubmit={handleAddCustom} className="mb-3 p-2 bg-[var(--m-surface-1)] rounded-lg border border-[var(--m-border)] flex gap-2">
              <input
                type="text"
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                placeholder="Enter city (e.g., Bengaluru, Jaipur)..."
                className="flex-1 bg-[var(--m-surface-inset)] text-[var(--m-text-primary)] text-xs px-2.5 py-1.5 rounded border border-[var(--m-border)] focus:outline-none focus:border-[var(--m-accent)]"
              />
              <button
                type="submit"
                className="bg-[var(--m-accent)] hover:bg-[var(--m-accent-hover)] text-[var(--m-text-primary)] text-xs px-3 py-1.5 rounded font-semibold cursor-pointer"
              >
                Add
              </button>
            </form>
          )}

          <div className="space-y-2">
            {destinations.map((dest) => (
              <div
                key={dest.id}
                className="p-2.5 bg-[var(--m-surface-1)] hover:bg-[var(--m-surface-2)] rounded-lg border border-[var(--m-border)] flex items-center justify-between text-xs transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-[var(--m-text-primary)] truncate">{dest.name}</strong>
                    <span className="text-[10px] text-[var(--m-text-muted)] truncate">{dest.state}</span>
                    {typeof dest.temp === 'number' && (
                      <span className="text-[11px] font-mono tabular-nums text-[var(--m-accent)] font-bold">
                        {dest.temp}°C
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--m-text-muted)] mt-0.5 truncate flex items-center gap-1.5">
                    {dest.activeAlert ? (
                      <span className="text-[var(--m-watch)] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {dest.activeAlert}
                      </span>
                    ) : (
                      <span>{dest.weatherSummary || 'Bookmark saved'}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(dest.id)}
                  className="text-[var(--m-text-muted)] hover:text-[var(--m-danger)] p-1.5 transition-colors ml-2 cursor-pointer"
                  title="Remove saved destination"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {activeAlerts.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-[var(--m-danger-soft)] border border-[var(--m-danger)]/35 text-xs">
            <div className="flex items-center gap-1.5 text-[var(--m-danger)] font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>Active Travel Alert: {activeAlerts[0].title}</span>
            </div>
            <p className="text-[11px] text-[var(--m-text-secondary)] mt-1">
              {activeAlerts[0].description} ({activeAlerts[0].actionItem})
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--m-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-[var(--m-text-muted)]">
        <span>Source: <strong className="text-[var(--m-text-secondary)]">SACHET CAP Alerts &amp; Synoptic Outlook</strong></span>
        <span>Client Bookmarks</span>
      </div>
    </div>
  );
};
