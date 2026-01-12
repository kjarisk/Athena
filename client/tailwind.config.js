/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ori + Hades inspired palette (warm, ethereal)
        // Using CSS variables for theme support
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        card: 'var(--color-surface)',
        
        primary: {
          DEFAULT: 'var(--color-primary)',
          light: '#E8C9A8',
          dark: '#B8875A',
          glow: 'var(--color-primary-glow)'
        },
        
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          light: '#9DBAA6',
          dark: '#5D8268',
          glow: 'var(--color-secondary-glow)'
        },
        
        accent: {
          DEFAULT: 'var(--color-accent)',
          light: '#F0D09A',
          dark: '#D09A4A'
        },
        
        success: {
          DEFAULT: '#8FBC8F',
          light: '#B0D4B0',
          dark: '#6A9A6A'
        },
        
        warning: {
          DEFAULT: '#DAA520',
          light: '#E8C566',
          dark: '#B08A18'
        },
        
        danger: {
          DEFAULT: '#CD7F6E',
          light: '#E0A89B',
          dark: '#A85C4D'
        },
        
        text: {
          primary: 'var(--color-text)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)'
        },
        
        border: {
          DEFAULT: 'var(--color-border)',
          light: 'var(--color-border-light)'
        },
        
        // Role-specific colors
        teamlead: '#7BA087',
        competence: '#D4A574',
        manager: '#E8B86D'
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Exo 2', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(212, 165, 116, 0.3)',
        'glow': '0 0 20px rgba(212, 165, 116, 0.4)',
        'glow-lg': '0 0 40px rgba(212, 165, 116, 0.5)',
        'glow-green': '0 0 20px rgba(123, 160, 135, 0.4)',
        'card': '0 4px 20px rgba(44, 62, 45, 0.08)',
        'card-hover': '0 8px 30px rgba(44, 62, 45, 0.12)'
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(212, 165, 116, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(212, 165, 116, 0.6)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-ethereal': 'linear-gradient(135deg, #FDFCFA 0%, #F7F5F0 50%, #F0EDE5 100%)',
        'gradient-warm': 'linear-gradient(135deg, #D4A574 0%, #E8B86D 100%)',
        'gradient-forest': 'linear-gradient(135deg, #7BA087 0%, #8FBC8F 100%)'
      }
    },
  },
  plugins: [],
};

