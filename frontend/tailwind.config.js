/**
 * Design tokens.
 *
 * Palette is unchanged from the existing app — near-black canvas, #64CEFB
 * as the signature accent, green/red for price direction — so the visual
 * identity is preserved while the token set is completed.
 *
 * The previous `keyframes`/`animation` block defined shimmer, fadeInUp and
 * ticker, none of which were referenced anywhere: the ticker and shine were
 * driven by duplicate @keyframes in index.css instead. Those are now used
 * from here, and index.css no longer duplicates them.
 */

module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary-dark': '#0a0e27',
        'primary-light': '#1a1f3a',
        'accent-green': '#00d084',
        'accent-red': '#ff4757',
        'accent-amber': '#ffb020',
        'accent-light': '#00f5a0',
        'accent-blue': '#64CEFB',
        'text-primary': '#ffffff',
        'text-secondary': '#a0a0a0',
        'border-color': '#2d3748',
        'chart-up': '#00d084',
        'chart-down': '#ff4757',
        surface: {
          DEFAULT: 'rgba(255,255,255,0.025)',
          raised: 'rgba(255,255,255,0.05)',
          border: 'rgba(255,255,255,0.08)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '10xl': ['10rem', { lineHeight: '0.85' }],
        '9xl': ['8rem', { lineHeight: '0.85' }],
        '8xl': ['6rem', { lineHeight: '0.85' }],
      },
      letterSpacing: {
        tightest: '-0.05em',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        // Skeleton loading sweep, replacing the spinner on every page.
        skeleton: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Slow halo on the live market-status dot.
        pulseRing: {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.8)', opacity: '0' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        // Brief tint when a price ticks up or down.
        flashUp: {
          '0%': { backgroundColor: 'rgba(0,208,132,0.28)' },
          '100%': { backgroundColor: 'rgba(0,208,132,0)' },
        },
        flashDown: {
          '0%': { backgroundColor: 'rgba(255,71,87,0.28)' },
          '100%': { backgroundColor: 'rgba(255,71,87,0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 3s linear infinite',
        fadeInUp: 'fadeInUp 0.8s ease forwards',
        ticker: 'ticker 30s linear infinite',
        skeleton: 'skeleton 1.6s ease-in-out infinite',
        'pulse-ring': 'pulseRing 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'flash-up': 'flashUp 0.9s ease-out',
        'flash-down': 'flashDown 0.9s ease-out',
      },
      maxWidth: {
        '8xl': '90rem',
      },
    },
  },
  plugins: [],
};
