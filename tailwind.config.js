module.exports = {
  content: [
    './client/index.html',
    './client/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Original site colors
        'primary-color': 'var(--primary-color)',
        'secondary-color': 'var(--secondary-color)',
        'accent-color': 'var(--accent-color)',
        'text-light': 'var(--text-light)',
        'text-dark': 'var(--text-dark)',
        'background-light': 'var(--background-light)',
        'background-dark': 'var(--background-dark)',
        'star-color': 'var(--star-color)',
        // NeoCore colors
        'background-1': 'var(--background-1)',
        'background-2': 'var(--background-2)',
        'background-3': 'var(--background-3)',
        'glow-cyan': 'var(--glow-cyan)',
        'glow-electric': 'var(--glow-electric)',
        'glow-pink': 'var(--glow-pink)',
        'border-soft': 'var(--border-soft)',
        'border-glow': 'var(--border-glow)',
        'text-primary': 'var(--text-primary)',
        'text-dim': 'var(--text-dim)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'neon-glow': 'var(--neon-glow)',
        'accent-glow': 'var(--accent-glow)',
        'primary-glow': 'var(--primary-glow)',
      },
      textShadow: {
        'neon-glow': 'var(--neon-glow)',
        'accent-glow': 'var(--accent-glow)',
        'primary-glow': 'var(--primary-glow)',
      },
      animation: {
        'float': 'float 5s ease-in-out infinite',
        'star-pulse': 'starPulse 2s ease-in-out infinite',
        'particle-fade': 'particleFade 10s infinite linear',
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'fade-in-soft': 'fadeInSoft 1.1s cubic-bezier(.4,0,.2,1) forwards',
        'premium-float': 'floatPremium 4.5s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.2s infinite alternate cubic-bezier(0.4,0,0.2,1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        starPulse: {
          '0%, 100%': { opacity: '0.2' },
          '50%': { opacity: '0.7' },
        },
        particleFade: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '0.7' },
          '100%': { transform: 'translateY(-100vh) scale(0.5)', opacity: '0' },
        },
        fadeIn: {
          'from': { opacity: '0', transform: 'translateY(30px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInSoft: {
          'from': { opacity: '0', transform: 'translateY(24px)' },
          'to': { opacity: '1', transform: 'none' },
        },
        floatPremium: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-18px) scale(1.025)' },
        },
        pulseGlow: {
          '0%': { opacity: '0.7', transform: 'scale(1)' },
          '100%': { opacity: '1', transform: 'scale(1.12)' },
        },
      },
    },
  },
  plugins: [],
} 