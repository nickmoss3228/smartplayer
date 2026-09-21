// modules/school/RoomPicks.tsx
//
// Customize mode: a tap target over every room you own, and a name above it.
//
// Deliberately almost invisible. In build mode the ghosts ARE the content —
// they are rooms that do not exist yet, so they have to be drawn. Here the room
// is already there and already the thing you are looking at; anything drawn on
// top of it hides the very thing you came to change. So this is a flat pane at
// the height of a rug, plus a label, and the selected room gets an outline
// rather than a fill.

import { Html } from "@react-three/drei";
import { SchoolRoomRect } from "../../config/schoolCatalog";

const SELECTED = "#7c5cd6";

const Pick = ({
  room,
  selected,
  label,
  onPick,
}: {
  room: SchoolRoomRect;
  selected: boolean;
  label: string;
  onPick?: (roomId: string) => void;
}) => (
  <group>
    {/* The tap target. Just above the floor and barely tinted: it has to be
        hittable across the whole room without washing the room out. */}
    <mesh
      position={[room.x + room.w / 2, 0.04, room.z + room.d / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={
        onPick
          ? (e) => {
              e.stopPropagation();
              onPick(room.id);
            }
          : undefined
      }
    >
      <planeGeometry args={[room.w - 0.2, room.d - 0.2]} />
      <meshBasicMaterial
        color={SELECTED}
        transparent
        opacity={selected ? 0.16 : 0.02}
        depthWrite={false}
      />
    </mesh>

    {/* An outline rather than a fill, so the room under it stays readable while
        you are changing its wallpaper. */}
    {selected &&
      (
        [
          [room.x + room.w / 2, room.z, room.w, 0.16],
          [room.x + room.w / 2, room.z + room.d, room.w, 0.16],
          [room.x, room.z + room.d / 2, 0.16, room.d],
          [room.x + room.w, room.z + room.d / 2, 0.16, room.d],
        ] as [number, number, number, number][]
      ).map(([cx, cz, w, d], i) => (
        <mesh key={i} position={[cx, 0.6, cz]}>
          <boxGeometry args={[w, 1.2, d]} />
          <meshBasicMaterial color={SELECTED} transparent opacity={0.55} depthWrite={false} />
        </mesh>
      ))}

    <Html
      position={[room.x + room.w / 2, selected ? 2.4 : 1.6, room.z + room.d / 2]}
      center
      zIndexRange={[20, 10]}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div
        style={{
          whiteSpace: "nowrap",
          fontSize: 11,
          fontWeight: 700,
          padding: "3px 7px",
          borderRadius: 8,
          background: selected ? SELECTED : "rgba(20,24,30,0.6)",
          color: "#fff",
          opacity: selected ? 1 : 0.65,
          transform: selected ? "scale(1.12)" : "none",
        }}
      >
        {label}
      </div>
    </Html>
  </group>
);

export const RoomPicks = ({
  rooms,
  selected,
  nameOf,
  onPick,
}: {
  rooms: SchoolRoomRect[];
  selected: string | null;
  nameOf: (roomId: string) => string;
  onPick?: (roomId: string) => void;
}) => (
  <group>
    {rooms.map((room) => (
      <Pick
        key={room.id}
        room={room}
        selected={selected === room.id}
        label={nameOf(room.id)}
        onPick={onPick}
      />
    ))}
  </group>
);
