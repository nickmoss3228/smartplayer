// Geometry regression tests for the two hand-rolled SVG charts.
//
// The palette validator checks color; nothing checks that the marks land where
// they should. These render the real components through react-dom/server and
// assert the things that break silently when the layout maths is edited:
// overflow, negative dimensions, mismatched card heights, and label collisions.

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../../../locales/en/translation.json";
import AccuracyTrendChart from "./AccuracyTrendChart";
import WeeklyActivityChart from "./WeeklyActivityChart";
import type { WeeklyPoint } from "./progressChartData";

i18n.use(initReactI18next).init({
  lng: "en",
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});

const WIDTH = 560; // useChartWidth fallback — effects do not run under SSR
const SVG_H = 204; // PAD.top 20 + PLOT_H 160 + PAD.bottom 24, now identical in both
const AXIS_Y = 196; // PAD.top + PLOT_H + 16

const mk = (
  label: string,
  easy: number,
  medium: number,
  hard: number,
  correct: number,
  questions: number
): WeeklyPoint => ({
  weekStart: `2026-06-${label}`,
  label: `${label} Jun`,
  easy,
  medium,
  hard,
  total: easy + medium + hard,
  correct,
  questions,
  accuracy: questions > 0 ? Math.round((correct / questions) * 100) : null,
});

// A plausible learner: a two-week break, a heavy week, a light current week.
const WEEKS: WeeklyPoint[] = [
  mk("01", 2, 0, 0, 6, 10),
  mk("08", 3, 1, 0, 15, 20),
  mk("15", 0, 0, 0, 0, 0), // gap
  mk("22", 0, 0, 0, 0, 0), // gap
  mk("29", 1, 2, 0, 12, 15),
  mk("06", 2, 3, 1, 25, 30),
  mk("13", 0, 2, 2, 17, 20),
  mk("20", 1, 1, 1, 13, 15),
];

const nums = (svg: string, attr: string) =>
  [...svg.matchAll(new RegExp(attr + '="(-?[\\d.]+)"', "g"))].map((m) => Number(m[1]));

interface Label {
  x: number;
  y: number;
  anchor: string;
  text: string;
  bold: boolean;
}

const textNodes = (svg: string): Label[] =>
  [...svg.matchAll(/<text([^>]*)>([^<]*)<\/text>/g)].map((m) => ({
    x: Number(/\bx="(-?[\d.]+)"/.exec(m[1])?.[1] ?? NaN),
    y: Number(/\by="(-?[\d.]+)"/.exec(m[1])?.[1] ?? NaN),
    anchor: /text-anchor="(\w+)"/.exec(m[1])?.[1] ?? "start",
    text: m[2],
    bold: /font-weight="700"/.test(m[1]),
  }));

describe("render check", () => {
  const accuracy = renderToStaticMarkup(<AccuracyTrendChart weeks={WEEKS} hasData />);
  const activity = renderToStaticMarkup(<WeeklyActivityChart weeks={WEEKS} hasData />);
  const both = [
    { name: "accuracy", svg: accuracy },
    { name: "activity", svg: activity },
  ];

  it("emits no NaN or undefined coordinates", () => {
    for (const { svg } of both) {
      expect(svg).not.toMatch(/NaN/);
      expect(svg).not.toMatch(/undefined/);
    }
  });

  it("keeps every mark inside the drawing area", () => {
    for (const { name, svg } of both) {
      const xs = [
        ...nums(svg, "x"),
        ...nums(svg, "cx"),
        ...nums(svg, "x1"),
        ...nums(svg, "x2"),
      ];
      const ys = [
        ...nums(svg, "y"),
        ...nums(svg, "cy"),
        ...nums(svg, "y1"),
        ...nums(svg, "y2"),
      ];
      expect(Math.min(...xs), name).toBeGreaterThanOrEqual(0);
      expect(Math.max(...xs), name).toBeLessThanOrEqual(WIDTH);
      expect(Math.min(...ys), name).toBeGreaterThanOrEqual(0);
      expect(Math.max(...ys), name).toBeLessThanOrEqual(SVG_H);
    }
  });

  it("never emits a negative width or height", () => {
    for (const { name, svg } of both) {
      expect(Math.min(...nums(svg, "width"), 0), name).toBe(0);
      expect(Math.min(...nums(svg, "height"), 0), name).toBe(0);
    }
  });

  it("renders both charts at the same height so the pair lines up", () => {
    for (const { name, svg } of both) {
      expect(svg, name).toContain(`height="${SVG_H}"`);
    }
  });

  it("caps bar width at the 24px mark spec and leaves the band airy", () => {
    const bandW = (WIDTH - 34 - 16) / WEEKS.length;
    const barW = Math.max(...nums(activity, "width").filter((w) => w > 0 && w <= 24));
    expect(barW).toBeLessThanOrEqual(24);
    expect(barW).toBeLessThan(bandW);
  });

  it("breaks the accuracy line across the two empty weeks", () => {
    // Two runs (weeks 1-2 and weeks 5-8) => two stroked paths, not one.
    expect([...accuracy.matchAll(/<path[^>]*stroke="#2a78d6"/g)]).toHaveLength(2);
  });

  it("draws exactly one direct label per chart", () => {
    for (const { name, svg } of both) {
      expect([...svg.matchAll(/font-weight="700"/g)], name).toHaveLength(1);
    }
  });

  it("leaves no x-axis labels overlapping or hanging off the edge", () => {
    for (const { name, svg } of both) {
      const labels = textNodes(svg).filter((l) => l.y === AXIS_Y);
      expect(labels.length, name).toBeGreaterThan(0);

      // Approximate glyph box at 10px system sans, then require disjoint boxes.
      const boxes = labels
        .map((l) => {
          const w = l.text.length * 5.5;
          const left =
            l.anchor === "end" ? l.x - w : l.anchor === "middle" ? l.x - w / 2 : l.x;
          return { left, right: left + w, text: l.text };
        })
        .sort((a, b) => a.left - b.left);

      for (let i = 1; i < boxes.length; i++) {
        expect(
          boxes[i].left,
          `${name}: "${boxes[i - 1].text}" and "${boxes[i].text}" collide`
        ).toBeGreaterThan(boxes[i - 1].right);
      }
      expect(boxes[0].left, name).toBeGreaterThanOrEqual(0);
      expect(boxes[boxes.length - 1].right, name).toBeLessThanOrEqual(WIDTH);
    }
  });

  it("keeps each direct label clear of the y-axis tick gutter", () => {
    // Selected by weight: the tick labels share the same digits as the values.
    for (const { name, svg } of both) {
      const label = textNodes(svg).find((l) => l.bold);
      expect(label, name).toBeDefined();
      expect(label!.x, `${name}: direct label "${label!.text}"`).toBeGreaterThan(34);
      expect(label!.y, name).toBeGreaterThanOrEqual(0);
    }
  });

});
