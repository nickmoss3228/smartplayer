// helpers/textShape.test.js — turning a transcript into the word window's shape.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SENTENCE_END,
  buildTextShape,
  cleanTranscript,
  describeMatches,
  keyPattern,
  wordForms,
} from "./textShape.js";

// Leo, part 2.
const TRANSCRIPT =
  "[slowly]Every morning, I wake up at six o'clock. I am a lark, really. I like getting up in the early mornings. So first, I get out of bed. While my tea cools down, I feed Ginger.\n\n" +
  "Then, I brush my teeth. I enjoy quiet mornings before the busy day starts.\n\n" +
  "My car didn’t start. All day I thought about that. I came back home late. I feed her up. After this I lay down on my couch.";

const KEYS = [
  "lark", "feed", "brush my teeth", "a quiet morning", "wake up", "get up",
  "get out of bed", "cool down", "start up", "feed up", "think about", "come back",
  "lie down", "lay down",
];
const words = (anchors = {}) => KEYS.map((audioKey) => ({ audioKey, anchor: anchors[audioKey] ?? null }));

const keysIn = (shape) => shape.paragraphs.flat().filter((t) => typeof t === "string");

describe("wordForms", () => {
  it("includes regular and irregular inflections", () => {
    const get = wordForms("get");
    assert.ok(get.includes("getting"));
    assert.ok(get.includes("got"));
    assert.ok(wordForms("think").includes("thought"));
    assert.ok(wordForms("cool").includes("cools"));
    assert.ok(wordForms("lie").includes("lay"));
  });
});

describe("cleanTranscript", () => {
  it("removes stage directions and keeps paragraph breaks only for blank lines", () => {
    assert.equal(cleanTranscript("[slowly]Hello\nthere.\n\n\n[chuckles] Bye."), "Hello there.\nBye.");
    assert.equal(cleanTranscript(null), "");
  });
});

describe("keyPattern", () => {
  it("lets a verb and particle have up to two words between, not three", () => {
    const find = (text) => text.match(keyPattern("feed up"))?.[0];
    assert.equal(find("I feed her up."), "feed her up");
    assert.equal(find("I feed the poor cat up."), undefined);
  });
});

describe("buildTextShape", () => {
  const shape = buildTextShape(TRANSCRIPT, words());

  it("is null without a transcript", () => {
    assert.equal(buildTextShape(null, words()), null);
    assert.equal(buildTextShape(undefined, words()), null);
    assert.equal(buildTextShape("   ", words()), null);
    assert.equal(buildTextShape("[slowly]", words()), null);
  });

  it("makes one paragraph per blank-line-separated block, starting with the first word's length", () => {
    assert.equal(shape.paragraphs.length, 3);
    assert.equal(shape.paragraphs[0][0], 5, "Every");
    for (const p of shape.paragraphs) assert.equal(p.at(-1), SENTENCE_END, "each paragraph ends a sentence");
  });

  it("puts a sentence end after every sentence", () => {
    const ends = shape.paragraphs.map((p) => p.filter((t) => t === SENTENCE_END).length);
    assert.deepEqual(ends, [5, 2, 5]);
  });

  it("does not count the stage direction's letters", () => {
    // "slowly" is 6 letters; "Every" is 5 and nothing precedes it.
    assert.deepEqual(shape.paragraphs[0].slice(0, 2), [5, 7]);
    assert.ok(!JSON.stringify(shape).includes("slowly"));
  });

  it("holds numbers, zeros and keys only, never the text", () => {
    for (const token of shape.paragraphs.flat()) {
      assert.ok(typeof token === "number" || KEYS.includes(token), String(token));
    }
    assert.ok(!JSON.stringify(shape).includes("Ginger"));
  });

  it("lists the words the text does not contain", () => {
    // "lie down" is earlier in the key list than "lay down" and, lie -> lay being an
    // inflection, takes the only "lay down" first; the later key finds nothing.
    assert.deepEqual(shape.missing, ["start up", "lay down"]);
  });

  it("places the rest in story order", () => {
    assert.deepEqual(keysIn(shape), [
      "wake up", "lark", "get up", "get out of bed", "cool down", "feed",
      "brush my teeth", "a quiet morning", "think about", "come back", "feed up", "lie down",
    ]);
  });

  it("gives plain 'feed' the first feed and 'feed up' the longer phrase", () => {
    const [first, , third] = shape.paragraphs;
    assert.ok(first.includes("feed"), "feed is in 'I feed Ginger'");
    assert.ok(!first.includes("feed up"));
    assert.ok(third.includes("feed up"));
    assert.ok(!third.includes("feed"));
  });

  it("an anchor makes 'start up' find the start of 'didn’t start'", () => {
    const anchored = buildTextShape(TRANSCRIPT, words({ "start up": "start" }));
    assert.ok(!anchored.missing.includes("start up"));
    const report = describeMatches(TRANSCRIPT, words({ "start up": "start" }));
    const match = report.matches.find((m) => m.key === "start up");
    assert.equal(match.text, "start");
    // The first literal "start" is in "didn’t start", not in "starts" earlier on.
    assert.equal(TRANSCRIPT.indexOf("starts") < TRANSCRIPT.indexOf("didn’t start"), true);
    const third = anchored.paragraphs[2];
    assert.equal(third.indexOf("start up"), 3, "after My, car, didn’t");
    assert.ok(!anchored.paragraphs[1].includes("start up"));
  });
});

describe("describeMatches", () => {
  it("reports what each key matched and what it missed", () => {
    const { matches, missing } = describeMatches(TRANSCRIPT, words());
    const text = Object.fromEntries(matches.map((m) => [m.key, m.text]));
    assert.equal(text["get up"], "getting up");
    assert.equal(text["think about"], "thought about");
    assert.equal(text["cool down"], "cools down");
    assert.equal(text["a quiet morning"], "quiet mornings");
    assert.equal(text["brush my teeth"], "brush my teeth");
    assert.equal(text["feed up"], "feed her up");
    assert.equal(text["come back"], "came back");
    assert.equal(text["lie down"], "lay down");
    assert.deepEqual(missing, ["start up", "lay down"]);
  });

  it("is empty for no transcript", () => {
    assert.deepEqual(describeMatches("", [{ audioKey: "Wake Up" }]), { matches: [], missing: ["wake up"] });
  });

  it("accepts any possessive for 'my'", () => {
    const { matches } = describeMatches("She brushes her teeth.", [{ audioKey: "brush my teeth" }]);
    assert.equal(matches[0].text, "brushes her teeth");
  });
});
