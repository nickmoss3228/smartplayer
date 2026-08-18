// config/storyRegistry.js
// Add entries here as you create new stories.
// totalParts must match the number of audio tracks in that story.

export const storyRegistry = {
  easy: [
    {
      storyId: "leo",
      storyName: "Leo's Story",
      characterIcon: "🦁",
      totalParts: 10,
    },
    {
      storyId: "leo-additional",
      storyName: "About Leo",
      characterIcon: "🦁",
      totalParts: 3,
    },
    // "News and Interesting things" group. Each is a source article (part 1)
    // plus the linked conversation (part 2), so totalParts is 2 — matching
    // storyGroups.ts and the track count in audioDataNewsPlaceholder.ts.
    // Without these entries getAllStoryMeta can't build a progress roster for
    // them, even though quiz grading works (that reads quizData directly).
    {
      storyId: "news-roland-garros",
      storyName: "Roland Garros 2026",
      characterIcon: "📰",
      totalParts: 2,
    },
    {
      // Frontend still titles this "Leo Visits Family Friends"; the text that
      // actually went in is the New Year survey article. Reconcile the two
      // when the placeholder titles get their real copy.
      storyId: "news-family-visit",
      storyName: "New Year Traditions",
      characterIcon: "📰",
      totalParts: 2,
    },
    {
      storyId: "news-grazing-board",
      storyName: "Grazing Board: Italian Antipasti",
      characterIcon: "📰",
      totalParts: 2,
    },
    // add more easy stories here later
  ],
  medium: [
    {
      storyId: "maya",
      storyName: "Maya's Journey",    
      characterIcon: "✈️",
      totalParts: 10,
    },
  ],
  hard: [
    {
      storyId: "daniel",
      storyName: "Daniel's world",    
      characterIcon: "🎯",
      totalParts: 10,
    },
  ],
};