// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignupWallSheet } from './SignupWallSheet';
import ru from '../../locales/ru/translation.json';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => {
  let value: unknown = ru;
  for (const part of key.split('.')) value = (value as Record<string, unknown>)?.[part];
  return typeof value === 'string' ? value : key;
} }) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;

function Next() {
  const location = useLocation();
  return <output data-testid="next">{location.pathname}|{JSON.stringify(location.state)}</output>;
}

function mount(onClose = vi.fn()) {
  act(() => root.render(
    <MemoryRouter initialEntries={['/levels/easy/leo?practice=repeat']}>
      <Routes>
        <Route path="/levels/:difficulty/:storySlug" element={<SignupWallSheet onClose={onClose} />} />
        <Route path="/signup" element={<Next />} />
        <Route path="/login" element={<Next />} />
      </Routes>
    </MemoryRouter>,
  ));
  return onClose;
}

const find = (text: string) =>
  Array.from(container.querySelectorAll('a,button')).find((el) => el.textContent === text) as HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('SignupWallSheet', () => {
  it('shows the title and points the links at sign-up and login', () => {
    mount();
    expect(container.querySelector('h2')?.textContent).toBe(ru.signupWall.title);
    expect(find(ru.signupWall.signUp).getAttribute('href')).toBe('/signup');
    expect(find(ru.signupWall.logIn).getAttribute('href')).toBe('/login');
  });

  it.each([
    ['signUp', '/signup'],
    ['logIn', '/login'],
  ] as const)('%s hands this grid to the next route as returnTo', (key, path) => {
    mount();
    act(() => find(ru.signupWall[key]).click());
    expect(container.querySelector('[data-testid="next"]')?.textContent).toBe(
      `${path}|${JSON.stringify({ returnTo: '/levels/easy/leo?practice=repeat' })}`,
    );
  });

  it('closes on "not now"', () => {
    const onClose = mount();
    act(() => find(ru.signupWall.notNow).click());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
