// modules/handout/downloadHandout.ts
//
// "Download PDF" on a part's card: fetch the part's handout, lay it out, and
// hand the browser a file. The PDF is made on the learner's device, so the
// server only answers one JSON request per download.
import { fetchPartHandout } from "./handoutApi";
import { buildHandoutModel, type HandoutLabels, type HandoutLocale } from "./handoutModel";

export { HandoutLockedError } from "./handoutApi";

/** Longest side of the comic in the PDF. The pages print at A4; more is only weight. */
const COMIC_MAX_SIDE = 1600;

/**
 * The comic page as a JPEG data URL, scaled down to print size. A PDF takes
 * only JPEG and PNG, and redrawing it also turns any other format into one.
 * Null when it cannot be loaded: the handout is still worth having without it.
 */
async function comicForPrint(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(new URL(url, window.location.origin).href);
    if (!res.ok) return null;
    const bitmap = await createImageBitmap(await res.blob());
    const scale = Math.min(1, COMIC_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.86);
  } catch {
    return null;
  }
}

function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked late: Safari reads the blob after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Throws HandoutLockedError when the caller may not open the part outright. */
export async function downloadPartHandout({
  difficulty,
  storyId,
  partNumber,
  locale,
  labels,
}: {
  difficulty: string;
  storyId: string;
  partNumber: number;
  locale: HandoutLocale;
  labels: HandoutLabels;
}): Promise<void> {
  const [handout, { renderHandout }] = await Promise.all([
    fetchPartHandout(difficulty, storyId, partNumber),
    import("./renderHandout"),
  ]);
  const comicUrl = await comicForPrint(handout.comicUrl);
  const model = buildHandoutModel({ ...handout, comicUrl }, locale, labels);
  saveFile(await renderHandout(model), model.fileName);
}
