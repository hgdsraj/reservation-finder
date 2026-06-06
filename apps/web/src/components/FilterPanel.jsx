import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import clsx from 'clsx';

const PLATFORMS = ['opentable', 'resy', 'tock', 'sevenrooms', 'thefork'];
const PRICES = ['$', '$$', '$$$', '$$$$'];
const MIN_RATINGS = [null, 3, 4, 4.5];
const SORT_OPTIONS = [
  { value: 'available', label: 'Most Available' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'name', label: 'Name A–Z' },
];

export function FilterPanel({ filters, onChange, count, platformStatus }) {
  function toggle(key, value) {
    const current = filters[key] || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  }

  function setSort(value) {
    onChange({ ...filters, sort: value });
  }

  function setMinRating(value) {
    onChange({ ...filters, minRating: value });
  }

  const hasFilters =
    filters.platforms?.length ||
    filters.prices?.length ||
    filters.minRating;

  return (
    <div className="bg-card-bg border border-card-border rounded-2xl p-5 space-y-5 sticky top-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-amber-400" />
          <span className="font-semibold text-sm text-white">Filters</span>
        </div>
        {hasFilters && (
          <button
            onClick={() => onChange({ platforms: [], prices: [], minRating: null, sort: 'available' })}
            className="text-xs text-slate-500 hover:text-amber-400 flex items-center gap-1 transition-colors"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {count !== null && (
        <p className="text-xs text-slate-500">
          Showing <span className="text-amber-400 font-semibold">{count}</span> restaurants
        </p>
      )}

      {/* Sort */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sort by</p>
        <div className="space-y-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={clsx(
                'w-full text-left text-sm px-3 py-2 rounded-lg transition-colors',
                filters.sort === opt.value
                  ? 'bg-amber-500/15 text-amber-400 font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-navy-700/50'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Platform */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Platform</p>
        <div className="space-y-1.5">
          {PLATFORMS.map((p) => {
            const active = filters.platforms?.includes(p);
            const status = platformStatus?.[p];
            return (
              <button
                key={p}
                onClick={() => toggle('platforms', p)}
                className={clsx(
                  'w-full flex items-center justify-between text-sm px-3 py-2 rounded-lg border transition-all',
                  active
                    ? 'border-amber-500/40 bg-amber-500/10 text-white'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-navy-700/50'
                )}
              >
                <span className="capitalize font-medium">{p}</span>
                <span className={clsx(
                  'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded',
                  status === 'loading' && 'text-blue-400 animate-pulse',
                  status === 'done' && 'text-emerald-400',
                  status === 'error' && 'text-red-400',
                  !status && 'text-slate-600',
                )}>
                  {status === 'loading' ? '...' : status === 'done' ? '✓' : status === 'error' ? '!' : '—'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Price */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Price</p>
        <div className="flex flex-wrap gap-2">
          {PRICES.map((p) => {
            const active = filters.prices?.includes(p);
            return (
              <button
                key={p}
                onClick={() => toggle('prices', p)}
                className={clsx(
                  'px-3 py-1 rounded-lg text-sm font-semibold border transition-all',
                  active
                    ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                    : 'border-navy-600 text-slate-500 hover:border-slate-500 hover:text-white'
                )}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Min Rating */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Min Rating</p>
        <div className="flex flex-wrap gap-2">
          {MIN_RATINGS.map((r) => {
            const label = r === null ? 'Any' : `${r}+`;
            const active = filters.minRating === r;
            return (
              <button
                key={label}
                onClick={() => setMinRating(r)}
                className={clsx(
                  'px-3 py-1 rounded-lg text-sm font-semibold border transition-all',
                  active
                    ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                    : 'border-navy-600 text-slate-500 hover:border-slate-500 hover:text-white'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
