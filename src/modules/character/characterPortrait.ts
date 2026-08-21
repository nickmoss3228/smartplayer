import { getCharacterItem } from "../../config/characterCatalog";
import { CharacterState } from "../../types/Character";

const SIZE = 64;
const DEFAULT_SHIRT_COLOR = "#4a7fd6";

// A small, deliberately simple 2D identity icon derived from the same
// customization data as the 3D CharacterRig — not a pixel-accurate portrait
// of the voxel model, just enough (skin tone + hair/outfit/hat colors) to be
// recognizable at Navbar/Dashboard size. Avoids standing up an off-screen
// Three.js render pipeline for a 32px image (see the character-creation
// plan's reasoning for this tradeoff).
export function drawCharacterPortrait(
  character: Pick<CharacterState, "skinTone" | "equipped">,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const outfitItem = character.equipped.outfit ? getCharacterItem(character.equipped.outfit) : null;
  const hairItem = character.equipped.hairstyle ? getCharacterItem(character.equipped.hairstyle) : null;
  const hatItem = character.equipped.hat ? getCharacterItem(character.equipped.hat) : null;

  // Background
  ctx.fillStyle = "#f4f4f5";
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
  ctx.fill();

  // Shoulders / outfit collar
  ctx.fillStyle = outfitItem?.swatch.color ?? DEFAULT_SHIRT_COLOR;
  ctx.beginPath();
  ctx.moveTo(SIZE * 0.15, SIZE);
  ctx.quadraticCurveTo(SIZE * 0.5, SIZE * 0.62, SIZE * 0.85, SIZE);
  ctx.closePath();
  ctx.fill();

  // Head
  ctx.fillStyle = character.skinTone;
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE * 0.44, SIZE * 0.28, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  if (hairItem) {
    ctx.fillStyle = hairItem.swatch.color;
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE * 0.34, SIZE * 0.3, Math.PI, Math.PI * 2);
    ctx.fill();
    if (hairItem.swatch.shape === "hair-long") {
      ctx.fillRect(SIZE * 0.18, SIZE * 0.34, SIZE * 0.1, SIZE * 0.28);
      ctx.fillRect(SIZE * 0.72, SIZE * 0.34, SIZE * 0.1, SIZE * 0.28);
    }
  }

  // Hat
  if (hatItem) {
    ctx.fillStyle = hatItem.swatch.color;
    ctx.beginPath();
    ctx.ellipse(SIZE / 2, SIZE * 0.24, SIZE * 0.3, SIZE * 0.16, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(SIZE * 0.22, SIZE * 0.16, SIZE * 0.56, SIZE * 0.1);
  }

  return canvas.toDataURL();
}
