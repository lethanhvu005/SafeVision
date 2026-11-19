import { cx } from './ui';

interface MiniTrendChartProps {
  title: string;
  subtitle: string;
  values: number[];
  labels: string[];
  tone?: 'info' | 'warning' | 'danger' | 'success';
}

const toneStroke = {
  info: 'stroke-sky-500',
  warning: 'stroke-amber-500',
  danger: 'stroke-rose-500',
  success: 'stroke-emerald-500',
};

const toneFill = {
  info: 'fill-sky-500/15',
  warning: 'fill-amber-500/15',
  danger: 'fill-rose-500/15',
  success: 'fill-emerald-500/15',
};

export function MiniTrendChart({
  title,
  subtitle,
  values,
  labels,
  tone = 'info',
}: MiniTrendChartProps) {
  const maxValue = Math.max(...values, 1);
  const stepX = values.length > 1 ? 100 / (values.length - 1) : 100;
  const points = values
    .map((value, index) => {
      const x = index * stepX;
      const y = 100 - (value / maxValue) * 100;
      return `${x},${y}`;
    })
    .join(' ');
  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-500">
          7 ngày gần nhất
        </div>
      </div>

      <div className="mt-6">
        <svg viewBox="0 0 100 100" className="h-48 w-full overflow-visible">
          <polygon points={areaPoints} className={toneFill[tone]} />
          <polyline
            points={points}
            className={cx('fill-none stroke-[2.2]', toneStroke[tone])}
            vectorEffect="non-scaling-stroke"
          />
          {values.map((value, index) => {
            const x = index * stepX;
            const y = 100 - (value / maxValue) * 100;
            return (
              <circle
                key={`${labels[index]}-${value}`}
                cx={x}
                cy={y}
                r={2.2}
                className={cx('fill-white stroke-[2]', toneStroke[tone])}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs text-slate-500">
        {labels.map((label, index) => (
          <div key={label}>
            <div className="font-medium text-slate-600">{values[index]}</div>
            <div className="mt-1">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
