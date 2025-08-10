const LoadingSpinner = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-500 via-red-500 to-blue-600 flex items-center justify-center">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-white/30 rounded-full animate-spin border-t-white"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-white/20 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}

export default LoadingSpinner