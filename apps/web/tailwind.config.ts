import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FFFEF7",
          100: "#FEF9E7",
          200: "#FDF0C4",
          300: "#FDE68A",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
        },
        surface: {
          950: "#0A0A0B",
          900: "#121214",
          850: "#18181B",
          800: "#1E1E22",
          700: "#27272A",
          600: "#3F3F46",
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      backgroundImage: {
        'glow-yellow': 'radial-gradient(ellipse at 50% 0%, rgba(253, 230, 138, 0.08) 0%, transparent 60%)',
        'glow-yellow-sm': 'radial-gradient(ellipse at 50% 50%, rgba(253, 230, 138, 0.05) 0%, transparent 50%)',
      },
      boxShadow: {
        'glow': '0 0 40px -10px rgba(253, 230, 138, 0.15)',
        'glow-sm': '0 0 20px -5px rgba(253, 230, 138, 0.1)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
