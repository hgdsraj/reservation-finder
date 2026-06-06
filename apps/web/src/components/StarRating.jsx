import React from 'react';
import { Star } from 'lucide-react';

export function StarRating({ rating, reviewCount }) {
  const r = parseFloat(rating);
  if (!r) return null;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= Math.floor(r);
          const partial = !filled && i - 1 < r;
          return (
            <span key={i} className="relative inline-block w-3.5 h-3.5">
              <Star size={14} className="text-slate-700 fill-slate-700" />
              {(filled || partial) && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: filled ? '100%' : `${(r % 1) * 100}%` }}
                >
                  <Star size={14} className="text-amber-400 fill-amber-400" />
                </span>
              )}
            </span>
          );
        })}
      </div>
      <span className="text-sm font-semibold text-amber-400">{r.toFixed(1)}</span>
      {reviewCount > 0 && (
        <span className="text-xs text-slate-500">({reviewCount.toLocaleString()})</span>
      )}
    </div>
  );
}
