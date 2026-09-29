// modules/character/look.ts
//
// What a person looks like: the player's own character, every student in the
// school and the staff. One shape for all of them, so the figure a player
// builds in the dashboard is drawn by exactly the code that draws everybody
// else — there is no "avatar model" that could drift away from the "student
// model", and the player really is a student among the others.
//
// Styles are closed sets, because each one is geometry (figureParts.ts).
// Colours are hex strings; the creator offers the palettes below, and the
// server checks the shape of a colour, not its membership, so a palette can
// grow without a backend deploy. backend/src/config/characterLook.js mirrors
// the style lists — a style the server does not know is refused.

import { getCharacterItem } from "../../config/characterCatalog";

export const HAIR_STYLES = ["short", "buzz", "spiky", "curly", "bob", "long", "ponytail", "bun"] as const;
/** "shirt" is a school shirt and tie; the tie takes the colour of the bottoms,
 *  so trousers and tie match like a uniform. */
export const TOP_STYLES = ["tee", "sweater", "hoodie", "shirt"] as const;
export const BOTTOM_STYLES = ["trousers", "shorts", "skirt"] as const;
export const GLASSES_STYLES = ["none", "glasses", "shades"] as const;
export const HAT_STYLES = ["none", "cap", "beanie", "headband"] as const;

export type HairStyle = (typeof HAIR_STYLES)[number];
export type TopStyle = (typeof TOP_STYLES)[number];
export type BottomStyle = (typeof BOTTOM_STYLES)[number];
export type GlassesStyle = (typeof GLASSES_STYLES)[number];
/** "chef" is the cook's toque: worn in the school, not offered in the creator. */
export type HatStyle = (typeof HAT_STYLES)[number] | "chef";

export interface CharacterLook {
  skin: string;
  hair: HairStyle;
  hairColor: string;
  top: TopStyle;
  topColor: string;
  bottom: BottomStyle;
  bottomColor: string;
  glasses: GlassesStyle;
  hat: HatStyle;
  hatColor: string;
}

export const SKIN_TONES = [
  "#f7d7b5",
  "#f2c48d",
  "#e8b98a",
  "#e0a870",
  "#c98c5b",
  "#a9714a",
  "#8a5a3b",
  "#5e3b26",
];

export const HAIR_COLORS = [
  "#1f1f22",
  "#3b2a1e",
  "#6b4423",
  "#a8742f",
  "#e8c873",
  "#d9733a",
  "#a83232",
  "#8a8a8a",
  "#ece8df",
  "#3f6fd6",
  "#d65a9a",
  "#7b4fa3",
];

export const CLOTHES_COLORS = [
  "#4a7fd6",
  "#2e3a58",
  "#3d4557",
  "#3f9aa8",
  "#4a9d5c",
  "#2f5a3d",
  "#c9a227",
  "#d97a4a",
  "#d64a4a",
  "#8b2f3f",
  "#e07aa8",
  "#7b4fa3",
  "#5a4636",
  "#c8b48a",
  "#8d8d97",
  "#2b2d2f",
  "#f1efe8",
];

export const DEFAULT_LOOK: CharacterLook = {
  skin: "#f2c48d",
  hair: "short",
  hairColor: "#3b2a1e",
  top: "tee",
  topColor: "#4a7fd6",
  bottom: "trousers",
  bottomColor: "#3d4557",
  glasses: "none",
  hat: "none",
  hatColor: "#d64a4a",
};

const HEX = /^#[0-9a-fA-F]{6}$/;

const oneOf = <T extends string>(options: readonly T[], value: unknown, fallback: T): T =>
  typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : fallback;
const colour = (value: unknown, fallback: string): string =>
  typeof value === "string" && HEX.test(value) ? value.toLowerCase() : fallback;

/**
 * Any value, made into a complete, valid look. Unknown styles and malformed
 * colours fall back to the default for that field rather than failing the
 * whole look — a saved character from before a style was renamed keeps
 * everything else about it.
 */
export function normalizeLook(input: unknown): CharacterLook {
  const v = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const d = DEFAULT_LOOK;
  return {
    skin: colour(v.skin, d.skin),
    hair: oneOf(HAIR_STYLES, v.hair, d.hair),
    hairColor: colour(v.hairColor, d.hairColor),
    top: oneOf(TOP_STYLES, v.top, d.top),
    topColor: colour(v.topColor, d.topColor),
    bottom: oneOf(BOTTOM_STYLES, v.bottom, d.bottom),
    bottomColor: colour(v.bottomColor, d.bottomColor),
    glasses: oneOf(GLASSES_STYLES, v.glasses, d.glasses),
    hat: oneOf([...HAT_STYLES, "chef"] as HatStyle[], v.hat, d.hat),
    hatColor: colour(v.hatColor, d.hatColor),
  };
}

/** The shapes of the old item shop, as the styles that replaced them. */
const LEGACY_HAIR: Record<string, HairStyle> = {
  "hair-short": "short",
  "hair-long": "long",
  "hair-spiky": "spiky",
  "hair-ponytail": "ponytail",
  "hair-buzz": "buzz",
};
const LEGACY_TOP: Record<string, TopStyle> = {
  "outfit-tee": "tee",
  "outfit-hoodie": "hoodie",
  "outfit-overalls": "tee",
};
const LEGACY_HAT: Record<string, HatStyle> = {
  "hat-cap": "cap",
  "hat-beanie": "beanie",
  "hat-wizard": "beanie",
};

/** What the character looked like under the old item shop — skin tone plus a
 *  bought hairstyle, outfit and hat — as a look. What anybody who had dressed
 *  their character before this starts the creator from. */
