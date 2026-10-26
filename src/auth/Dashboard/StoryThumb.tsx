// auth/Dashboard/StoryThumb.tsx
//
// A story's small picture in the Dashboard's level window: its cover art, the
// same picture its card on the Stories page shows. A story with no art (news,
// or one the published list no longer carries) gets a drawn icon in the
// level's tint. Never the story's characterIcon: that is an emoji.
import React from "react";
import { IoBookOutline, IoNewspaperOutline } from "react-icons/io5";
import type { StoryGroup } from "../../types/storyGroups";

/**
 * Stories on one level share a character portrait, so siblings get different
 * crops of it. Same table and hash as the Stories page's StoryCard, so a story
 * shows the same part of the picture in both places.
 */
const CROPS = ["50% 18%", "32% 40%", "68% 32%", "50% 62%", "22% 55%", "78% 50%"];

const cropFor = (slug: string) => {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return CROPS[hash % CROPS.length];
};

interface StoryThumbProps {
  slug: string;
  group?: StoryGroup;
  /** The level's soft tint and icon colour (getDifficultyTheme) */
  softClass: string;
  textClass: string;
}

const StoryThumb: React.FC<StoryThumbProps> = ({ slug, group, softClass, textClass }) => {
  if (group?.cover) {
    return (
      <img
        src={group.cover}
        alt=""
        loading="lazy"
        decoding="async"
        style={{ objectPosition: cropFor(slug) }}
        className="w-10 h-10 flex-shrink-0 rounded-tile object-cover bg-gray-900"
      />
    );
  }
  const Icon = group?.category === "news" ? IoNewspaperOutline : IoBookOutline;
  return (
    <span
      className={`w-10 h-10 flex-shrink-0 rounded-tile flex items-center justify-center ${softClass}`}
      aria-hidden="true"
    >
      <Icon size={20} className={textClass} />
    </span>
  );
};

export default StoryThumb;
