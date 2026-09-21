// Type declarations for config/roomLayout.js — a bridge, see sessions.d.ts for
// why these exist rather than converting the config to TypeScript.
//
// Only what the data layer needs: the placement defaults Mongoose applied to
// the `room` subtree on read, which the Postgres user loader now applies.

export interface FloorPlacement {
  x: number;
  z: number;
  rotation: number;
}

export interface WallPlacement {
  along: number;
  height: number;
}

export const DEFAULT_PLACEMENT: {
  furniture1: FloorPlacement;
  chair: FloorPlacement;
  table: FloorPlacement;
  furniture2: FloorPlacement;
  wardrobe: FloorPlacement;
  poster: WallPlacement;
  window: WallPlacement;
  shelf: WallPlacement;
};
