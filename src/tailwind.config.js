module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.8)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "bounce-in": {
          from: { opacity: "0", transform: "scale(0) rotate(-180deg)" },
          to: { opacity: "1", transform: "scale(1) rotate(0deg)" },
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
      },
      animation: {
        "slide-down": "slide-down 0.7s ease-out",
        "slide-up": "slide-up 0.7s ease-out",
        "scale-in": "scale-in 0.5s ease-out both",
        "bounce-in": "bounce-in 0.6s ease-out",
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
