import React from 'react';
import { IoLockClosed, IoPersonOutline } from 'react-icons/io5';
import type { CastCard } from './castReveal';

/**
 * A character's face. Round, because faces are — the one round thing in a
 * square-cornered interface reads as "a person" at a glance.
 *
 *   portrait → the image, cropped toward the top (story covers are 4:5 with
 *              the face high in the frame)
 *   none yet → the name's first letter on a wash of the level's colour
 *   locked   → a silhouette on a dashed ring, with a padlock
 */
export const CastAvatar: React.FC<{ card: CastCard; accent: string; size: number }> = ({
  card,
  accent,
  size,
}) => {
  const box = { width: size, height: size };

  if (card.locked) {
    return (
      <span
        aria-hidden
        className="relative flex flex-none items-center justify-center rounded-full border border-dashed border-line-strong bg-room text-muted"
        style={box}
      >
        <IoPersonOutline style={{ width: size * 0.45, height: size * 0.45 }} />
        <span className="absolute -right-0.5 -bottom-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-white text-dim">
          <IoLockClosed className="h-2.5 w-2.5" />
        </span>
      </span>
    );
  }

  if (card.imageUrl) {
    return (
      <span
        aria-hidden
        className="flex-none overflow-hidden rounded-full bg-room"
        style={{ ...box, boxShadow: `0 0 0 2px ${accent}` }}
      >
        <img
          src={card.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-[50%_18%]"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className="flex flex-none items-center justify-center rounded-full font-extrabold text-ink"
      style={{
        ...box,
        fontSize: size * 0.4,
        background: `color-mix(in srgb, ${accent} 16%, white)`,
        boxShadow: `inset 0 0 0 1.5px ${accent}`,
      }}
    >
      {card.name.charAt(0).toUpperCase()}
    </span>
  );
};
