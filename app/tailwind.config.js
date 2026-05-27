/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Paleta Quorum: oscuro + verde verificación + ámbar advertencia
        quorum: {
          bg: "#0A0E14",
          surface: "#111820",
          border: "#1E2A38",
          green: "#00D4A0",
          "green-dim": "#00D4A020",
          amber: "#F59E0B",
          "amber-dim": "#F59E0B20",
          red: "#EF4444",
          "red-dim": "#EF444420",
          text: "#E2EBF4",
          muted: "#6B7F94",
        },
      },
      fontFamily: {
        display: ["'DM Mono'", "monospace"],
        body: ["'Syne'", "sans-serif"],
      },
      animation: {
        "pulse-green": "pulseGreen 2s ease-in-out infinite",
        "slide-up": "slideUp 0.4s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
      },
      keyframes: {
        pulseGreen: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.5 },
        },
        slideUp: {
          from: { transform: "translateY(12px)", opacity: 0 },
          to: { transform: "translateY(0)", opacity: 1 },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
