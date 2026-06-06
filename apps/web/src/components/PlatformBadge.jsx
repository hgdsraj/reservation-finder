import React from 'react';
import clsx from 'clsx';

const PLATFORMS = {
  opentable:  { label: 'OpenTable',  color: 'bg-[#DA3743]/20 text-[#FF6B74] border-[#DA3743]/40', dot: 'bg-[#DA3743]' },
  resy:       { label: 'Resy',       color: 'bg-[#0F5AE6]/20 text-[#6B9FFF] border-[#0F5AE6]/40', dot: 'bg-[#0F5AE6]' },
  tock:       { label: 'Tock',       color: 'bg-[#7C3AED]/20 text-[#B794F4] border-[#7C3AED]/40', dot: 'bg-[#7C3AED]' },
  sevenrooms: { label: 'SevenRooms', color: 'bg-[#00897B]/20 text-[#4DB6AC] border-[#00897B]/40', dot: 'bg-[#00897B]' },
  thefork:    { label: 'TheFork',    color: 'bg-[#00AA6C]/20 text-[#4DD08A] border-[#00AA6C]/40', dot: 'bg-[#00AA6C]' },
};

export function PlatformBadge({ platform, size = 'sm' }) {
  const p = PLATFORMS[platform] || { label: platform, color: 'bg-slate-700/50 text-slate-300 border-slate-600', dot: 'bg-slate-400' };
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wider',
      p.color,
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
    )}>
      <span className={clsx('rounded-full flex-shrink-0', p.dot, size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
      {p.label}
    </span>
  );
}
