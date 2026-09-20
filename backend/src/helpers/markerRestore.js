// helpers/markerRestore.js
//
// The pure half of the durable-markers feature, split out of the old
// models/PartMarkers.js so it outlives the Mongoose model. The frontend's
// Vitest suite (src/modules/audiodata/markerRestore.test.ts) tests it directly,
// because the rule it encodes decides whether hand-placed work survives.

/**
 * @typedef {{ time: number, label?: string, color?: string }} TimeMarker
 * @typedef {{ partNumber: number, timeMarkers?: TimeMarker[] }} PartLike
 */

/**
 * Merge remembered markers into incoming parts. Pure, so the rule that decides
 * whether work is preserved or destroyed can be tested without a database.
 *
 * The rule is FILL A GAP, NEVER OVERWRITE: a part that already carries markers
 * is returned untouched, so a caller with an opinion — the static repo files in
 * src/modules/audiodata/markers — always wins. Only an empty part, which means
 * "no opinion", gets the remembered copy. That asymmetry is the whole safety
 * property: no code path can replace real markers with older ones.
 *
 * @param {PartLike[]} [parts]
 * @param {Record<number, TimeMarker[]>} [remembered]
 * @returns {{ parts: PartLike[], restoredCount: number }} restoredCount is parts changed, not markers added.
 */
export function restoreMarkersIntoParts(parts, remembered) {
  let restoredCount = 0;
  const merged = (parts ?? []).map((part) => {
    if (part.timeMarkers?.length) return part;
    const saved = remembered?.[part.partNumber];
    if (!saved?.length) return part;
    restoredCount++;
    return { ...part, timeMarkers: saved };
  });
  return { parts: merged, restoredCount };
}
