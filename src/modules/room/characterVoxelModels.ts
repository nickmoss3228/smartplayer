import { CharacterSwatch } from "../../config/characterCatalog";
import { VoxelBox } from "./voxelModels";

// Hair/hat attachments for CharacterRig, in the same "small box assembly"
// idiom as voxelModels.ts's buildVoxelModel — positions are relative to the
// head group's local origin (the head box's own center), not world space.
// The rig faces local +Z (see CharacterRig's walk-turn comment), so the face
// is at z > 0 and the back of the head is at z < 0 — hair that hangs down
// the back belongs at NEGATIVE z, not positive (positive z sits in front of
// the face).
export function buildHairModel(swatch: CharacterSwatch): VoxelBox[] {
  switch (swatch.shape) {
    case "hair-short":
      return [{ size: [17, 6, 17], position: [0, 6, 0], color: swatch.color }];

    case "hair-long":
      return [
        { size: [17, 6, 17], position: [0, 6, 0], color: swatch.color },
        { size: [17, 14, 5], position: [0, -3, -6.5], color: swatch.color },
      ];

    case "hair-spiky":
      return [
        { size: [6, 8, 6], position: [-5, 9, -5], color: swatch.color },
        { size: [6, 10, 6], position: [0, 10, 0], color: swatch.color },
        { size: [6, 8, 6], position: [5, 9, 5], color: swatch.color },
      ];

    case "hair-ponytail":
      return [
        { size: [17, 6, 17], position: [0, 6, 0], color: swatch.color },
        { size: [5, 16, 5], position: [0, -6, -9], color: swatch.color },
      ];

    case "hair-buzz":
      return [{ size: [17, 2, 17], position: [0, 8, 0], color: swatch.color }];

    default:
      return [];
  }
}

const EYE_COLOR = "#232323";
const MOUTH_COLOR = "#8a4a4a";

// Always-on face features (not a purchasable/equippable item) — small boxes
// sitting just proud of the head's front face (z ~= +8, the head's half-depth)
// so they don't z-fight with the head box itself.
export function buildFaceModel(skinTone: string): VoxelBox[] {
  return [
    { size: [2.5, 2.5, 1], position: [-4, 2, 8.4], color: EYE_COLOR },
    { size: [2.5, 2.5, 1], position: [4, 2, 8.4], color: EYE_COLOR },
    { size: [2.5, 3, 1.5], position: [0, -1, 8.8], color: skinTone },
    { size: [5, 1.5, 1], position: [0, -5.5, 8.4], color: MOUTH_COLOR },
  ];
}

export function buildHatModel(swatch: CharacterSwatch): VoxelBox[] {
  switch (swatch.shape) {
    case "hat-cap":
      return [
        { size: [17, 6, 17], position: [0, 4, 0], color: swatch.color },
        { size: [8, 3, 6], position: [0, 2, 10], color: swatch.accent },
      ];

    case "hat-beanie":
      return [{ size: [18, 9, 18], position: [0, 5, 0], color: swatch.color }];

    case "hat-wizard":
      return [
        { size: [20, 4, 20], position: [0, 3, 0], color: swatch.color },
        { size: [10, 20, 10], position: [0, 18, 0], color: swatch.color },
        { size: [4, 4, 4], position: [0, 29, 0], color: swatch.accent },
      ];

    default:
      return [];
  }
}
