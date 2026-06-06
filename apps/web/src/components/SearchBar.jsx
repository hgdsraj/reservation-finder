import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Calendar, Users, Clock, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import clsx from 'clsx';

const TIMES = [
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00',
];

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function formatPlaceLabel(p) {
  const a = p.address || {};
  const parts = [
    a.city || a.town || a.village || a.county || a.municipality,
    a.state || a.province || a.region,
    a.country,
  ].filter(Boolean);
  return parts.join(', ');
}

// Input field wrapper — adapts to dark (deep blue) and light (cool lavender-white)
const fieldCls = 'flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors bg-navy-700/40 border-navy-600/60 hover:border-peri-400/40 focus-within:border-peri-400/70';

export function SearchBar({ onSearch, loading }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [query, setQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [date, setDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [partySize, setPartySize] = useState(2);
  const [time, setTime] = useState('19:00');
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSugLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        const places = data
          .filter((p) => !['road', 'house', 'building', 'neighbourhood', 'suburb'].includes(p.type || p.class))
          .slice(0, 6)
          .map((p) => ({
            lat: parseFloat(p.lat),
            lng: parseFloat(p.lon),
            label: formatPlaceLabel(p),
            city: p.address?.city || p.address?.town || p.address?.village || p.address?.county || query,
            type: p.type,
          }));
        setSuggestions(places);
        setShowDropdown(true);
      } catch { /* ignore */ }
      finally { setSugLoading(false); }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function selectPlace(place) {
    setSelectedPlace(place);
    setQuery(place.label);
    setShowDropdown(false);
    setSuggestions([]);
  }

  function handleQueryChange(e) {
    setQuery(e.target.value);
    setSelectedPlace(null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedPlace || loading) return;
    onSearch({ city: selectedPlace.label, date, partySize, time, selectedPlace });
  }

  const canSearch = !!selectedPlace && !loading;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center bg-navy-800/70 border border-navy-600/50 rounded-2xl p-2.5 shadow-lg">

        {/* City autocomplete */}
        <div ref={wrapRef} className="relative flex-1 min-w-0">
          <label className={clsx(
            fieldCls,
            selectedPlace ? 'border-amber-500/70 bg-amber-500/5' : '',
          )}>
            <MapPin size={15} className={clsx('flex-shrink-0', selectedPlace ? 'text-peri-400' : 'text-slate-500')} />
            <input
              type="text"
              placeholder="City, neighborhood, or area…"
              value={query}
              onChange={handleQueryChange}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              className="flex-1 bg-transparent text-white placeholder-slate-600 text-sm outline-none min-w-0"
              autoComplete="off"
              spellCheck={false}
            />
            {sugLoading && <Loader2 size={12} className="animate-spin text-slate-600 flex-shrink-0" />}
            {selectedPlace && !sugLoading && (
              <span className="text-peri-400 flex-shrink-0">✓</span>
            )}
          </label>

          {showDropdown && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-navy-700 border border-navy-600 rounded-xl overflow-hidden shadow-2xl">
              {suggestions.map((place, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); selectPlace(place); }}
                  className="w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-navy-600 transition-colors border-b border-navy-600/30 last:border-0"
                >
                  <MapPin size={12} className="text-peri-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-sm text-white font-medium truncate">{place.label}</div>
                    {place.type && (
                      <div className="text-[10px] text-slate-500 capitalize mt-0.5">{place.type}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {query.length >= 2 && !sugLoading && suggestions.length === 0 && showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-navy-700 border border-navy-600 rounded-xl shadow-2xl">
              <div className="px-4 py-3 text-sm text-slate-500">No locations found</div>
            </div>
          )}
        </div>

        <div className="hidden lg:block w-px h-7 bg-navy-600/60 mx-0.5" />

        {/* Date */}
        <label className={clsx(fieldCls, 'lg:w-44')}>
          <Calendar size={14} className="text-peri-400 flex-shrink-0" />
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 bg-transparent text-white text-sm outline-none [color-scheme:dark]"
          />
        </label>

        <div className="hidden lg:block w-px h-7 bg-navy-600/60 mx-0.5" />

        {/* Time */}
        <label className={clsx(fieldCls, 'lg:w-32')}>
          <Clock size={14} className="text-peri-400 flex-shrink-0" />
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="flex-1 bg-transparent text-white text-sm outline-none appearance-none"
          >
            {TIMES.map((t) => (
              <option key={t} value={t} className="bg-navy-700">{formatTime(t)}</option>
            ))}
          </select>
        </label>

        <div className="hidden lg:block w-px h-7 bg-navy-600/60 mx-0.5" />

        {/* Party size */}
        <div className={clsx(fieldCls, 'lg:w-28 cursor-default')}>
          <Users size={14} className="text-peri-400 flex-shrink-0" />
          <div className="flex items-center gap-2 flex-1 justify-between">
            <button type="button" onClick={() => setPartySize((p) => Math.max(1, p - 1))}
              className="w-5 h-5 rounded-full bg-white/10 text-white text-sm flex items-center justify-center hover:bg-peri-500 hover:text-white transition-colors">−</button>
            <span className="text-white text-sm font-semibold w-4 text-center">{partySize}</span>
            <button type="button" onClick={() => setPartySize((p) => Math.min(20, p + 1))}
              className="w-5 h-5 rounded-full bg-white/10 text-white text-sm flex items-center justify-center hover:bg-peri-500 hover:text-white transition-colors">+</button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSearch}
          title={!selectedPlace ? 'Pick a location from the dropdown first' : ''}
          className={clsx(
            'flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 flex-shrink-0',
            canSearch
              ? 'bg-peri-500 hover:bg-peri-400 text-white'
              : 'bg-navy-700/50 text-slate-600 cursor-not-allowed'
          )}
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          {loading ? 'Searching…' : 'Find Tables'}
        </button>
      </div>

      {query.length > 0 && !selectedPlace && !showDropdown && (
        <p className="text-xs text-slate-600 mt-2 pl-1">Choose a location from the list above to search</p>
      )}
    </form>
  );
}
