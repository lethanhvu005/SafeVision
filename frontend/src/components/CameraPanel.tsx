import type { ReactNode, RefObject } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Camera, LocateFixed, Power, Radio, Sparkles, Video } from 'lucide-react';

import { SOSButton } from './SOSButton';
import { cx, toneChip, toneDot, type UiTone } from './ui';

export interface CameraAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
  variant?: 'primary' | 'danger' | 'default';
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
  cameraActive?: boolean;
  onStartCamera?: () => void;
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
  cameraActive = false,
  onStartCamera,
}: CameraPanelProps) {
  return (
    <section className="card relative overflow-hidden p-5 md:p-6">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-700 ring-1 ring-teal-500/20">
              <Video size={14} />
              Giám sát thời gian thực
            </span>
            <span
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1',
                cameraActive
                  ? 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/25'
                  : 'bg-slate-900/5 text-slate-600 ring-slate-900/10',
              )}
            >
              <span
                className={cx(
                  'h-2 w-2 rounded-full',
                  cameraActive ? 'animate-pulse bg-emerald-500' : 'bg-slate-400',
                )}
              />
              {cameraActive ? 'LIVE AI STREAM' : 'STANDBY'}
            </span>
          </div>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
            {title}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p>
        </div>

        <div className="w-full lg:max-w-[300px]">
          <SOSButton
            onClick={onSos}
            loading={sosLoading}
            emergency={sosEmergency}
            className="w-full"
          />
        </div>
      </div>

      <div className="relative mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="flex flex-col justify-between rounded-[28px] border border-slate-800/80 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_38%),linear-gradient(180deg,#07111f_0%,#0c192e_100%)] p-3.5 shadow-panel md:p-4">
          <div className="relative aspect-video overflow-hidden rounded-[22px] border border-white/10 bg-slate-950/90 shadow-inner">
            <div
              className="absolute inset-0"
              style={mirrorVideo ? { transform: 'scaleX(-1)' } : undefined}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cx(
                  'h-full w-full object-cover transition-opacity duration-300',
                  cameraActive ? 'opacity-100' : 'opacity-20',
                )}
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/60 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/70 to-transparent" />
              {mirroredOverlay}
            </div>

            {!cameraActive ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-sky-400/30 bg-sky-500/10 text-sky-300 shadow-lg backdrop-blur-md">
                  <div className="absolute -inset-2 rounded-[28px] border border-sky-400/15 animate-pulse" />
                  <Camera size={34} />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-white md:text-xl">
                  Camera giám sát đang ở chế độ chờ
                </h3>
                <p className="mt-1.5 max-w-md text-xs leading-5 text-slate-300 md:text-sm">
                  Bật camera để hệ thống phân tích dấu hiệu buồn ngủ (EAR, MAR, tư thế đầu) và nhận diện chuỗi cử chỉ tay S-O-S theo thời gian thực.
                </p>
                {onStartCamera ? (
                  <button
                    type="button"
                    onClick={onStartCamera}
                    className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:from-teal-400 hover:to-sky-400"
                  >
                    <Sparkles size={16} />
                    Kích hoạt Camera AI ngay
                  </button>
                ) : null}
              </div>
            ) : null}

            <canvas ref={canvasRef} className="hidden" />
            {overlay}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap gap-2.5">
              {actions.map((action, index) => {
                const Icon = action.icon ?? Power;
                const isPrimaryAction =
                  action.variant === 'primary' || (!cameraActive && index === 0);
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={cx(
                      'inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
                      isPrimaryAction
                        ? 'border-sky-400/40 bg-gradient-to-r from-teal-500/90 to-sky-500/90 text-white shadow-md shadow-sky-500/20 hover:from-teal-500 hover:to-sky-500'
                        : 'border-white/12 bg-white/10 text-white hover:border-white/25 hover:bg-white/15',
                    )}
                  >
                    <Icon size={16} />
                    {action.label}
                  </button>
                );
              })}
            </div>

            <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 sm:inline-flex">
              <Radio size={14} className={cameraActive ? 'text-emerald-400' : 'text-slate-400'} />
              <span>Chu kỳ AI: 250ms</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4 md:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                <LocateFixed size={15} className="text-teal-600" />
                Chỉ số trạng thái trực tiếp
              </div>
              <span className="rounded-full bg-slate-900/5 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                {statuses.length} hạng mục
              </span>
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-2">
              {statuses.map((status) => (
                <div
                  key={status.label}
                  className={cx(
                    'rounded-2xl px-3.5 py-3 text-sm ring-1 transition',
                    toneChip[status.tone],
                  )}
                >
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80">
                    <span className={cx('h-2 w-2 shrink-0 rounded-full', toneDot[status.tone])} />
                    <span className="truncate">{status.label}</span>
                  </div>
                  <div className="mt-1.5 truncate font-semibold text-ink">{status.value}</div>
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
