// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StoryCard from './StoryCard';
import { LevelCard } from '../LevelProgress/LevelCard';
import { themes } from '../../modules/levelprogress/themes.levelprogress';
import type { StoryGroup } from '../../types/storyGroups';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../modules/comics/useComicFocus', () => ({ useComicFocus: () => ({ focus: null, ready: true }) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('navigation renders real links', () => {
  it('a story card is an <a> to the story page', () => {
    const story = { slug: 'maya', title: 'Maya', category: 'general', totalTracks: 10 } as StoryGroup;
    act(() => root.render(<MemoryRouter>
      <StoryCard story={story} difficulty="medium" accent="red" completed={0} index={0} href="/levels/medium/maya" />
    </MemoryRouter>));
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/levels/medium/maya');
    expect(container.querySelector('button')).toBeNull();
  });

  it('a part tile is an <a> to the player, and a plain click runs the old handler', () => {
    const onClick = vi.fn();
    act(() => root.render(<MemoryRouter>
      <LevelCard
        level={2} index={1} status="available" isCompleted={false} isLocked={false}
        freeParts={0} previewSeconds={null} trackTitle="Part two" comicSrc={undefined}
        theme={themes.medium} href="/levels/medium/maya/2" onClick={onClick}
      />
    </MemoryRouter>));
    const link = container.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/levels/medium/maya/2');
    act(() => { link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })); });
    expect(onClick).toHaveBeenCalledWith(2);
    act(() => { link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true })); });
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
