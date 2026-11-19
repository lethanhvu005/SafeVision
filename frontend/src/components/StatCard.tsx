import type { LucideIcon } from 'lucide-react';
import { Activity, TrendingUp } from 'lucide-react';

import { cx, toneChip, toneIcon, toneSurface, type UiTone } from './ui';

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
    <article className="card stat-card group relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lift">
      <div
        className={cx(
          'pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br opacity-60 transition-opacity group-hover:opacity-90',
          toneSurface[tone],
        )}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-3">
          <span
            className={cx(
              'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ring-1',
              toneChip[tone],
            )}
          >
            {title}
          </span>
          <div className="space-y-1.5">
            <p className="font-display text-3xl font-bold tracking-tight tabular-nums text-ink md:text-4xl">
              {value}
            </p>
            <p className="max-w-[20rem] text-sm leading-6 text-slate-600">{hint}</p>
          </div>
        </div>
        <div
          className={cx(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-lg transition-transform duration-200 group-hover:scale-105',
            toneIcon[tone],
          )}
        >
          <Icon size={22} />
        </div>
      </div>
      {trend ? (
        <div className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-slate-900/[0.04] px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-900/10">
          <TrendingUp size={13} className="text-teal-600" />
          {trend}
        </div>
      ) : null}
    </article>
  );
}
