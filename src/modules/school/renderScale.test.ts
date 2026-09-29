import { describe, expect, it } from "vitest";
import { DESKTOP_SCALE, renderScale } from "./renderScale";

describe("the school's render scale", () => {
  it("keeps the desktop look on a desktop and a small laptop", () => {
    expect(renderScale(1920, 1080, 1)).toBe(DESKTOP_SCALE);
    expect(renderScale(2560, 1440, 2)).toBe(DESKTOP_SCALE);
    expect(renderScale(1366, 768, 1)).toBe(DESKTOP_SCALE);
  });

  it("draws a phone with more than twice the pixels per side", () => {
    const phone = renderScale(390, 844, 3);
    expect(phone).toBeGreaterThan(DESKTOP_SCALE * 2.3);
    expect(phone).toBeLessThanOrEqual(1);
    // Turned sideways it is the same phone.
    expect(renderScale(844, 390, 3)).toBe(phone);
  });

  it("only ever gets sharper as the screen gets smaller", () => {
    let last = 0;
    for (let side = 1200; side >= 300; side -= 20) {
      const s = renderScale(side, side * 2, 3);
      expect(s).toBeGreaterThanOrEqual(last);
      last = s;
    }
  });

  it("never draws more pixels than the screen has", () => {
    expect(renderScale(360, 640, 0.75)).toBe(0.75);
    expect(renderScale(360, 640, 1)).toBe(1);
  });
});
