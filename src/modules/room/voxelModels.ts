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

export function buildVoxelModel(swatch: Swatch): VoxelBox[] {
  switch (swatch.shape) {
    case "desk-basic":
      return [
        { size: [90, 6, 44], position: [0, 46, 0], color: swatch.color },
        { size: [6, 46, 6], position: [-40, 23, -18], color: swatch.accent },
        { size: [6, 46, 6], position: [40, 23, -18], color: swatch.accent },
        { size: [6, 46, 6], position: [-40, 23, 18], color: swatch.accent },
        { size: [6, 46, 6], position: [40, 23, 18], color: swatch.accent },
        // monitor
        { size: [32, 20, 3], position: [-10, 62, -14], color: "#1a1a1a" },
        { size: [10, 6, 4], position: [-10, 51, -14], color: "#333333" },
        // keyboard + mouse
        { size: [22, 2, 8], position: [-10, 50, 8], color: "#333333" },
        { size: [6, 2, 8], position: [16, 50, 8], color: "#222222" },
      ];

    case "desk-office":
      return [
        { size: [96, 6, 46], position: [0, 48, 0], color: swatch.color },
        { size: [20, 48, 42], position: [32, 24, 0], color: swatch.accent }, // drawer pedestal
        { size: [6, 48, 6], position: [-42, 24, -18], color: swatch.accent },
        { size: [6, 48, 6], position: [-42, 24, 18], color: swatch.accent },
        // monitor
        { size: [38, 24, 3], position: [-8, 65, -16], color: "#1a1a1a" },
        { size: [10, 8, 4], position: [-8, 53, -16], color: "#333333" },
        // keyboard + mouse + pen cup
        { size: [24, 2, 9], position: [-8, 52, 10], color: "#333333" },
        { size: [7, 2, 9], position: [20, 52, 10], color: "#222222" },
        { size: [10, 12, 8], position: [24, 58, -10], color: "#e9c46a" },
      ];

    case "desk-executive":
      return [
        { size: [104, 6, 50], position: [0, 50, 0], color: swatch.color },
        { size: [24, 50, 44], position: [36, 25, 0], color: swatch.accent }, // drawer pedestal
        { size: [6, 50, 6], position: [-46, 25, -20], color: swatch.accent },
        { size: [6, 50, 6], position: [-46, 25, 20], color: swatch.accent },
        // dual monitors
        { size: [30, 20, 3], position: [-26, 68, -18], color: "#7d3232" },
        { size: [8, 6, 4], position: [-26, 55, -18], color: "#eae4e4" },
        { size: [30, 20, 3], position: [8, 68, -18], color: "#1a1a1a" },
        { size: [8, 6, 4], position: [8, 55, -18], color: "#333333" },
        // keyboard + mouse
        { size: [26, 2, 9], position: [-9, 54, 12], color: "#333333" },
        { size: [7, 2, 9], position: [20, 54, 12], color: "#222222" },
        // desk lamp
        { size: [12, 4, 12], position: [-42, 53, 14], color: "#555555" },
        { size: [3, 30, 3], position: [-42, 68, 14], color: "#555555" },
        { size: [16, 8, 16], position: [-42, 84, 8], color: "#f4d35e" },
      ];

    case "chair-basic":
      return [
        { size: [30, 4, 30], position: [0, 30, 0], color: swatch.color },
        { size: [4, 30, 4], position: [-12, 15, -12], color: swatch.accent },
        { size: [4, 30, 4], position: [12, 15, -12], color: swatch.accent },
        { size: [4, 30, 4], position: [-12, 15, 12], color: swatch.accent },
        { size: [4, 30, 4], position: [12, 15, 12], color: swatch.accent },
      ];

    case "chair-office":
      return [
        { size: [34, 6, 34], position: [0, 34, 0], color: swatch.color }, // seat
        { size: [34, 34, 6], position: [0, 54, -15], color: swatch.color }, // backrest
        { size: [6, 28, 6], position: [0, 17, 0], color: swatch.accent }, // post
        { size: [42, 3, 42], position: [0, 3, 0], color: swatch.accent }, // base
      ];

    case "chair-ergonomic":
      return [
        { size: [36, 6, 36], position: [0, 36, 0], color: swatch.color }, // seat
        { size: [36, 44, 6], position: [0, 60, -16], color: swatch.color }, // backrest
        { size: [10, 8, 8], position: [0, 84, -16], color: swatch.accent }, // headrest
        { size: [4, 16, 20], position: [-19, 46, 0], color: swatch.accent }, // left armrest
        { size: [4, 16, 20], position: [19, 46, 0], color: swatch.accent }, // right armrest
        { size: [6, 30, 6], position: [0, 18, 0], color: "#333333" }, // post
        { size: [44, 3, 44], position: [0, 3, 0], color: "#333333" }, // base
      ];

    case "window-small":
      return [
        { size: [50, 50, 4], position: [0, 0, 0], color: "#e8ddc8" }, // frame backing
        { size: [42, 42, 3], position: [0, 0, 1], color: swatch.color }, // sky pane
        { size: [3, 42, 5], position: [0, 0, 2], color: swatch.accent }, // vertical mullion
        { size: [42, 3, 5], position: [0, 0, 2], color: swatch.accent }, // horizontal mullion
      ];

    case "window-large":
      return [
        { size: [80, 60, 4], position: [0, 0, 0], color: "#e8ddc8" },
        { size: [72, 52, 3], position: [0, 0, 1], color: swatch.color },
        { size: [3, 52, 5], position: [-18, 0, 2], color: swatch.accent },
        { size: [3, 52, 5], position: [18, 0, 2], color: swatch.accent },
        { size: [72, 3, 5], position: [0, 0, 2], color: swatch.accent },
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
      // Reskinned into a filing cabinet: shorter than the old bedroom
      // wardrobe, with 3 drawer seams + handles instead of a wardrobe door.
      return [
        { size: [50, 100, 40], position: [0, 50, 0], color: swatch.color },
        { size: [46, 2, 2], position: [0, 68, 21], color: swatch.accent },
        { size: [46, 2, 2], position: [0, 50, 21], color: swatch.accent },
        { size: [46, 2, 2], position: [0, 32, 21], color: swatch.accent },
        { size: [12, 3, 3], position: [0, 78, 22], color: swatch.accent },
        { size: [12, 3, 3], position: [0, 58, 22], color: swatch.accent },
        { size: [12, 3, 3], position: [0, 40, 22], color: swatch.accent },
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

// Achievement trophies aren't shop items (nothing to buy — they appear
// automatically once earned), so this takes a single tier color rather than
// a full Swatch. Reused for every earned tier, recolored via TIER_COLORS.
export function buildTrophyModel(color: string): VoxelBox[] {
  return [
    { size: [14, 4, 14], position: [0, 2, 0], color: "#5c3d26" }, // base
    { size: [4, 14, 4], position: [0, 11, 0], color }, // stem
    { size: [16, 14, 16], position: [0, 25, 0], color }, // cup
    { size: [4, 6, 4], position: [-12, 20, 0], color }, // left handle
    { size: [4, 6, 4], position: [12, 20, 0], color }, // right handle
  ];
}
