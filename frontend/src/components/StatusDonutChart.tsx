import { cx } from './ui';

interface StatusSegment {
  label: string;
  value: number;
  tone: 'success' | 'warning' | 'danger' | 'info';
}

interface StatusDonutChartProps {
  title: string;
  subtitle: string;
  segments: StatusSegment[];
}

const strokeClass = {
  success: 'stroke-emerald-500',
  warning: 'stroke-amber-500',
  danger: 'stroke-rose-500',
  info: 'stroke-sky-500',
};

const dotClass = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
};

export function StatusDonutChart({
  title,
  subtitle,
  segments,
}: StatusDonutChartProps) {
  const total = Math.max(
    segments.reduce((sum, segment) => sum + segment.value, 0),
    1,
  );
  const circumference = 2 * Math.PI * 42;
  let offsetAccumulator = 0;

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-500">
          Tổng {total}
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative h-52 w-52">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r="42" className="fill-none stroke-slate-200" strokeWidth="10" />
            {segments.map((segment) => {
              const segmentLength = (segment.value / total) * circumference;
              const dashOffset = circumference - offsetAccumulator;
              offsetAccumulator += segmentLength;
              return (
                <circle
                  key={segment.label}
                  cx="60"
                  cy="60"
                  r="42"
                  className={cx('fill-none', strokeClass[segment.tone])}
                  strokeWidth="10"
                  strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs uppercase tracking-[0.24em] text-slate-500">SOS</span>
            <span className="mt-2 font-display text-4xl font-semibold text-ink">{total}</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {segments.map((segment) => (
            <div key={segment.label} className="rounded-2xl bg-slate-900/4 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <span className={cx('h-3 w-3 rounded-full', dotClass[segment.tone])} />
                  {segment.label}
                </div>
                <div className="text-sm font-semibold text-ink">{segment.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
