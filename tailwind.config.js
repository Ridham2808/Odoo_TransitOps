/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./app/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base surfaces
        background: "var(--bg)",
        surface: "var(--surface)",
        "surface-elevated": "var(--surface-elevated)",
        border: "var(--border)",
        "border-subtle": "var(--border-subtle)",

        // Text
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        subtle: "var(--subtle)",

        // Accent — amber
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          muted: "var(--accent-muted)",
        },

        // Status colors
        status: {
          green: "var(--status-green)",
          "green-bg": "var(--status-green-bg)",
          blue: "var(--status-blue)",
          "blue-bg": "var(--status-blue-bg)",
          amber: "var(--status-amber)",
          "amber-bg": "var(--status-amber-bg)",
          red: "var(--status-red)",
          "red-bg": "var(--status-red-bg)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "10px",
        full: "9999px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
        elevated: "0 4px 16px rgba(0,0,0,0.5)",
        "glow-amber": "0 0 20px rgba(245,158,11,0.15)",
      },
      transitionDuration: {
        DEFAULT: "150ms",
        fast: "100ms",
        normal: "150ms",
        slow: "200ms",
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-in-left": "slideInLeft 200ms ease-out",
        "slide-up": "slideUp 150ms ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideInLeft: {
          "0%": { transform: "translateX(-8px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(4px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
