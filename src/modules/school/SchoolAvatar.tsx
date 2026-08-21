// modules/school/SchoolAvatar.tsx
//
// The player's avatar, drawn flat in SVG. It reuses the same customization
// data as the old 3D CharacterRig (skinTone plus the equipped hair/outfit/hat
// colours) — the plan kept "an avatar you dress up" and only changed how it is
// drawn, so the character catalogue and its purchases carry over unchanged.
//
// Animation is pure CSS keyframes on SVG groups. No animation library, no
// per-frame React state: a room's idle loop costs nothing while the tab sits
// open, which matters for a page a player leaves running.

import { useEffect, useMemo, useState } from "react";
import { getCharacterItem } from "../../config/characterCatalog";
import { CharacterState } from "../../types/Character";
import { SchoolAnim } from "../../config/schoolCatalog";

const DEFAULT_OUTFIT = "#7c8cd6";
const DEFAULT_HAIR = "#4a3a2f";

// Each animation is a class name; the keyframes live in the <style> block
// below. Keeping them here rather than in Tailwind config means the whole
// game ships as one lazy-loaded chunk with nothing to register globally.
const ANIM_CLASS: Record<SchoolAnim, string> = {
  write: "ds-write",
  read: "ds-read",
  listen: "ds-listen",
  paint: "ds-paint",
  sip: "ds-sip",
  bow: "ds-bow",
  stretch: "ds-stretch",
  cheer: "ds-cheer",
  ponder: "ds-ponder",
  browse: "ds-browse",
  nap: "ds-nap",
  dance: "ds-dance",
  note: "ds-note",
  brush: "ds-brush",
  admire: "ds-admire",
  toast: "ds-toast",
  chat: "ds-chat",
  spin: "ds-spin",
  applause: "ds-applause",
  water: "ds-water",
  gaze: "ds-gaze",
};

export const AVATAR_STYLES = `
@keyframes ds-bob      { 0%,100% { transform: translateY(0) }      50% { transform: translateY(-2px) } }
@keyframes ds-armSwing { 0%,100% { transform: rotate(-14deg) }     50% { transform: rotate(16deg) } }
@keyframes ds-armUp    { 0%,100% { transform: rotate(-6deg) }      50% { transform: rotate(-64deg) } }
@keyframes ds-lean     { 0%,100% { transform: rotate(0deg) }       50% { transform: rotate(-7deg) } }
@keyframes ds-sway     { 0%,100% { transform: rotate(-5deg) }      50% { transform: rotate(5deg) } }
@keyframes ds-nod      { 0%,100% { transform: translateY(0) }      50% { transform: translateY(2px) } }
@keyframes ds-spinY    { 0% { transform: scaleX(1) } 49% { transform: scaleX(0.1) } 50% { transform: scaleX(-0.1) } 99% { transform: scaleX(-1) } 100% { transform: scaleX(1) } }
@keyframes ds-clap     { 0%,100% { transform: translateX(0) }      50% { transform: translateX(5px) } }
@keyframes ds-lookUp   { 0%,100% { transform: rotate(0deg) }       50% { transform: rotate(-16deg) } }

.ds-avatar        { animation: ds-bob 3.2s ease-in-out infinite; }
.ds-write   .arm-r{ animation: ds-armSwing 1.5s ease-in-out infinite; transform-origin: 70% 34%; }
.ds-read    .body { animation: ds-lean 4s ease-in-out infinite; transform-origin: 50% 100%; }
.ds-listen  .head { animation: ds-nod 1.4s ease-in-out infinite; }
.ds-paint   .arm-r{ animation: ds-armSwing 1.1s ease-in-out infinite; transform-origin: 70% 34%; }
.ds-sip     .arm-l{ animation: ds-armUp 3s ease-in-out infinite; transform-origin: 30% 34%; }
.ds-bow     .body { animation: ds-lean 2.6s ease-in-out infinite; transform-origin: 50% 100%; }
.ds-stretch .arm-l{ animation: ds-armUp 4s ease-in-out infinite; transform-origin: 30% 34%; }
.ds-stretch .arm-r{ animation: ds-armUp 4s ease-in-out infinite 0.2s; transform-origin: 70% 34%; }
.ds-cheer   .arm-r{ animation: ds-armUp 1.8s ease-in-out infinite; transform-origin: 70% 34%; }
.ds-ponder  .head { animation: ds-lean 3.4s ease-in-out infinite; transform-origin: 50% 100%; }
.ds-browse  .body { animation: ds-sway 3s ease-in-out infinite; transform-origin: 50% 100%; }
.ds-nap     .body { animation: ds-lean 5s ease-in-out infinite; transform-origin: 50% 100%; }
.ds-dance   .body { animation: ds-sway 0.9s ease-in-out infinite; transform-origin: 50% 100%; }
.ds-note    .arm-r{ animation: ds-armSwing 1.2s ease-in-out infinite; transform-origin: 70% 34%; }
.ds-brush   .arm-r{ animation: ds-armSwing 0.8s ease-in-out infinite; transform-origin: 70% 34%; }
.ds-admire  .body { animation: ds-lean 4.5s ease-in-out infinite; transform-origin: 50% 100%; }
.ds-toast   .arm-r{ animation: ds-armUp 2.4s ease-in-out infinite; transform-origin: 70% 34%; }
.ds-chat    .head { animation: ds-nod 0.7s ease-in-out infinite; }
.ds-spin          { animation: ds-spinY 3.4s linear infinite; transform-origin: 50% 50%; }
.ds-applause .arm-l{ animation: ds-clap 0.5s ease-in-out infinite; }
.ds-applause .arm-r{ animation: ds-clap 0.5s ease-in-out infinite reverse; }
.ds-water   .body { animation: ds-lean 3s ease-in-out infinite; transform-origin: 50% 100%; }
.ds-gaze    .head { animation: ds-lookUp 5s ease-in-out infinite; transform-origin: 50% 100%; }

/* A player who has asked the OS for less motion gets a still avatar. The room
   still reads correctly — the pose is legible without the loop. */
@media (prefers-reduced-motion: reduce) {
  .ds-avatar, .ds-avatar * { animation: none !important; }
}
`;

