import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import * as THREE from "three";
import { getShopItem, ShopSlot, Swatch } from "../../config/shopCatalog";
import { TierKey } from "../../config/achievementsConfig";
import {
  ROOM_WIDTH,
  ROOM_DEPTH,
  ROOM_HEIGHT,
  FLOOR_SLOTS,
  BACK_WALL_SLOTS,
  SIDE_WALL_SLOTS,
  RoomPlacement,
  FloorPlacement,
  WallPlacement,
  FloorSlotKey,
  WallSlotKey,
  isFloorSlot,
  clampFloorPlacement,
  clampWallPlacement,
  floorOverlaps,
  wallOverlaps,
  wallGroupFor,
  nextRotation,
} from "../../config/roomLayout";
import { drawWallpaperTexture, drawFlooringTexture } from "./textures";
import { buildVoxelModel, buildTrophyModel, VoxelBox } from "./voxelModels";
import { CharacterRig, CharacterAppearance, CharacterTarget } from "./CharacterRig";

// ─── Room shell dimensions (world units) ───────────────────────────────────
// The room is real 3D geometry — a floor plus two walls forming an open
// corner — viewed from a fixed isometric-ish angle. Furniture/character are
// real 3D box assemblies (see voxelModels.ts) rather than flat canvas-
// textured "standee" planes. Dimensions live in config/roomLayout.ts now
// (shared with the backend, which needs the same numbers to validate
// arrange-mode placement).
const CAMERA_POSITION = new THREE.Vector3(500, 500, 500);
const LOOK_TARGET = new THREE.Vector3(0, ROOM_HEIGHT * 0.35, 0);

// World-units distance beyond which a pointer-down-then-move counts as a
// drag rather than a tap (tap toggles selection for the rotate button).
const DRAG_THRESHOLD = 6;
const WALL_FLUSH_OFFSET = 2;

const TROPHY_TIER_HEX: Record<TierKey, string> = {
  bronze: "#b45309",
  silver: "#94a3b8",
  gold: "#facc15",
  platinum: "#22d3ee",
  crown: "#a855f7",
};

// ─── Analytic viewport fit ──────────────────────────────────────────────
// For an orthographic camera, a world point's screen-space position is just
// its dot product with the camera's right/up basis vectors (no perspective
// divide) — so scaling all room content by `s` around the origin scales the
// projected size by exactly `s`, regardless of camera distance. That means
// we can compute the room's projected bounding box analytically (from the
// same fixed eye/target used below) and derive an exact contain-fit scale
// against the canvas viewport, instead of tuning a "reference resolution"
// by eye.
function computeCameraBasis(eye: THREE.Vector3, target: THREE.Vector3) {
  const forward = target.clone().sub(eye).normalize();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
  const up = new THREE.Vector3().crossVectors(right, forward).normalize();
  return { right, up };
}

function getProjectedRoomExtent() {
  const { right, up } = computeCameraBasis(CAMERA_POSITION, LOOK_TARGET);
  const corners: THREE.Vector3[] = [];
  for (const x of [-ROOM_WIDTH / 2, ROOM_WIDTH / 2]) {
    for (const y of [0, ROOM_HEIGHT]) {
      for (const z of [-ROOM_DEPTH / 2, ROOM_DEPTH / 2]) {
        corners.push(new THREE.Vector3(x, y, z));
      }
    }
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of corners) {
    const rx = p.dot(right);
    const ry = p.dot(up);
    minX = Math.min(minX, rx);
    maxX = Math.max(maxX, rx);
    minY = Math.min(minY, ry);
    maxY = Math.max(maxY, ry);
  }
  return { width: maxX - minX, height: maxY - minY };
}

const ROOM_PROJECTED = getProjectedRoomExtent();

export interface RoomAchievementTrophy {
  key: string;
  tier: TierKey;
}

