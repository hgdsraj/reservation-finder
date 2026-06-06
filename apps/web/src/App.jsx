import React, { useState, useMemo } from 'react';
import { Utensils, Wifi, AlertCircle } from 'lucide-react';
import { SearchBar } from './components/SearchBar.jsx';
import { RestaurantCard } from './components/RestaurantCard.jsx';
import { FilterPanel } from './components/FilterPanel.jsx';
import { SkeletonCard } from './components/SkeletonCard.jsx';
import { PlatformBadge } from './components/PlatformBadge.jsx';
import { useSearch } from './hooks/useSearch.js';

const ALL_PLATFORMS = ['opentable', 'resy', 'tock', 'sevenrooms', 'thefork'];
const DEFAULT_FILTERS = { platforms: [], prices: [], minRating: null, sort: 'available' };

export default function App() {
  const { restaurants, status, loading, platformStatus, errors, cityData, search } = useSearch();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchParams, setSearchParams] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  function handleSearch(params) {
    setSearchParams(params);
    setHasSearched(true);
    setFilters(DEFAULT_FILTERS);
    search(params);
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

  return (
    <div className="min-h-screen bg-hero-gradient">
      {/* Header */}
      <header className="border-b border-navy-700/50 glass sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Utensils size={16} className="text-amber-400" />
            </div>
            <span className="font-display font-semibold text-white text-lg">ReserveNow</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            {ALL_PLATFORMS.map((p) => <PlatformBadge key={p} platform={p} />)}
          </div>
        </div>
      </header>

      {/* Hero / Search */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="absolute -top-20 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-8">
          {!hasSearched ? (
            <div className="text-center mb-10">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                Find your next
                <span className="text-gradient"> great table</span>
              </h1>
              <p className="text-slate-400 text-lg max-w-xl mx-auto">
                Real-time availability from 5 platforms — any city, instantly.
              </p>
            </div>
          ) : (
            <div className="mb-6">
              {cityData && (
                <h2 className="font-display text-2xl font-semibold text-white mb-1">{cityData.label}</h2>
              )}
              {status && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  {loading && <Wifi size={13} className="text-amber-400 animate-pulse" />}
                  <span>{status}</span>
                </div>
              )}
            </div>
          )}

          <SearchBar onSearch={handleSearch} loading={loading} />

          {/* Live platform status */}
          {hasSearched && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4">
              {ALL_PLATFORMS.map((p) => (
                <div key={p} className="flex items-center gap-1.5">
                  <PlatformBadge platform={p} />
                  {platformStatus[p] && (
                    <span className={[
                      'text-[10px] font-medium',
                      platformStatus[p] === 'loading' ? 'text-blue-400 animate-pulse' :
                      platformStatus[p] === 'done'    ? 'text-emerald-400' : 'text-red-400',
                    ].join(' ')}>
                      {platformStatus[p] === 'loading' ? 'scanning...' :
                       platformStatus[p] === 'done'    ? `${platformCounts[p] || 0} found` : 'failed'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Results */}
      {hasSearched && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
          {errors.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {errors.map((e, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-red-400/70 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-1.5">
                  <AlertCircle size={12} /> {e}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-6 items-start">
            <aside className="hidden lg:block w-56 flex-shrink-0">
              <FilterPanel filters={filters} onChange={setFilters} count={filtered.length} platformStatus={platformStatus} />
            </aside>

            <div className="flex-1 min-w-0">
              {/* Mobile filter pills */}
              <div className="lg:hidden mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {ALL_PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      const cur = filters.platforms || [];
                      setFilters({ ...filters, platforms: cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p] });
                    }}
                    className={['flex-shrink-0 transition-all', filters.platforms?.includes(p) ? 'opacity-100' : 'opacity-40'].join(' ')}
                  >
                    <PlatformBadge platform={p} size="md" />
                  </button>
                ))}
              </div>

              {loading && filtered.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filtered.map((r, i) => (
                    <RestaurantCard key={r.id} restaurant={r} searchParams={searchParams} animDelay={Math.min(i * 40, 400)} />
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

      {/* Landing features */}
      {!hasSearched && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 mt-16">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-600 mb-6">Aggregates from</p>
          <div className="flex justify-center gap-3 flex-wrap mb-16">
            {ALL_PLATFORMS.map((p) => <PlatformBadge key={p} platform={p} size="md" />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: '🔍', title: 'Any city in the world', desc: 'Type any city name — we use OpenStreetMap to geocode it and scan all 5 platforms simultaneously.' },
              { icon: '⚡', title: 'Real-time streaming', desc: 'Results stream in live per platform as they respond. No waiting for all to finish.' },
              { icon: '🎯', title: 'Book in one click', desc: 'Click any time slot to open the exact booking page on the source platform. Zero friction.' },
            ].map((f) => (
              <div key={f.title} className="bg-card-bg border border-card-border rounded-2xl p-6">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
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
    <div className="text-center py-20">
      <div className="text-5xl mb-4">🍽️</div>
      <h3 className="font-display text-xl text-white mb-2">No restaurants found</h3>
      <p className="text-slate-500 text-sm max-w-sm mx-auto">
        {cityData
          ? `We didn't find results in ${cityData.label}. Try a different date, party size, or time.`
          : 'Try adjusting your search.'}
      </p>
    </div>
  );
}
