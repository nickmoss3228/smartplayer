import { describe, expect, it } from "vitest";
import i18next from "i18next";
import en from "../../locales/en/translation.json";
import ru from "../../locales/ru/translation.json";
import { PHRASE_POOLS, buildBubblePool } from "./bubbles";
import { phraseBookFrom } from "./phraseBook";
import { adviceFor } from "./advisor";
import { PAYROLL_MAX_WEEKS } from "../../config/schoolCatalog";

async function translator(lng: "en" | "ru") {
  const i18n = i18next.createInstance();
  await i18n.init({
    lng,
    // No fallback: a line missing from Russian must fail here, not quietly
    // turn up in English.
    fallbackLng: false,
    resources: { en: { translation: en }, ru: { translation: ru } },
    interpolation: { escapeValue: false },
  });
  return i18n.t.bind(i18n) as unknown as (key: string, options?: Record<string, unknown>) => unknown;
}

describe("what the school says", () => {
  it("has every pool of lines in both languages", async () => {
    for (const lng of ["en", "ru"] as const) {
      const book = phraseBookFrom(await translator(lng));
      for (const pool of PHRASE_POOLS) expect(book[pool].length, `${lng} ${pool}`).toBeGreaterThan(0);
      for (const g of Object.values(book.greeting)) expect(g, lng).not.toMatch(/^school\./);
    }
  });

  it("speaks Russian to a Russian-speaking player, and quotes learned words as they are", async () => {
    const book = phraseBookFrom(await translator("ru"));
    const pool = buildBubblePool(["journey"], 10, book);
    expect(pool.student).toContain("«journey»");
    expect(pool.student.some((l) => /[а-яё]/i.test(l))).toBe(true);
    expect(pool.receptionist[0]).toBe("Доброе утро!");
    // Late at night, the late lines.
    expect(buildBubblePool([], 23, book).student).toEqual(book.lateStudent);
    expect(buildBubblePool([], 23, book).receptionist[0]).toBe("Засиделись допоздна?");
  });

  it("gives every kind of person something to say, day and night, in both languages", async () => {
    for (const lng of ["en", "ru"] as const) {
      const book = phraseBookFrom(await translator(lng));
      for (const hour of [7, 10, 17, 23]) {
        for (const [role, lines] of Object.entries(buildBubblePool(["journey"], hour, book))) {
          expect(lines.length, `${lng} ${hour}h ${role}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("does not have the head, the coach or the librarian talk like everybody else", async () => {
    const pool = buildBubblePool([], 10, phraseBookFrom(await translator("en")));
    const apart: [keyof typeof pool, keyof typeof pool][] = [
      ["head", "teacher"],
      ["staff", "teacher"],
      ["director", "teacher"],
      ["coach", "athlete"],
      ["footballer", "athlete"],
      ["librarian", "reader"],
      ["researcher", "reader"],
      ["reviser", "reader"],
      ["musician", "student"],
      ["performer", "student"],
      ["friend", "student"],
      ["walker", "student"],
      ["kid", "student"],
      ["keeper", "footballer"],
    ];
    for (const [a, b] of apart) {
      const shared = pool[a].filter((line) => pool[b].includes(line));
      expect(shared, `${a} and ${b}`).toEqual([]);
    }
    // Up the path in the morning, back down it after school.
    const book = phraseBookFrom(await translator("en"));
    expect(buildBubblePool([], 7, book).arriving).toEqual(book.arriving);
    expect(buildBubblePool([], 16, book).arriving).toEqual(book.leaving);
  });

  it("gives the deputy head a line for every situation, in both languages", async () => {
    for (const lng of ["en", "ru"] as const) {
      const t = await translator(lng);
      const said = new Set<string>();
      for (let weeksOwed = 0; weeksOwed <= PAYROLL_MAX_WEEKS + 3; weeksOwed++) {
        for (const morale of [40, 100]) {
          for (const canBuild of [false, true]) {
            for (let rooms = 1; rooms <= 20; rooms++) {
              const a = adviceFor({ weeksOwed, due: 120, morale, canBuild, rooms });
              const text = String(t(`school.advisor.${a.line}`, a.params));
              expect(text, `${lng} ${a.line}`).not.toMatch(/^school\./);
              expect(text).not.toMatch(/\{\{/);
              said.add(text);
            }
          }
        }
      }
      expect(said.size, lng).toBeGreaterThan(8);
    }
  });

  it("gets the Russian plural right for weeks owed", async () => {
    const t = await translator("ru");
    const line = (count: number) => String(t("school.advisor.payrollBehind", { count, due: 50 }));
    expect(line(2)).toContain("2 недели");
    expect(line(5)).toContain("5 недель");
  });
});
