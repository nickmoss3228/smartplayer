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
// than the wallpaper, a knee-high band rather than walls, no floor texture —
// until you tap one. The one you tap is shown as the real room instead (walls,
// floor, furniture: see `previewPlan` in SchoolCanvas), and all that is left
// of its ghost is a bright frame round its floor, so it still reads as "the
// one you are looking at" rather than as a room you already own.
//
// The labels say as little as they can: a price on the rooms you could buy, a
// lock on the ones you cannot yet. The name, and what a locked room is
// waiting for, are on the card for the one you tapped. Fourteen labels each
// with a name and a sentence were most of what build mode looked like.

import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { IoLockClosed } from "react-icons/io5";
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
  price,
  onPick,
}: {
  ghost: GhostRoom;
  affordable: boolean;
  selected: boolean;
  price: number;
  onPick?: (roomId: string) => void;
}) => {
  const { color, dim } = lookFor(ghost, affordable);
  const { rect } = ghost;
  const base = dim ? 0.16 : 0.26;
  const Icon = iconFor(ghost.spec.currency);
  // Locked rooms can be tapped too: the card is where you find out what they
  // are waiting for, now that the scene no longer says it over every one.
  const pick = onPick
    ? (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        onPick(ghost.spec.id);
      }
    : undefined;
  // What the tapped room will actually look like is drawn by the scene; the
  // ghost keeps only a frame round its floor, low enough not to cut across the
  // walls being previewed. Tapping it again still has to land on something.
  const previewing = selected && ghost.blocker === null;

  return (
    <group>
      <mesh position={[rect.x + rect.w / 2, 0.06, rect.z + rect.d / 2]} onClick={pick} visible={!previewing}>
        <boxGeometry args={[rect.w - 0.3, 0.12, rect.d - 0.3]} />
        <meshBasicMaterial color={color} transparent opacity={base} depthWrite={false} />
      </mesh>

      <Outline
        rect={rect}
        color={color}
        opacity={dim ? 0.3 : previewing ? 0.95 : 0.5}
        height={previewing ? 0.14 : selected ? BAND_H * 1.6 : BAND_H}
      />
      {/* Corner posts, so a footprint still reads as a room from across the
          campus once the band is too small to see. */}
      {!dim &&
        !previewing &&
        CORNERS.map(([ax, az]) => (
          <mesh key={`${ax}${az}`} position={[rect.x + ax * rect.w, POST_H / 2, rect.z + az * rect.d]}>
            <boxGeometry args={[0.22, POST_H, 0.22]} />
            <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} />
          </mesh>
        ))}

      {/* Whatever comes in the same purchase — reception's forecourt. Always
          drawn, and tappable like the room itself: it is part of the offer,
          not a side effect of it. */}
      {ghost.extra.map((x) => (
        <group key={x.id}>
          <mesh position={[x.x + x.w / 2, 0.06, x.z + x.d / 2]} onClick={pick} visible={!previewing}>
            <boxGeometry args={[x.w - 0.3, 0.12, x.d - 0.3]} />
            <meshBasicMaterial color={color} transparent opacity={base * 0.8} depthWrite={false} />
          </mesh>
          <Outline
            rect={x}
            color={color}
            opacity={dim ? 0.3 : previewing ? 0.9 : 0.4}
            height={previewing ? 0.14 : BAND_H}
          />
        </group>
      ))}

      {/* What the corridor (or whatever else) does when this arrives. Only for
          the selected ghost: drawn for all of them at once it is a mess of
          overlapping bands, and it is only ever a question about one room.
          While previewing, the grown corridor is itself drawn, so a floor
          frame is all it needs. */}
      {selected &&
        ghost.grows.map((g) => (
          <Outline key={g.id} rect={g} color={color} opacity={0.4} height={previewing ? 0.14 : 0.5} />
        ))}

      {/* The tapped room's own label goes: the card at the bottom names it,
          and a chip floating over the walls being previewed only hides them. */}
      {!previewing && (
        <Html
          position={[rect.x + rect.w / 2, POST_H + 0.4, rect.z + rect.d / 2]}
          center
          // Behind the page's own chrome (z-30), in front of the scene.
          zIndexRange={[20, 10]}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              whiteSpace: "nowrap",
              fontSize: 11,
              fontWeight: 700,
              padding: dim ? "3px 5px" : "3px 7px",
              borderRadius: 8,
              background: selected ? color : dim ? "rgba(30,34,40,0.45)" : "rgba(20,24,30,0.82)",
              color: dim ? "rgba(255,255,255,0.6)" : affordable ? "#fff" : "#ffb4b4",
            }}
          >
            {dim ? (
              <IoLockClosed size={10} />
            ) : (
              <>
                <Icon size={11} />
                {price}
              </>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

export interface GhostsProps {
  ghosts: GhostRoom[];
  wallet: Record<Currency, number>;
  selectedRoomId: string | null;
  onPick?: (roomId: string) => void;
}

export const Ghosts = ({ ghosts, wallet, selectedRoomId, onPick }: GhostsProps) => {
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
          price={g.spec.price}
          onPick={onPick}
        />
      ))}
    </group>
  );
};
