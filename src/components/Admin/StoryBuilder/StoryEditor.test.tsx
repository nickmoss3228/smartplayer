// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminStory, StoryPart } from "../../../services/adminStoryServices";
import StoryEditor from "./StoryEditor";

const audio = vi.hoisted(() => ({ callbacks: [] as Array<(part: StoryPart) => void> }));
vi.mock("./PartAudioMarkerEditor", () => ({ default: ({ active, part, onPartUpdated }: { active: boolean; part: StoryPart; onPartUpdated: (part: StoryPart) => void }) => {
  audio.callbacks.push(onPartUpdated);
  return <div data-audio-active={String(active)}>Recording {part.partNumber}</div>;
} }));
vi.mock("./PartTranscriptEditor", () => ({ default: function ScriptEditorStub() {
  const [value, setValue] = useState("");
  return <button data-draft onClick={() => setValue("Unsaved author script")}>{value || "Write a script"}</button>;
} }));
vi.mock("./PartTranslationEditor", () => ({ default: () => <div>Translation editor</div> }));
vi.mock("./PartComicEditor", () => ({ default: () => <div>Comic editor</div> }));
vi.mock("./PartQuizEditor", () => ({ default: ({part}: {part: StoryPart}) => <div data-quiz-part={part.partNumber}>Quiz editor</div> }));
vi.mock("./PartIntroEditor", () => ({ default: () => <div>Preview card editor</div> }));
vi.mock("./PartVocabWordsEditor", () => ({ default: () => <div>Vocabulary editor</div> }));
vi.mock("./PartPanelQuizEditor", () => ({ default: () => <div>Comic quiz editor</div> }));
vi.mock("./StoryCoverEditor", () => ({ default: () => <div>Cover editor</div> }));
vi.mock("./CastEditor", () => ({ default: () => <div>Cast editor</div> }));
vi.mock("./StoryPricingPanel", () => ({ default: () => <div>Access editor</div> }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root, container: HTMLDivElement;
const part = (n: number): StoryPart => ({partNumber:n,title:"",audioUrl:"/recording.mp3",timeMarkers:[{time:0,label:"1",color:"red"}],vocabulary:[],phrasalVerbs:[],quiz:[]});
const sample = (): AdminStory => ({_id:"desk-test",storyId:"test",storyName:"Test set",difficulty:"easy",description:"",characterIcon:"",totalParts:2,published:false,createdAt:"2026-11-02",parts:[part(1),part(2)]});
beforeEach(() => {container=document.createElement("div");document.body.append(container);root=createRoot(container);audio.callbacks=[];});
afterEach(async () => {await act(async () => root.unmount());container.remove();});
const click = async (label: string) => {
  const button=Array.from(container.querySelectorAll("button")).find(b=>b.textContent===label);
  expect(button, label).toBeTruthy();
  await act(async()=>button!.click());
};
const show = async (story=sample(), onStoryUpdated=vi.fn()) => act(async()=>root.render(<StoryEditor token="test" story={story} onStoryUpdated={onStoryUpdated} onBack={vi.fn()} onDeleted={vi.fn()} onPreview={vi.fn()} switcher={null} switcherOpen={false} onToggleSwitcher={vi.fn()} />));

describe("editing desk navigation", () => {
  it("preserves an unsaved form when visiting the overview and settings", async () => {
    await show();await click("Private script");await click("Write a script");
    const draft=container.querySelector("[data-draft]");
    await click("Production board");
    expect(container.querySelector<HTMLElement>('[data-testid="editing-desk"]')!.hidden).toBe(true);
    await click("Set settings");await click("Editing desk");
    expect(container.querySelector("[data-draft]")).toBe(draft);
    expect(draft?.textContent).toBe("Unsaved author script");
  });
  it("suspends audio while hidden and restores it on return", async () => {
    await show();expect(container.querySelector("[data-audio-active]")?.getAttribute("data-audio-active")).toBe("true");
    await click("Production board");expect(container.querySelector("[data-audio-active]")?.getAttribute("data-audio-active")).toBe("false");
    await click("Editing desk");expect(container.querySelector("[data-audio-active]")?.getAttribute("data-audio-active")).toBe("true");
  });
  it("opens the exact part and editor selected from the production board", async () => {
    await show();await click("Production board");
    await act(async()=>container.querySelector<HTMLButtonElement>('[aria-label="Part 2 — Quiz: empty"]')!.click());
    expect(container.querySelector("[data-quiz-part]")?.getAttribute("data-quiz-part")).toBe("2");
    expect(container.querySelector<HTMLElement>('[data-testid="production-board"]')!.hidden).toBe(true);
  });
  it("merges a delayed part save into the latest set instead of reverting another part", async () => {
    const initial=sample(),onUpdate=vi.fn();await show(initial,onUpdate);
    const oldCallback=audio.callbacks[0];
    const newest={...initial,parts:[initial.parts[0],{...initial.parts[1],transcript:"New part two script"}]};
    await show(newest,onUpdate);
    oldCallback({...initial.parts[0],timeMarkers:[{time:0,label:"1",color:"red"},{time:1,label:"2",color:"red"}]});
    expect(onUpdate.mock.calls[0][0].parts[1].transcript).toBe("New part two script");
    expect(onUpdate.mock.calls[0][0].parts[0].timeMarkers).toHaveLength(2);
  });
});
