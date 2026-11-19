export type UiTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const toneSurface: Record<UiTone, string> = {
  neutral: 'from-slate-200/70 via-white/70 to-slate-100/70',
  info: 'from-sky-500/12 via-cyan-400/10 to-blue-500/10',
  success: 'from-emerald-500/14 via-green-400/10 to-lime-300/10',
  warning: 'from-amber-400/16 via-orange-300/10 to-yellow-300/12',
  danger: 'from-rose-500/16 via-red-400/12 to-orange-400/10',
};

export const toneIcon: Record<UiTone, string> = {
  neutral: 'bg-slate-900 text-white',
  info: 'bg-sky-500 text-white',
  success: 'bg-emerald-500 text-white',
  warning: 'bg-amber-500 text-slate-950',
  danger: 'bg-rose-500 text-white',
};

export const toneChip: Record<UiTone, string> = {
  neutral: 'bg-slate-900/8 text-slate-700 ring-slate-900/10',
  info: 'bg-sky-500/12 text-sky-700 ring-sky-500/20',
  success: 'bg-emerald-500/12 text-emerald-700 ring-emerald-500/20',
  warning: 'bg-amber-500/16 text-amber-700 ring-amber-500/20',
  danger: 'bg-rose-500/14 text-rose-700 ring-rose-500/20',
};

export const toneText: Record<UiTone, string> = {
  neutral: 'text-slate-700',
  info: 'text-sky-700',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-rose-700',
};

export const toneDot: Record<UiTone, string> = {
  neutral: 'bg-slate-500',
  info: 'bg-sky-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
};
