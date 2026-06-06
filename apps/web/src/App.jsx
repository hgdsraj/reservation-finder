import React, { useState, useMemo, useEffect, useRef, Suspense, lazy } from 'react';
import { Utensils, Sun, Moon, List, Map, AlertTriangle } from 'lucide-react';
import { SearchBar } from './components/SearchBar.jsx';
import { RestaurantCard } from './components/RestaurantCard.jsx';
import { FilterPanel } from './components/FilterPanel.jsx';
import { SkeletonCard } from './components/SkeletonCard.jsx';
import { PlatformBadge } from './components/PlatformBadge.jsx';
import { useSearch } from './hooks/useSearch.js';

const MapView = lazy(() =>
  import('./components/MapView.jsx').then((m) => ({ default: m.MapView }))
);

const ALL_PLATFORMS = ['opentable', 'resy', 'tock', 'sevenrooms', 'thefork'];
const DEFAULT_FILTERS = { platforms: [], prices: [], minRating: null, sort: 'available' };

export default function App() {
  const { restaurants, status, loading, platformStatus, errors, cityData, proximityWarning, search, checkProximity } = useSearch();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchParams, setSearchParams] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [isDark, setIsDark] = useState(true);
  const proximityChecked = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const dark = stored !== 'light';
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  // Check proximity once loading finishes and we have results + coordinates
  useEffect(() => {
    if (!loading && restaurants.length > 0 && cityData && !proximityChecked.current) {
      proximityChecked.current = true;
      checkProximity(restaurants, cityData);
    }
  }, [loading, restaurants, cityData, checkProximity]);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  function handleSearch(params) {
    setSearchParams(params);
    setHasSearched(true);
    setFilters(DEFAULT_FILTERS);
    proximityChecked.current = false;
    search(params);
  }

  function goHome() {
    setHasSearched(false);
    setFilters(DEFAULT_FILTERS);
  }

  const filtered = useMemo(() => {
    let result = [...restaurants];
    if (filters.platforms?.length) result = result.filter((r) => filters.platforms.includes(r.platform));
    if (filters.prices?.length)    result = result.filter((r) => filters.prices.includes(r.price));
    if (filters.minRating)         result = result.filter((r) => r.rating && parseFloat(r.rating) >= filters.minRating);

    if (filters.sort === 'available') result.sort((a, b) => (b.slots?.length || 0) - (a.slots?.length || 0));
    else if (filters.sort === 'rating') result.sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
    else if (filters.sort === 'name')   result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return result;
  }, [restaurants, filters]);

  const platformCounts = useMemo(() => {
    const c = {};
    for (const r of restaurants) c[r.platform] = (c[r.platform] || 0) + 1;
    return c;
  }, [restaurants]);

  const activePlatforms = ALL_PLATFORMS.filter((p) => platformStatus[p] === 'loading');

  return (
    <div className="min-h-screen bg-hero-gradient">
      {/* Header */}
      <header className="border-b border-navy-700/50 glass sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={goHome}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <Utensils size={17} className="text-peri-400" />
            <span className="font-display font-semibold text-white text-lg tracking-tight">TableFinder</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5">
              {ALL_PLATFORMS.map((p) => <PlatformBadge key={p} platform={p} />)}
            </div>
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-navy-600 hover:border-peri-400/50 transition-all text-slate-500 hover:text-peri-300"
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </div>
      </header>

      {/* Hero / Search */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-10">
          {!hasSearched && (
            <div className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-peri-400/80 mb-3">
                Resy · OpenTable · Tock · SevenRooms · TheFork
              </p>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                Your table is{' '}
                <span className="text-gradient">waiting.</span>
              </h1>
              <p className="text-slate-400 text-base max-w-md mx-auto leading-relaxed">
                Search every major reservation platform at once — real-time, any city.
              </p>
            </div>
          )}

          {hasSearched && cityData && (
            <div className="mb-5">
              <h2 className="font-display text-2xl font-semibold text-white">{cityData.label}</h2>
              {activePlatforms.length > 0 && (
                <p className="text-sm text-slate-500 mt-0.5">
                  Checking {activePlatforms.join(', ')}…
                </p>
              )}
            </div>
          )}

          {/* Proximity warning */}
          {proximityWarning && (
            <div className="mb-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-sm">
              <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{proximityWarning}</span>
            </div>
          )}

          <SearchBar onSearch={handleSearch} loading={loading} />

          {/* Platform results summary */}
          {hasSearched && (
            <div className="flex flex-wrap gap-3 mt-4">
              {ALL_PLATFORMS.map((p) => {
                const s = platformStatus[p];
                if (!s) return null;
                const isLoading = s === 'loading';
                const isDone    = s === 'done';
                const isBlocked = s === 'blocked';
                return (
                  <div key={p} className="flex items-center gap-1.5">
                    <PlatformBadge platform={p} />
                    <span className={[
                      'text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full',
                      isLoading ? 'text-peri-300 animate-pulse bg-peri-500/10' :
                      isDone && platformCounts[p] ? 'text-emerald-400 bg-emerald-500/10' :
                      isDone    ? 'text-slate-500 bg-white/5' :
                      isBlocked ? 'text-red-400 bg-red-500/10' : 'text-slate-500',
                    ].join(' ')}>
                      {isLoading ? '···' :
                       isDone    ? `${platformCounts[p] || 0}` :
                       isBlocked ? 'blocked' : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Results */}
      {hasSearched && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
          <div className="flex gap-6 items-start">
            <aside className="hidden lg:block w-56 flex-shrink-0">
              <FilterPanel filters={filters} onChange={setFilters} count={filtered.length} platformStatus={platformStatus} />
            </aside>

            <div className="flex-1 min-w-0">
              {/* Top bar */}
              <div className="flex items-center justify-between mb-5 gap-3">
                {/* Mobile filter pills */}
                <div className="lg:hidden flex gap-2 overflow-x-auto pb-1 no-scrollbar flex-1">
                  {ALL_PLATFORMS.map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        const cur = filters.platforms || [];
                        setFilters({ ...filters, platforms: cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p] });
                      }}
                      className={['flex-shrink-0 transition-opacity', filters.platforms?.includes(p) ? 'opacity-100' : 'opacity-35'].join(' ')}
                    >
                      <PlatformBadge platform={p} size="md" />
                    </button>
                  ))}
                </div>

                {/* List / Map toggle */}
                {filtered.length > 0 && (
                  <div className="flex-shrink-0 flex items-center rounded-full border border-navy-600 overflow-hidden">
                    <button
                      onClick={() => setViewMode('list')}
                      className={['flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold transition-all', viewMode === 'list' ? 'bg-peri-500/20 text-peri-300' : 'text-slate-500 hover:text-white'].join(' ')}
                    >
                      <List size={12} /> List
                    </button>
                    <button
                      onClick={() => setViewMode('map')}
                      className={['flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold transition-all', viewMode === 'map' ? 'bg-peri-500/20 text-peri-300' : 'text-slate-500 hover:text-white'].join(' ')}
                    >
                      <Map size={12} /> Map
                    </button>
                  </div>
                )}
              </div>

              {viewMode === 'map' && filtered.length > 0 ? (
                <Suspense fallback={<div className="h-96 bg-card-bg border border-card-border rounded-2xl animate-pulse" />}>
                  <MapView restaurants={filtered} cityData={cityData} searchParams={searchParams} />
                </Suspense>
              ) : loading && filtered.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filtered.map((r, i) => (
                    <RestaurantCard key={r.id} restaurant={r} searchParams={searchParams} animDelay={Math.min(i * 35, 380)} />
                  ))}
                  {loading && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)}
                </div>
              ) : !loading ? (
                <EmptyState cityData={cityData} />
              ) : null}
            </div>
          </div>
        </main>
      )}

      {/* Landing feature blocks */}
      {!hasSearched && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 mt-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: '🌍',
                title: 'Any city',
                desc: 'Search from New York to Lisbon. We geocode any city name instantly.',
              },
              {
                icon: '⚡',
                title: 'Arrives live',
                desc: 'Results stream in as each platform responds — no spinner, no waiting.',
              },
              {
                icon: '🔗',
                title: 'Book direct',
                desc: 'Time slots link straight to the source. You always book on the real platform.',
              },
            ].map((f) => (
              <div key={f.title} className="bg-card-bg border border-card-border rounded-2xl p-6">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-display text-base font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EmptyState({ cityData }) {
  return (
    <div className="text-center py-24">
      <div className="text-4xl mb-4">🍽</div>
      <h3 className="font-display text-xl font-semibold text-white mb-2">Nothing available nearby</h3>
      <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
        {cityData
          ? `No open tables found in ${cityData.label} right now. Try a different date or party size.`
          : 'Try adjusting your search.'}
      </p>
    </div>
  );
}