// "Arrange mode" drag state — lives in the outer (non-Canvas) RoomScene
// component so the rotate-button overlay (plain HTML, not r3f) can read
// it, but is written to from inside FitRoom where the viewport-fit `scale`
// needed to convert pointer hits into room-local coordinates is available.
interface FloorDragState {
  kind: "floor";
  slot: FloorSlotKey;
  startX: number;
  startZ: number;
  moved: boolean;
  current: FloorPlacement;
  valid: boolean;
}
interface WallDragState {
  kind: "wall";
  slot: WallSlotKey;
  startAlong: number;
  startHeight: number;
  moved: boolean;
  current: WallPlacement;
  valid: boolean;
}
type DragState = FloorDragState | WallDragState;

interface RoomSceneProps {
  placedItems: Record<ShopSlot, string | null>;
  placement: RoomPlacement;
  character: CharacterAppearance;
  lightsOn: boolean;
  achievements: RoomAchievementTrophy[];
  arrangeMode: boolean;
  onMoveFloorItem: (slot: FloorSlotKey, x: number, z: number, rotation: number) => void;
  onMoveWallItem: (slot: WallSlotKey, along: number, height: number) => void;
  rotateLabel: string;
}

// ─── Room shell: floor / back wall / side wall ─────────────────────────────
function ShellPlane({
  itemId,
  draw,
  fallbackColor,
  width,
  height,
  position,
  rotation,
  onClick,
  onPointerMove,
}: {
  itemId: string | null;
  draw: (swatch: Swatch) => THREE.CanvasTexture;
  fallbackColor: string;
  width: number;
  height: number;
  position: [number, number, number];
  rotation: [number, number, number];
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void;
}) {
  const texture = useMemo(() => {
    if (!itemId) return null;
    const item = getShopItem(itemId);
    return item ? draw(item.swatch) : null;
  }, [itemId, draw]);

  // CanvasTexture holds GPU-side memory that isn't freed by JS garbage
  // collection alone — without an explicit dispose(), every wallpaper/
  // flooring swap on the owner's live session leaks a texture, eventually
  // exhausting the browser's WebGL contexts/memory and turning the canvas
  // black. A first-load visitor never swaps anything, so they never hit it.
  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  return (
    <mesh position={position} rotation={rotation} onClick={onClick} onPointerMove={onPointerMove}>
      <planeGeometry args={[width, height]} />
      {texture ? <meshLambertMaterial map={texture} /> : <meshLambertMaterial color={fallbackColor} />}
    </mesh>
  );
}

// ─── A placeholder ghost box for an empty (unowned) slot ──────────────────
function EmptySlotPlaceholder({ size }: { size: [number, number, number] }) {
  return (
    <mesh position={[0, size[1] / 2, 0]}>
      <boxGeometry args={size} />
      <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.35} />
    </mesh>
  );
}

// ─── Furniture voxel model, rendered as a group of boxes ──────────────────
function VoxelBoxes({ model }: { model: VoxelBox[] }) {
  return (
    <>
      {model.map((box, i) => (
        <mesh key={i} position={box.position}>
          <boxGeometry args={box.size} />
          <meshLambertMaterial color={box.color} />
        </mesh>
      ))}
    </>
  );
}

// ─── A thin amber ring under the currently-selected floor item (arrange
// mode only) — so it's clear what the rotate button will spin. ────────────
function SelectionRing({ radius }: { radius: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1, 0]}>
      <ringGeometry args={[Math.max(4, radius - 5), radius, 32]} />
      <meshBasicMaterial color="#f59e0b" transparent opacity={0.8} />
    </mesh>
  );
}

// ─── Floor-standing furniture slot ─────────────────────────────────────────
function FurnitureSlot({
  itemId,
  x,
  z,
  rotationDeg,
  placeholderSize,
  sway,
  selected,
  onClick,
  onPointerDown,
}: {
  itemId: string | null;
  x: number;
  z: number;
  rotationDeg: number;
  placeholderSize: [number, number, number];
  sway?: boolean;
  selected?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const model = useMemo(() => {
    if (!itemId) return null;
    const item = getShopItem(itemId);
    return item ? buildVoxelModel(item.swatch) : null;
  }, [itemId]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const base = (rotationDeg * Math.PI) / 180;
    const swayOffset = sway ? Math.sin(clock.elapsedTime * 1.2) * 0.08 : 0;
    groupRef.current.rotation.y = base + swayOffset;
  });

  return (
    <group
      ref={groupRef}
      position={[x, 0, z]}
      onClick={itemId ? onClick : undefined}
      onPointerDown={itemId ? onPointerDown : undefined}
    >
      {model ? <VoxelBoxes model={model} /> : <EmptySlotPlaceholder size={placeholderSize} />}
      {selected && <SelectionRing radius={Math.max(placeholderSize[0], placeholderSize[2]) / 2 + 6} />}
    </group>
  );
}

