// config/characterLook.js
//
// The character a player makes in the dashboard's creator — skin, hair,
// clothes, glasses, a hat. Free, and saved whole (PUT /progress/character/look).
//
// Mirrors the style lists in src/modules/character/look.ts. Styles are closed
// sets, because each one is geometry the client has to draw; colours only have
// to be colours, so the client's palettes can grow without a deploy here.
// "chef" is missing from HAT_STYLES on purpose: it is the cook's toque, worn in
// the school, not something a player can pick.

export const HAIR_STYLES = ["short", "buzz", "spiky", "curly", "bob", "long", "ponytail", "bun"];
export const TOP_STYLES = ["tee", "sweater", "hoodie", "shirt"];
export const BOTTOM_STYLES = ["trousers", "shorts", "skirt"];
export const GLASSES_STYLES = ["none", "glasses", "shades"];
export const HAT_STYLES = ["none", "cap", "beanie", "headband"];

const HEX = /^#[0-9a-fA-F]{6}$/;

const FIELDS = {
  skin: "colour",
  hair: HAIR_STYLES,
  hairColor: "colour",
  top: TOP_STYLES,
  topColor: "colour",
  bottom: BOTTOM_STYLES,
  bottomColor: "colour",
  glasses: GLASSES_STYLES,
  hat: HAT_STYLES,
  hatColor: "colour",
};

/**
 * A look exactly as it will be stored, or null when anything about it is
 * wrong. Strict rather than forgiving — every field present, nothing extra —
 * because this is a whole character sent by our own creator, and anything
 * else is not that.
 */
export function sanitizeLook(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const keys = Object.keys(input);
  if (keys.length !== Object.keys(FIELDS).length) return null;
  const out = {};
  for (const [field, rule] of Object.entries(FIELDS)) {
    const value = input[field];
    if (typeof value !== "string") return null;
    if (rule === "colour") {
      if (!HEX.test(value)) return null;
      out[field] = value.toLowerCase();
    } else {
      if (!rule.includes(value)) return null;
      out[field] = value;
    }
  }
  return out;
}
