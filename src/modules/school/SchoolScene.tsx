// modules/school/SchoolScene.tsx
//
// The Dream School as a dollhouse: the whole building in cutaway, every room
// visible at once. That is the point — the plan asked to "see your progress",
// and progress you have to navigate to is progress you do not feel. Locked
// rooms stay on screen as dim, priced outlines so the next goal is always in
// view next to what you already built.
//
// Everything is one inline SVG. No 3D, no canvas, no images: it scales to any
// viewport, themes with CSS, costs nothing to render, and ports to
// react-native-svg later without a rewrite (the plan flags React Native).

import { SchoolAvatar, AVATAR_STYLES } from "./SchoolAvatar";
import { SLOT_SPRITES } from "./sprites";
import { CharacterState } from "../../types/Character";
import {
  SCHOOL_SLOTS,
  SchoolRoom,
  SchoolSlotId,
  getSchoolItem,
  getSchoolAction,
  getRoomsByZone,
  placementKey,
} from "../../config/schoolCatalog";

// ── Geometry ────────────────────────────────────────────────────────────────
const VW = 900;
const VH = 700;
const BUILDING_X = 70;
const BUILDING_W = 760;
const CELL_W = BUILDING_W / 3;
const CELL_H = 190;
const UPPER_Y = 118;
const MAIN_Y = UPPER_Y + CELL_H;
const GARDEN_Y = MAIN_Y + CELL_H + 26;
const GARDEN_H = 150;
// A sprite is authored in a 100x100 box; this scales that into a room cell.
const SPRITE_BASE = 0.95;

interface CellBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function cellBoxFor(room: SchoolRoom): CellBox {
  if (room.zone === "garden") {
    return { x: BUILDING_X, y: GARDEN_Y, w: BUILDING_W, h: GARDEN_H };
  }
  const y = room.zone === "upper" ? UPPER_Y : MAIN_Y;
  return { x: BUILDING_X + room.order * CELL_W, y, w: CELL_W, h: CELL_H };
}

export interface SchoolSceneProps {
  unlockedRoomIds: string[];
  placed: Record<string, string>;
  ownedActionIds: string[];
  focusedRoomId: string;
  character: Pick<CharacterState, "skinTone" | "equipped"> | null;
  /** Omitted in the read-only visiting view, which makes cells non-interactive. */
  onSelectRoom?: (roomId: string) => void;
  lockedLabel?: (room: SchoolRoom) => string;
}

// ── Furniture inside one cell ───────────────────────────────────────────────
const Furnishings = ({ room, box, placed }: { room: SchoolRoom; box: CellBox; placed: Record<string, string> }) => (
  <>
    {room.slots.map((slotId: SchoolSlotId) => {
      const itemId = placed[placementKey(room.id, slotId)];
      if (!itemId) return null;
      const item = getSchoolItem(itemId);
      if (!item) return null;
      const slot = SCHOOL_SLOTS[slotId];
      const Sprite = SLOT_SPRITES[slotId];
      if (!Sprite) return null;

      const px = box.x + slot.x * box.w;
      const py = box.y + slot.y * box.h;
      const s = SPRITE_BASE * slot.scale * (box.h / CELL_H);
      // Sprites are anchored bottom-centre at (50,100) in their own box, so
      // they sit ON the slot point rather than hanging off its top-left.
      return (
        <g key={slotId} transform={`translate(${px}, ${py}) scale(${s}) translate(-50, -100)`}>
          <Sprite c={item.palette.color} a={item.palette.accent} v={item.variant} />
        </g>
      );
    })}
  </>
);

