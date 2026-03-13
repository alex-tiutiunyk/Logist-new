/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0f4c35',
        accent: '#1D9E75',
        bg: '#f8faf9',
        surface: '#ffffff',
        border: '#e8f0ec',
        muted: '#6b8f7e',
        status: {
          in_transit: '#2563eb',
          loading_cargo: '#d97706',
          customs: '#7c3aed',
          completed: '#059669',
          emergency: '#dc2626',
        },
      },
      screens: {
        xs: '375px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
