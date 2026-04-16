/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        purple: {
          DEFAULT: '#7e43ff',
          50: '#f5f0ff',
          100: '#ede0ff',
          200: '#dec2ff',
          300: '#c794ff',
          400: '#af5fff',
          500: '#7e43ff',
          600: '#6b2ee6',
          700: '#5a22bf',
          800: '#4a1e9c',
          900: '#3e1a7a',
        },
        orange: {
          DEFAULT: '#ff7e3e',
          50: '#fff4ed',
          100: '#ffe6d4',
          200: '#ffc9a8',
          300: '#ffa270',
          400: '#ff7e3e',
          500: '#f55a14',
          600: '#e0400e',
          700: '#ba2e0f',
          800: '#952513',
          900: '#772212',
        },
        void: {
          DEFAULT: '#0a0215',
          light: '#140521',
          dark: '#05010a',
        },
        gold: {
          DEFAULT: '#ffd700',
          light: '#ffec8b',
          dark: '#b8860b',
        },
      },
      fontFamily: {
        display: ['Oxanium', 'sans-serif'],
        body: ['Rajdhani', 'sans-serif'],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        glow: "0 0 30px rgba(126, 67, 255, 0.5)",
        "glow-lg": "0 0 60px rgba(126, 67, 255, 0.6)",
        "glow-orange": "0 0 30px rgba(255, 126, 62, 0.5)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(126, 67, 255, 0.4)" },
          "50%": { boxShadow: "0 0 40px rgba(126, 67, 255, 0.8)" },
        },
        "live-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.2)", opacity: "0.8" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "float": "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "live-pulse": "live-pulse 1.5s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "spin-slow": "spin-slow 20s linear infinite",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-purple': 'linear-gradient(135deg, rgba(126, 67, 255, 0.15) 0%, rgba(20, 5, 33, 0.8) 100%)',
        'gradient-text': 'linear-gradient(135deg, #7e43ff 0%, #ff7e3e 100%)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
