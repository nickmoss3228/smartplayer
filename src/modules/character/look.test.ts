import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOOK,
  HAIR_STYLES,
  lookFromLegacy,
  lookKey,
  normalizeLook,
  randomLook,
  resolveLook,
} from "./look";

describe("a character's look", () => {
  it("fills in whatever is missing or wrong, field by field", () => {
    expect(normalizeLook(null)).toEqual(DEFAULT_LOOK);
    expect(normalizeLook("ponytail")).toEqual(DEFAULT_LOOK);
    const kept = normalizeLook({ hair: "bun", hairColor: "#ABCDEF", top: "cape", skin: "blue" });
    expect(kept).toEqual({ ...DEFAULT_LOOK, hair: "bun", hairColor: "#abcdef" });
  });

  it("dresses somebody from the old item shop the way they were dressed", () => {
    const look = lookFromLegacy({
      skinTone: "#8a5a3b",
      equipped: { hairstyle: "hair-ponytail-red", outfit: "outfit-green-overalls", hat: "hat-cap-red" },
    });
    expect(look).toMatchObject({
      skin: "#8a5a3b",
      hair: "ponytail",
      hairColor: "#a83232",
      top: "tee",
      bottomColor: "#4a9d5c",
      hat: "cap",
      hatColor: "#d64a4a",
    });
    // Nothing bought, nothing changed but the skin.
    expect(lookFromLegacy({ skinTone: "#5e3b26", equipped: {} })).toEqual({ ...DEFAULT_LOOK, skin: "#5e3b26" });
  });

  it("prefers the character they made over what they used to wear", () => {
    const made = { ...DEFAULT_LOOK, hair: "curly" as const };
    expect(resolveLook({ look: made, skinTone: "#000000", equipped: { hairstyle: "hair-long-black" } })).toEqual(made);
    expect(resolveLook({ look: null, skinTone: "#5e3b26", equipped: {} }).skin).toBe("#5e3b26");
    expect(resolveLook(null)).toEqual(DEFAULT_LOOK);
  });

  it("makes up only looks it could draw", () => {
    let seed = 7;
    const r = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 200; i++) {
      const look = randomLook(r);
      expect(normalizeLook(look)).toEqual(look);
    }
  });

  it("tells two looks apart by their contents", () => {
    expect(lookKey({ ...DEFAULT_LOOK })).toBe(lookKey(DEFAULT_LOOK));
    const keys = new Set(HAIR_STYLES.map((hair) => lookKey({ ...DEFAULT_LOOK, hair })));
    expect(keys.size).toBe(HAIR_STYLES.length);
  });
});
