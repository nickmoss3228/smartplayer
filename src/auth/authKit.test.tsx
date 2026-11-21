// @vitest-environment jsdom
//
// The auth kit's text inputs are tagged for Yandex Webvisor: ym-disable-keys
// makes the recording show what was typed as asterisks. A field added to the
// kit without the tag would leak what people type into a session recording, so
// each input type is rendered and checked.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en/translation.json";
import { TextField, PasswordField, PhoneField, OtpField } from "./authKit";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

i18n.use(initReactI18next).init({
  lng: "en",
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});

function Fields() {
  const [text, setText] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  return (
    <>
      <TextField id="t-email" label="Email" value={text} onChange={setText} />
      <PasswordField
        id="t-password"
        label="Password"
        value={password}
        onChange={setPassword}
        show={false}
        onToggleShow={() => {}}
      />
      <PhoneField
        id="t-phone"
        label="Phone"
        value={phone}
        onChange={setPhone}
        format={(raw) => raw}
      />
      <OtpField value={code} onChange={setCode} label="Code" />
    </>
  );
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("auth kit inputs", () => {
  it("tags the text, password and phone inputs so Webvisor masks typing", async () => {
    await act(async () => {
      root.render(<Fields />);
    });
    for (const id of ["t-email", "t-password", "t-phone"]) {
      const input = container.querySelector<HTMLInputElement>(`#${id}`);
      expect(input, id).not.toBeNull();
      expect(input!.classList.contains("ym-disable-keys"), id).toBe(true);
    }
  });

  it("tags every SMS code box", async () => {
    await act(async () => {
      root.render(<Fields />);
    });
    const boxes = container.querySelectorAll<HTMLInputElement>('input[id^="code-"]');
    expect(boxes.length).toBe(6);
    boxes.forEach((box) => expect(box.classList.contains("ym-disable-keys")).toBe(true));
  });
});
