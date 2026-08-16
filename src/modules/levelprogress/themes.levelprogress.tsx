// `accent` is the same hue as each level's `lastListenedBorder`, expressed as
// the Tailwind v4 palette variable rather than a class, so it can be handed to
// things Tailwind can't reach — SVG `stroke`/`fill`, inline styles. Points at
// the same --color-* custom property Tailwind emits, so it cannot drift from
// the utility classes below it.
export const themes = {
  easy: {
    title: "Easy",
    subtitle: "Leo's Life",
    accent: "var(--color-green-500)",
    gradient: "from-green-900 via-emerald-900 to-teal-800",
    background: "",
    // 2nd state: completed
    completedGradient: "from-green-400 to-green-600",
    completedColor: "border-green-300",
    // 3rd state: last listened
    currentGradient: "from-green-200 to-green-600",
    currentColor: "border-green-200",
    // 1st state: incomplete
    incompleteGradient: "from-teal-600 to-emerald-700",
    incompleteColor: "border-teal-400",
    progressGradient: "from-green-400 to-green-600",
    // Blinking "last listened, not finished" highlight — easy = green
    lastListenedBorder: "border-green-500",
    statColors: {
      completed: "text-green-400",
      remaining: "text-emerald-400",
      progress: "text-teal-400",
    },
  },
  medium: {
    title: "Medium",
    subtitle: "Maya's Adventures",
    accent: "var(--color-orange-500)",
    gradient: "from-yellow-900 via-orange-900 to-red-800",
    background: "",
    // 2nd state: completed
    completedGradient: "from-yellow-400 to-orange-500",
    completedColor: "border-yellow-300",
    // 3rd state: last listened
    currentGradient: "from-sky-300 to-blue-400",
    currentColor: "border-sky-200",
    // 1st state: incomplete
    incompleteGradient: "from-orange-700 to-red-800",
    incompleteColor: "border-orange-500",
    progressGradient: "from-yellow-400 to-orange-500",
    // Blinking "last listened, not finished" highlight — medium = orange
    lastListenedBorder: "border-orange-500",
    statColors: {
      completed: "text-yellow-400",
      remaining: "text-orange-400",
      progress: "text-red-400",
    },
  },
  hard: {
    title: "Hard",
    subtitle: "Daniel Mercer: a businessman's journey",
    accent: "var(--color-purple-500)",
    gradient: "from-red-900 via-purple-900 to-pink-800",
    background: "",
    // 2nd state: completed
    completedGradient: "from-red-400 to-red-600",
    completedColor: "border-red-300",
    // 3rd state: last listened
    currentGradient: "from-cyan-300 to-teal-400",
    currentColor: "border-cyan-200",
    // 1st state: incomplete
    incompleteGradient: "from-purple-700 to-pink-800",
    incompleteColor: "border-purple-500",
    progressGradient: "from-red-400 to-purple-600",
    // Blinking "last listened, not finished" highlight — hard = purple
    lastListenedBorder: "border-purple-500",
    statColors: {
      completed: "text-red-400",
      remaining: "text-purple-400",
      progress: "text-pink-400",
    },
  },
};