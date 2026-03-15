/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-yellow': '#F8B64C',
        'brand-slate':  '#3A4045',
        'brand-teal':   '#529E9B',
        'brand-beige':  '#D8CAAE',
        'brand-bg':     '#F4F1EA',
      },
      fontFamily: {
        display: ['Fredoka', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'solid':       '6px 6px 0px 0px #3A4045',
        'solid-sm':    '3px 3px 0px 0px #3A4045',
        'solid-lg':    '10px 10px 0px 0px #3A4045',
        'solid-hover': '4px 4px 0px 0px #3A4045',
      },
      borderWidth: {
        '3': '3px',
        '4': '4px',
      },
      animation: {
        'float':         'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'pulse-slow':    'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
      },
    },
  },
  plugins: [],
}