// ── One room cell ───────────────────────────────────────────────────────────
const RoomCell = ({
  room,
  unlocked,
  focused,
  placed,
  character,
  ownedActionIds,
  onSelect,
  lockedLabel,
}: {
  room: SchoolRoom;
  unlocked: boolean;
  focused: boolean;
  placed: Record<string, string>;
  character: SchoolSceneProps["character"];
  ownedActionIds: string[];
  onSelect?: (roomId: string) => void;
  lockedLabel?: (room: SchoolRoom) => string;
}) => {
  const box = cellBoxFor(room);
  const outdoor = room.zone === "garden";
  const clickable = Boolean(onSelect) && unlocked;

  const wallFill = outdoor ? "url(#ds-grass)" : focused ? "#fdfbff" : "#f6f3fb";
  const floorFill = outdoor ? "#8fbf7a" : "#e3d7c8";

  const ownedAnims = ownedActionIds
    .map((id) => getSchoolAction(id))
    .filter((a) => a && a.roomId === room.id)
    .map((a) => a!.anim);

  return (
    <g
      onClick={onSelect && unlocked ? () => onSelect(room.id) : undefined}
      style={{ cursor: clickable ? "pointer" : "default" }}
      role={clickable ? "button" : undefined}
      aria-label={clickable ? `Open ${room.name}` : undefined}
    >
      {/* room shell */}
      <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={wallFill} />
      {!outdoor && (
        <rect x={box.x} y={box.y + box.h - 26} width={box.w} height={26} fill={floorFill} />
      )}
      {outdoor && (
        <rect x={box.x} y={box.y + box.h - 34} width={box.w} height={34} fill="#7faa68" opacity="0.55" />
      )}

      {unlocked ? (
        <>
          <Furnishings room={room} box={box} placed={placed} />
          {focused && (() => {
            // The avatar is drawn in a 100-unit box whose ground line — feet
            // and contact shadow — sits at y=96, NOT at the bottom edge. So it
            // has to be placed by its feet: anchoring the box's top edge sinks
            // it through the floor by the difference, which is most of its
            // height.
            const floorBand = outdoor ? 34 : 26;
            const size = 82 * (box.h / CELL_H);
            const feetY = box.y + box.h - floorBand + floorBand * 0.55;
            const cx = box.x + box.w * (outdoor ? 0.38 : 0.44);
            return (
              <g transform={`translate(${cx - size / 2}, ${feetY - size * 0.96})`}>
                <SchoolAvatar
                  character={character}
                  idleAnim={room.idleAnim}
                  ownedAnims={ownedAnims}
                  size={size}
                />
              </g>
            );
          })()}
        </>
      ) : (
        // Locked: dimmed, with the price sitting where the furniture would be.
        <g>
          <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="#2b2b45" opacity="0.5" />
          <g transform={`translate(${box.x + box.w / 2}, ${box.y + box.h / 2 - 12})`}>
            <rect x="-13" y="-6" width="26" height="20" rx="4" fill="#fff" opacity="0.92" />
            <path
              d="M-7 -6 V-13 a7 7 0 0 1 14 0 V-6"
              fill="none"
              stroke="#fff"
              strokeWidth="3.4"
              strokeLinecap="round"
              opacity="0.92"
            />
            <circle cx="0" cy="3" r="3" fill="#2b2b45" />
          </g>
          <text
            x={box.x + box.w / 2}
            y={box.y + box.h / 2 + 30}
            textAnchor="middle"
            fill="#fff"
            fontSize="15"
            fontWeight="700"
          >
            {lockedLabel ? lockedLabel(room) : `${room.unlockPriceBitAward} BitAward`}
          </text>
        </g>
      )}

      {/* cell border + focus ring, drawn last so nothing paints over it */}
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        fill="none"
        stroke={focused ? "#8b6fd6" : "#cfc6de"}
        strokeWidth={focused ? 3.5 : 1.5}
        rx={outdoor ? 14 : 0}
      />

      {/* nameplate */}
      <g transform={`translate(${box.x + 12}, ${box.y + 12})`}>
        <rect
          width={room.name.length * 7.6 + 18}
          height="21"
          rx="10.5"
          fill={focused ? "#8b6fd6" : "#ffffff"}
          opacity={unlocked ? 0.95 : 0.72}
        />
        <text
          x={(room.name.length * 7.6 + 18) / 2}
          y="15"
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          fill={focused ? "#ffffff" : "#4a4360"}
        >
          {room.name}
        </text>
      </g>
    </g>
  );
};

export const SchoolScene = ({
  unlockedRoomIds,
  placed,
  ownedActionIds,
  focusedRoomId,
  character,
  onSelectRoom,
  lockedLabel,
}: SchoolSceneProps) => {
  const unlocked = new Set(unlockedRoomIds);
  const indoor = [...getRoomsByZone("upper"), ...getRoomsByZone("main")];
  const garden = getRoomsByZone("garden");

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      className="w-full h-auto select-none"
      role="img"
      aria-label="Your Dream School"
    >
      <style>{AVATAR_STYLES}</style>
      <defs>
        <linearGradient id="ds-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9d6ff" />
          <stop offset="55%" stopColor="#e6ddf7" />
          <stop offset="100%" stopColor="#f6eef8" />
        </linearGradient>
        <linearGradient id="ds-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cfe8bd" />
          <stop offset="100%" stopColor="#a9d18e" />
        </linearGradient>
        <linearGradient id="ds-roof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b6fd6" />
          <stop offset="100%" stopColor="#6f56b0" />
        </linearGradient>
      </defs>

      <rect width={VW} height={VH} fill="url(#ds-sky)" />

      {/* a few stars, for the "dreamy" note in the plan */}
      {[
        [120, 60, 2], [220, 40, 1.4], [700, 52, 2.2], [800, 88, 1.6],
        [400, 34, 1.6], [560, 70, 1.2], [60, 120, 1.4], [860, 150, 1.8],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity="0.85" />
      ))}

      {/* roof */}
      <path
        d={`M${BUILDING_X - 26} ${UPPER_Y} L${VW / 2} ${UPPER_Y - 74} L${BUILDING_X + BUILDING_W + 26} ${UPPER_Y} Z`}
        fill="url(#ds-roof)"
      />
      <rect x={BUILDING_X - 26} y={UPPER_Y - 6} width={BUILDING_W + 52} height="8" rx="4" fill="#5d4796" />

      {/* building body behind the cells, so gaps read as wall not sky */}
      <rect x={BUILDING_X} y={UPPER_Y} width={BUILDING_W} height={CELL_H * 2} fill="#efe9f7" />

      {indoor.map((room) => (
        <RoomCell
          key={room.id}
          room={room}
          unlocked={unlocked.has(room.id)}
          focused={room.id === focusedRoomId}
          placed={placed}
          character={character}
          ownedActionIds={ownedActionIds}
          onSelect={onSelectRoom}
          lockedLabel={lockedLabel}
        />
      ))}

      {/* floor slab between the two storeys */}
      <rect x={BUILDING_X - 8} y={MAIN_Y - 5} width={BUILDING_W + 16} height="10" rx="5" fill="#d8cde9" />
      <rect x={BUILDING_X - 8} y={MAIN_Y + CELL_H - 5} width={BUILDING_W + 16} height="12" rx="6" fill="#c9bcdf" />

      {garden.map((room) => (
        <RoomCell
          key={room.id}
          room={room}
          unlocked={unlocked.has(room.id)}
          focused={room.id === focusedRoomId}
          placed={placed}
          character={character}
          ownedActionIds={ownedActionIds}
          onSelect={onSelectRoom}
          lockedLabel={lockedLabel}
        />
      ))}
    </svg>
  );
};
