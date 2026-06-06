import React, { useEffect, useState } from 'react';
import { X, MapPin, ExternalLink, Users, Calendar } from 'lucide-react';
import { PlatformBadge } from './PlatformBadge.jsx';
import { StarRating } from './StarRating.jsx';

const FALLBACK_PHOTOS = {
  opentable: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
  resy:       'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
  tock:       'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
};

export function RestaurantModal({ restaurant: r, searchParams, onClose }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const photo = !imgError && r.photos?.[0]
    ? r.photos[0]
    : FALLBACK_PHOTOS[r.platform] || FALLBACK_PHOTOS.opentable;

  const allSlots = r.slots || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] bg-[#0D1626] sm:rounded-2xl border border-card-border shadow-2xl overflow-hidden flex flex-col">
        {/* Hero image */}
        <div className="relative h-56 flex-shrink-0 bg-navy-700">
          <img
            src={photo}
            alt={r.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D1626] via-transparent to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white rounded-full p-2 hover:bg-black/80 transition-colors"
          >
            <X size={18} />
          </button>
          <div className="absolute bottom-4 left-4">
            <PlatformBadge platform={r.platform} size="md" />
          </div>
          {r.price && (
            <div className="absolute bottom-4 right-4 bg-navy-900/80 text-peri-300 text-sm font-bold px-3 py-1 rounded-lg border border-peri-500/20">
              {r.price}
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-white mb-1">{r.name}</h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
              <span>{r.cuisine}</span>
              {r.neighborhood && (
                <>
                  <span className="text-slate-700">·</span>
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-slate-500" />
                    {r.neighborhood}
                  </span>
                </>
              )}
              {r.address && (
                <>
                  <span className="text-slate-700">·</span>
                  <span className="text-slate-500">{r.address}</span>
                </>
              )}
            </div>
          </div>

          <StarRating rating={r.rating} reviewCount={r.reviewCount} />

          {r.description && (
            <p className="text-sm text-slate-400 leading-relaxed">{r.description}</p>
          )}

          {searchParams && (
            <div className="flex items-center gap-4 text-xs text-slate-500 bg-navy-800/50 rounded-xl p-3 border border-navy-700">
              <span className="flex items-center gap-1.5">
                <Calendar size={12} />
                {searchParams.date}
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={12} />
                {searchParams.partySize} {parseInt(searchParams.partySize) === 1 ? 'guest' : 'guests'}
              </span>
            </div>
          )}

          {/* All time slots */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2.5">
              {allSlots.length > 0 ? `Available Times (${allSlots.length})` : 'Check Availability'}
            </h3>
            {allSlots.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allSlots.map((slot, i) => (
                  <a
                    key={i}
                    href={slot.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="slot-btn !px-4 !py-1.5 !text-sm"
                  >
                    {formatTime(slot.time)}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Times not pre-loaded. Click below to check directly.</p>
            )}
          </div>

          <a
            href={r.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-peri-500 hover:bg-peri-400 text-white font-semibold transition-colors"
          >
            Book on {capitalize(r.platform)}
            <ExternalLink size={15} />
          </a>

          {/* Alternative platforms */}
          {r.alternatives?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Also available on:</p>
              {r.alternatives.map((alt) => (
                <a
                  key={alt.platform}
                  href={alt.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-navy-600 hover:border-peri-400/50 text-slate-400 hover:text-white font-medium text-sm transition-colors"
                >
                  Book on {capitalize(alt.platform)}
                  <ExternalLink size={13} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : '';
}
