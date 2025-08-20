import { useNavigate } from "react-router";

const order = ['easy', 'medium', 'hard'];

const LevelProgress = ({
  difficulty = "",
  completedLevels = [],
  currentLevel = 1,
  totalLevels = 10,
  onRefresh = () => { },
  onNavigate,
  debugMode = false,
}) => {
  const navigate = useNavigate(); 

  const themes = {
    easy: {
      title: "Easy",
      subtitle: "Leo's Life",
      background: "from-green-900 via-emerald-900 to-teal-800",
      completedGradient: "from-green-400 to-green-600",
      currentGradient: "from-emerald-400 to-emerald-600",
      progressGradient: "from-green-400 to-green-600",
      completedColor: "border-green-300",
      currentColor: "border-emerald-300",
      statColors: {
        completed: "text-green-400",
        remaining: "text-emerald-400",
        progress: "text-teal-400",
      },
    },
    medium: {
      title: "Medium",
      subtitle: "Anna's trip",
      background: "from-yellow-900 via-orange-900 to-red-800",
      completedGradient: "from-yellow-400 to-orange-500",
      currentGradient: "from-orange-400 to-red-500",
      progressGradient: "from-yellow-400 to-orange-500",
      completedColor: "border-yellow-300",
      currentColor: "border-orange-300",
      statColors: {
        completed: "text-yellow-400",
        remaining: "text-orange-400",
        progress: "text-red-400",
      },
    },
    hard: {
      title: "Hard",
      subtitle: "Steven's business trip",
      background: "from-red-900 via-purple-900 to-pink-800",
      completedGradient: "from-red-400 to-red-600",
      currentGradient: "from-purple-400 to-purple-600",
      progressGradient: "from-red-400 to-purple-600",
      completedColor: "border-red-300",
      currentColor: "border-purple-300",
      statColors: {
        completed: "text-red-400",
        remaining: "text-purple-400",
        progress: "text-pink-400",
      },
    },
  };

  const theme = themes[difficulty] || themes.easy;

  const handleLevelClick = (level) => {
    if (debugMode || level <= currentLevel) {
      navigate(`/player?difficulty=${difficulty}&level=${level}`);
    }
  };

  const getLevelStatus = (level) => {
    if (debugMode) return "available"; // In debug mode, make all available

    if (completedLevels.includes(level)) return "completed";
    if (level === currentLevel) return "current";
    if (level < currentLevel) return "available";
    return "locked";
  };

  const getLevelStyles = (level) => {
    const status = getLevelStatus(level);

    switch (status) {
      case "completed":
        return `bg-gradient-to-br ${theme.completedGradient} text-white shadow-lg transform hover:scale-105 cursor-pointer border-2 ${theme.completedColor}`;
      case "current":
        return `bg-gradient-to-br ${theme.currentGradient} text-white shadow-lg transform hover:scale-105 cursor-pointer border-2 ${theme.currentColor} animate-pulse`;
      case "available":
        return "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700 shadow-md transform hover:scale-105 cursor-pointer border-2 border-gray-200";
      default:
        return "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400 cursor-not-allowed border-2 border-gray-100";
    }
  };

  const getLevelIcon = (level) => {
    const status = getLevelStatus(level);

    switch (status) {
      case "completed":
        return "✓";
      case "current":
        return "▶";
      case "locked":
        return "🔒";
      default:
        return level;
    }
  };

  const currentIndex = Math.max(0, order.indexOf(difficulty));
  const prevDifficulty = currentIndex > 0 ? order[currentIndex - 1] : null;
  const nextDifficulty = currentIndex < order.length - 1 ? order[currentIndex + 1] : null;

  const routeByDifficulty = (d) => {
    switch (d) {
      case "easy":
        return "/levels/easy";
      case "medium":
        return "/levels/medium";
      case "hard":
        return "/levels/hard";
      default:
        return "/levels/easy";
    }
  };

  const goToDifficulty = (d) => {
    if (!d) return;
    if (onNavigate) {
      onNavigate(d);
      return;
    }
    navigate(routeByDifficulty(d));
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.background} p-8`}>
      <div className="max-w-4xl mx-auto">
        {/* Header with arrows */}
        <div className="flex items-center justify-between mb-12">
          {/* Left Arrow */}
          <button
            onClick={() => goToDifficulty(prevDifficulty)}
            disabled={!prevDifficulty}
            className={`h-10 w-10 rounded-full flex items-center cursor-pointer justify-center transition
              ${prevDifficulty ? "bg-white/10 hover:bg-white/20 text-white" : "bg-white/5 text-white/30 cursor-not-allowed"}
            `}
            aria-label="Previous difficulty"
            title={prevDifficulty ? `Go to ${prevDifficulty}` : "No previous diffculties"}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Title and subtitle */}
          <div className="text-center">
            <div className="text-2xl font-bold text-white/80 mb-2 tracking-wider">
              {theme.title}
            </div>
            <h1 className="text-4xl font-bold text-white">
              {theme.subtitle}
            </h1>
          </div>

          {/* Right Arrow */}
          <button
            onClick={() => goToDifficulty(nextDifficulty)}
            disabled={!nextDifficulty}
            className={`h-10 w-10 rounded-full flex items-center cursor-pointer justify-center transition
              ${nextDifficulty ? "bg-white/10 hover:bg-white/20 text-white" : "bg-white/5 text-white/30 cursor-not-allowed"}
            `}
            aria-label="Next difficulty"
            title={nextDifficulty ? `Go to ${nextDifficulty}` : "No next"}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Legend */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-4 text-white/80">
            <div className="flex items-center space-x-2">
              <div className={`w-4 h-4 bg-gradient-to-r ${theme.completedGradient} rounded`}></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-4 h-4 bg-gradient-to-r ${theme.currentGradient} rounded animate-pulse`}></div>
              <span>Current</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-400 rounded"></div>
              <span>Locked</span>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              Overall Progress
            </h2>
            <span className="text-white/80">
              {completedLevels.length}/{totalLevels} Completed
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div
              className={`bg-gradient-to-r ${theme.progressGradient} h-3 rounded-full transition-all duration-500`}
              style={{
                width: `${(completedLevels.length / totalLevels) * 100}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Level Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {[...Array(totalLevels)].map((_, index) => {
            const level = index + 1;
            return (
              <div
                key={level}
                onClick={() => handleLevelClick(level)}
                className={`
                  relative aspect-square rounded-2xl flex flex-col items-center justify-center
                  transition-all duration-300 ${getLevelStyles(level)}
                `}
              >
                {/* Level icon/number */}
                <div className="text-3xl font-bold mb-2">
                  {getLevelIcon(level)}
                </div>

                {/* Level label */}
                <div className="text-sm font-medium">Level {level} { }</div>

                {/* Completion badge */}
                {completedLevels.includes(level) && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-yellow-900 text-2xl">★</span>
                  </div>
                )}

                {/* Current level indicator */}
                {level === currentLevel && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                    <div
                      className={`w-3 h-3 bg-gradient-to-r ${theme.currentGradient} rounded-full animate-bounce`}
                    ></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Stats Cards */}
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <div
              className={`text-3xl font-bold ${theme.statColors.completed} mb-2`}
            >
              {completedLevels.length}
            </div>
            <div className="text-white/80">Levels Completed</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <div
              className={`text-3xl font-bold ${theme.statColors.remaining} mb-2`}
            >
              {totalLevels - currentLevel + 1}
            </div>
            <div className="text-white/80">Levels Remaining</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <div
              className={`text-3xl font-bold ${theme.statColors.progress} mb-2`}
            >
              {Math.round((completedLevels.length / totalLevels) * 100)}%
            </div>
            <div className="text-white/80">Progress</div>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default LevelProgress;
