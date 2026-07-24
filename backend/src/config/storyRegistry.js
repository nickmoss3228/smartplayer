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