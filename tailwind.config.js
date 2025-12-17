/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dracula-bg': '#282a36',
        'dracula-sec': '#44475a',
        'dracula-ter': '#6272a4',
        'dracula-elevated': '#21222c',
        'text-primary': '#f8f8f2',
        'text-secondary': '#bfbfbf',
        'neon-green': '#50fa7b',
        'neon-green-hover': '#69ff94',
        'dracula-purple': '#bd93f9',
        'dracula-pink': '#ff79c6',
        'dracula-red': '#ff5555',
        'dracula-yellow': '#f1fa8c',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'neon-sm': '0 0 5px rgba(80, 250, 123, 0.5)',
        'neon-md': '0 0 10px rgba(80, 250, 123, 0.6), 0 0 20px rgba(80, 250, 123, 0.3)',
        'neon-lg': '0 0 15px rgba(80, 250, 123, 0.7), 0 0 30px rgba(80, 250, 123, 0.4)',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(80, 250, 123, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(80, 250, 123, 0.8)' },
        }
      }
    }
  },
  plugins: [],
}