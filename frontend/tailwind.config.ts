import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#111111',
        brand: '#0f766e',
        sun: '#f59e0b'
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 118, 110, 0.18)'
      }
    }
  },
  plugins: []
};

export default config;
