import { describe, expect, it } from "vitest";
import { congratsKey, markCongratsShown, shouldShowCongrats, type FlagStorage } from "./congratsFlags";

const fakeStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  const storage: FlagStorage = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, String(v)),
  };
  return { storage, data };
};

const throwing: FlagStorage = {
  getItem: () => { throw new Error("denied"); },
  setItem: () => { throw new Error("denied"); },
};

const key = congratsKey("easy", "leo", "u1");

describe("congrats flags", () => {
  it("builds per-story keys, with a guest key", () => {
    expect(key).toBe("congrats_shown_u1_easy_leo");
    expect(congratsKey("easy", "leo")).toBe("congrats_shown_guest_easy_leo");
    expect(congratsKey("easy", "leo", null)).toBe("congrats_shown_guest_easy_leo");
  });

  it("never shows when the key is true", () => {
    const { storage } = fakeStorage({ [key]: "true" });
    expect(shouldShowCongrats("easy", "leo", "u1", true, storage)).toBe(false);
  });

  it("shows a fresh completion and mark writes true", () => {
    const { storage, data } = fakeStorage();
    expect(shouldShowCongrats("easy", "leo", "u1", true, storage)).toBe(true);
    expect(data.size).toBe(0);
    markCongratsShown("easy", "leo", "u1", storage);
    expect(data.get(key)).toBe("true");
    expect(shouldShowCongrats("easy", "leo", "u1", true, storage)).toBe(false);
  });

  it("skips silently a story finished before the update, keeping the old flag", () => {
    const { storage, data } = fakeStorage({ congrats_shown_easy: "true" });
    expect(shouldShowCongrats("easy", "leo", "u1", true, storage)).toBe(false);
    expect(data.get(key)).toBe("true");
    expect(data.get("congrats_shown_easy")).toBe("true");
  });

  it("writes pending for an incomplete story when the old flag exists", () => {
    const { storage, data } = fakeStorage({ congrats_shown_easy: "true" });
    expect(shouldShowCongrats("easy", "leo", "u1", false, storage)).toBe(false);
    expect(data.get(key)).toBe("pending");
  });

  it("writes nothing for an incomplete story without the old flag", () => {
    const { storage, data } = fakeStorage();
    expect(shouldShowCongrats("easy", "leo", "u1", false, storage)).toBe(false);
    expect(data.size).toBe(0);
  });

  it("pending then completed shows once", () => {
    const { storage, data } = fakeStorage({ congrats_shown_easy: "true" });
    shouldShowCongrats("easy", "leo", "u1", false, storage);
    expect(shouldShowCongrats("easy", "leo", "u1", true, storage)).toBe(true);
    expect(data.get(key)).toBe("pending");
    markCongratsShown("easy", "leo", "u1", storage);
    expect(shouldShowCongrats("easy", "leo", "u1", true, storage)).toBe(false);
  });

  it("keeps pending while the story is still incomplete", () => {
    const { storage, data } = fakeStorage({ [key]: "pending" });
    expect(shouldShowCongrats("easy", "leo", "u1", false, storage)).toBe(false);
    expect(data.get(key)).toBe("pending");
  });

  it("decides per user and per guest", () => {
    const { storage, data } = fakeStorage({ [key]: "true" });
    expect(shouldShowCongrats("easy", "leo", "u2", true, storage)).toBe(true);
    expect(shouldShowCongrats("easy", "leo", null, true, storage)).toBe(true);
    markCongratsShown("easy", "leo", null, storage);
    expect(data.get("congrats_shown_guest_easy_leo")).toBe("true");
    expect(data.has(congratsKey("easy", "leo", "u2"))).toBe(false);
  });

  it("decides per story", () => {
    const { storage } = fakeStorage({ [key]: "true" });
    expect(shouldShowCongrats("easy", "mia", "u1", true, storage)).toBe(true);
  });

  it("never shows when storage throws", () => {
    expect(shouldShowCongrats("easy", "leo", "u1", true, throwing)).toBe(false);
    expect(shouldShowCongrats("easy", "leo", "u1", false, throwing)).toBe(false);
    expect(() => markCongratsShown("easy", "leo", "u1", throwing)).not.toThrow();
  });
});
