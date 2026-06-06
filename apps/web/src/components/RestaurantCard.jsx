import React, { useState } from 'react';
import { MapPin, Users, ExternalLink, ChevronRight } from 'lucide-react';
import { PlatformBadge } from './PlatformBadge.jsx';
import { StarRating } from './StarRating.jsx';
import { RestaurantModal } from './RestaurantModal.jsx';

const FALLBACK_PHOTOS = {
  opentable: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
  resy:       'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
  tock:       'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80',
};

export function RestaurantCard({ restaurant, searchParams, animDelay = 0 }) {
  const [imgError, setImgError] = useState(false);
  const [open, setOpen] = useState(false);

  const photo = !imgError && restaurant.photos?.[0]
    ? restaurant.photos[0]
    : FALLBACK_PHOTOS[restaurant.platform] || FALLBACK_PHOTOS.opentable;

  const visibleSlots = restaurant.slots?.slice(0, 5) || [];
  const hasSlots = visibleSlots.length > 0;

  return (
    <>
      <article
        className="group rounded-2xl overflow-hidden border border-card-border bg-card-bg card-hover fade-up cursor-pointer"
        style={{ animationDelay: `${animDelay}ms` }}
        onClick={() => setOpen(true)}
      >
        {/* Image */}
        <div className="relative h-52 overflow-hidden bg-navy-700">
          <img
            src={photo}
            alt={restaurant.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-card-gradient" />
          <div className="absolute top-3 left-3">
            <PlatformBadge platform={restaurant.platform} />
          </div>
          {restaurant.price && (
            <div className="absolute top-3 right-3 bg-navy-900/80 backdrop-blur-sm text-amber-400 text-xs font-bold px-2 py-1 rounded-lg border border-amber-500/20">
              {restaurant.price}
            </div>
          )}
          {/* Available badge */}
          {hasSlots && (
            <div className="absolute bottom-3 right-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full">
              Available
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-semibold text-white leading-tight line-clamp-2 group-hover:text-amber-400 transition-colors">
              {restaurant.name}
            </h3>
            <ChevronRight size={16} className="text-slate-600 group-hover:text-amber-400 transition-colors flex-shrink-0 mt-1" />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
            <span className="text-slate-300">{restaurant.cuisine}</span>
            {restaurant.neighborhood && (
              <>
                <span className="text-slate-700">·</span>
                <span className="flex items-center gap-1">
                  <MapPin size={11} className="text-slate-600" />
                  {restaurant.neighborhood}
                </span>
              </>
            )}
          </div>

          <StarRating rating={restaurant.rating} reviewCount={restaurant.reviewCount} />

          {restaurant.description && (
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{restaurant.description}</p>
          )}

          {/* Time slots */}
          <div className="pt-1" onClick={(e) => e.stopPropagation()}>
            {hasSlots ? (
              <div className="flex flex-wrap gap-1.5">
                {visibleSlots.map((slot, i) => (
                  <a
                    key={i}
                    href={slot.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="slot-btn"
                  >
                    {formatTime(slot.time)}
                  </a>
                ))}
                {restaurant.slots.length > 5 && (
                  <button
                    className="slot-btn"
                    onClick={(e) => { e.stopPropagation(); setOpen(true); }}
                  >
                    +{restaurant.slots.length - 5} more
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="no-slots">No times shown</span>
                <a
                  href={restaurant.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-amber-400 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Check site <ExternalLink size={10} />
                </a>
              </div>
            )}
          </div>
        </div>
      </article>

      {open && (
        <RestaurantModal
          restaurant={restaurant}
          searchParams={searchParams}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}
