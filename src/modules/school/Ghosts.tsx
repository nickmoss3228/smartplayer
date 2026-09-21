// modules/school/Ghosts.tsx
//
// Build mode: the rooms you could buy, standing where they would actually
// stand.
//
// A list of room names cannot answer the question the player is really asking,
// which is "where does that go, and what does it do to what I already have".
// So the preview is geometry, in the scene, at the right scale — the same
// rectangles `Building.tsx` will draw for real, at a third of the opacity.
//
// Everything here is deliberately NOT the real building: flat colour rather
// than the wallpaper, a knee-high band rather than walls, no floor texture.
// A ghost that looked like a room would be a room you thought you owned.

import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { GhostRoom } from "./props";
import { CURRENCIES } from "../../config/currencies";
import { Currency, SchoolRoomRect } from "../../config/schoolCatalog";

// `Html` renders real DOM, so the price can carry the same icon the navbar and
// the build bar use rather than a lookalike glyph. Two of the three currencies
// were rendering as the same diamond.
const iconFor = (key: Currency) => (CURRENCIES.find((c) => c.key === key) ?? CURRENCIES[0]).icon;

/** How tall the outline stands. Low enough to see over into the rooms behind
 *  it, high enough to read as a footprint rather than a rug. */
const BAND_H = 0.9;
const POST_H = 2.2;

const AFFORDABLE = "#4ea36a";
const TOO_DEAR = "#c09a3e";
const LOCKED = "#7d8590";

interface GhostLook {
  color: string;
  /** Locked rooms are shown, but faintly and without a price — you cannot buy
   *  them yet, and the point of showing them at all is that you can see where
   *  the gym will go. */
  dim: boolean;
}

const lookFor = (g: GhostRoom, affordable: boolean): GhostLook =>
  g.blocker !== null
    ? { color: LOCKED, dim: true }
    : { color: affordable ? AFFORDABLE : TOO_DEAR, dim: false };

/** A translucent slab plus a band around its edge. One mesh per side rather
 *  than a box, so the middle of the room stays open to look through. */