interface SchoolAvatarProps {
  character: Pick<CharacterState, "skinTone" | "equipped"> | null;
  /** The room's free idle animation. */
  idleAnim: SchoolAnim;
  /** Extra animations the player has bought for this room (bitPhrase). */
  ownedAnims?: SchoolAnim[];
  size?: number;
}

export const SchoolAvatar = ({
  character,
  idleAnim,
  ownedAnims = [],
  size = 74,
}: SchoolAvatarProps) => {
  // Owned actions join the room's free idle in one rotation, so buying one
  // visibly adds to what the avatar does rather than replacing it.
  const cycle = useMemo<SchoolAnim[]>(
    () => [idleAnim, ...ownedAnims.filter((a) => a !== idleAnim)],
    [idleAnim, ownedAnims],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (cycle.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % cycle.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [cycle]);

  const skin = character?.skinTone ?? "#f2c48d";
  const outfit = character?.equipped.outfit ? getCharacterItem(character.equipped.outfit) : null;
  const hair = character?.equipped.hairstyle ? getCharacterItem(character.equipped.hairstyle) : null;
  const hat = character?.equipped.hat ? getCharacterItem(character.equipped.hat) : null;

  const outfitColor = outfit?.swatch.color ?? DEFAULT_OUTFIT;
  const hairColor = hair?.swatch.color ?? DEFAULT_HAIR;
  const anim = cycle[Math.min(index, cycle.length - 1)] ?? idleAnim;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`ds-avatar ${ANIM_CLASS[anim] ?? ""}`}
      role="img"
      aria-label="Your avatar"
    >
      <ellipse cx="50" cy="96" rx="18" ry="4" fill="#000" opacity="0.13" />

      <g className="body">
        {/* legs */}
        <rect x="41" y="72" width="7" height="20" rx="3" fill="#3f4657" />
        <rect x="52" y="72" width="7" height="20" rx="3" fill="#3f4657" />

        {/* torso */}
        <path d="M38 44 Q50 40 62 44 L64 74 L36 74 Z" fill={outfitColor} />

        {/* arms — named so the keyframes above can target one at a time */}
        <rect className="arm-l" x="28" y="46" width="7" height="24" rx="3.5" fill={outfitColor} />
        <rect className="arm-r" x="65" y="46" width="7" height="24" rx="3.5" fill={outfitColor} />
        <circle cx="31.5" cy="71" r="4" fill={skin} />
        <circle cx="68.5" cy="71" r="4" fill={skin} />

        <g className="head">
          <circle cx="50" cy="30" r="15" fill={skin} />
          {/* hair */}
          <path d="M35 29 Q35 14 50 14 Q65 14 65 29 Q58 21 50 22 Q42 21 35 29 Z" fill={hairColor} />
          {hair?.swatch.shape === "hair-long" && (
            <>
              <rect x="33" y="26" width="5" height="18" rx="2.5" fill={hairColor} />
              <rect x="62" y="26" width="5" height="18" rx="2.5" fill={hairColor} />
            </>
          )}
          {/* face */}
          <circle cx="44.5" cy="31" r="1.8" fill="#2b2b2b" />
          <circle cx="55.5" cy="31" r="1.8" fill="#2b2b2b" />
          <path d="M46 37 Q50 40 54 37" stroke="#2b2b2b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {hat && (
            <>
              <ellipse cx="50" cy="18" rx="18" ry="4.5" fill={hat.swatch.color} />
              <path d="M39 18 Q39 8 50 8 Q61 8 61 18 Z" fill={hat.swatch.color} />
            </>
          )}
        </g>
      </g>
    </svg>
  );
};
