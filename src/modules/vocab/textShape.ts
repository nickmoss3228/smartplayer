// modules/vocab/textShape.ts
//
// The word window's page of dots, on the client side.
//
// A part with a transcript arrives with its shape built by the server
// (backend/src/helpers/textShape.js): the real rhythm of what is said, with the
// words where they are said. A part without one gets an invented shape here —
// runs of dots with the words mixed in — seeded by story and part so it never
// reshuffles, and a student can remember where a word sits on the page.
//
// Either shape is condensed before it is drawn (condensed): far fewer dots
// than letters, so the words sit close together.

import type { TextShape } from "../../services/storyServices";

export const SENTENCE_END = 0;

/** A word as the window shows it: Russian on the chip, English only in the clip. */
export interface WindowWord {
  /** Lowercased audioKey — the копилка's and the bookmarks' key. */
  key: string;
  word: string;
  audioKey: string;
  audioUrl: string;
  phrasal: boolean;
}

export const wordKey = (w: { audioKey?: string; word: string }) => (w.audioKey || w.word).toLowerCase();

/** A small seeded generator (mulberry32 over a string hash), so a seed always draws the same page. */
export function seededRandom(seed: string): () => number {
  let a = 0;
  for (const c of seed) a = (Math.imul(a, 31) + c.charCodeAt(0)) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A made-up page for a part with no transcript: sentences of dot runs, most
 * holding one or two of the words, a paragraph every four sentences.
 */
export function inventedShape(seed: string, keys: readonly string[]): TextShape {
  const random = seededRandom(seed);
  const order = [...keys];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const paragraphs: (number | string)[][] = [[]];
  const run = (min: number, span: number) => min + Math.floor(random() * span);
  let i = 0;
  let sentences = 0;
  while (i < order.length) {
    const paragraph = paragraphs[paragraphs.length - 1];
    const words = random() < 0.18 ? 0 : 1 + Math.floor(random() * 2.4);
    paragraph.push(run(4, 18));
    for (let k = 0; k < words && i < order.length; k++, i++) paragraph.push(order[i], run(2, 16));
    paragraph.push(SENTENCE_END);
    if (++sentences % 4 === 0 && i < order.length) paragraphs.push([]);
  }
  return { paragraphs: paragraphs.filter((p) => p.length > 0), missing: [] };
}

// The most dots a stretch between two words is drawn with.
const RUN_MAX = 6;

/**
 * One stretch of speech between two words (or a word and a sentence end),
 * drawn short: about a dot for every four letters, never more than RUN_MAX,
 * split in two when the stretch had more than one word.
 */
function shortRun(run: readonly number[]): number[] {
  const letters = run.reduce((sum, n) => sum + n, 0);
  const dots = Math.min(RUN_MAX, Math.max(Math.min(2, letters), Math.round(letters / 4)));
  return run.length > 1 && dots >= 4 ? [Math.ceil(dots / 2), Math.floor(dots / 2)] : [dots];
}

/**
 * The page as it is drawn. The dots are a picture of speech, not a copy of it;
 * drawn a dot per letter, they bury the words under screens of scrolling. So a
 * sentence without one of the part's words is left out, and the speech around a word shrinks to a short
 * run (shortRun). The words keep their order, their sentences and paragraphs.
 */
export function condensed(shape: TextShape): TextShape {
  const paragraphs = shape.paragraphs.map((paragraph) => {
    const out: (number | string)[] = [];
    let sentence: (number | string)[] = [];
    let run: number[] = [];
    const endRun = () => {
      if (run.length > 0) sentence.push(...shortRun(run));
      run = [];
    };
    const endSentence = (closed: boolean) => {
      endRun();
      if (sentence.some((t) => typeof t === "string")) out.push(...sentence, ...(closed ? [SENTENCE_END] : []));
      sentence = [];
    };
    for (const token of paragraph) {
      if (token === SENTENCE_END) endSentence(true);
      else if (typeof token === "number") run.push(token);
      else {
        endRun();
        sentence.push(token);
      }
    }
    endSentence(false);
    return out;
  });
  return { paragraphs: paragraphs.filter((p) => p.length > 0), missing: shape.missing };
}

/** The shape to draw: the server's when the part has a transcript, an invented one otherwise. */
export function shapeFor(shape: TextShape | null | undefined, seed: string, words: readonly WindowWord[]): TextShape {
  if (shape && shape.paragraphs.length > 0) {
    // A word the server placed but the part no longer has (an edit between the
    // two) is dropped rather than drawn as a chip that plays nothing.
    const known = new Set(words.map((w) => w.key));
    return condensed({
      paragraphs: shape.paragraphs.map((p) => p.filter((t) => typeof t === "number" || known.has(t))),
      missing: shape.missing.filter((k) => known.has(k)),
    });
  }
  return condensed(inventedShape(seed, words.map((w) => w.key)));
}