const Outline = ({
  rect,
  color,
  opacity,
  height = BAND_H,
}: {
  rect: SchoolRoomRect;
  color: string;
  opacity: number;
  height?: number;
}) => {
  const t = 0.18;
  const sides: [number, number, number, number][] = [
    [rect.x + rect.w / 2, rect.z, rect.w, t],
    [rect.x + rect.w / 2, rect.z + rect.d, rect.w, t],
    [rect.x, rect.z + rect.d / 2, t, rect.d],
    [rect.x + rect.w, rect.z + rect.d / 2, t, rect.d],
  ];
  return (
    <group>
      {sides.map(([cx, cz, w, d], i) => (
        <mesh key={i} position={[cx, height / 2, cz]}>
          <boxGeometry args={[w, height, d]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
};

const CORNERS = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
] as const;

/**
 * One buildable room. The slab is what you tap — a thin box rather than a
 * plane, because a plane is invisible from underneath and the camera can be
 * panned below a room's own plane at the south edge of the campus.
 */
const Ghost = ({
  ghost,
  affordable,
  selected,
  label,
  note,
  price,
  onPick,
}: {
  ghost: GhostRoom;
  affordable: boolean;
  selected: boolean;
  label: string;
  /** Why it cannot be bought yet, for the ones that cannot. A grey box with a
   *  name on it says where the gym goes but not how to get it. */
  note: string | null;
  price: number;
  onPick?: (roomId: string) => void;
}) => {
  const { color, dim } = lookFor(ghost, affordable);
  const { rect } = ghost;
  // The selected ghost has to be obvious from across the campus, because the
  // card at the bottom of the screen names a room and the player has to find it.
  const base = dim ? 0.16 : selected ? 0.62 : 0.26;
  const Icon = iconFor(ghost.spec.currency);

  return (
    <group>
      <mesh
        position={[rect.x + rect.w / 2, 0.06, rect.z + rect.d / 2]}
        onClick={
          onPick && ghost.blocker === null
            ? (e) => {
                e.stopPropagation();
                onPick(ghost.spec.id);
              }
            : undefined
        }
      >
        <boxGeometry args={[rect.w - 0.3, 0.12, rect.d - 0.3]} />
        <meshBasicMaterial color={color} transparent opacity={base} depthWrite={false} />
      </mesh>

      <Outline
        rect={rect}
        color={color}
        opacity={dim ? 0.3 : selected ? 0.95 : 0.5}
        height={selected ? BAND_H * 1.6 : BAND_H}
      />
      {/* Corner posts, so a footprint still reads as a room from across the
          campus once the band is too small to see. */}
      {!dim &&
        CORNERS.map(([ax, az]) => (
          <mesh
            key={`${ax}${az}`}
            position={[
              rect.x + ax * rect.w,
              (selected ? POST_H * 1.45 : POST_H) / 2,
              rect.z + az * rect.d,
            ]}
          >
            <boxGeometry args={[selected ? 0.3 : 0.22, selected ? POST_H * 1.45 : POST_H, selected ? 0.3 : 0.22]} />
            <meshBasicMaterial color={color} transparent opacity={selected ? 0.8 : 0.4} depthWrite={false} />
          </mesh>
        ))}

      {/* What the corridor (or whatever else) does when this arrives. Only for
          the selected ghost: drawn for all of them at once it is a mess of
          overlapping bands, and it is only ever a question about one room. */}
      {selected &&
        ghost.grows.map((g) => (
          <Outline key={g.id} rect={g} color={color} opacity={0.4} height={0.5} />
        ))}

      <Html
        position={[
          rect.x + rect.w / 2,
          (selected ? POST_H * 1.45 : POST_H) + 0.4,
          rect.z + rect.d / 2,
        ]}
        center
        // The label is the only part that has to survive being behind a wall:
        // a ghost you cannot read is a ghost you cannot choose.
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
            background: selected ? color : dim ? "rgba(30,34,40,0.55)" : "rgba(20,24,30,0.82)",
            color: dim ? "rgba(255,255,255,0.55)" : "#fff",
            transform: selected ? "scale(1.12)" : "none",
            boxShadow: selected ? "0 2px 10px rgba(0,0,0,0.45)" : "none",
          }}
        >
          {label}
          {dim && note && (
            <span style={{ fontWeight: 500, opacity: 0.8 }}>
              {" · "}
              {note}
            </span>
          )}
          {!dim && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                marginLeft: 6,
                color: affordable ? "#fff" : "#ffb4b4",
              }}
            >
              <Icon size={11} />
              {price}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
};

export interface GhostsProps {
  ghosts: GhostRoom[];
  wallet: Record<Currency, number>;
  selectedRoomId: string | null;
  /** Room id -> display name, already translated. */
  nameOf: (roomId: string) => string;
  /** Room id -> why it is still locked, already translated. Null when it is not. */
  noteOf?: (roomId: string) => string | null;
  onPick?: (roomId: string) => void;
}

export const Ghosts = ({
  ghosts,
  wallet,
  selectedRoomId,
  nameOf,
  noteOf,
  onPick,
}: GhostsProps) => {
  // Locked rooms first, so the ones you can actually buy draw over them where
  // two labels land in the same place.
  const ordered = useMemo(
    () => [...ghosts].sort((a, b) => Number(b.blocker !== null) - Number(a.blocker !== null)),
    [ghosts],
  );

  return (
    <group>
      {ordered.map((g) => (
        <Ghost
          key={g.spec.id}
          ghost={g}
          affordable={wallet[g.spec.currency] >= g.spec.price}
          selected={selectedRoomId === g.spec.id}
          label={nameOf(g.spec.id)}
          note={g.blocker === "locked" ? (noteOf?.(g.spec.id) ?? null) : null}
          price={g.spec.price}
          onPick={onPick}
        />
      ))}
    </group>
  );
};
