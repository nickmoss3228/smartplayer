// modules/city/buildingSprite.ts
//
// One tile's visual: the zoned-ground colour underneath (the "colour the
// land green/orange/red" requirement) plus, for roads, neighbour-aware lane
// markings, and for everything else a small silhouette distinct per
// building id — a house isn't just a green box, it's walls + a roof; a
// park is trees; a data center has blinking status lights — all still in
// the translucent "glass" Frutiger Aero material established in the
// milestone-1 scaffold.

import { Container, Graphics } from "pixi.js";
import { BuildingDef } from "../../config/cityCatalog";
import { TILE_SIZE } from "./constants";

const TILE_PAD = 2;

export interface RoadConnections {
  n: boolean;
  s: boolean;
  e: boolean;
  w: boolean;
}

const NO_CONNECTIONS: RoadConnections = { n: false, s: false, e: false, w: false };

export function drawTileVisual(
  building: BuildingDef,
  dimmed = false,
  roadConnections: RoadConnections = NO_CONNECTIONS,
): Container {
  const container = new Container();
  const groundSize = TILE_SIZE - TILE_PAD * 2;
  const isRoad = building.category === "road";

  const ground = new Graphics();
  ground
    .roundRect(TILE_PAD, TILE_PAD, groundSize, groundSize, isRoad ? 2 : 4)
    .fill({ color: building.zoneColor, alpha: isRoad ? 0.9 : 0.4 });
  container.addChild(ground);

  if (isRoad) {
    container.addChild(drawRoadMarkings(roadConnections));
    return container;
  }

  container.addChild(drawBuildingArt(building));

  // Residents leaving reads as the house itself fading and greying out, not
  // a UI number — a grey wash over the whole footprint.
  if (dimmed) {
    const overlay = new Graphics();
    overlay.roundRect(8, 8, TILE_SIZE - 16, TILE_SIZE - 16, 7).fill({ color: 0x556b5c, alpha: 0.45 });
    container.addChild(overlay);
  }

  return container;
}

// ── Roads ───────────────────────────────────────────────────────────────
// One lane-marking segment per connected side, drawn from the tile centre
// out to (short of) the edge on that side only. Straight roads, corners,
// T-junctions, crossroads and dead-end stubs all fall out of the same four
// `if`s — no separate case for each shape.

function drawRoadMarkings(c: RoadConnections): Graphics {
  const g = new Graphics();
  const cx = TILE_SIZE / 2;
  const cy = TILE_SIZE / 2;
  const laneW = 4;
  const inset = TILE_PAD + 3;
  const color = 0xffffff;
  const alpha = 0.55;

  if (c.n) g.rect(cx - laneW / 2, inset, laneW, cy - inset).fill({ color, alpha });
  if (c.s) g.rect(cx - laneW / 2, cy, laneW, TILE_SIZE - inset - cy).fill({ color, alpha });
  if (c.w) g.rect(inset, cy - laneW / 2, cx - inset, laneW).fill({ color, alpha });
  if (c.e) g.rect(cx, cy - laneW / 2, TILE_SIZE - inset - cx, laneW).fill({ color, alpha });

  return g;
}

// ── Buildings ───────────────────────────────────────────────────────────

function drawBuildingArt(building: BuildingDef): Container {
  switch (building.id) {
    case "house":
      return drawHouse(building.zoneColor);
    case "park":
      return drawPark();
    case "parking":
      return drawParkingLot();
    case "restaurant":
      return drawRestaurant(building.zoneColor);
    case "office":
      return drawOffice(building.zoneColor);
    case "factory":
      return drawFactory(building.zoneColor);
    case "datacenter":
      return drawDataCenter(building.zoneColor);
    case "police":
      return drawServiceBuilding(building.zoneColor, "badge");
    case "firestation":
      return drawServiceBuilding(building.zoneColor, "ladder");
    case "hospital":
      return drawServiceBuilding(building.zoneColor, "cross");
    default:
      return glassBlockContainer(8, 8, TILE_SIZE - 16, TILE_SIZE - 16, building.zoneColor, 7);
  }
}

/** Translucent tinted panel + glassy highlight band + soft outline — the
 *  shared "material" every building is built from, regardless of shape. */
function glassBlock(g: Graphics, x: number, y: number, w: number, h: number, tint: number, radius = 5) {
  g.roundRect(x, y, w, h, radius).fill({ color: tint, alpha: 0.65 });
  g.roundRect(x + 2, y + 2, w - 4, Math.min(h * 0.4, 9), Math.max(radius - 2, 2)).fill({
    color: 0xffffff,
    alpha: 0.32,
  });
  g.setStrokeStyle({ width: 1.3, color: 0xffffff, alpha: 0.85 });
  g.roundRect(x, y, w, h, radius).stroke();
}

function glassBlockContainer(x: number, y: number, w: number, h: number, tint: number, radius = 5): Container {
  const c = new Container();
  const g = new Graphics();
  glassBlock(g, x, y, w, h, tint, radius);
  c.addChild(g);
  return c;
}

/** Darken (negative amount) or lighten (positive) a hex colour. */
function shade(color: number, amount: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const adjust = (v: number) => {
    const next = amount < 0 ? v * (1 + amount) : v + (255 - v) * amount;
    return Math.max(0, Math.min(255, Math.round(next)));
  };
  return (adjust(r) << 16) | (adjust(g) << 8) | adjust(b);
}

