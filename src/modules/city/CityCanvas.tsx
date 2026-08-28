// modules/city/CityCanvas.tsx
//
// PixiJS scene for the city builder. The Application/Viewport are created
// once on mount (see the comment on sceneRef below for why); everything that
// depends on React state — the placed tiles, the hover ghost, the click
// handler — is kept in refs and re-synced imperatively so prop updates never
// tear down and rebuild the WebGL context.

import { useEffect, useRef } from "react";
import { Application, Container, FederatedPointerEvent, Graphics } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { drawTerrain } from "./terrain";
import { drawGrid } from "./grid";
import { drawTileVisual } from "./buildingSprite";
import { TILE_SIZE, WORLD_SIZE_PX, tileToWorld, worldToTile, isInsideGrid } from "./constants";
import { checkPlacement, tileKey, TileMap } from "./placement";
import { getBuilding, ROAD_ID } from "../../config/cityCatalog";
import { Car, Tile, drawCar, pickNextRoadTile } from "./traffic";

interface CityCanvasProps {
  className?: string;
  tiles: TileMap;
  connectedRoads: Set<string>;
  selectedBuildingId: string | null;
  bulldozeMode: boolean;
  onTileClick: (x: number, y: number) => void;
  /** Read once, at mount — a city's territory doesn't change after founding. */
  territoryId?: string;
  /** 0-100. Below the "residents leaving" threshold, houses render dimmed. */
  happiness?: number;
}

const UNHAPPY_THRESHOLD = 50;

interface Scene {
  app: Application;
  viewport: Viewport;
  tilesLayer: Container;
  tileSprites: Map<string, Container>;
  hoverGraphics: Graphics;
  lastDimmed: boolean;
  trafficLayer: Container;
  cars: Car[];
  roadTiles: Set<string>;
  /** Tile under the cursor as of the last pointermove — re-read whenever
   *  `tiles`/selection change so a click doesn't leave a stale hover colour
   *  behind (e.g. bulldozing a tile used to leave it highlighted "valid"
   *  until the mouse moved again). */
  lastPointerTile: { x: number; y: number } | null;
}

