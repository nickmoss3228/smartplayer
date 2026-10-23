// helpers/textShape.js
//
// The word window's text, without the text.
//
// The player draws a part as a page of dots: one dot per letter of what is
// said, a heavier dot where a sentence ends, and the part's words (in Russian)
// sitting exactly where they are said. The student taps a word to hear it in
// English and never sees how it is spelt — so the transcript itself must never
// reach the client. This module turns the transcript into that SHAPE on the
// server, and the shape is all the public story endpoint sends.
//
// The shape is { paragraphs, missing }:
//   paragraphs  one array per paragraph, of
//                 n > 0   a word of n letters, drawn as n dots
//                 0       a sentence ends here
//                 "key"   one of the part's words (lowercased audioKey)
//   missing     keys of the part's words the transcript does not contain;
//               the window lists them under the text
//
// Finding a word: an author-written `anchor` wins, matched literally. Without
// one the audioKey is matched with its inflections ("get up" finds "getting
// up", "think about" finds "thought about"), any possessive in place of a
// possessive ("brush my teeth" finds "brush his teeth") and any reflexive in
// place of a reflexive ("taught himself" finds "taught myself"), an article dropped
// from the front ("a quiet morning" finds "quiet mornings"), and for a verb
// with a particle up to two words in between ("feed up" finds "feed her up").
// Longer phrases claim their place first, so "feed" cannot take the "feed" of
// "feed her up"; a word otherwise takes its first occurrence nobody claimed.

export const SENTENCE_END = 0;

// Stage directions the author writes for the voice: "[slowly]", "[chuckles]".
const STAGE_DIRECTION = /\[[^\]\n]*\]/g;

const ARTICLES = new Set(["a", "an", "the"]);
const POSSESSIVES = ["my", "your", "his", "her", "its", "our", "their"];
// "taught himself" is said as "taught myself": any reflexive stands for any other.
const REFLEXIVES = ["myself", "yourself", "himself", "herself", "itself", "ourselves", "yourselves", "themselves"];
const PARTICLES = new Set([
  "up", "down", "out", "off", "in", "on", "away", "back", "over", "about",
  "around", "through", "along", "by", "after", "into", "with", "for", "together", "from",
]);

// Base form -> the other forms a story is likely to use. Only verbs whose past
// or participle is not base+ed; the regular endings are generated below.
const IRREGULAR = {
  be: ["am", "is", "are", "was", "were", "been", "being"],
  have: ["has", "had", "having"],
  do: ["does", "did", "done", "doing"],
  go: ["goes", "went", "gone"],
  get: ["got", "gotten"],
  come: ["came"],
  become: ["became"],
  think: ["thought"],
  bring: ["brought"],
  buy: ["bought"],
  catch: ["caught"],
  teach: ["taught"],
  fight: ["fought"],
  seek: ["sought"],
  take: ["took", "taken"],
  make: ["made"],
  wake: ["woke", "woken"],
  feed: ["fed"],
  lie: ["lay", "lain", "lying"],
  lay: ["laid"],
  see: ["saw", "seen"],
  run: ["ran"],
  sit: ["sat"],
  stand: ["stood"],
  understand: ["understood"],
  fall: ["fell", "fallen"],
  give: ["gave", "given"],
  forgive: ["forgave", "forgiven"],
  say: ["said"],
  pay: ["paid"],
  tell: ["told"],
  sell: ["sold"],
  find: ["found"],
  leave: ["left"],
  fly: ["flew", "flown"],
  swim: ["swam", "swum"],
  ride: ["rode", "ridden"],
  drive: ["drove", "driven"],
  write: ["wrote", "written"],
  eat: ["ate", "eaten"],
  drink: ["drank", "drunk"],
  begin: ["began", "begun"],
  break: ["broke", "broken"],
  choose: ["chose", "chosen"],
  forget: ["forgot", "forgotten"],
  keep: ["kept"],
  sleep: ["slept"],
  feel: ["felt"],
  meet: ["met"],
  spend: ["spent"],
  send: ["sent"],
  lend: ["lent"],
  bend: ["bent"],
  build: ["built"],
  lose: ["lost"],
  win: ["won"],
  hold: ["held"],
  hear: ["heard"],
  wear: ["wore", "worn"],
  tear: ["tore", "torn"],
  throw: ["threw", "thrown"],
  grow: ["grew", "grown"],
  know: ["knew", "known"],
  blow: ["blew", "blown"],
  draw: ["drew", "drawn"],
  show: ["shown"],
  speak: ["spoke", "spoken"],
  steal: ["stole", "stolen"],
  sing: ["sang", "sung"],
  ring: ["rang", "rung"],
  sink: ["sank", "sunk"],
  shake: ["shook", "shaken"],
  hide: ["hid", "hidden"],
  bite: ["bit", "bitten"],
  freeze: ["froze", "frozen"],
  rise: ["rose", "risen"],
  shine: ["shone"],
  shoot: ["shot"],
  stick: ["stuck"],
  strike: ["struck"],
  swing: ["swung"],
  hang: ["hung"],
  dig: ["dug"],
  deal: ["dealt"],
  mean: ["meant"],
  lead: ["led"],
  light: ["lit"],
  slide: ["slid"],
  dream: ["dreamt"],
  learn: ["learnt"],
  burn: ["burnt"],
  smell: ["smelt"],
  spell: ["spelt"],
};

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const VOWEL = /[aeiou]/;

