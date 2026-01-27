/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'air': '0 0 0 1px rgba(0,0,0,0.03), 0 2px 20px -4px rgba(0,0,0,0.08)',
        'air-hover': '0 0 0 1px rgba(0,0,0,0.03), 0 8px 30px -4px rgba(0,0,0,0.12)',
      },
      animation: {
        'in': 'fade-in-up 0.6s ease-out forwards',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