export function CityCanvas({
  className,
  tiles,
  connectedRoads,
  selectedBuildingId,
  bulldozeMode,
  onTileClick,
  territoryId,
  happiness = 100,
}: CityCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);

  // Latest props, read from inside Pixi event handlers registered once on
  // mount — without this every handler would close over the tiles map from
  // the very first render.
  const latest = useRef({ tiles, connectedRoads, selectedBuildingId, bulldozeMode, onTileClick });
  latest.current = { tiles, connectedRoads, selectedBuildingId, bulldozeMode, onTileClick };

  // Mount once: build the Application, the viewport, and the static layers.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let destroyed = false;
    let cleanupResize: (() => void) | undefined;
    const appRef: { current: Application | null } = { current: null };
    const app = new Application();

    (async () => {
      await app.init({
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        resizeTo: container,
      });
      if (destroyed) {
        app.destroy(true, { children: true });
        return;
      }
      container.appendChild(app.canvas);

      const viewport = new Viewport({
        screenWidth: container.clientWidth,
        screenHeight: container.clientHeight,
        worldWidth: WORLD_SIZE_PX,
        worldHeight: WORLD_SIZE_PX,
        events: app.renderer.events,
      });
      app.stage.addChild(viewport);

      viewport
        .drag()
        .pinch()
        .wheel({ smooth: 3 })
        .decelerate()
        .clampZoom({ minScale: 0.4, maxScale: 2.5 })
        .clamp({ direction: "all", underflow: "center" });

      viewport.addChild(drawTerrain(territoryId));
      viewport.addChild(drawGrid());

      const tilesLayer = new Container();
      viewport.addChild(tilesLayer);

      const trafficLayer = new Container();
      viewport.addChild(trafficLayer);

      const hoverGraphics = new Graphics();
      viewport.addChild(hoverGraphics);

      viewport.moveCenter(WORLD_SIZE_PX / 2, WORLD_SIZE_PX / 2);
      viewport.setZoom(1, true);

      const scene: Scene = {
        app,
        viewport,
        tilesLayer,
        tileSprites: new Map(),
        hoverGraphics,
        lastPointerTile: null,
        lastDimmed: happiness < UNHAPPY_THRESHOLD,
        trafficLayer,
        cars: [],
        roadTiles: new Set(),
      };
      sceneRef.current = scene;
      syncTiles(scene, latest.current.tiles, scene.lastDimmed);
      syncTraffic(scene, latest.current.tiles);

      app.ticker.add((ticker) => updateTraffic(scene, ticker.deltaMS));

      const tileUnderPointer = (event: FederatedPointerEvent): { x: number; y: number } => {
        const world = viewport.toWorld(event.global);
        return worldToTile(world.x, world.y);
      };

      viewport.on("pointermove", (event: FederatedPointerEvent) => {
        const { x, y } = tileUnderPointer(event);
        scene.lastPointerTile = { x, y };
        drawHover(scene, x, y, latest.current);
      });
      viewport.on("pointerleave", () => {
        scene.lastPointerTile = null;
        scene.hoverGraphics.clear();
      });
      viewport.on("clicked", (e: { world: { x: number; y: number } }) => {
        const { x, y } = worldToTile(e.world.x, e.world.y);
        if (isInsideGrid(x, y)) latest.current.onTileClick(x, y);
      });

      const handleResize = () => viewport.resize(container.clientWidth, container.clientHeight);
      window.addEventListener("resize", handleResize);
      cleanupResize = () => window.removeEventListener("resize", handleResize);
      appRef.current = app;
    })();

    return () => {
      destroyed = true;
      cleanupResize?.();
      sceneRef.current = null;
      if (appRef.current) appRef.current.destroy(true, { children: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sync the tile visuals whenever the placed tiles change, and refresh
  // the hover ghost against the tile the cursor is already sitting on —
  // otherwise a click that changes validity (placing/bulldozing) leaves the
  // old colour showing until the next pointermove.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    syncTiles(scene, tiles, happiness < UNHAPPY_THRESHOLD);
    syncTraffic(scene, tiles);
    if (scene.lastPointerTile) {
      drawHover(scene, scene.lastPointerTile.x, scene.lastPointerTile.y, latest.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles, selectedBuildingId, bulldozeMode, happiness]);

  return <div ref={containerRef} className={className} style={{ touchAction: "none" }} />;
}

/** Diff `tiles` against what's currently on screen: add new sprites, drop
 *  removed ones. Cheap at this grid size and avoids the WebGL churn of a
 *  full clear-and-rebuild on every placement — except when the dimmed state
 *  itself flips (happiness crossed the unhappy threshold), which changes how
 *  every existing residential sprite should look, so that case forces a full
 *  rebuild rather than trying to diff tint state per sprite.
 *
 *  Road sprites are always rebuilt regardless of the diff, because a road's
 *  lane markings depend on ITS NEIGHBOURS: placing or bulldozing one road
 *  tile changes what an already-on-screen adjacent road tile should look
 *  like (a straight segment becoming a corner, a corner becoming a T, etc.),
 *  and the neighbour's own sprite was never touched by this update without
 *  that. Road counts stay small enough that redrawing all of them on every
 *  tile change is cheap. */
function syncTiles(scene: Scene, tiles: TileMap, dimmed: boolean) {
  const { tilesLayer, tileSprites } = scene;

  if (dimmed !== scene.lastDimmed) {
    for (const sprite of tileSprites.values()) sprite.destroy({ children: true });
    tileSprites.clear();
    tilesLayer.removeChildren();
    scene.lastDimmed = dimmed;
  }

  for (const [key, sprite] of tileSprites) {
    if (!tiles.has(key)) {
      tilesLayer.removeChild(sprite);
      sprite.destroy({ children: true });
      tileSprites.delete(key);
    }
  }

  for (const [key, tile] of tiles) {
    if (tile.buildingId === ROAD_ID && tileSprites.has(key)) {
      const existing = tileSprites.get(key)!;
      tilesLayer.removeChild(existing);
      existing.destroy({ children: true });
      tileSprites.delete(key);
    }
  }

  for (const [key, tile] of tiles) {
    if (tileSprites.has(key)) continue;
    const building = getBuilding(tile.buildingId);
    if (!building) continue;
    const [xs, ys] = key.split("_");
    const x = Number(xs);
    const y = Number(ys);
    // tileToWorld returns the tile's top-left corner (same convention drawGrid
    // and drawHover use) and drawTileVisual draws in that same local frame
    // (0,0)-(TILE_SIZE,TILE_SIZE) — so this needs no centering offset. An
    // earlier version subtracted TILE_SIZE/2 here, which rendered every
    // building a half-tile off from the ground colour and grid cell under it.
    const world = tileToWorld(x, y);
    const sprite =
      building.id === ROAD_ID
        ? drawTileVisual(building, false, {
            n: tiles.get(tileKey(x, y - 1))?.buildingId === ROAD_ID,
            s: tiles.get(tileKey(x, y + 1))?.buildingId === ROAD_ID,
            e: tiles.get(tileKey(x + 1, y))?.buildingId === ROAD_ID,
            w: tiles.get(tileKey(x - 1, y))?.buildingId === ROAD_ID,
          })
        : drawTileVisual(building, dimmed && building.category === "residential");
    sprite.position.set(world.x, world.y);
    tilesLayer.addChild(sprite);
    tileSprites.set(key, sprite);
  }
}

const MAX_CARS = 10;
/** One car per this many road tiles, before the MAX_CARS cap. */
const TILES_PER_CAR = 3;

/** Recomputes which tiles are roads and adjusts the car pool to match — more
 *  roads, more traffic, up to MAX_CARS. Cars whose current tile got
 *  bulldozed out from under them are re-seeded onto a surviving road tile
 *  rather than left driving on nothing. */
function syncTraffic(scene: Scene, tiles: TileMap) {
  const roadTiles = new Set<string>();
  for (const [key, tile] of tiles) {
    if (tile.buildingId === ROAD_ID) roadTiles.add(key);
  }
  scene.roadTiles = roadTiles;

  const desired = Math.min(MAX_CARS, Math.floor(roadTiles.size / TILES_PER_CAR));
  const roadList = Array.from(roadTiles.values());

  while (scene.cars.length > desired) {
    const car = scene.cars.pop();
    if (car) {
      scene.trafficLayer.removeChild(car.sprite);
      car.sprite.destroy();
    }
  }

  const randomTile = (): Tile => {
    const [xs, ys] = roadList[Math.floor(Math.random() * roadList.length)].split("_");
    return { x: Number(xs), y: Number(ys) };
  };

  while (scene.cars.length < desired && roadList.length > 0) {
    const from = randomTile();
    const to = pickNextRoadTile(from, null, roadTiles) ?? from;
    const sprite = drawCar();
    scene.trafficLayer.addChild(sprite);
    scene.cars.push({ sprite, from, to, t: 0, speed: 0.6 + Math.random() * 0.4 });
  }

  // A car stranded on a tile that's no longer a road (bulldozed mid-drive)
  // gets teleported onto a surviving one rather than animating off-grid.
  for (const car of scene.cars) {
    const onRoad = roadTiles.has(tileKey(car.from.x, car.from.y));
    if (onRoad || roadList.length === 0) continue;
    const from = randomTile();
    car.from = from;
    car.to = pickNextRoadTile(from, null, roadTiles) ?? from;
    car.t = 0;
  }
}

function updateTraffic(scene: Scene, deltaMS: number) {
  for (const car of scene.cars) {
    if (car.from.x === car.to.x && car.from.y === car.to.y) continue;

    car.t += (car.speed * deltaMS) / 1000;
    if (car.t >= 1) {
      const arrived = car.to;
      const next = pickNextRoadTile(arrived, car.from, scene.roadTiles) ?? arrived;
      car.from = arrived;
      car.to = next;
      car.t = 0;
    }

    const fromWorld = tileToWorld(car.from.x, car.from.y);
    const toWorld = tileToWorld(car.to.x, car.to.y);
    const cx = fromWorld.x + (toWorld.x - fromWorld.x) * car.t + TILE_SIZE / 2;
    const cy = fromWorld.y + (toWorld.y - fromWorld.y) * car.t + TILE_SIZE / 2;
    car.sprite.position.set(cx, cy);
    if (toWorld.x !== fromWorld.x || toWorld.y !== fromWorld.y) {
      car.sprite.rotation = Math.atan2(toWorld.y - fromWorld.y, toWorld.x - fromWorld.x);
    }
  }
}

function drawHover(
  scene: Scene,
  x: number,
  y: number,
  state: {
    tiles: TileMap;
    connectedRoads: Set<string>;
    selectedBuildingId: string | null;
    bulldozeMode: boolean;
  },
) {
  const g = scene.hoverGraphics;
  g.clear();
  if (!isInsideGrid(x, y)) return;

  let valid: boolean;
  if (state.bulldozeMode) {
    valid = state.tiles.has(tileKey(x, y));
  } else if (state.selectedBuildingId) {
    valid = checkPlacement(state.tiles, x, y, state.selectedBuildingId, state.connectedRoads).ok;
  } else {
    return;
  }

  const world = tileToWorld(x, y);
  const color = valid ? 0x4ade80 : 0xef4444;
  g.rect(world.x, world.y, TILE_SIZE, TILE_SIZE).fill({ color, alpha: 0.22 });
  g.setStrokeStyle({ width: 2, color, alpha: 0.9 });
  g.rect(world.x, world.y, TILE_SIZE, TILE_SIZE).stroke();
}
