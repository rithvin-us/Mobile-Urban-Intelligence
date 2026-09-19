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
        canvas: "var(--canvas)",
        panel: "var(--panel)",
        raised: "var(--raised)",
        hover: "var(--hover)",
        line: "var(--line)",
        "line-soft": "var(--line-soft)",

        ink: "var(--ink)",
        dim: "var(--dim)",
        faint: "var(--faint)",

        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        "accent-line": "var(--accent-line)",

        ok: "var(--ok)",
        warn: "var(--warn)",
        crit: "var(--crit)",
        water: "var(--water)",
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
