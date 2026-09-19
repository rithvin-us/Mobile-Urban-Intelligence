/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Operations console surfaces: charcoal canvas, dark navy panels.
        canvas: "#0B0E12",
        panel: "#0F141A",
        raised: "#141B23",
        hover: "#1A222C",
        line: "#1E2833",
        "line-soft": "#18202A",

        ink: "#DCE3EA",
        dim: "#8FA0AF",
        faint: "#62727E",

        accent: "#4C86C6",
        "accent-soft": "#1B2E44",
        "accent-line": "#325F8C",

        ok: "#4F9D77",
        warn: "#C9922F",
        crit: "#C7564C",
        water: "#4E96A6",
      },
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
      },
      boxShadow: {
        float: '0 10px 30px -12px rgba(0,0,0,0.75)',
      },
    },
  },
  plugins: [],
}
