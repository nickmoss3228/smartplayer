import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import * as THREE from "three";
import { getShopItem, ShopSlot, Swatch } from "../../config/shopCatalog";
import { drawWallpaperTexture, drawFlooringTexture } from "./textures";
import { buildVoxelModel, VoxelBox } from "./voxelModels";
import { CharacterRig, CharacterAppearance } from "./CharacterRig";

// ─── Room shell dimensions (world units) ───────────────────────────────────
// The room is real 3D geometry — a floor plus two walls forming an open
// corner — viewed from a fixed isometric-ish angle. Furniture/character are
// now real 3D box assemblies too (see voxelModels.ts) rather than flat
// canvas-textured "standee" planes — those looked like 2D cutouts once you
// could see they had no depth. Real geometry needs no camera-facing hack.
const ROOM_WIDTH = 400; // X extent
const ROOM_DEPTH = 400; // Z extent
const ROOM_HEIGHT = 260; // Y extent

const CAMERA_POSITION = new THREE.Vector3(500, 500, 500);
const LOOK_TARGET = new THREE.Vector3(0, ROOM_HEIGHT * 0.35, 0);

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

interface RoomSceneProps {
  placedItems: Record<ShopSlot, string | null>;
  character: CharacterAppearance;
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
}: {
  itemId: string | null;
  draw: (swatch: Swatch) => THREE.CanvasTexture;
  fallbackColor: string;
  width: number;
  height: number;
  position: [number, number, number];
  rotation: [number, number, number];
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
    <mesh position={position} rotation={rotation}>
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

// ─── Floor-standing furniture slot ─────────────────────────────────────────
function FurnitureSlot({
  itemId,
  x,
  z,
  placeholderSize,
  sway,
}: {
  itemId: string | null;
  x: number;
  z: number;
  placeholderSize: [number, number, number];
  sway?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const model = useMemo(() => {
    if (!itemId) return null;
    const item = getShopItem(itemId);
    return item ? buildVoxelModel(item.swatch) : null;
  }, [itemId]);

  useFrame(({ clock }) => {
    if (sway && groupRef.current) {
      groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 1.2) * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={[x, 0, z]}>
      {model ? <VoxelBoxes model={model} /> : <EmptySlotPlaceholder size={placeholderSize} />}
    </group>
  );
}

// ─── Wall-mounted slot (poster/shelf) — flush against its wall ────────────
function WallSlot({
  itemId,
  position,
  rotationY,
  placeholderSize,
}: {
  itemId: string | null;
  position: [number, number, number];
  rotationY: number;
  placeholderSize: [number, number, number];
}) {
  const model = useMemo(() => {
    if (!itemId) return null;
    const item = getShopItem(itemId);
    return item ? buildVoxelModel(item.swatch) : null;
  }, [itemId]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {model ? <VoxelBoxes model={model} /> : <EmptySlotPlaceholder size={placeholderSize} />}
    </group>
  );
}

function FitRoom({ placedItems, character }: RoomSceneProps) {
  const { viewport } = useThree();
  const scale =
    Math.min(viewport.width / ROOM_PROJECTED.width, viewport.height / ROOM_PROJECTED.height) * 0.92;

  return (
    <group scale={[scale, scale, scale]}>
      {/* Floor */}
      <ShellPlane
        itemId={placedItems.flooring}
        draw={drawFlooringTexture}
        fallbackColor="#cfc6b8"
        width={ROOM_WIDTH}
        height={ROOM_DEPTH}
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
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
      />

      {/* Wall-mounted */}
      <WallSlot
        itemId={placedItems.poster}
        position={[-80, 170, -ROOM_DEPTH / 2 + 2]}
        rotationY={0}
        placeholderSize={[64, 50, 4]}
      />
      <WallSlot
        itemId={placedItems.shelf}
        position={[-ROOM_WIDTH / 2 + 2, 190, 60]}
        rotationY={Math.PI / 2}
        placeholderSize={[100, 8, 16]}
      />

      {/* Floor-standing furniture */}
      <FurnitureSlot itemId={placedItems.furniture1} x={-120} z={-60} placeholderSize={[70, 40, 90]} />
      <FurnitureSlot itemId={placedItems.table} x={-10} z={30} placeholderSize={[64, 44, 40]} />
      <FurnitureSlot itemId={placedItems.furniture2} x={100} z={60} placeholderSize={[50, 40, 50]} sway />
      <FurnitureSlot itemId={placedItems.wardrobe} x={150} z={-140} placeholderSize={[70, 140, 40]} />

      <CharacterRig skinTone={character.skinTone} equipped={character.equipped} />
    </group>
  );
}

export function RoomScene({ placedItems, character }: RoomSceneProps) {
  return (
    <Canvas className="!touch-none" style={{ background: "linear-gradient(to bottom, #dff1ff, #f7ecd9)" }}>
      <OrthographicCamera
        makeDefault
        position={CAMERA_POSITION.toArray()}
        onUpdate={(self) => self.lookAt(LOOK_TARGET)}
      />
      <ambientLight intensity={0.6} />
      <directionalLight position={[300, 500, 200]} intensity={0.9} />
      <FitRoom placedItems={placedItems} character={character} />
    </Canvas>
  );
}
