/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base:     '#080B11',
        surface:  '#0F1319',
        elevated: '#161C26',
        hover:    '#1C2433',
        border:   '#1E2840',
        accent:   '#00D4AA',
        violet:   '#7C6AFE',
        bull:     '#00C896',
        bear:     '#FF4560',
        amber:    '#F5C842',
        'txt-1':  '#CDD6F4',
        'txt-2':  '#7D8AB0',
        'txt-3':  '#454F6B',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
