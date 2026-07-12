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
        background:        "var(--bg)",
        surface:           "var(--surface)",
        "surface-elevated":"var(--surface-elevated)",
        "surface-hover":   "var(--surface-hover)",
        border:            "var(--border)",
        foreground:        "var(--foreground)",
        muted:             "var(--muted)",
        subtle:            "var(--subtle)",
        accent:            "var(--accent)",
        status: {
          green:      "var(--status-green)",
          "green-bg": "var(--status-green-bg)",
          blue:       "var(--status-blue)",
          "blue-bg":  "var(--status-blue-bg)",
          neutral:    "var(--status-neutral)",
          "neutral-bg":"var(--status-neutral-bg)",
          red:        "var(--status-red)",
          "red-bg":   "var(--status-red-bg)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "10px",
        full: "9999px",
      },
      letterSpacing: {
        tight: "-0.025em",
        tighter: "-0.035em",
      },
      animation: {
        "fade-in":  "fadeIn 150ms ease-out",
        "slide-up": "slideUp 150ms ease-out",
        "spin": "spin 1s linear infinite",
      },
      keyframes: {
        fadeIn:  { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};