import { Swatch } from "../../config/shopCatalog";

// Every furniture/poster item is a small assembly of boxes ("voxel" style —
// like a tiny Minecraft model) rather than a flat drawn texture, so it reads
// as a real 3D object from any angle instead of a 2D cutout standing in a 3D
// room. Mirrors the old drawFurnitureSprite's structure exactly: one
// function, switching on swatch.shape, parameterized by swatch.color/accent
// — only the output changed from canvas draw calls to box descriptors.
export interface VoxelBox {
  size: [number, number, number]; // width (x), height (y), depth (z)
  position: [number, number, number]; // center, relative to the item's floor-contact point (y=0 = floor)
  color: string;
}

const WOOD = "#8b5e3c";

export function buildVoxelModel(swatch: Swatch): VoxelBox[] {
  switch (swatch.shape) {
    case "bed":
      return [
        { size: [70, 14, 90], position: [0, 7, 0], color: WOOD },
        { size: [64, 12, 80], position: [0, 20, 0], color: swatch.color },
        { size: [26, 8, 22], position: [-16, 30, -28], color: swatch.accent },
      ];

    case "canopybed":
      return [
        { size: [6, 90, 6], position: [-32, 45, -38], color: WOOD },
        { size: [6, 90, 6], position: [32, 45, -38], color: WOOD },
        { size: [6, 90, 6], position: [-32, 45, 38], color: WOOD },
        { size: [6, 90, 6], position: [32, 45, 38], color: WOOD },
        { size: [74, 4, 86], position: [0, 90, 0], color: swatch.color },
        { size: [70, 14, 90], position: [0, 7, 0], color: WOOD },
        { size: [64, 12, 80], position: [0, 20, 0], color: swatch.accent },
      ];

    case "bunkbed":
      return [
        { size: [6, 90, 6], position: [-28, 45, -38], color: WOOD },
        { size: [6, 90, 6], position: [28, 45, -38], color: WOOD },
        { size: [6, 90, 6], position: [-28, 45, 38], color: WOOD },
        { size: [6, 90, 6], position: [28, 45, 38], color: WOOD },
        { size: [62, 12, 80], position: [0, 16, 0], color: swatch.color },
        { size: [20, 6, 18], position: [-18, 25, -30], color: swatch.accent },
        { size: [62, 12, 80], position: [0, 55, 0], color: swatch.color },
        { size: [20, 6, 18], position: [-18, 64, -30], color: swatch.accent },
      ];

    case "plant":
      return [
        { size: [22, 16, 22], position: [0, 8, 0], color: swatch.accent },
        { size: [26, 20, 26], position: [0, 26, 0], color: swatch.color },
        { size: [18, 14, 18], position: [8, 43, 6], color: swatch.color },
        { size: [18, 14, 18], position: [-8, 43, -6], color: swatch.color },
      ];

    case "rug":
      return [
        { size: [96, 1, 66], position: [0, 0.5, 0], color: swatch.accent },
        { size: [88, 1.2, 58], position: [0, 1.1, 0], color: swatch.color },
      ];

    case "cactus":
      return [
        { size: [20, 14, 20], position: [0, 7, 0], color: swatch.accent },
        { size: [10, 32, 10], position: [0, 30, 0], color: swatch.color },
        { size: [8, 16, 8], position: [-11, 34, 0], color: swatch.color },
        { size: [8, 18, 8], position: [11, 38, 0], color: swatch.color },
      ];

    case "bookshelf": {
      const bookColors = ["#e76f51", "#2a9d8f", "#e9c46a", "#264653"];
      const books = bookColors.flatMap((c, i) => [
        { size: [8, 16, 8] as [number, number, number], position: [-18 + i * 12, 46, 6] as [number, number, number], color: c },
        { size: [8, 16, 8] as [number, number, number], position: [-18 + i * 12, 20, 6] as [number, number, number], color: c },
      ]);
      return [{ size: [56, 64, 10], position: [0, 32, 0], color: swatch.accent }, ...books];
    }

    case "lamp":
      return [
        { size: [20, 4, 20], position: [0, 2, 0], color: swatch.accent },
        { size: [4, 50, 4], position: [0, 27, 0], color: swatch.accent },
        { size: [36, 16, 36], position: [0, 58, 0], color: swatch.color },
      ];

    case "wardrobe":
      return [
        { size: [70, 140, 40], position: [0, 70, 0], color: swatch.color },
        { size: [2, 120, 4], position: [0, 70, 21], color: swatch.accent },
        { size: [3, 3, 3], position: [-6, 70, 22], color: swatch.accent },
        { size: [3, 3, 3], position: [6, 70, 22], color: swatch.accent },
      ];

    case "table":
      return [
        { size: [64, 8, 40], position: [0, 44, 0], color: swatch.color },
        { size: [6, 40, 6], position: [-26, 20, -16], color: swatch.accent },
        { size: [6, 40, 6], position: [26, 20, -16], color: swatch.accent },
        { size: [6, 40, 6], position: [-26, 20, 16], color: swatch.accent },
        { size: [6, 40, 6], position: [26, 20, 16], color: swatch.accent },
      ];

    case "shelf":
      return [
        { size: [100, 8, 16], position: [0, 0, 0], color: swatch.color },
        { size: [10, 16, 10], position: [-25, 16, 0], color: swatch.accent },
        { size: [14, 14, 14], position: [20, 15, 0], color: swatch.accent },
      ];

    case "poster-stars":
      return [
        { size: [64, 50, 4], position: [0, 0, 0], color: swatch.color },
        { size: [5, 5, 5], position: [-16, 10, 3], color: swatch.accent },
        { size: [5, 5, 5], position: [10, 14, 3], color: swatch.accent },
        { size: [5, 5, 5], position: [0, -6, 3], color: swatch.accent },
        { size: [5, 5, 5], position: [18, -8, 3], color: swatch.accent },
      ];

    case "poster-map":
      return [
        { size: [64, 50, 4], position: [0, 0, 0], color: swatch.color },
        { size: [16, 10, 2], position: [-14, 8, 3], color: swatch.accent },
        { size: [18, 14, 2], position: [6, 2, 3], color: swatch.accent },
        { size: [10, 10, 2], position: [-8, -10, 3], color: swatch.accent },
      ];

    case "poster-music":
      return [
        { size: [64, 50, 4], position: [0, 0, 0], color: swatch.color },
        { size: [3, 22, 2], position: [-16, 4, 3], color: swatch.accent },
        { size: [3, 26, 2], position: [-2, 6, 3], color: swatch.accent },
        { size: [6, 5, 3], position: [-18, -8, 3], color: swatch.accent },
        { size: [6, 5, 3], position: [-4, -8, 3], color: swatch.accent },
      ];

    case "poster-abstract":
      return [
        { size: [64, 50, 4], position: [0, 0, 0], color: swatch.color },
        { size: [16, 16, 3], position: [-14, 8, 3], color: swatch.accent },
        { size: [14, 18, 3], position: [10, -2, 3], color: swatch.accent },
      ];

    default:
      // Wallpaper/flooring shapes never reach here — those stay canvas
      // textures on the room shell, drawn by textures.ts directly.
      return [];
  }
}
