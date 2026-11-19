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
      ? 'from-rose-500 via-red-500 to-orange-400'
      : tone === 'warning'
        ? 'from-amber-400 to-orange-400'
        : 'from-teal-500 via-emerald-500 to-cyan-400';

  return (
    <article className="card p-4 transition-all hover:shadow-md md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-ink">{label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description ?? 'Cập nhật liên tục từ AI engine'}
          </p>
        </div>
        <span
          className={cx(
            'inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-bold tabular-nums ring-1',
            toneChip[tone],
          )}
        >
          <span className={cx('h-2 w-2 rounded-full', toneDot[tone])} />
          {formatter ? formatter(value) : value.toFixed(2)}
        </span>
      </div>
      <div className="mt-4 space-y-2.5">
        <div className="relative h-3.5 overflow-hidden rounded-full bg-slate-200/80 ring-1 ring-inset ring-slate-900/5">
          <div
            className={cx(
              'absolute inset-y-0 left-0 rounded-full bg-gradient-to-r shadow-inner transition-all duration-300',
              gradientClass,
            )}
            style={{ width }}
          />
          <div
            className="absolute inset-y-0 w-0.5 bg-amber-500/90"
            style={{ left: warningPosition }}
            title="Ngưỡng cảnh báo"
          />
          <div
            className="absolute inset-y-0 w-0.5 bg-rose-600"
            style={{ left: dangerPosition }}
            title="Ngưỡng nguy hiểm"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Trạng thái trực tiếp
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Cảnh báo: <strong>{formatter ? formatter(warning) : warning.toFixed(2)}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-600" />
            Nguy hiểm: <strong>{formatter ? formatter(danger) : danger.toFixed(2)}</strong>
          </span>
        </div>
      </div>
    </article>
  );
}
