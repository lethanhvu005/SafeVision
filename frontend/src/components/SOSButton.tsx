import { LoaderCircle, Siren } from 'lucide-react';

import { cx } from './ui';

interface SOSButtonProps {
  onClick: () => void;
  loading?: boolean;
  emergency?: boolean;
  label?: string;
  className?: string;
}

export function SOSButton({
  onClick,
  loading = false,
  emergency = false,
  label = 'Gửi SOS khẩn cấp',
  className,
}: SOSButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cx(
        'group relative inline-flex min-h-[64px] items-center justify-center gap-3 overflow-hidden rounded-[28px] bg-gradient-to-br from-rose-500 via-red-500 to-red-700 px-6 py-4 text-base font-semibold text-white shadow-lift transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70',
        className,
      )}
    >
      {emergency && !loading ? (
        <span className="pointer-events-none absolute inset-0 rounded-[28px] border border-white/40 animate-sos-pulse" />
      ) : null}
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.25),transparent)] bg-[length:200%_100%] opacity-0 transition-opacity group-hover:opacity-100 group-hover:animate-shimmer" />
      {loading ? <LoaderCircle className="animate-spin" size={20} /> : <Siren size={20} />}
      <span className="relative">{loading ? 'Đang gửi SOS...' : label}</span>
    </button>
  );
}
