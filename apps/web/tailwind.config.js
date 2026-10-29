/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      colors: {
        background: '#09090b',
        foreground: '#fafafa',
        surface: {
          DEFAULT: '#121215',
          elevated: '#18181b',
        },
        card: {
          DEFAULT: '#121215',
          foreground: '#fafafa',
        },
        popover: {
          DEFAULT: '#121215',
          foreground: '#fafafa',
        },
        primary: {
          DEFAULT: '#10b981',
          foreground: '#052e16',
          muted: 'rgba(16, 185, 129, 0.14)',
        },
        secondary: {
          DEFAULT: '#18181b',
          foreground: '#e4e4e7',
        },
        muted: {
          DEFAULT: '#18181b',
          foreground: '#a1a1aa',
        },
        accent: {
          DEFAULT: '#27272a',
          foreground: '#fafafa',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#fef2f2',
        },
        border: '#27272a',
        input: '#27272a',
        ring: '#10b981',
      },
      borderRadius: {
        xl: '0.875rem',
        lg: '0.625rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
    },
  },
  plugins: [],
};

