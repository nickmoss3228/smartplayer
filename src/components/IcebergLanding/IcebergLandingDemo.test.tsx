// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n';
import IcebergLandingDemo from './IcebergLandingDemo';

// the three.js scenes are separate chunks and need WebGL: not part of this test
vi.mock('./three/MarineSnow', () => ({ default: () => null }));
vi.mock('./three/Iceberg3D', () => ({ default: () => null }));

// jsdom's CSS parser cannot read the colour-mix() gradients of water(); the colours are not under test
vi.mock('./IcebergLanding', async (importActual) => ({ ...(await importActual<typeof import('./IcebergLanding')>()), water: () => 'none' }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;

describe('IcebergLandingDemo', () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom has no IntersectionObserver; a no-op one is enough for the order check
    vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } });
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as unknown as typeof window.matchMedia;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('puts the sections in the new order and keeps the footer last', async () => {
    await act(async () => root.render(<MemoryRouter><IcebergLandingDemo /></MemoryRouter>));
    const order = ['header.ib-hero', '.dv-final', '.dv-ascent', '.dv-z1', '.dv-z4', '.ib-rivals', 'footer'];
    const els = order.map((sel) => container.querySelector(sel));
    els.forEach((el, i) => expect(el, order[i]).not.toBeNull());
    for (let i = 1; i < els.length; i++) {
      expect(els[i - 1]!.compareDocumentPosition(els[i]!) & Node.DOCUMENT_POSITION_FOLLOWING, order[i]).toBeTruthy();
    }
    // the final section's footer moved out of it
    expect(container.querySelectorAll('footer')).toHaveLength(1);
    expect(container.querySelector('.dv-final footer')).toBeNull();
    // «Вот почему ты не слышишь» leads to the first problem band, which exists on the page
    expect(container.querySelector('a.ib-down')?.getAttribute('href')).toBe('#ib-letter-title');
    expect(container.querySelector('#ib-letter-title')).not.toBeNull();
  });
});
