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
        canvas: "rgb(var(--canvas-rgb) / <alpha-value>)",
        panel: "rgb(var(--panel-rgb) / <alpha-value>)",
        raised: "rgb(var(--raised-rgb) / <alpha-value>)",
        hover: "rgb(var(--hover-rgb) / <alpha-value>)",
        line: "rgb(var(--line-rgb) / <alpha-value>)",
        "line-soft": "rgb(var(--line-soft-rgb) / <alpha-value>)",

        ink: "rgb(var(--ink-rgb) / <alpha-value>)",
        dim: "rgb(var(--dim-rgb) / <alpha-value>)",
        faint: "rgb(var(--faint-rgb) / <alpha-value>)",

        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        "accent-line": "var(--accent-line)",

        ok: "var(--ok)",
        warn: "var(--warn)",
        crit: "var(--crit)",
        water: "var(--water)",
      },
      fontFamily: {
        sans: ['var(--font-ui)', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      // A 1.2 scale off a 13px base. Telemetry rows sit at micro/mini, panel
      // headings at base, and only the fleet counters go above that.
      fontSize: {
        micro: ['10px', { lineHeight: '13px', letterSpacing: '0.01em' }],
        mini: ['11px', { lineHeight: '15px', letterSpacing: '0.005em' }],
        '2xs': ['10px', '14px'],
        sm: ['12px', { lineHeight: '16px' }],
        base: ['13px', { lineHeight: '18px' }],
        md: ['15px', { lineHeight: '20px', letterSpacing: '-0.01em' }],
        lg: ['18px', { lineHeight: '23px', letterSpacing: '-0.015em' }],
        xl: ['22px', { lineHeight: '26px', letterSpacing: '-0.02em' }],
      },
      boxShadow: {
        float: 'var(--shadow-float)',
      },
      borderRadius: {
        panel: '14px',
      },
    },
  },
  plugins: [],
}
