// modules/school/exterior.ts
//
// What each outside style LOOKS like. The catalog (config/schoolCatalog.ts)
// only knows ids, slots and prices — the server charges for a red-brick facade
// but has no opinion about what colour a brick is. Everything visual is here:
// the colours and textures Building.tsx draws with, and a CSS swatch for the
// shop so a style can be seen before it is bought.

import * as THREE from "three";
import { boardsTexture, brickTexture, gravelTexture, stoneTexture } from "./textures";

export interface FacadeLook {
  /** Null follows each room's own wallpaper, which is the plain plaster the
   *  school has always had. */
  color: string | null;
  map: (() => THREE.Texture) | null;
  /** One flat colour standing for the facade, for surfaces too small or too
   *  oddly shaped to texture. */
  solid: string | null;
  swatch: string;
}

export const FACADES: Record<string, FacadeLook> = {
  plaster: { color: null, map: null, solid: null, swatch: "#e9e6df" },
  "white-render": { color: "#f3f1ec", map: null, solid: "#f3f1ec", swatch: "#f3f1ec" },
  terracotta: { color: "#c9795a", map: null, solid: "#c9795a", swatch: "#c9795a" },
  "red-brick": {
    color: "#ffffff",
    map: () => brickTexture("red", "#a8513c", "#d8cbb8", "#94452f"),
    solid: "#a8513c",
    swatch: "repeating-linear-gradient(0deg, #a8513c 0 7px, #d8cbb8 7px 9px)",
  },
  "yellow-brick": {
    color: "#ffffff",
    map: () => brickTexture("yellow", "#d9b56a", "#f0e5c8", "#c9a35a"),
    solid: "#d9b56a",
    swatch: "repeating-linear-gradient(0deg, #d9b56a 0 7px, #f0e5c8 7px 9px)",
  },
  timber: {
    color: "#ffffff",
    map: () => boardsTexture("timber", "#9c7045", "#6f4d2d"),
    solid: "#9c7045",
    swatch: "repeating-linear-gradient(90deg, #9c7045 0 8px, #6f4d2d 8px 10px)",
  },
  stone: {
    color: "#ffffff",
    map: () => stoneTexture("stone", "#b3aea3", "#8d887e", "#a39d91"),
    solid: "#b3aea3",
    swatch: "repeating-linear-gradient(0deg, #b3aea3 0 12px, #8d887e 12px 14px)",
  },
};

export type RoofFinish = "plain" | "gravel" | "green" | "solar";

export type RoofLook =
  | { kind: "flat"; deck: string; edge: string; finish: RoofFinish; map: (() => THREE.Texture) | null; swatch: string }
  | { kind: "pitched"; slope: string; ridge: string; swatch: string };

export const ROOFS: Record<string, RoofLook> = {
  flat: { kind: "flat", deck: "#6f7683", edge: "#575d68", finish: "plain", map: null, swatch: "#6f7683" },
  gravel: {
    kind: "flat",
    deck: "#ffffff",
    edge: "#6f7683",
    finish: "gravel",
    map: gravelTexture,
    swatch: "radial-gradient(#7c786f 1px, #a19d95 1px) 0 0 / 5px 5px",
  },
  green: { kind: "flat", deck: "#ffffff", edge: "#8f8a80", finish: "green", map: null, swatch: "#6f9a58" },
  solar: {
    kind: "flat",
    deck: "#6f7683",
    edge: "#575d68",
    finish: "solar",
    map: null,
    swatch: "repeating-linear-gradient(0deg, #2b3a5c 0 8px, #c9ced6 8px 10px)",
  },
  "red-tile": { kind: "pitched", slope: "#b5543c", ridge: "#8e3f2c", swatch: "linear-gradient(135deg, #c9644a, #9a4431)" },
  slate: { kind: "pitched", slope: "#5d6673", ridge: "#474e59", swatch: "linear-gradient(135deg, #6c7584, #4c5461)" },
};

export interface TrimLook {
  /** Window frames. */
  frame: string;
  /** Front-door leaves. */
  door: string;
  swatch: string;
}

export const TRIMS: Record<string, TrimLook> = {
  white: { frame: "#f1efe8", door: "#8a5a34", swatch: "#f1efe8" },
  navy: { frame: "#2e3a58", door: "#2e3a58", swatch: "#2e3a58" },
  forest: { frame: "#2f5a3e", door: "#2f5a3e", swatch: "#2f5a3e" },
  oxblood: { frame: "#6e2a2e", door: "#6e2a2e", swatch: "#6e2a2e" },
};

/** The three looks a building is wearing, with fallbacks for any id this
 *  client does not know — an older bundle talking to a newer server. */
export interface OutsideLook {
  facade: FacadeLook;
  roof: RoofLook;
  trim: TrimLook;
}

export const outsideLook = (ids?: { facadeId?: string; roofId?: string; trimId?: string } | null): OutsideLook => ({
  facade: FACADES[ids?.facadeId ?? ""] ?? FACADES.plaster,
  roof: ROOFS[ids?.roofId ?? ""] ?? ROOFS.flat,
  trim: TRIMS[ids?.trimId ?? ""] ?? TRIMS.white,
});

/** The swatch for any style, by id. */
export const swatchFor = (id: string): string =>
  FACADES[id]?.swatch ?? ROOFS[id]?.swatch ?? TRIMS[id]?.swatch ?? "#cccccc";
