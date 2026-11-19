import type { ReactNode, RefObject } from 'react';
import type { LucideIcon } from 'lucide-react';
import { LocateFixed, Power, Video } from 'lucide-react';

import { SOSButton } from './SOSButton';
import { cx, toneChip, toneDot, type UiTone } from './ui';

export interface CameraAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
}

export interface CameraStatus {
  label: string;
  value: string;
  tone: UiTone;
}

interface CameraPanelProps {
  title: string;
  subtitle: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  statuses: CameraStatus[];
  actions: CameraAction[];
  overlay?: ReactNode;
  mirroredOverlay?: ReactNode;
  footer?: ReactNode;
  onSos: () => void;
  sosLoading?: boolean;
  sosEmergency?: boolean;
  mirrorVideo?: boolean;
}

export function CameraPanel({
  title,
  subtitle,
  videoRef,
  canvasRef,
  statuses,
  actions,
  overlay,
  mirroredOverlay,
  footer,
  onSos,
  sosLoading = false,
  sosEmergency = false,
  mirrorVideo = false,
}: CameraPanelProps) {
  return (
    <section className="card overflow-hidden p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/6 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 ring-1 ring-slate-900/8">
            <Video size={14} />
            realtime monitoring
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold text-ink">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p>
        </div>
        <div className="w-full lg:max-w-[320px]">
          <SOSButton onClick={onSos} loading={sosLoading} emergency={sosEmergency} className="w-full" />
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_35%),linear-gradient(180deg,#07111f_0%,#10213f_100%)] p-4 shadow-panel">
          <div className="relative aspect-video overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/80">
            <div
              className="absolute inset-0"
              style={mirrorVideo ? { transform: 'scaleX(-1)' } : undefined}
            >
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-slate-950/40 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/50 to-transparent" />
              {mirroredOverlay}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            {overlay}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {actions.map((action) => {
              const Icon = action.icon ?? Power;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Icon size={16} />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              <LocateFixed size={16} />
              Trạng thái AI
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {statuses.map((status) => (
                <div
                  key={status.label}
                  className={cx(
                    'min-w-[168px] flex-1 rounded-2xl px-4 py-3 text-sm ring-1',
                    toneChip[status.tone],
                  )}
                >
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em]">
                    <span className={cx('h-2.5 w-2.5 rounded-full', toneDot[status.tone])} />
                    {status.label}
                  </div>
                  <div className="mt-2 font-semibold text-ink">{status.value}</div>
                </div>
              ))}
            </div>
          </div>

          {footer}
        </div>
      </div>
    </section>
  );
}
