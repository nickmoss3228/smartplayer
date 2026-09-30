// modules/school/Baked.tsx
//
// Draws its children as a few merged meshes instead of one per box (bake.ts).
// Wrap anything that is mostly still; mark whatever inside it moves with
// `userData={LIVE}`, and it is left exactly as it is.
//
// It re-checks after every commit — its own, which is every time anything
// above it re-renders — and after the day's lights or season change, which is
// the one context the scenery reads. A change nothing drew differently costs a
// walk of the tree and nothing more; one that did is merged again.

import { ReactNode, useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useAtmosphere } from "./atmosphere";
import { Baked as BakeResult, LIVE, dispose, merge, walk } from "./bake";

export const Baked = ({ children }: { children: ReactNode }) => {
  // Read only so a change of season or lights re-runs the check below along
  // with the scenery that drew itself differently for it.
  useAtmosphere();
  const source = useRef<THREE.Group>(null);
  const out = useRef<THREE.Group>(null);
  const last = useRef<{ signature: number; baked: BakeResult | null; hidden: Set<THREE.Object3D> }>({
    signature: -1,
    baked: null,
    hidden: new Set(),
  });

  // No dependency list, on purpose: see the header.
  useLayoutEffect(() => {
    const src = source.current;
    const dst = out.current;
    if (!src || !dst) return;
    const state = last.current;
    const { items, signature } = walk(src, state.hidden);
    if (signature === state.signature) return;

    // Put the originals back as they were, then merge afresh.
    for (const o of state.hidden) o.visible = true;
    state.hidden.clear();
    if (state.baked) dispose(state.baked);

    dst.updateWorldMatrix(true, false);
    const baked = merge(items, dst.matrixWorld);
    for (const mesh of baked.meshes) dst.add(mesh);
    for (const mesh of baked.replaced) {
      mesh.visible = false;
      state.hidden.add(mesh);
    }
    state.baked = baked;
    state.signature = signature;
  });

  useEffect(
    () => () => {
      const state = last.current;
      if (state.baked) dispose(state.baked);
      state.baked = null;
      state.signature = -1;
      state.hidden.clear();
    },
    [],
  );

  // LIVE on the whole thing: a Baked inside another is merged by itself, and
  // the outer one leaves it be.
  return (
    <group userData={LIVE}>
      <group ref={source}>{children}</group>
      <group ref={out} />
    </group>
  );
};
