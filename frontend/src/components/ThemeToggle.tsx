import { MoonStar, SunMedium } from 'lucide-react';

import { useTheme } from '../theme/ThemeProvider';

export function ThemeToggle() {
  const { isNight, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isNight}
      aria-label={isNight ? 'Chuyển sang chế độ ban ngày' : 'Chuyển sang chế độ ban đêm'}
      className="theme-toggle fixed bottom-5 right-5 z-[70] inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/82 px-4 py-3 text-sm font-semibold text-ink shadow-lift backdrop-blur-xl transition hover:-translate-y-0.5"
    >
      {isNight ? <SunMedium size={18} /> : <MoonStar size={18} />}
      <span>{isNight ? 'Chế độ ngày' : 'Chế độ ban đêm'}</span>
    </button>
  );
}
