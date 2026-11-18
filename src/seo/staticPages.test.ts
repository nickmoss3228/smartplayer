import { describe, it, expect } from "vitest";
import pages from "./pages.json";
import { renderHeadTags, storyMeta, resolveMeta } from "./meta";
import * as script from "../../scripts/seo-head.mjs";

// scripts/seo-head.mjs is the plain-JS copy the build script uses; it must
// emit exactly what the React side would.
describe("static page head tags", () => {
  it.each(Object.keys(pages))("matches renderHeadTags for %s", (path) => {
    const meta = resolveMeta(path);
    expect(script.renderHeadTags(meta)).toBe(renderHeadTags(meta));
  });

  it("matches for a story with a cover, quotes and a long description", () => {
    const story = {
      title: 'Кот & "пёс"',
      description: "слово ".repeat(60),
      coverUrl: "https://cdn.test/c.jpg",
    };
    const path = "/levels/easy/cat";
    const ours = storyMeta(path, story);
    const theirs = script.storyMeta(path, story, resolveMeta(path).description);
    expect(theirs).toEqual(ours);
    expect(script.renderHeadTags(theirs)).toBe(renderHeadTags(ours));
  });

  it("injectHead replaces the shell's tags instead of duplicating them", () => {
    const shell = `<html><head><title>x</title>\n<meta\n name="description"\n content="old"\n/>\n<meta property="og:title" content="old" /></head></html>`;
    const out = script.injectHead(shell, resolveMeta("/levels"));
    expect(out.match(/<title>/g)).toHaveLength(1);
    expect(out.match(/name="description"/g)).toHaveLength(1);
    expect(out.match(/property="og:title"/g)).toHaveLength(1);
    expect(out).toContain('rel="canonical"');
  });
});
