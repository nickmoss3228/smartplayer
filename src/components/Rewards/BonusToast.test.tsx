// @vitest-environment jsdom
//
// The toast shows the server-rolled bonus, then goes away on its own.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../../locales/en/translation.json";
import BonusToast from "./BonusToast";
import type { RewardBonus } from "../../types/Wallet";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

i18n.use(initReactI18next).init({
  lng: "en",
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});

let container: HTMLDivElement;
let root: Root;

const show = (bonus: RewardBonus | null) =>
  act(async () => {
    root.render(<BonusToast bonus={bonus} />);
  });

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe("BonusToast", () => {
  it("renders nothing without a bonus", async () => {
    await show(null);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it.each([
    [{ kind: "surprise", currency: "bitAward", amount: 5 }, "Surprise bonus!", "+5"],
    [{ kind: "golden", currency: "bitPhrase", amount: 3 }, "Golden phrase!", "+3"],
  ] as [RewardBonus, string, string][])("shows title and amount for %o", async (bonus, title, amount) => {
    await show(bonus);
    const toast = container.querySelector('[role="status"]');
    expect(toast).not.toBeNull();
    expect(toast!.getAttribute("aria-live")).toBe("polite");
    expect(toast!.textContent).toContain(title);
    expect(toast!.textContent).toContain(amount);
  });

  it("names a single golden word, and counts several", async () => {
    await show({ kind: "goldenWord", currency: "bitWord", amount: 5, word: "give up", count: 1 });
    let toast = container.querySelector('[role="status"]')!;
    expect(toast.textContent).toContain("Golden word!");
    expect(toast.textContent).toContain("“give up” was a golden word");
    expect(toast.textContent).toContain("+5");

    await show({ kind: "goldenWord", currency: "bitWord", amount: 15, word: "give up", count: 3 });
    toast = container.querySelector('[role="status"]')!;
    expect(toast.textContent).toContain("3 golden words this round");
  });

  it("disappears after the timeout", async () => {
    await show({ kind: "surprise", currency: "bitWord", amount: 2 });
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(3600);
    });
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it("can be dismissed by click", async () => {
    await show({ kind: "golden", currency: "bitPhrase", amount: 1 });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[role="status"]')!.click();
    });
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});
