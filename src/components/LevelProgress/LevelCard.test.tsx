// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LevelCard } from './LevelCard';
import { themes } from '../../modules/levelprogress/themes.levelprogress';
import ru from '../../locales/ru/translation.json';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => {
  let value: unknown = ru;
  for (const part of key.split('.')) value = (value as Record<string, unknown>)?.[part];
  return typeof value === 'string' ? value : key;
} }) }));
vi.mock('../../modules/comics/useComicFocus', () => ({ useComicFocus: () => ({ focus: null, ready: true }) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;

function mount(signupLock: boolean) {
  act(() => root.render(
    <MemoryRouter>
      <LevelCard
        level={2} index={1} status="locked" isCompleted={false} isLocked signupLock={signupLock}
        freeParts={0} previewSeconds={null} trackTitle="Part" comicSrc={undefined}
        theme={themes.easy} href="/levels/easy/leo/2" onClick={() => {}}
      />
    </MemoryRouter>,
  ));
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('LevelCard lock label', () => {
  it('names the sign-up wall when that is the lock', () => {
    mount(true);
    expect(container.textContent).toContain(ru.signupWall.lockLabel);
    expect(container.textContent).not.toContain(ru.paywall.locked);
  });

  it('keeps the bare "locked" for any other lock', () => {
    mount(false);
    expect(container.textContent).toContain(ru.paywall.locked);
    expect(container.textContent).not.toContain(ru.signupWall.lockLabel);
  });
});
