// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../i18n';
import ContinueCard from './ContinueCard';
import { saveLastPlayed } from '../../services/lastPlayed';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;

const mount = () => act(() => root.render(<MemoryRouter><ContinueCard /></MemoryRouter>));

describe('ContinueCard', () => {
  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
  });

  it('renders nothing without a record', () => {
    mount();
    expect(container.innerHTML).toBe('');
  });

  it('links to the last played part with its title', () => {
    saveLastPlayed({ difficulty: 'easy', storySlug: 'leo', part: 2, titles: { ru: 'Приключения Лео', en: 'Leo' } });
    mount();
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/levels/easy/leo/2');
    expect(link?.textContent).toContain('Приключения Лео');
    expect(link?.textContent).toContain('2');
  });
});