export function lookFromLegacy(character: {
  skinTone?: string | null;
  equipped?: Partial<Record<"hairstyle" | "outfit" | "hat", string | null>> | null;
}): CharacterLook {
  const item = (slot: "hairstyle" | "outfit" | "hat") => {
    const id = character.equipped?.[slot];
    return id ? getCharacterItem(id)?.swatch : undefined;
  };
  const hair = item("hairstyle");
  const outfit = item("outfit");
  const hat = item("hat");
  const overalls = outfit?.shape === "outfit-overalls";
  return normalizeLook({
    ...DEFAULT_LOOK,
    skin: character.skinTone ?? DEFAULT_LOOK.skin,
    ...(hair ? { hair: LEGACY_HAIR[hair.shape], hairColor: hair.color } : {}),
    ...(outfit
      ? {
          top: LEGACY_TOP[outfit.shape],
          // Overalls were green with a yellow shirt: the shirt is the top now,
          // and the green goes on the legs.
          topColor: overalls ? outfit.accent : outfit.color,
          bottomColor: overalls ? outfit.color : outfit.accent,
        }
      : {}),
    ...(hat ? { hat: LEGACY_HAT[hat.shape], hatColor: hat.color } : {}),
  });
}

/** The look to draw for a character: the one they made, or, until they have
 *  made one, whatever the old shop had them wearing. */
export function resolveLook(
  character:
    | {
        look?: unknown;
        skinTone?: string | null;
        equipped?: Partial<Record<"hairstyle" | "outfit" | "hat", string | null>> | null;
      }
    | null
    | undefined,
): CharacterLook {
  if (!character) return DEFAULT_LOOK;
  return character.look ? normalizeLook(character.look) : lookFromLegacy(character);
}

const FIELDS: (keyof CharacterLook)[] = [
  "skin",
  "hair",
  "hairColor",
  "top",
  "topColor",
  "bottom",
  "bottomColor",
  "glasses",
  "hat",
  "hatColor",
];

/** One string per distinct look: a cache key, and how two looks compare. */
export const lookKey = (look: CharacterLook): string => FIELDS.map((f) => look[f]).join("|");

const pick = <T>(list: readonly T[], r: () => number): T => list[Math.floor(r() * list.length) % list.length];

/** A look made up on the spot, for the creator's dice. Hats and glasses only
 *  some of the time, the way people actually turn up. */
export function randomLook(r: () => number = Math.random): CharacterLook {
  const bottom = pick(BOTTOM_STYLES, r);
  return {
    skin: pick(SKIN_TONES, r),
    hair: pick(HAIR_STYLES, r),
    // Natural colours most of the time; the dyed ones are the last three.
    hairColor: r() < 0.85 ? pick(HAIR_COLORS.slice(0, 9), r) : pick(HAIR_COLORS.slice(9), r),
    top: pick(TOP_STYLES, r),
    topColor: pick(CLOTHES_COLORS, r),
    bottom,
    bottomColor: pick(CLOTHES_COLORS, r),
    glasses: r() < 0.3 ? pick(GLASSES_STYLES.slice(1), r) : "none",
    hat: r() < 0.3 ? pick(HAT_STYLES.slice(1), r) : "none",
    hatColor: pick(CLOTHES_COLORS, r),
  };
}

// ── The crowd ───────────────────────────────────────────────────────────────
// Everybody in the school who is not the player or on the staff. Indexed,
// never random, so a student does not change clothes when a desk layout is
// swapped — and cycled with steps coprime to each list's length, so the
// combinations do not repeat in lockstep.

const CROWD_SKINS = ["#f2c48d", "#e0a870", "#c98c5b", "#a9714a", "#8a5a3b", "#f7d7b5", "#5e3b26", "#e8b98a"];
const CROWD_HAIRS = ["#3b2a1e", "#6b4423", "#2b2d2f", "#a83232", "#e8c873", "#5a5a5a", "#1f1f22", "#a8742f"];
const CROWD_SHIRTS = ["#4a7fd6", "#d64a4a", "#4a9d5c", "#c9a227", "#7b4fa3", "#3f9aa8", "#d97a4a", "#f1efe8"];
const CROWD_TROUSERS = ["#3d4557", "#5a4636", "#454b3f", "#4a3f57", "#2e3a58"];
const CROWD_HAIR_STYLES: HairStyle[] = ["short", "ponytail", "bob", "short", "curly", "long", "buzz", "bun", "spiky"];
const CROWD_TOPS: TopStyle[] = ["tee", "sweater", "tee", "hoodie", "shirt", "tee", "sweater"];
const CROWD_BOTTOMS: BottomStyle[] = ["trousers", "trousers", "skirt", "trousers", "shorts", "skirt", "trousers"];

export const crowdLook = (i: number): CharacterLook => ({
  skin: CROWD_SKINS[i % CROWD_SKINS.length],
  hair: CROWD_HAIR_STYLES[(i * 5 + 2) % CROWD_HAIR_STYLES.length],
  hairColor: CROWD_HAIRS[(i * 3 + 1) % CROWD_HAIRS.length],
  top: CROWD_TOPS[(i * 3) % CROWD_TOPS.length],
  topColor: CROWD_SHIRTS[(i * 5 + 2) % CROWD_SHIRTS.length],
  bottom: CROWD_BOTTOMS[(i * 4 + 1) % CROWD_BOTTOMS.length],
  bottomColor: CROWD_TROUSERS[(i * 7) % CROWD_TROUSERS.length],
  // About one in seven wears glasses.
  glasses: i % 7 === 3 ? "glasses" : "none",
  hat: "none",
  hatColor: "#2e3a58",
});
