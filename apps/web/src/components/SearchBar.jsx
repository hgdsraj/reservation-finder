import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Calendar, Users, Clock, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';

const TIMES = [
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00',
];

const POPULAR_CITIES = [
  'New York', 'Chicago', 'Los Angeles', 'San Francisco', 'Miami',
  'Boston', 'Seattle', 'Washington DC', 'Las Vegas', 'Austin',
  'Nashville', 'New Orleans', 'Denver', 'Portland', 'Atlanta',
];

export function SearchBar({ onSearch, loading }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [city, setCity] = useState('');
  const [date, setDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [partySize, setPartySize] = useState(2);
  const [time, setTime] = useState('19:00');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const cityRef = useRef(null);

  useEffect(() => {
    if (!city || city.length < 2) { setSuggestions([]); return; }
    const filtered = POPULAR_CITIES.filter((c) =>
      c.toLowerCase().includes(city.toLowerCase())
    );
    setSuggestions(filtered.slice(0, 6));
  }, [city]);

  useEffect(() => {
    const handler = (e) => {
      if (!cityRef.current?.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!city.trim()) return;
    onSearch({ city: city.trim(), date, partySize, time });
  }

  function selectSuggestion(c) {
    setCity(c);
    setShowSuggestions(false);
    setTimeout(() => document.getElementById('search-submit')?.click(), 50);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col lg:flex-row gap-3 lg:gap-2 items-stretch lg:items-center bg-navy-800/60 backdrop-blur-md border border-navy-600/50 rounded-2xl p-3 shadow-xl">
        {/* City */}
        <div ref={cityRef} className="relative flex-1 min-w-0">
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-navy-700/60 border border-navy-600/40 hover:border-amber-500/30 transition-colors focus-within:border-amber-500/60 group">
            <MapPin size={16} className="text-amber-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="City or neighborhood..."
              value={city}
              onChange={(e) => { setCity(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm font-medium outline-none min-w-0"
              required
              autoComplete="off"
            />
          </label>
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-navy-800 border border-navy-600 rounded-xl overflow-hidden shadow-2xl">
              {suggestions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onMouseDown={() => selectSuggestion(c)}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-navy-700 hover:text-white flex items-center gap-2 transition-colors"
                >
                  <MapPin size={12} className="text-amber-400" /> {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px h-8 bg-navy-600/50" />

        {/* Date */}
        <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-navy-700/60 border border-navy-600/40 hover:border-amber-500/30 transition-colors focus-within:border-amber-500/60 lg:w-40">
          <Calendar size={15} className="text-amber-400 flex-shrink-0" />
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 bg-transparent text-white text-sm font-medium outline-none [color-scheme:dark]"
            required
          />
        </label>

        <div className="hidden lg:block w-px h-8 bg-navy-600/50" />

        {/* Time */}
        <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-navy-700/60 border border-navy-600/40 hover:border-amber-500/30 transition-colors focus-within:border-amber-500/60 lg:w-36">
          <Clock size={15} className="text-amber-400 flex-shrink-0" />
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="flex-1 bg-transparent text-white text-sm font-medium outline-none appearance-none"
          >
            {TIMES.map((t) => (
              <option key={t} value={t} className="bg-navy-800">
                {formatTime(t)}
              </option>
            ))}
          </select>
        </label>

        <div className="hidden lg:block w-px h-8 bg-navy-600/50" />

        {/* Party size */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-navy-700/60 border border-navy-600/40 lg:w-28">
          <Users size={15} className="text-amber-400 flex-shrink-0" />
          <div className="flex items-center gap-2 flex-1 justify-between">
            <button
              type="button"
              onClick={() => setPartySize((p) => Math.max(1, p - 1))}
              className="w-5 h-5 rounded-full bg-navy-600 text-white text-sm flex items-center justify-center hover:bg-amber-500 hover:text-navy-900 transition-colors"
            >−</button>
            <span className="text-white text-sm font-semibold w-4 text-center">{partySize}</span>
            <button
              type="button"
              onClick={() => setPartySize((p) => Math.min(20, p + 1))}
              className="w-5 h-5 rounded-full bg-navy-600 text-white text-sm flex items-center justify-center hover:bg-amber-500 hover:text-navy-900 transition-colors"
            >+</button>
          </div>
        </div>

        {/* Submit */}
        <button
          id="search-submit"
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-navy-900 font-semibold text-sm transition-all active:scale-95 lg:w-auto flex-shrink-0"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
          {loading ? 'Searching...' : 'Find Tables'}
        </button>
      </div>
    </form>
  );
}

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}
