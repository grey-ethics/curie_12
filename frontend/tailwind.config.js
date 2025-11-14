/** @type {import('tailwindcss').Config} */
import animate from 'tailwindcss-animate'

export default {
  content: ['./index.html','./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        card: 'var(--card)',
        border: 'var(--border)',
        primary: 'var(--primary)',
      },
      borderRadius: { '2xl': '1rem' },
      boxShadow: { soft: '0 10px 30px rgba(0,0,0,.12)' },
    },
  },
  plugins: [animate],
}
