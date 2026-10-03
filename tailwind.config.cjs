/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#eef3f3",
        surface: "#f8fbfa",
        "surface-raised": "#ffffff",
        border: "#d7e4e1",
        "border-soft": "#cfe0dc",
        "text-primary": "#193c40",
        "text-secondary": "#57716f",
        "text-muted": "#829996",
        "navy-teal-900": "#173f43",
        "teal-800": "#205951",
        "teal-700": "#277e78",
        "teal-600": "#338b89",
        "mint-100": "#dff7ed",
        "mint-200": "#dceee8",
        online: "#2dbb79",
        warning: "#d89c38",
        offline: "#cf6971",
        info: "#4f83a5",
        background: "#eef3f3",
        foreground: "#173f43",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "Arial", "sans-serif"],
        mono: ["var(--font-space-mono)", "Courier New", "monospace"],
      },
      spacing: {
        'layout-max': '1600px'
      }
    },
    screens: {
      // Single desktop breakpoint — project is desktop-first
      desktop: '1024px'
    }
  },
  plugins: [],
  // Make utilities take precedence so the project styles benefit from Tailwind classes
  important: true,
};