// ─── Wall-mounted slot (poster/shelf/window) — flush against its wall ─────
function WallSlot({
  itemId,
  position,
  rotationY,
  placeholderSize,
  onPointerDown,
}: {
  itemId: string | null;
  position: [number, number, number];
  rotationY: number;
  placeholderSize: [number, number, number];
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
}) {
  const model = useMemo(() => {
    if (!itemId) return null;
    const item = getShopItem(itemId);
    return item ? buildVoxelModel(item.swatch) : null;
  }, [itemId]);

  return (
    <group position={position} rotation={[0, rotationY, 0]} onPointerDown={itemId ? onPointerDown : undefined}>
      {model ? <VoxelBoxes model={model} /> : <EmptySlotPlaceholder size={placeholderSize} />}
    </group>
  );
}

// ─── Earned-achievement trophies — always-visible wall ledge, not a
// purchasable item, so trophies show up regardless of shop purchases. ─────
function TrophyLedge({ achievements }: { achievements: RoomAchievementTrophy[] }) {
  if (achievements.length === 0) return null;
  const spacing = 26;
  const ledgeWidth = Math.max(50, achievements.length * spacing + 16);
  const startX = -((achievements.length - 1) * spacing) / 2;

  return (
    <group position={[-ROOM_WIDTH / 2 + 3, 210, -80]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, -4, 0]}>
        <boxGeometry args={[ledgeWidth, 4, 18]} />
        <meshLambertMaterial color="#8b5e3c" />
      </mesh>
      {achievements.map((a, i) => (
        <group key={a.key} position={[startX + i * spacing, 0, 0]}>
          <VoxelBoxes model={buildTrophyModel(TROPHY_TIER_HEX[a.tier])} />
        </group>
      ))}
    </group>
  );
}

interface FitRoomProps extends Omit<RoomSceneProps, "rotateLabel"> {
  characterTarget: CharacterTarget | null;
  onFloorClick: (x: number, z: number) => void;
  onChairClick: () => void;
  onCharacterClick: () => void;
  selectedSlot: FloorSlotKey | null;
  dragState: DragState | null;
  setDragState: Dispatch<SetStateAction<DragState | null>>;
}

function occupiedFloorSiblings(
  slot: FloorSlotKey,
  placedItems: Record<ShopSlot, string | null>,
  placement: RoomPlacement,
) {
  return FLOOR_SLOTS.filter((s) => s !== slot && placedItems[s]).map((s) => ({
    slot: s,
    placement: placement[s],
  }));
}

function occupiedWallSiblings(
  slot: WallSlotKey,
  placedItems: Record<ShopSlot, string | null>,
  placement: RoomPlacement,
) {
  return wallGroupFor(slot)
    .filter((s) => s !== slot && placedItems[s])
    .map((s) => ({ slot: s, placement: placement[s] }));
}

