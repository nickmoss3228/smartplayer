// modules/character/bodyRefs.ts
//
// Handles on a figure's joints, for whoever animates it: People.tsx walks and
// seats them, the dashboard's creator has one breathe and wave.

import { RefObject, useRef } from "react";
import type * as THREE from "three";

export interface BodyRefs {
  root: RefObject<THREE.Group | null>;
  torso: RefObject<THREE.Group | null>;
  head: RefObject<THREE.Group | null>;
  armL: RefObject<THREE.Group | null>;
  armR: RefObject<THREE.Group | null>;
  legL: RefObject<THREE.Group | null>;
  legR: RefObject<THREE.Group | null>;
}

export function useBodyRefs(): BodyRefs {
  return {
    root: useRef<THREE.Group>(null),
    torso: useRef<THREE.Group>(null),
    head: useRef<THREE.Group>(null),
    armL: useRef<THREE.Group>(null),
    armR: useRef<THREE.Group>(null),
    legL: useRef<THREE.Group>(null),
    legR: useRef<THREE.Group>(null),
  };
}
