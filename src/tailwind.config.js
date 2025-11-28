module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.8)' },
          to: { opacity: '1', transform: 'scale(1)' }
        },
        'bounce-in': {
          from: { opacity: '0', transform: 'scale(0) rotate(-180deg)' },
          to: { opacity: '1', transform: 'scale(1) rotate(0deg)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.6s ease-out',
        'fade-in-delay-1': 'fade-in 0.6s ease-out 0.2s both',
        'fade-in-delay-2': 'fade-in 0.6s ease-out 0.4s both',
        'fade-in-delay-3': 'fade-in 0.6s ease-out 0.6s both',
        'slide-down': 'slide-down 0.7s ease-out',
        'slide-up': 'slide-up 0.7s ease-out',
        'scale-in': 'scale-in 0.5s ease-out both',
        'bounce-in': 'bounce-in 0.6s ease-out'
      }
    }
  }
}