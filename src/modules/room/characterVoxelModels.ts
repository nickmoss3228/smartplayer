import { CharacterSwatch } from "../../config/characterCatalog";
import { VoxelBox } from "./voxelModels";

// Hair/hat attachments for CharacterRig, in the same "small box assembly"
// idiom as voxelModels.ts's buildVoxelModel — positions are relative to the
// head group's local origin (the head box's own center), not world space.
export function buildHairModel(swatch: CharacterSwatch): VoxelBox[] {
  switch (swatch.shape) {
    case "hair-short":
      return [{ size: [17, 6, 17], position: [0, 6, 0], color: swatch.color }];

    case "hair-long":
      return [
        { size: [17, 6, 17], position: [0, 6, 0], color: swatch.color },
        { size: [17, 14, 5], position: [0, -3, 6.5], color: swatch.color },
      ];

    case "hair-spiky":
      return [
        { size: [6, 8, 6], position: [-5, 9, -5], color: swatch.color },
        { size: [6, 10, 6], position: [0, 10, 0], color: swatch.color },
        { size: [6, 8, 6], position: [5, 9, 5], color: swatch.color },
      ];

    default:
      return [];
  }
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
