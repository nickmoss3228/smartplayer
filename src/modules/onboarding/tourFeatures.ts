// modules/onboarding/tourFeatures.ts
//
// The six cards of the /welcome tour (FeatureTour.tsx), in order: which icon
// and which screenshot each shows. The copy is under onboarding.tour.<id>.

import type React from 'react';
import {
  IoDiamondOutline,
  IoHeadsetOutline,
  IoHelpCircleOutline,
  IoPersonCircleOutline,
  IoSchoolOutline,
} from 'react-icons/io5';
import { JarIcon } from '../vocab/JarIcon';
import playerShot from '../../assets/landing/m3-player.webp';
import wordGameShot from '../../assets/landing/m4-wordgame.webp';
import quizShot from '../../assets/landing/m4-quiz.webp';
import schoolShot from '../../assets/landing/f-school.webp';
import dashboardShot from '../../assets/landing/m6-dashboard.webp';

type Icon = React.ComponentType<{ size?: number; className?: string }>;

export type TourFeature = 'player' | 'words' | 'quiz' | 'points' | 'school' | 'dashboard';

interface Shot {
  src: string;
  width: number;
  height: number;
  /** Which part of a tall phone screenshot the card's window shows. */
  position: string;
}

export const FEATURES: { id: TourFeature; icon: Icon; shot?: Shot }[] = [
  // The speeds and the play button sit at the bottom of the player.
  { id: 'player', icon: IoHeadsetOutline, shot: { src: playerShot, width: 780, height: 1688, position: '50% 90%' } },
  { id: 'words', icon: JarIcon, shot: { src: wordGameShot, width: 723, height: 924, position: '50% 0%' } },
  { id: 'quiz', icon: IoHelpCircleOutline, shot: { src: quizShot, width: 723, height: 1100, position: '50% 0%' } },
  { id: 'points', icon: IoDiamondOutline },
  { id: 'school', icon: IoSchoolOutline, shot: { src: schoolShot, width: 1100, height: 848, position: '50% 50%' } },
  // The level progress is at the bottom of this crop of the dashboard.
  { id: 'dashboard', icon: IoPersonCircleOutline, shot: { src: dashboardShot, width: 780, height: 1188, position: '50% 100%' } },
];

/** The tour's order, for tests. */
export const TOUR_ORDER: TourFeature[] = FEATURES.map((f) => f.id);
