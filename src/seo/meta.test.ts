// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import pages from "./pages.json";
import { applyMeta, resolveMeta, storyMeta, ORIGIN } from "./meta";

const table = pages as Record<string, { title: string; description: string }>;

describe("resolveMeta", () => {
  it.each(Object.keys(table))("knows %s", (path) => {
    expect(resolveMeta(path)).toEqual({ ...table[path], path });
  });

  it("ignores a trailing slash", () => {
    expect(resolveMeta("/levels/easy/")).toEqual(resolveMeta("/levels/easy"));
    expect(resolveMeta("/").path).toBe("/");
  });

  it("gives story and part paths a generic meta with the level description", () => {
    const story = resolveMeta("/levels/medium/some-story");
    expect(story.title).toBe("История на английском · малако");
    expect(story.description).toBe(table["/levels/medium"].description);
    expect(story.path).toBe("/levels/medium/some-story");
    const part = resolveMeta("/levels/hard/some-story/3");
    expect(part.title).toBe("Часть 3 · малако");
    expect(part.path).toBe("/levels/hard/some-story/3");
  });

  it("falls back for unknown paths, with no canonical path", () => {
    expect(resolveMeta("/nope")).toEqual({ title: "малако", description: table["/"].description });
    expect(resolveMeta("/levels/expert/x").path).toBeUndefined();
  });
});

describe("storyMeta", () => {
  it("builds title, description and cover", () => {
    const m = storyMeta("/levels/easy/cat", { title: "Кот", description: "Коротко.", coverUrl: "https://x.test/c.jpg" });
    expect(m).toEqual({
      title: "Кот — история на английском · малако",
      description: "Коротко.",
      path: "/levels/easy/cat",
      image: "https://x.test/c.jpg",
    });
  });

  it("trims long descriptions at a word boundary", () => {
    const long = "слово ".repeat(60);
    const m = storyMeta("/levels/easy/cat", { title: "Кот", description: long });
    expect(m.description.length).toBeLessThanOrEqual(161);
    expect(m.description.endsWith("слово…")).toBe(true);
    expect(m.image).toBeUndefined();
  });

  it("falls back to the level description and names the part", () => {
    const m = storyMeta("/levels/easy/cat/2", { title: "Кот" });
    expect(m.title).toBe("Кот, часть 2 · малако");
    expect(m.description).toBe(table["/levels/easy"].description);
  });
});

describe("applyMeta", () => {
  const count = (sel: string) => document.head.querySelectorAll(sel).length;

  it("creates tags, then updates them without duplicating", () => {
    applyMeta({ title: "A", description: "da", path: "/levels" });
    applyMeta({ title: "B", description: "db", path: "/levels/easy", image: "/x.png" });
    expect(document.title).toBe("B");
    for (const sel of [
      "title",
      'meta[name="description"]',
      'link[rel="canonical"]',
      'meta[property="og:url"]',
      'meta[property="og:title"]',
      'meta[property="og:image"]',
      'meta[name="twitter:card"]',
    ]) {
      expect(count(sel)).toBe(1);
    }
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(`${ORIGIN}/levels/easy`);
    expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute("content")).toBe(`${ORIGIN}/x.png`);
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute("content")).toBe("db");
  });

  it("removes canonical and og:url when there is no path", () => {
    applyMeta({ title: "A", description: "da", path: "/levels" });
    applyMeta({ title: "малако", description: "d" });
    expect(count('link[rel="canonical"]')).toBe(0);
    expect(count('meta[property="og:url"]')).toBe(0);
    expect(count('meta[property="og:title"]')).toBe(1);
  });
});
