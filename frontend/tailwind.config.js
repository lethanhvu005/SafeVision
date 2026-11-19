/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#07111f',
        navy: '#10213f',
        signal: '#ef4444',
        alert: '#f59e0b',
        safe: '#22c55e',
        sand: '#f8fbff',
        steel: '#8ea4c7',
        mist: '#dce6f8',
        panel: '#f4f8ff',
      },
      fontFamily: {
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 24px 60px rgba(7, 17, 31, 0.14)',
        lift: '0 20px 40px rgba(15, 23, 42, 0.18)',
        innerGlass: 'inset 0 1px 0 rgba(255,255,255,0.28)',
      },
      backgroundImage: {
        'hero-grid':
          'linear-gradient(rgba(142,164,199,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(142,164,199,0.14) 1px, transparent 1px)',
      },
      keyframes: {
        'alert-enter': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'sos-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.7' },
          '50%': { transform: 'scale(1.08)', opacity: '0.15' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'alert-enter': 'alert-enter 220ms ease-out',
        'sos-pulse': 'sos-pulse 1.8s ease-in-out infinite',
        floaty: 'floaty 6s ease-in-out infinite',
        shimmer: 'shimmer 2.6s linear infinite',
      },
    },
  },
  plugins: [],
};
