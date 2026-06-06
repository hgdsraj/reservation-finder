import React, { useState } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import { PlatformBadge } from './PlatformBadge.jsx';
import { StarRating } from './StarRating.jsx';
import { RestaurantModal } from './RestaurantModal.jsx';

const FALLBACK_PHOTOS = {
  opentable: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=700&q=80',
  resy:       'https://images.unsplash.com/photo-1428515613728-6b4607e44363?w=700&q=80',
  tock:       'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=700&q=80',
  sevenrooms: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=700&q=80',
  thefork:    'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=700&q=80',
};

export function RestaurantCard({ restaurant, searchParams, animDelay = 0 }) {
  const [imgError, setImgError] = useState(false);
  const [open, setOpen] = useState(false);

  const photo = !imgError && restaurant.photos?.[0]
    ? restaurant.photos[0]
    : FALLBACK_PHOTOS[restaurant.platform] || FALLBACK_PHOTOS.resy;

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
        <div className="relative h-48 overflow-hidden bg-navy-700">
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

          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {restaurant.price && (
              <span className="bg-black/50 backdrop-blur-sm text-amber-400 text-xs font-bold px-2 py-0.5 rounded-lg">
                {restaurant.price}
              </span>
            )}
          </div>

          {hasSlots && (
            <div className="absolute bottom-3 right-3 bg-emerald-500/25 border border-emerald-500/50 text-emerald-400 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full backdrop-blur-sm">
              Available
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          <div>
            <h3 className="font-display text-base font-semibold text-white leading-snug line-clamp-1 group-hover:text-amber-400 transition-colors">
              {restaurant.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              <span>{restaurant.cuisine}</span>
              {restaurant.neighborhood && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <MapPin size={10} className="flex-shrink-0" />
                    {restaurant.neighborhood}
                  </span>
                </>
              )}
            </div>
          </div>

          <StarRating rating={restaurant.rating} reviewCount={restaurant.reviewCount} />

          {restaurant.description && (
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{restaurant.description}</p>
          )}

          {/* Time slots */}
          <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
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
                  <button className="slot-btn" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
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
        <RestaurantModal restaurant={restaurant} searchParams={searchParams} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
