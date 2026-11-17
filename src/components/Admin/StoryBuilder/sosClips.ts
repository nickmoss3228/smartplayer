// components/Admin/StoryBuilder/sosClips.ts
//
// The pure half of the SOS tab: which picked file goes to which marker, and
// the clip list the tab edits. Kept out of the component so it can be tested.

/** The part's clips as one slot per marker; "" where a sentence has none. */
export function clipSlots(helpAudio: string[] | undefined, markerCount: number): string[] {
  return Array.from({ length: markerCount }, (_, i) => helpAudio?.[i] ?? "");
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** The one number in a file name ("3.mp3", "sentence 03.mp3"), or null when it
 *  has none or several (ElevenLabs names carry a date and a time). */
function slotNumberIn(name: string): number | null {
  const groups = name.replace(/\.[^.]+$/, "").match(/\d+/g);
  return groups && groups.length === 1 ? Number(groups[0]) : null;
}

export type SlotMatch<F> =
  | { ok: true; assignments: { index: number; file: F }[] }
  | { ok: false; reason: "tooMany"; picked: number; markers: number };

/**
 * Pairs picked files with markers (0-based slot indexes).
 *
 * When every name carries exactly one number, each in 1..markers and none
 * repeated, the number is the marker: "1.mp3" … "12.mp3" land in place in any
 * order, and a handful of re-recorded sentences replace only their own slots.
 * Otherwise the files fill slots 1, 2, 3… in natural name order — which, for
 * timestamped ElevenLabs downloads, is the order they were made in.
 *
 * More files than markers is refused outright: the markers are the plan, and
 * a spare clip means either the markers or the clips are wrong.
 */
export function matchFilesToSlots<F extends { name: string }>(files: F[], markerCount: number): SlotMatch<F> {
  if (files.length > markerCount) {
    return { ok: false, reason: "tooMany", picked: files.length, markers: markerCount };
  }
  const numbers = files.map((file) => slotNumberIn(file.name));
  const byNumber =
    numbers.every((n) => n !== null && n >= 1 && n <= markerCount) &&
    new Set(numbers).size === numbers.length;
  if (byNumber) {
    return { ok: true, assignments: files.map((file, i) => ({ index: (numbers[i] as number) - 1, file })) };
  }
  const sorted = [...files].sort((a, b) => collator.compare(a.name, b.name));
  return { ok: true, assignments: sorted.map((file, index) => ({ index, file })) };
}