function drawHouse(tint: number): Container {
  const c = new Container();
  const walls = new Graphics();
  glassBlock(walls, 10, 22, 28, 20, tint, 4);
  c.addChild(walls);

  const roof = new Graphics();
  roof
    .moveTo(6, 22)
    .lineTo(24, 8)
    .lineTo(42, 22)
    .closePath()
    .fill({ color: shade(tint, -0.25), alpha: 0.85 });
  roof.setStrokeStyle({ width: 1.2, color: 0xffffff, alpha: 0.6 });
  roof.moveTo(6, 22).lineTo(24, 8).lineTo(42, 22).stroke();
  c.addChild(roof);

  const details = new Graphics();
  details.roundRect(20, 32, 8, 10, 1).fill({ color: 0xffffff, alpha: 0.5 });
  details.roundRect(13, 27, 6, 6, 1).fill({ color: 0xffffff, alpha: 0.55 });
  c.addChild(details);
  return c;
}

function drawPark(): Container {
  const c = new Container();
  const g = new Graphics();
  g.rect(22, 30, 4, 10).fill({ color: 0x8a6642, alpha: 0.9 });
  g.circle(24, 23, 12).fill({ color: 0x4f9e58, alpha: 0.78 });
  g.setStrokeStyle({ width: 1.2, color: 0xffffff, alpha: 0.5 });
  g.circle(24, 23, 12).stroke();
  g.rect(34, 34, 3, 7).fill({ color: 0x8a6642, alpha: 0.9 });
  g.circle(35.5, 30, 7).fill({ color: 0x6cb56f, alpha: 0.78 });
  c.addChild(g);
  return c;
}

function drawParkingLot(): Container {
  const c = new Container();
  const g = new Graphics();
  g.roundRect(8, 8, 32, 32, 4).fill({ color: 0x8a97a3, alpha: 0.55 });
  g.setStrokeStyle({ width: 2, color: 0xffffff, alpha: 0.65 });
  for (let i = 0; i < 3; i++) {
    const x = 14 + i * 8;
    g.moveTo(x, 12).lineTo(x, 36);
  }
  g.stroke();
  c.addChild(g);
  return c;
}

function drawRestaurant(tint: number): Container {
  const c = new Container();
  const body = new Graphics();
  glassBlock(body, 10, 18, 28, 22, tint, 5);
  c.addChild(body);
  const awning = new Graphics();
  awning.roundRect(8, 16, 32, 6, 2).fill({ color: 0xffffff, alpha: 0.6 });
  awning.roundRect(21, 30, 6, 10, 1).fill({ color: 0xffffff, alpha: 0.4 });
  c.addChild(awning);
  return c;
}

function drawOffice(tint: number): Container {
  const c = new Container();
  const tower = new Graphics();
  glassBlock(tower, 14, 8, 20, 32, tint, 4);
  c.addChild(tower);
  const windows = new Graphics();
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 2; col++) {
      windows.roundRect(17 + col * 8, 12 + row * 7, 5, 4, 1).fill({ color: 0xffffff, alpha: 0.45 });
    }
  }
  c.addChild(windows);
  return c;
}

function drawFactory(tint: number): Container {
  const c = new Container();
  const body = new Graphics();
  glassBlock(body, 8, 20, 32, 20, tint, 4);
  c.addChild(body);
  const chimney = new Graphics();
  chimney.rect(29, 6, 6, 16).fill({ color: shade(tint, -0.3), alpha: 0.9 });
  chimney.circle(32, 4, 3).fill({ color: 0xffffff, alpha: 0.32 });
  chimney.circle(36, 0.5, 2.3).fill({ color: 0xffffff, alpha: 0.22 });
  c.addChild(chimney);
  return c;
}

function drawDataCenter(tint: number): Container {
  const c = new Container();
  const body = new Graphics();
  glassBlock(body, 8, 14, 32, 26, tint, 4);
  c.addChild(body);
  const lights = new Graphics();
  const colors = [0x6cf28a, 0xf2c14e, 0x6cf28a, 0x6cf28a, 0xf25c5c, 0x6cf28a];
  let i = 0;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      lights.circle(14 + col * 8, 20 + row * 8, 2).fill({ color: colors[i % colors.length], alpha: 0.9 });
      i++;
    }
  }
  c.addChild(lights);
  return c;
}

function drawServiceBuilding(tint: number, icon: "badge" | "ladder" | "cross"): Container {
  const c = new Container();
  const body = new Graphics();
  glassBlock(body, 9, 16, 30, 24, tint, 5);
  c.addChild(body);

  const mark = new Graphics();
  if (icon === "cross") {
    mark.roundRect(21, 20, 6, 16, 1).fill({ color: 0xffffff, alpha: 0.85 });
    mark.roundRect(15, 26, 18, 6, 1).fill({ color: 0xffffff, alpha: 0.85 });
  } else if (icon === "badge") {
    mark.circle(24, 28, 7).fill({ color: 0xffffff, alpha: 0.28 });
    mark.setStrokeStyle({ width: 1.5, color: 0xffffff, alpha: 0.9 });
    mark.circle(24, 28, 7).stroke();
    mark.circle(24, 28, 2.5).fill({ color: 0xffffff, alpha: 0.9 });
  } else {
    mark.setStrokeStyle({ width: 1.6, color: 0xffffff, alpha: 0.85 });
    mark.moveTo(18, 20).lineTo(18, 36);
    mark.moveTo(30, 20).lineTo(30, 36);
    for (let y = 22; y < 36; y += 4) {
      mark.moveTo(18, y).lineTo(30, y);
    }
    mark.stroke();
  }
  c.addChild(mark);
  return c;
}
