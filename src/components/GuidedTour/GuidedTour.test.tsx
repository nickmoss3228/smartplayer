// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';
import { GuidedTour } from './GuidedTour';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;
let rectSpy: ReturnType<typeof vi.spyOn>;

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const dialog = () => document.querySelector('[role="dialog"]');
const click = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const buttonByText = (text: string) =>
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes(text));

const mount = () => {
  act(() => root.render(
    <div>
      <GuidedTour />
      <div data-tour="tour-player"><button id="play">play</button></div>
      <div data-tour="tour-speed">
        <button id="speed">speed</button>
        <span id="caption">caption</span>
      </div>
      <div data-tour="tour-repeat"><button id="repeat">repeat</button></div>
    </div>,
  ));
};

describe('GuidedTour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 100, y: 200, left: 100, top: 200, right: 220, bottom: 240, width: 120, height: 40,
      toJSON: () => ({}),
    } as DOMRect);
    Element.prototype.scrollIntoView = vi.fn();
    document.elementFromPoint = vi.fn(() => document.getElementById('speed'));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    rectSpy.mockRestore();
    localStorage.clear();
    vi.useRealTimers();
  });

  describe('first tour', () => {
    it('shows step 1 of 3 after the delay', () => {
      mount();
      expect(dialog()).toBeNull();
      advance(700);
      expect(dialog()).not.toBeNull();
      expect(document.body.textContent).toContain('Шаг 1 из 3');
    });

    it('skip stores playerTourV6 and removes the tour', () => {
      mount();
      advance(700);
      click(buttonByText('Пропустить')!);
      expect(localStorage.getItem('playerTourV6')).not.toBeNull();
      expect(dialog()).toBeNull();
    });

    it('Next moves to step 2', () => {
      mount();
      advance(700);
      click(buttonByText('Далее')!);
      expect(document.body.textContent).toContain('Шаг 2 из 3');
    });
  });

  describe('veteran (playerTourV5)', () => {
    it('renders nothing and shows no hint', () => {
      localStorage.setItem('playerTourV5', '1');
      mount();
      advance(1500);
      expect(dialog()).toBeNull();
      click(document.getElementById('speed')!);
      advance(1000);
      expect(dialog()).toBeNull();
    });
  });

  describe('first-use hints (playerTourV6)', () => {
    beforeEach(() => localStorage.setItem('playerTourV6', '1'));

    const showSpeedHint = () => {
      mount();
      advance(700);
      expect(dialog()).toBeNull();
      click(document.getElementById('speed')!);
      advance(450);
    };

    it('shows the speed hint ~450 ms after a button click and records it', () => {
      mount();
      click(document.getElementById('speed')!);
      advance(400);
      expect(dialog()).toBeNull();
      advance(50);
      expect(dialog()?.getAttribute('aria-label')).toBe('Почему три скорости?');
      expect(JSON.parse(localStorage.getItem('playerHintsV1')!)).toContain('speed');
    });

    it('does not show it a second time', () => {
      showSpeedHint();
      expect(dialog()).not.toBeNull();
      click(buttonByText('Понятно')!);
      expect(dialog()).toBeNull();
      click(document.getElementById('speed')!);
      advance(1000);
      expect(dialog()).toBeNull();
    });

    it('ignores a click on a plain span inside the target', () => {
      mount();
      click(document.getElementById('caption')!);
      advance(1000);
      expect(dialog()).toBeNull();
      expect(localStorage.getItem('playerHintsV1')).toBeNull();
    });

    it('Escape closes the hint', () => {
      showSpeedHint();
      expect(dialog()).not.toBeNull();
      act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
      expect(dialog()).toBeNull();
    });

    it('a pointerdown outside the card closes it, inside does not', () => {
      showSpeedHint();
      act(() => { dialog()!.dispatchEvent(new Event('pointerdown', { bubbles: true })); });
      expect(dialog()).not.toBeNull();
      act(() => { document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })); });
      expect(dialog()).toBeNull();
    });
  });
});
