// @vitest-environment jsdom
//
// Behaviour tests for the Dashboard's change-password dialog, mounted for real
// against a mocked service. What matters here is what never reaches the server
// (a mismatch, a short password) and that each refusal the server CAN give is
// shown as words the user can act on rather than a generic failure.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../../locales/en/translation.json";

vi.mock("../../services/profileServices", () => ({
  changePassword: vi.fn(),
}));

import { changePassword } from "../../services/profileServices";
import ChangePasswordModal from "./ChangePasswordModal";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

i18n.use(initReactI18next).init({
  lng: "en",
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});

let container: HTMLDivElement;
let root: Root;
const onChanged = vi.fn();

async function mount(passwordChangedAt?: string | null) {
  await act(async () => {
    root.render(
      <ChangePasswordModal
        passwordChangedAt={passwordChangedAt}
        onChanged={onChanged}
        onClose={() => {}}
      />
    );
  });
}

// React tracks an input's value itself; going through the native setter is
// what makes it see the change as user input.
function type(id: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(`#${id}`)!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function fillAndSubmit(current: string, next: string, confirm = next) {
  await act(async () => {
    type("current-password", current);
    type("new-password", next);
    type("confirm-password", confirm);
  });
  await act(async () => {
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

// The shape axios.isAxiosError recognises.
const refusal = (data: Record<string, unknown>, status = 400) =>
  Object.assign(new Error("refused"), { isAxiosError: true, response: { status, data } });

const alertText = () => container.querySelector('[role="alert"]')?.textContent ?? "";

beforeEach(() => {
  vi.mocked(changePassword).mockReset();
  onChanged.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("change password dialog", () => {
  it("does not send new passwords that don't match", async () => {
    await mount();
    await fillAndSubmit("old-password", "new-password-1", "new-password-2");
    expect(alertText()).toContain("don't match");
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("does not send a new password under 6 characters", async () => {
    await mount();
    await fillAndSubmit("old-password", "12345");
    expect(alertText()).toContain("at least 6 characters");
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("says the current password is wrong, and keeps the form", async () => {
    vi.mocked(changePassword).mockRejectedValue(refusal({ code: "WRONG_PASSWORD" }));
    await mount();
    await fillAndSubmit("typo-password", "new-password-1");
    expect(changePassword).toHaveBeenCalledWith("typo-password", "new-password-1");
    expect(alertText()).toContain("current password is incorrect");
    expect(container.querySelector("form")).not.toBeNull();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("turns a rate limit into minutes to wait", async () => {
    vi.mocked(changePassword).mockRejectedValue(
      refusal({ code: "RATE_LIMITED", retryAfterSeconds: 900 }, 429)
    );
    await mount();
    await fillAndSubmit("old-password", "new-password-1");
    expect(alertText()).toContain("15 min");
  });

  it("reports success and hands the new timestamp up", async () => {
    vi.mocked(changePassword).mockResolvedValue({ passwordChangedAt: "2026-10-01T10:00:00.000Z" });
    await mount();
    await fillAndSubmit("old-password", "new-password-1");
    expect(onChanged).toHaveBeenCalledWith("2026-10-01T10:00:00.000Z");
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Other devices have been signed out"
    );
    expect(container.querySelector("form")).toBeNull();
  });

  it("shows when the password was last changed, and nothing when unknown", async () => {
    await mount("2026-09-15T12:00:00.000Z");
    expect(container.textContent).toContain("Last changed September 15, 2026");

    await mount(null);
    expect(container.textContent).not.toContain("Last changed");
  });
});
