// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../i18n';
import Levels from './Levels';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;

describe('Levels', () => {
  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<MemoryRouter><Levels /></MemoryRouter>));
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('shows one link per level', () => {
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/levels/easy', '/levels/medium', '/levels/hard']);
  });

  it('shows the CEFR bands and no Continue button', () => {
    const text = container.textContent ?? '';
    for (const band of ['A1–A2', 'B1', 'B2–C1']) expect(text).toContain(band);
    expect(text).not.toContain('Продолжить');
  });
});
