// components/TabBar/hubTabs.ts
//
// The four places a signed-in student goes, in one list. The phone's bottom
// bar (TabBar.tsx) and the desktop navbar links (Navbar.tsx) both render it,
// so the two can never disagree about what the sections are called, where
// they lead or when one counts as "you are here".
//
// Behind HUB_ENABLED (config/features.ts).

import type { ComponentType } from 'react';
import { IoHeadsetOutline, IoHomeOutline, IoSchoolOutline } from 'react-icons/io5';
import { JarIcon } from '../../modules/vocab/JarIcon';
import { readLastLevel } from '../../services/lastLevel';

type TabIcon = ComponentType<{ size?: number; className?: string }>;

export interface HubTab {
  id: 'home' | 'levels' | 'words' | 'school';
  /** A key under `tabs`. */
  labelKey: string;
  /** Outline in every state (design manifest §7): ink colour and the signal
   *  marker say which tab is current, not a filled icon. */
  icon: TabIcon;
  /** Read at render, not at import: the levels tab follows the last level opened. */
  to: () => string;
  isActive: (pathname: string) => boolean;
}

const startsWith = (pathname: string, ...prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const HUB_TABS: HubTab[] = [
  {
    id: 'home',
    labelKey: 'tabs.home',
    icon: IoHomeOutline,
    to: () => '/home',
    isActive: (p) => p === '/home',
  },
  {
    id: 'levels',
    labelKey: 'tabs.levels',
    icon: IoHeadsetOutline,
    // Straight to the shelf of the level last opened; the picker is one tap
    // back from there («Сменить уровень») and on the hub itself.
    to: () => {
      const level = readLastLevel();
      return level ? `/levels/${level}` : '/levels';
    },
    isActive: (p) => startsWith(p, '/levels', '/stories', '/shop', '/library'),
  },
  {
    id: 'words',
    labelKey: 'tabs.words',
    icon: JarIcon,
    to: () => '/kopilka',
    isActive: (p) => startsWith(p, '/kopilka'),
  },
  {
    id: 'school',
    labelKey: 'tabs.school',
    icon: IoSchoolOutline,
    to: () => '/room',
    isActive: (p) => startsWith(p, '/room', '/players'),
  },
];
