import React from 'react';

export function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-card-border bg-card-bg">
      <div className="shimmer h-52 w-full" />
      <div className="p-4 space-y-3">
        <div className="shimmer h-4 w-20 rounded-full" />
        <div className="shimmer h-6 w-3/4 rounded" />
        <div className="shimmer h-4 w-1/2 rounded" />
        <div className="shimmer h-4 w-2/3 rounded" />
        <div className="flex gap-2 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="shimmer h-7 w-16 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
