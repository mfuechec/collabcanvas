/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    // Spacing utilities that might be missing in v4
    'space-x-1', 'space-x-2', 'space-x-3', 'space-x-4', 'space-x-6',
    // Size utilities
    'w-2', 'h-2', 'w-8', 'h-8', 'w-px', 'h-6',
    // Flex utilities
    'flex-shrink-0'
  ]
}
