import { CharacterLook } from "./look";

const SIZE = 64;

// The stand-in portrait, shown for the moment it takes portrait.ts to render
// the real one on a device that has never seen this look. A flat front view of
// the same boxes the 3D figure is made of — skin, hair, shirt — drawn in 2D so
// it needs nothing loaded. Once the 3D picture exists it is cached, and this
// is not drawn again for that look.
export function drawCharacterPortrait(look: CharacterLook): string {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const u = SIZE / 16;
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x * u, y * u, w * u, h * u);
  };

  ctx.fillStyle = "#d8ebf6";
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
  ctx.fill();

  rect(3, 12, 10, 4, look.topColor);
  rect(5, 4, 6, 7, look.skin);
  rect(4.5, 3, 7, 2.5, look.hairColor);
  if (look.hair === "long" || look.hair === "bob") {
    rect(4.5, 5, 1, 5, look.hairColor);
    rect(10.5, 5, 1, 5, look.hairColor);
  }
  if (look.glasses !== "none") rect(5.5, 6.5, 5, 1.4, look.glasses === "shades" ? "#17191d" : "#2b2b2b");
  else {
    rect(6.3, 6.8, 0.9, 0.9, "#2b2b2b");
    rect(8.8, 6.8, 0.9, 0.9, "#2b2b2b");
  }
  if (look.hat !== "none") rect(4.3, 2, 7.4, 2, look.hatColor);

  return canvas.toDataURL();
}
