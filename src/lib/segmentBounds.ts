/**
 * Where does the current sentence start and end?
 *
 * This is the core of the whole app: "replay this sentence" and "next
 * sentence" both reduce to a [start, end) window over the audio, derived from
 * the marker list. It lived in three places at once — usePlayerControls,
 * useSegmentEngine and Admin/StoryBuilder/PartAudioMarkerEditor — as three
 * copies of the same conditional chain, which is why it now lives here.
 *
 * Markers are a mixed list on purpose: older static story data stores plain
 * numbers, the Story Builder writes `{ time }` objects, and both flow through
 * the same player.
 */

export type Marker = { time: number } | number;

/** Unwrap a marker to its seconds value, whichever shape it arrived in. */
export const markerTime = (marker: Marker): number =>
  typeof marker === 'object' ? marker.time : marker;

/**
 * The segment for `markerIndex`, running to the next marker or to the end of
 * the track.
 *
 * `duration` is allowed to be 0 or undefined: the audio element reports 0
 * until metadata loads, and a segment that ends at 0 would be empty and would
 * stop playback instantly. Falling back to `Infinity` means "play to the end",
 * which is the safe reading while duration is still unknown.
 */
export function computeSegmentBounds(
  markers: readonly Marker[] | null | undefined,
  markerIndex: number,
  duration: number | null | undefined,
): { start: number; end: number } {
  const trackEnd = duration || Infinity;

  // No markers, or we're before the first one: the whole track is the segment.
  if (!markers?.length || markerIndex < 0) {
    return { start: 0, end: trackEnd };
  }

  const current = markers[markerIndex];
  const next = markers[markerIndex + 1];

  return {
    start: markerTime(current),
    end: next ? markerTime(next) : trackEnd,
  };
}

/**
 * The index of the marker covering `time` — i.e. the last marker at or before
 * it. Returns 0 when `time` precedes every marker, so the caller always has a
 * usable index to seek to.
 */
export function findMarkerIndexAt(
  markers: readonly Marker[] | null | undefined,
  time: number,
): number {
  if (!markers?.length) return 0;

  let index = 0;
  for (let i = 0; i < markers.length; i++) {
    if (time >= markerTime(markers[i])) index = i;
    else break;
  }
  return index;
}