function FitRoom({
  placedItems,
  placement,
  character,
  lightsOn,
  achievements,
  arrangeMode,
  characterTarget,
  onFloorClick,
  onChairClick,
  onCharacterClick,
  selectedSlot,
  dragState,
  setDragState,
}: FitRoomProps) {
  const { viewport } = useThree();
  const scale =
    Math.min(viewport.width / ROOM_PROJECTED.width, viewport.height / ROOM_PROJECTED.height) * 0.92;

  // ── Character movement (normal mode only — arrange mode repurposes the
  // floor/chair for furniture placement instead). ──────────────────────
  const handleFloorClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onFloorClick(e.point.x / scale, e.point.z / scale);
  };
  const handleChairSitClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onChairClick();
  };

  // ── Arrange-mode drag tracking ────────────────────────────────────────
  const startFloorDrag = (slot: FloorSlotKey) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const p = placement[slot];
    setDragState({ kind: "floor", slot, startX: p.x, startZ: p.z, moved: false, current: p, valid: true });
  };
  const startWallDrag = (slot: WallSlotKey) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const p = placement[slot];
    setDragState({
      kind: "wall", slot, startAlong: p.along, startHeight: p.height, moved: false, current: p, valid: true,
    });
  };

  const handleFloorPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragState || dragState.kind !== "floor") return;
    const localX = e.point.x / scale;
    const localZ = e.point.z / scale;
    setDragState((prev) => {
      if (!prev || prev.kind !== "floor") return prev;
      const moved = prev.moved || Math.hypot(localX - prev.startX, localZ - prev.startZ) > DRAG_THRESHOLD;
      if (!moved) return { ...prev, moved };
      const candidate = clampFloorPlacement(prev.slot, localX, localZ, prev.current.rotation);
      const occupied = occupiedFloorSiblings(prev.slot, placedItems, placement);
      const valid = !floorOverlaps(prev.slot, candidate, occupied);
      return { ...prev, moved, current: candidate, valid };
    });
  };

  const handleBackWallPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragState || dragState.kind !== "wall" || !(BACK_WALL_SLOTS as readonly string[]).includes(dragState.slot)) return;
    const along = e.point.x / scale;
    const height = e.point.y / scale;
    setDragState((prev) => {
      if (!prev || prev.kind !== "wall") return prev;
      const moved = prev.moved || Math.hypot(along - prev.startAlong, height - prev.startHeight) > DRAG_THRESHOLD;
      if (!moved) return { ...prev, moved };
      const candidate = clampWallPlacement(prev.slot, along, height);
      const occupied = occupiedWallSiblings(prev.slot, placedItems, placement);
      const valid = !wallOverlaps(prev.slot, candidate, occupied);
      return { ...prev, moved, current: candidate, valid };
    });
  };

  const handleSideWallPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragState || dragState.kind !== "wall" || !(SIDE_WALL_SLOTS as readonly string[]).includes(dragState.slot)) return;
    const along = e.point.z / scale;
    const height = e.point.y / scale;
    setDragState((prev) => {
      if (!prev || prev.kind !== "wall") return prev;
      const moved = prev.moved || Math.hypot(along - prev.startAlong, height - prev.startHeight) > DRAG_THRESHOLD;
      if (!moved) return { ...prev, moved };
      const candidate = clampWallPlacement(prev.slot, along, height);
      const occupied = occupiedWallSiblings(prev.slot, placedItems, placement);
      const valid = !wallOverlaps(prev.slot, candidate, occupied);
      return { ...prev, moved, current: candidate, valid };
    });
  };

  const floorPlacementFor = (slot: FloorSlotKey): FloorPlacement =>
    dragState?.kind === "floor" && dragState.slot === slot ? dragState.current : placement[slot];
  const wallPlacementFor = (slot: WallSlotKey): WallPlacement =>
    dragState?.kind === "wall" && dragState.slot === slot ? dragState.current : placement[slot];

  const desk = floorPlacementFor("furniture1");
  const chair = floorPlacementFor("chair");
  const table = floorPlacementFor("table");
  const decor = floorPlacementFor("furniture2");
  const cabinet = floorPlacementFor("wardrobe");
  const posterP = wallPlacementFor("poster");
  const windowP = wallPlacementFor("window");
  const shelfP = wallPlacementFor("shelf");

  return (
    <group scale={[scale, scale, scale]}>
      {/* Floor — click to walk (normal mode) or drag furniture (arrange mode) */}
      <ShellPlane
        itemId={placedItems.flooring}
        draw={drawFlooringTexture}
        fallbackColor="#cfc6b8"
        width={ROOM_WIDTH}
        height={ROOM_DEPTH}
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={!arrangeMode ? handleFloorClick : undefined}
        onPointerMove={arrangeMode ? handleFloorPointerMove : undefined}
      />
      {/* Back wall */}
      <ShellPlane
        itemId={placedItems.wallpaper}
        draw={drawWallpaperTexture}
        fallbackColor="#e8ddd0"
        width={ROOM_WIDTH}
        height={ROOM_HEIGHT}
        position={[0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2]}
        rotation={[0, 0, 0]}
        onPointerMove={arrangeMode ? handleBackWallPointerMove : undefined}
      />
      {/* Side wall — same wallpaper item as the back wall */}
      <ShellPlane
        itemId={placedItems.wallpaper}
        draw={drawWallpaperTexture}
        fallbackColor="#e8ddd0"
        width={ROOM_DEPTH}
        height={ROOM_HEIGHT}
        position={[-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        onPointerMove={arrangeMode ? handleSideWallPointerMove : undefined}
      />

      {/* Wall-mounted */}
      <WallSlot
        itemId={placedItems.window}
        position={[windowP.along, windowP.height, -ROOM_DEPTH / 2 + WALL_FLUSH_OFFSET]}
        rotationY={0}
        placeholderSize={[60, 50, 4]}
        onPointerDown={arrangeMode ? startWallDrag("window") : undefined}
      />
      <WallSlot
        itemId={placedItems.poster}
        position={[posterP.along, posterP.height, -ROOM_DEPTH / 2 + WALL_FLUSH_OFFSET]}
        rotationY={0}
        placeholderSize={[64, 50, 4]}
        onPointerDown={arrangeMode ? startWallDrag("poster") : undefined}
      />
      <WallSlot
        itemId={placedItems.shelf}
        position={[-ROOM_WIDTH / 2 + WALL_FLUSH_OFFSET, shelfP.height, shelfP.along]}
        rotationY={Math.PI / 2}
        placeholderSize={[100, 8, 16]}
        onPointerDown={arrangeMode ? startWallDrag("shelf") : undefined}
      />

      <TrophyLedge achievements={achievements} />

      {/* Floor-standing furniture — freely arrangeable within the room. */}
      <FurnitureSlot
        itemId={placedItems.furniture1}
        x={desk.x} z={desk.z} rotationDeg={desk.rotation}
        placeholderSize={[90, 60, 44]}
        selected={selectedSlot === "furniture1"}
        onPointerDown={arrangeMode ? startFloorDrag("furniture1") : undefined}
      />
      <FurnitureSlot
        itemId={placedItems.chair}
        x={chair.x} z={chair.z} rotationDeg={chair.rotation}
        placeholderSize={[36, 50, 36]}
        selected={selectedSlot === "chair"}
        onClick={!arrangeMode ? handleChairSitClick : undefined}
        onPointerDown={arrangeMode ? startFloorDrag("chair") : undefined}
      />
      <FurnitureSlot
        itemId={placedItems.table}
        x={table.x} z={table.z} rotationDeg={table.rotation}
        placeholderSize={[64, 44, 40]}
        selected={selectedSlot === "table"}
        onPointerDown={arrangeMode ? startFloorDrag("table") : undefined}
      />
      <FurnitureSlot
        itemId={placedItems.furniture2}
        x={decor.x} z={decor.z} rotationDeg={decor.rotation}
        placeholderSize={[50, 40, 50]}
        sway={!arrangeMode}
        selected={selectedSlot === "furniture2"}
        onPointerDown={arrangeMode ? startFloorDrag("furniture2") : undefined}
      />
      <FurnitureSlot
        itemId={placedItems.wardrobe}
        x={cabinet.x} z={cabinet.z} rotationDeg={cabinet.rotation}
        placeholderSize={[50, 100, 40]}
        selected={selectedSlot === "wardrobe"}
        onPointerDown={arrangeMode ? startFloorDrag("wardrobe") : undefined}
      />

      {lightsOn && (
        <pointLight position={[desk.x - 20, 110, desk.z]} intensity={0.6} distance={220} color="#ffd98a" />
      )}

      <CharacterRig
        skinTone={character.skinTone}
        equipped={character.equipped}
        target={characterTarget}
        onCharacterClick={onCharacterClick}
      />
    </group>
  );
}

export function RoomScene({
  placedItems,
  placement,
  character,
  lightsOn,
  achievements,
  arrangeMode,
  onMoveFloorItem,
  onMoveWallItem,
  rotateLabel,
}: RoomSceneProps) {
  const [characterTarget, setCharacterTarget] = useState<CharacterTarget | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<FloorSlotKey | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Leaving arrange mode clears any in-progress selection/drag so re-
  // entering it starts clean.
  useEffect(() => {
    if (!arrangeMode) {
      setSelectedSlot(null);
      setDragState(null);
    }
  }, [arrangeMode]);

  const finalizeDrag = useCallback(() => {
    setDragState((prev) => {
      if (!prev) return null;
      if (!prev.moved) {
        // A plain tap (no meaningful drag distance) — floor items toggle
        // selection so the rotate button can target them; wall items don't
        // rotate, so a tap on one does nothing.
        if (prev.kind === "floor") {
          setSelectedSlot((s) => (s === prev.slot ? null : prev.slot));
        }
        return null;
      }
      if (prev.valid) {
        if (prev.kind === "floor") {
          onMoveFloorItem(prev.slot, prev.current.x, prev.current.z, prev.current.rotation);
        } else {
          onMoveWallItem(prev.slot, prev.current.along, prev.current.height);
        }
      }
      // Invalid drops are simply discarded — clearing dragState makes the
      // item fall back to rendering from the last-saved `placement` prop.
      return null;
    });
  }, [onMoveFloorItem, onMoveWallItem]);

  useEffect(() => {
    if (!dragState) return;
    window.addEventListener("pointerup", finalizeDrag);
    return () => window.removeEventListener("pointerup", finalizeDrag);
  }, [dragState, finalizeDrag]);

  const handleFloorClick = (x: number, z: number) => setCharacterTarget({ x, z, sitting: false });
  const handleChairClick = () => {
    const deskP = placement.furniture1;
    const chairP = placement.chair;
    // Face wherever the desk currently sits — correct even after either
    // piece has been dragged elsewhere in arrange mode.
    const facing = Math.atan2(deskP.x - chairP.x, deskP.z - chairP.z);
    setCharacterTarget({ x: chairP.x, z: chairP.z, sitting: true, facing });
  };
  const handleCharacterClick = () => {
    setCharacterTarget((prev) => (prev?.sitting ? { x: prev.x, z: prev.z + 24, sitting: false } : prev));
  };

  const rotateSelected = () => {
    if (!selectedSlot) return;
    const current = placement[selectedSlot];
    const rotation = nextRotation(current.rotation);
    const candidate = clampFloorPlacement(selectedSlot, current.x, current.z, rotation);
    const occupied = occupiedFloorSiblings(selectedSlot, placedItems, placement);
    if (floorOverlaps(selectedSlot, candidate, occupied)) return;
    onMoveFloorItem(selectedSlot, candidate.x, candidate.z, candidate.rotation);
  };

  return (
    <div className="relative w-full h-full">
      <Canvas className="!touch-none" style={{ background: "linear-gradient(to bottom, #dff1ff, #f7ecd9)" }}>
        <OrthographicCamera
          makeDefault
          position={CAMERA_POSITION.toArray()}
          onUpdate={(self) => self.lookAt(LOOK_TARGET)}
        />
        <ambientLight intensity={lightsOn ? 0.6 : 0.15} />
        <directionalLight position={[300, 500, 200]} intensity={lightsOn ? 0.9 : 0.15} />
        <FitRoom
          placedItems={placedItems}
          placement={placement}
          character={character}
          lightsOn={lightsOn}
          achievements={achievements}
          arrangeMode={arrangeMode}
          onMoveFloorItem={onMoveFloorItem}
          onMoveWallItem={onMoveWallItem}
          characterTarget={characterTarget}
          onFloorClick={handleFloorClick}
          onChairClick={handleChairClick}
          onCharacterClick={handleCharacterClick}
          selectedSlot={selectedSlot}
          dragState={dragState}
          setDragState={setDragState}
        />
      </Canvas>

      {arrangeMode && selectedSlot && isFloorSlot(selectedSlot) && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 text-white rounded-full px-3 py-2 text-sm shadow-lg">
          <button
            onClick={rotateSelected}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 rounded-full px-3 py-1 cursor-pointer"
          >
            ⟳ {rotateLabel}
          </button>
          <button
            onClick={() => setSelectedSlot(null)}
            className="text-white/60 hover:text-white px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
