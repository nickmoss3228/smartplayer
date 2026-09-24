// Loaded by App.css through `@config`. Colours, fonts and the entrance easing
// live in App.css's `@theme` block (docs/design-manifest.md); this file only
// carries the older animation utilities.
//
// Each animation name is declared exactly once. It used to declare `bounce-in`
// and `scale-in` twice; in an object literal the second silently wins, so the
// first definitions and the keyframes only they used were dead. The survivors
// below are the ones that were actually rendering.
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        confetti: {
          "0%": {
            transform: "translateY(-100vh) rotate(0deg)",
            opacity: "1",
          },
          "100%": {
            transform: "translateY(100vh) rotate(720deg)",
            opacity: "0",
          },
        },
        bounceIn: {
          "0%": {
            transform: "scale(0)",
            opacity: "0",
          },
          "50%": {
            transform: "scale(1.2)",
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1",
          },
        },
        scaleIn: {
          "0%": {
            transform: "scale(0.8)",
            opacity: "0",
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1",
          },
        },
        fadeIn: {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },
        "blink-ring": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
      },
      animation: {
        "blink-ring": "blink-ring 1.2s ease-in-out infinite",
        "slide-down": "slide-down 0.7s ease-out",
        "slide-up": "slide-up 0.7s ease-out",
        confetti: "confetti 3s ease-in-out infinite",
        "confetti-slow": "confetti 4s ease-in-out infinite",
        "confetti-fast": "confetti 2.5s ease-in-out infinite",
        "bounce-in": "bounceIn 0.6s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "fade-in": "fadeIn 0.5s ease-out",
        "fade-in-delay-1": "fadeIn 0.5s ease-out 0.1s both",
        "fade-in-delay-2": "fadeIn 0.5s ease-out 0.2s both",
        "fade-in-delay-3": "fadeIn 0.5s ease-out 0.3s both",
      },
    },
  },
};
