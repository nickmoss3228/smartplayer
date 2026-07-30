// Maps difficulty → character folder name in public/assets/
const characterFolderMap: Record<string, string> = {
  easy: "leo",
  medium: "maya",
  hard: "daniel", // rename to match your actual folder name
};

export const comicManifest: Record<string, string[]> = {
  easy: [
    "1. Meet Leo",
    "2. Leo's mornings",
    "3. Leo’s Favorite Food",
    "4. Leo's family",
    "5. Leo's clothes",
    "6. A Day at the Beach",
    "7. A Country Leo Wants to Visit",
    "8. Leo's hobbies",
    "9. Meeting a friend",
    "10. The Lost Kitten",
  ],
  medium: [
    "1. Meet Maya",
    "2. A trip to Kyoto",
    "3. Trying street food in Bangkok",
    "4. A missed connection",
    "5. Budgeting for adventure",
    "6. Discussing environmental concerns",
    "7. An unexpected interview",
    "8. Family Across Borders",
    "9. The Mountain Festival - Part 1",
    "10. The Mountain Festival - Part 2",
  ],
  hard: [
    "1. Introducing Myself",
    "2. The deal that nearly broke me",
    "3. The Conference in Munich",
    "4. A Failure with a Silver Lining",
    "5. The Bridge at Low Tide",
    "6. Night of the Phantom Pallets",
    "7. Family Weather Report",
    "8. The Price of Enough",
    "9. Family on the Manifest, Part I The Itinerary That Blinked",
    "10. Family on the Manifest, Part II The Break That Tested the Break",
  ],
};

// Builds full public URLs from the manifest
export function getOrderedComics(difficulty: string): string[] {
  const folder = characterFolderMap[difficulty];
  const files = comicManifest[difficulty];
  if (!folder || !files) return [];
  return files.map((name) => `/assets/${folder}/comics/${name}.jpg`);
}

export const orderedComicsEasy: string[] = getOrderedComics("easy");
