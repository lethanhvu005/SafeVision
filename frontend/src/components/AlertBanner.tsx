import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, CircleCheckBig, Info, ShieldAlert, Siren } from 'lucide-react';

import { cx, toneChip, toneIcon, toneText, type UiTone } from './ui';

interface AlertBannerProps {
  level?: UiTone;
  title: string;
  description: string;
  icon?: LucideIcon;
}

function resolveIcon(level: UiTone) {
  switch (level) {
    case 'danger':
      return Siren;
    case 'warning':
      return AlertTriangle;
    case 'success':
      return CircleCheckBig;
    case 'info':
      return Info;
    default:
      return ShieldAlert;
  }
}

export function AlertBanner({
  level = 'info',
  title,
  description,
  icon,
}: AlertBannerProps) {
  const Icon = icon ?? resolveIcon(level);

  return (
    <div className={cx('animate-alert-enter rounded-[28px] border border-white/60 bg-white/70 p-4 shadow-panel backdrop-blur', toneText[level])}>
      <div className="flex items-start gap-4">
        <div className={cx('flex h-11 w-11 flex-none items-center justify-center rounded-2xl shadow-lg', toneIcon[level])}>
          <Icon size={20} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-ink">{title}</h4>
            <span className={cx('rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ring-1', toneChip[level])}>
              {level === 'danger'
                ? 'Nguy hiểm'
                : level === 'warning'
                  ? 'Cảnh báo'
                  : level === 'success'
                    ? 'An toàn'
                    : level === 'info'
                      ? 'Thông tin'
                      : 'Hệ thống'}
            </span>
          </div>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}
