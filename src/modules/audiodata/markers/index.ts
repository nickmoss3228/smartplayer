// Time markers, kept in the repo instead of only in the database.
//
// Markers can only realistically be authored in the Story Builder — you need
// the waveform to place them. But the Story Builder saves them to the DB, and
// the import flow that creates a draft reads its timeMarkers from the STATIC
// source. So the old loop lost work:
//
//   import static -> add markers in the app -> delete the draft to re-import
//   -> re-import from static -> markers gone, because static had none.
//
// (Deleting is not optional: importStory 409s if a doc for that storyId
// already exists, so re-importing after a content change means delete first.)
//
// These files close the loop. `npm run pull:markers` copies the markers out of
// a draft into the JSON beside this file; the static track data reads them back
// via getStoryMarkers, so the next import carries them in. They also survive
// things the database does not: a dropped staging DB, the prod/staging split,
// and every environment gets the same markers because they ship with the code.
//
// To add a story: pull its markers, then add the import and the map entry
// below — the same two-line ritual audioDataByDifficulty.ts already uses.
import type { TimeMarker } from "../../../types";
import newsRolandGarros from "./easy.news-roland-garros.json";
import newsGrazingBoard from "./easy.news-grazing-board.json";
import newsFamilyVisit from "./easy.news-family-visit.json";

/** Shape of one `<difficulty>.<storyId>.json` file. */
interface StoryMarkerFile {
  difficulty: string;
  storyId: string;
  /** ISO timestamp of the last pull, or null if never pulled. */
  pulledAt: string | null;
  /** Track id ("1", "2", …) -> that part's markers. */
  parts: Record<string, TimeMarker[]>;
}

const files: StoryMarkerFile[] = [newsRolandGarros, newsGrazingBoard, newsFamilyVisit];

const byStory: Record<string, Record<string, TimeMarker[]>> = Object.fromEntries(
  files.map((f) => [`${f.difficulty}:${f.storyId}`, f.parts]),
);

/**
 * Markers for one track, or [] when the story has no file or the part has not
 * been pulled yet. Returning [] rather than undefined matters: an AudioTrack's
 * timeMarkers is non-optional, and an empty waveform is the correct rendering
 * of "no markers recorded", not an error.
 */
export const getStoryMarkers = (
  difficulty: string,
  storyId: string,
  trackId: string,
): TimeMarker[] => byStory[`${difficulty}:${storyId}`]?.[trackId] ?? [];
