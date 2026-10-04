// config/onboarding.js  (backend)
//
// The two questions a new account answers before its first story (the
// frontend's /welcome flow). The values are stored verbatim in
// users.onboarding_english_level / users.onboarding_listening_experience, and
// the CHECK constraints in db/schema.ts mirror these lists — change both.
//
// The frontend keeps its own copy of the ids with their labels and icons
// (src/modules/onboarding/onboardingOptions.ts); catalogMirror-style tests on
// both sides keep the three in step.

/** The student's own estimate, easiest first. */
export const ENGLISH_LEVELS = [
  "beginner",
  "elementary",
  "intermediate",
  "upper_intermediate",
  "advanced",
];

/** How much English they already listen to, least first. */
export const LISTENING_EXPERIENCES = [
  "none",
  "subtitles",
  "no_subtitles",
  "courses",
  "immersion",
];

export const isEnglishLevel = (value) =>
  typeof value === "string" && ENGLISH_LEVELS.includes(value);

export const isListeningExperience = (value) =>
  typeof value === "string" && LISTENING_EXPERIENCES.includes(value);
