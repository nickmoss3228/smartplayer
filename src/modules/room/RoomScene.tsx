import { useMemo, useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getShopItem, ShopSlot } from "../../config/shopCatalog";
import {
  drawWallpaperTexture,
  drawFlooringTexture,
  drawFurnitureSprite,
  getEmptySlotTexture,
} from "./textures";

// Reference resolution the room is laid out in — with R3F's default
// orthographic camera setup, 1 world unit == 1 CSS pixel of the canvas at
// zoom 1, so viewport.width/height are already in these same units. FitRoom
// below just scales the whole scene to "contain"-fit that viewport.
const ROOM_WIDTH = 400;
const ROOM_HEIGHT = 560;
const WALL_HEIGHT = 340;
const FLOOR_HEIGHT = ROOM_HEIGHT - WALL_HEIGHT;
const WALL_CENTER_Y = ROOM_HEIGHT / 2 - WALL_HEIGHT / 2;
const FLOOR_CENTER_Y = -ROOM_HEIGHT / 2 + FLOOR_HEIGHT / 2;

interface RoomSceneProps {
  placedItems: Record<ShopSlot, string | null>;
}

function SlotPlane({
  itemId,
  slot,
  width,
  height,
  x,
  y,
  z,
}: {
  itemId: string | null;
  slot: ShopSlot;
  width: number;
  height: number;
  x: number;
  y: number;
  z: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isSway = slot === "furniture2" && !!itemId;

  const texture = useMemo(() => {
    if (!itemId) return getEmptySlotTexture();
    const item = getShopItem(itemId);
    if (!item) return getEmptySlotTexture();
    if (slot === "wallpaper") return drawWallpaperTexture(item.swatch);
    if (slot === "flooring") return drawFlooringTexture(item.swatch);
    return drawFurnitureSprite(item.swatch);
  }, [itemId, slot]);

  useFrame(({ clock }) => {
    if (isSway && meshRef.current) {
      meshRef.current.rotation.z = Math.sin(clock.elapsedTime * 1.2) * 0.03;
    }
  });

  return (
    <mesh ref={meshRef} position={[x, y, z]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

function FitRoom({ placedItems }: RoomSceneProps) {
  const { viewport } = useThree();
  const scale = Math.min(viewport.width / ROOM_WIDTH, viewport.height / ROOM_HEIGHT);

  const floorBottom = FLOOR_CENTER_Y - FLOOR_HEIGHT / 2; // = room bottom edge

  return (
    <group scale={[scale, scale, 1]}>
      <SlotPlane itemId={placedItems.wallpaper} slot="wallpaper" width={ROOM_WIDTH} height={WALL_HEIGHT} x={0} y={WALL_CENTER_Y} z={0} />
      <SlotPlane itemId={placedItems.flooring} slot="flooring" width={ROOM_WIDTH} height={FLOOR_HEIGHT} x={0} y={FLOOR_CENTER_Y} z={0.1} />

      {/* Wall-mounted */}
      <SlotPlane itemId={placedItems.poster} slot="poster" width={80} height={64} x={-120} y={WALL_CENTER_Y + 70} z={1} />
      <SlotPlane itemId={placedItems.shelf} slot="shelf" width={120} height={26} x={70} y={WALL_CENTER_Y + 90} z={1} />

      {/* Floor-standing, left to right */}
      <SlotPlane itemId={placedItems.furniture1} slot="furniture1" width={140} height={110} x={-130} y={floorBottom + 55} z={1} />
      <SlotPlane itemId={placedItems.table} slot="table" width={80} height={60} x={-20} y={floorBottom + 30} z={1} />
      <SlotPlane itemId={placedItems.furniture2} slot="furniture2" width={70} height={65} x={60} y={floorBottom + 32.5} z={1} />
      <SlotPlane itemId={placedItems.wardrobe} slot="wardrobe" width={90} height={200} x={150} y={floorBottom + 100} z={1} />
    </group>
  );
}

export function RoomScene({ placedItems }: RoomSceneProps) {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 10], zoom: 1 }}
      className="!touch-none"
      style={{ background: "linear-gradient(to bottom, #dff1ff, #f7ecd9)" }}
    >
      <FitRoom placedItems={placedItems} />
    </Canvas>
  );
}
