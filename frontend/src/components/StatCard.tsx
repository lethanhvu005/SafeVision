import type { LucideIcon } from 'lucide-react';
import { Activity } from 'lucide-react';

import { cx, toneChip, toneIcon, type UiTone } from './ui';

interface StatCardProps {
  title: string;
  value: string | number;
  hint: string;
  icon?: LucideIcon;
  tone?: UiTone;
  trend?: string;
}

export function StatCard({
  title,
  value,
  hint,
  icon: Icon = Activity,
  tone = 'neutral',
  trend,
}: StatCardProps) {
  return (
    <article className="card stat-card group relative overflow-hidden p-5 transition-transform duration-200 hover:-translate-y-1">
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-3">
          <span className={cx('inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1', toneChip[tone])}>
            {title}
          </span>
          <div className="space-y-2">
            <p className="font-display tabular-nums text-4xl font-semibold text-ink">{value}</p>
            <p className="max-w-[18rem] text-sm leading-6 text-slate-600">{hint}</p>
          </div>
        </div>
        <div className={cx('flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg', toneIcon[tone])}>
          <Icon size={22} />
        </div>
      </div>
      {trend ? (
        <div className="relative mt-4 inline-flex rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-white/70 backdrop-blur">
          {trend}
        </div>
      ) : null}
    </article>
  );
}
