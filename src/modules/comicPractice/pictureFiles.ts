// Matching a folder of word pictures to a part's words by filename, so a dozen
// generated images attach in one drop: "local shop.png", "local_shop.webp" and
// "Local-Shop.JPG" all belong to the word whose key is "local shop".

const stem = (name: string) => name.replace(/\.[^.]+$/, "");

/** A filename or word key reduced to what both are compared by. */
export const pictureKey = (name: string) =>
  stem(name).toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

export interface PictureMatch<F> {
  /** Word key → the file that goes with it. */
  matched: Map<string, F>;
  /** Files no word is named like. */
  unmatched: F[];
}

/**
 * Pairs each file with the word of the same key. A key matched by two files
 * keeps the first and reports the second as unmatched, so nothing is silently
 * overwritten by upload order.
 */
export function matchPictureFiles<F extends { name: string }>(
  files: readonly F[],
  audioKeys: readonly string[],
): PictureMatch<F> {
  const byKey = new Map(audioKeys.map((key) => [pictureKey(key), key]));
  const matched = new Map<string, F>();
  const unmatched: F[] = [];
  for (const file of files) {
    const key = byKey.get(pictureKey(file.name));
    if (key && !matched.has(key)) matched.set(key, file);
    else unmatched.push(file);
  }
  return { matched, unmatched };
}