/** Every spelling of one English word the matcher accepts. */
export function wordForms(word) {
  const w = word.toLowerCase();
  const forms = new Set([w, ...(IRREGULAR[w] ?? [])]);
  if (!/^[a-z]+$/.test(w)) return [...forms];

  forms.add(w + "s");
  forms.add(w + "es");
  forms.add(w + "ed");
  forms.add(w + "ing");
  forms.add(w + "'s");
  forms.add(w + "’s");
  if (w.endsWith("e")) {
    forms.add(w + "d");
    forms.add(w.slice(0, -1) + "ing");
  }
  if (w.endsWith("ie")) forms.add(w.slice(0, -2) + "ying");
  if (/[^aeiou]y$/.test(w)) {
    forms.add(w.slice(0, -1) + "ies");
    forms.add(w.slice(0, -1) + "ied");
  }
  // One short vowel between two consonants doubles the last one: get ->
  // getting, stop -> stopped. Not for w/x/y, which never double.
  if (w.length <= 4 && /[^aeiou][aeiou][^aeiouwxy]$/.test(w) && VOWEL.test(w)) {
    const doubled = w + w.at(-1);
    forms.add(doubled + "ing");
    forms.add(doubled + "ed");
  }
  return [...forms];
}

const LETTER = "[\\p{L}\\p{N}'’]";
const BEFORE = `(?<!${LETTER})`;
const AFTER = `(?!${LETTER})`;

const alternation = (forms) =>
  `(?:${[...forms].sort((a, b) => b.length - a.length).map(escape).join("|")})`;

/** The pattern that finds an audioKey in running text. */
export function keyPattern(key) {
  let words = key.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length > 1 && ARTICLES.has(words[0])) words = words.slice(1);
  if (words.length === 0) return null;

  const parts = words.map((w) =>
    POSSESSIVES.includes(w)
      ? alternation(POSSESSIVES)
      : REFLEXIVES.includes(w)
        ? alternation(REFLEXIVES)
        : alternation(wordForms(w)),
  );
  // A verb and its particle may have the object between them: "feed her up".
  const splitParticle = words.length === 2 && PARTICLES.has(words[1]);
  const between = splitParticle ? `(?:\\s+${LETTER}+){0,2}\\s+` : "\\s+";
  return new RegExp(BEFORE + parts.join(between) + AFTER, "giu");
}

function anchorPattern(anchor) {
  const words = anchor.trim().split(/\s+/).filter(Boolean).map(escape);
  if (words.length === 0) return null;
  return new RegExp(BEFORE + words.join("\\s+") + AFTER, "giu");
}

/**
 * The transcript as the matcher reads it: stage directions gone, one line per
 * paragraph (a blank line in the original separates paragraphs; a single line
 * break inside one is just a space), runs of spaces collapsed.
 */
