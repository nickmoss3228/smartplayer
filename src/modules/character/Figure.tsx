// modules/character/Figure.tsx
//
// A person on screen: the meshes from figureGeometry.ts hung on the joints
// from figureParts.ts. It holds no animation of its own — whoever mounts it
// drives the joints through `refs` — so the same figure sits at a desk in the
// school and turns on the spot in the dashboard.

import { useMemo } from "react";
import { BodyRefs } from "./bodyRefs";
import { CharacterLook, lookKey } from "./look";
import { jointPositions } from "./figureParts";
import { FIGURE_MATERIAL, SHADOW_GEOMETRY, SHADOW_MATERIAL, figureGeometries } from "./figureGeometry";

export const Figure = ({
  refs,
  look,
  sitting = false,
  seatTop,
  shadow = true,
}: {
  refs: BodyRefs;
  look: CharacterLook;
  sitting?: boolean;
  /** Height of the seat under a seated figure. */
  seatTop?: number;
  shadow?: boolean;
}) => {
  const key = lookKey(look);
  // Keyed on the look's contents, not its identity: a look rebuilt with the
  // same values must not rebuild — or re-fetch from the cache — anything.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geo = useMemo(() => figureGeometries(look, sitting, seatTop), [key, sitting, seatTop]);
  const at = useMemo(() => jointPositions(sitting, seatTop), [sitting, seatTop]);

  return (
    <group ref={refs.root}>
      {shadow && (
        <mesh
          geometry={SHADOW_GEOMETRY}
          material={SHADOW_MATERIAL}
          position={[0, 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      )}
      {geo.root && <mesh geometry={geo.root} material={FIGURE_MATERIAL} />}
      {!sitting && (
        <>
          <group ref={refs.legL} position={at.legL}>
            {geo.legL && <mesh geometry={geo.legL} material={FIGURE_MATERIAL} />}
          </group>
          <group ref={refs.legR} position={at.legR}>
            {geo.legR && <mesh geometry={geo.legR} material={FIGURE_MATERIAL} />}
          </group>
        </>
      )}
      <group ref={refs.torso} position={at.torso}>
        {geo.torso && <mesh geometry={geo.torso} material={FIGURE_MATERIAL} />}
        <group ref={refs.armL} position={at.armL}>
          {geo.armL && <mesh geometry={geo.armL} material={FIGURE_MATERIAL} />}
        </group>
        <group ref={refs.armR} position={at.armR}>
          {geo.armR && <mesh geometry={geo.armR} material={FIGURE_MATERIAL} />}
        </group>
        <group ref={refs.head} position={at.head}>
          {geo.head && <mesh geometry={geo.head} material={FIGURE_MATERIAL} />}
        </group>
      </group>
    </group>
  );
};
