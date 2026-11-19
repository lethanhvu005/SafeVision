import { cx, toneChip, toneDot, type UiTone } from './ui';

interface MetricBarProps {
  label: string;
  value: number;
  max?: number;
  warning: number;
  danger: number;
  direction?: 'high' | 'low';
  description?: string;
  formatter?: (value: number) => string;
}

function resolveTone({
  value,
  warning,
  danger,
  direction,
}: {
  value: number;
  warning: number;
  danger: number;
  direction: 'high' | 'low';
}): UiTone {
  if (direction === 'low') {
    if (value <= danger) return 'danger';
    if (value <= warning) return 'warning';
    return 'success';
  }

  if (value >= danger) return 'danger';
  if (value >= warning) return 'warning';
  return 'success';
}

export function MetricBar({
  label,
  value,
  max = 1,
  warning,
  danger,
  direction = 'high',
  description,
  formatter,
}: MetricBarProps) {
  const tone = resolveTone({ value, warning, danger, direction });
  const width = `${Math.min(100, Math.max(0, (value / max) * 100))}%`;
  const warningPosition = `${Math.min(100, Math.max(0, (warning / max) * 100))}%`;
  const dangerPosition = `${Math.min(100, Math.max(0, (danger / max) * 100))}%`;
  const gradientClass =
    tone === 'danger'
      ? 'from-rose-500 to-orange-400'
      : tone === 'warning'
        ? 'from-amber-400 to-orange-400'
        : 'from-emerald-500 to-cyan-400';

  return (
    <article className="card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">{label}</p>
          <p className="mt-1 text-xs text-slate-500">{description ?? 'Cập nhật liên tục từ AI engine'}</p>
        </div>
        <span className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1', toneChip[tone])}>
          <span className={cx('h-2.5 w-2.5 rounded-full', toneDot[tone])} />
          {formatter ? formatter(value) : value.toFixed(2)}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        <div className="relative h-3 overflow-hidden rounded-full bg-slate-200/80">
          <div className={cx('absolute inset-y-0 left-0 rounded-full bg-gradient-to-r shadow-inner', gradientClass)} style={{ width }} />
          <div className="absolute inset-y-[-2px] w-px bg-slate-500/70" style={{ left: warningPosition }} />
          <div className="absolute inset-y-[-2px] w-px bg-rose-500/80" style={{ left: dangerPosition }} />
        </div>
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-slate-500">
          <span>Hiện tại</span>
          <span>Ngưỡng cảnh báo {formatter ? formatter(warning) : warning.toFixed(2)}</span>
          <span>Ngưỡng nguy hiểm {formatter ? formatter(danger) : danger.toFixed(2)}</span>
        </div>
      </div>
    </article>
  );
}