export function cleanTranscript(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(STAGE_DIRECTION, " ")
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/**
 * Where each of the part's words is said.
 *
 * @param {string} text  from cleanTranscript
 * @param {{ key: string, anchor?: string | null }[]} entries  key = lowercased audioKey
 * @returns {{ claims: { key: string, start: number, end: number }[], missing: string[] }}
 *   claims sorted by position; missing in the entries' own order
 */
export function placeWords(text, entries) {
  const order = entries
    .map((entry, i) => ({ ...entry, i, length: entry.key.split(/\s+/).length }))
    // Authored anchors first (the author has spoken), then longer phrases,
    // then the author's order.
    .sort((a, b) => Number(Boolean(b.anchor)) - Number(Boolean(a.anchor)) || b.length - a.length || a.i - b.i);

  const claims = [];
  const overlaps = (start, end) => claims.some((c) => start < c.end && end > c.start);

  for (const entry of order) {
    const pattern = entry.anchor?.trim() ? anchorPattern(entry.anchor) : keyPattern(entry.key);
    if (!pattern) continue;
    for (const match of text.matchAll(pattern)) {
      const start = match.index;
      const end = start + match[0].length;
      if (overlaps(start, end)) continue;
      claims.push({ key: entry.key, start, end });
      break;
    }
  }

  claims.sort((a, b) => a.start - b.start);
  const placed = new Set(claims.map((c) => c.key));
  return { claims, missing: entries.map((e) => e.key).filter((k) => !placed.has(k)) };
}

const SENTENCE_CLOSES = /[.!?…]["'’”»)\]]*$/u;

function pushText(paragraphs, chunk) {
  for (const piece of chunk.split(/(\n)|\s+/)) {
    if (piece === "\n") {
      paragraphs.push([]);
      continue;
    }
    if (!piece) continue;
    const letters = piece.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
    const current = paragraphs[paragraphs.length - 1];
    if (letters > 0) current.push(letters);
    if (SENTENCE_CLOSES.test(piece) && current.at(-1) !== SENTENCE_END) current.push(SENTENCE_END);
  }
}

/**
 * The shape the player draws. Null when the part has no transcript.
 *
 * @param {string | null | undefined} transcript
 * @param {{ audioKey: string, anchor?: string | null }[]} words  vocabulary then phrasal verbs
 */
export function buildTextShape(transcript, words) {
  const text = cleanTranscript(transcript);
  if (!text) return null;

  const seen = new Set();
  const entries = [];
  for (const word of words ?? []) {
    const key = String(word?.audioKey ?? "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    entries.push({ key, anchor: word.anchor ?? null });
  }

  const { claims, missing } = placeWords(text, entries);
  const paragraphs = [[]];
  let pos = 0;
  for (const claim of claims) {
    pushText(paragraphs, text.slice(pos, claim.start));
    paragraphs[paragraphs.length - 1].push(claim.key);
    pos = claim.end;
  }
  pushText(paragraphs, text.slice(pos));

  return { paragraphs: paragraphs.filter((p) => p.length > 0), missing };
}

/**
 * For the Story Builder: what each word matched, so the author can see a wrong
 * guess ("start up" landing on "starts") and anchor it by hand.
 */
export function describeMatches(transcript, words) {
  const text = cleanTranscript(transcript);
  const entries = (words ?? [])
    .map((w) => ({ key: String(w?.audioKey ?? "").trim().toLowerCase(), anchor: w?.anchor ?? null }))
    .filter((e) => e.key);
  if (!text) return { matches: [], missing: entries.map((e) => e.key) };
  const { claims, missing } = placeWords(text, entries);
  return {
    matches: claims.map((c) => ({ key: c.key, text: text.slice(c.start, c.end) })),
    missing,
  };
}

/**
 * For the part's handout (the PDF a learner downloads): the transcript as
 * paragraphs of plain runs, with each of the part's words marked where it is
 * said. Unlike buildTextShape this DOES carry the text, so it is only ever
 * sent to a caller who may open the part (getPartHandout).
 *
 * @param {string | null | undefined} transcript
 * @param {{ audioKey: string, anchor?: string | null }[]} words  vocabulary then phrasal verbs
 * @returns {{ text: string, word?: number }[][]}  `word` indexes into `words`
 */
export function markWords(transcript, words) {
  const text = cleanTranscript(transcript);
  if (!text) return [];

  const indexOf = new Map();
  const entries = [];
  (words ?? []).forEach((word, i) => {
    const key = String(word?.audioKey ?? "").trim().toLowerCase();
    if (!key || indexOf.has(key)) return;
    indexOf.set(key, i);
    entries.push({ key, anchor: word.anchor ?? null });
  });

  const paragraphs = [[]];
  const pushRun = (chunk) => {
    chunk.split("\n").forEach((piece, i) => {
      if (i > 0) paragraphs.push([]);
      if (piece) paragraphs[paragraphs.length - 1].push({ text: piece });
    });
  };

  let pos = 0;
  for (const claim of placeWords(text, entries).claims) {
    pushRun(text.slice(pos, claim.start));
    paragraphs[paragraphs.length - 1].push({ text: text.slice(claim.start, claim.end), word: indexOf.get(claim.key) });
    pos = claim.end;
  }
  pushRun(text.slice(pos));
  return paragraphs.filter((p) => p.length > 0);
}
