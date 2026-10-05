import React, { useId } from "react";
import type { VocabImage } from "../../../services/storyServices";

interface VocabPictureProps {
  image: VocabImage;
  /** cover fills the frame and trims the edges; contain shows all of it. */
  fit?: "cover" | "contain";
  className?: string;
}

/**
 * A word's picture: a whole image, or a crop of a bigger one (the comic page,
 * or a sheet with one picture per word).
 *
 * The crop is an SVG viewBox over the image rather than a CSS background, so
 * it needs nothing but the stored box and aspect — no image measurement, no
 * container-query units — and the URL only ever lands in an attribute, never
 * in a CSS url() it could break out of. The image is laid out in units where
 * its width is 1; its height in those units follows from the crop's aspect.
 *
 * Decorative: whatever shows it labels the button it sits in with the word.
 */
export const VocabPicture: React.FC<VocabPictureProps> = ({ image, fit = "cover", className = "" }) => {
  // useId's ":r1:" / "«r1»" are not safe inside url(#…); keep word characters.
  const clipId = `vocab-pic-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const { url, box, aspect } = image;

  if (!box || !aspect) {
    return (
      <img
        src={url}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={`${className} ${fit === "cover" ? "object-cover" : "object-contain"} select-none`}
      />
    );
  }

  const imageHeight = box.w / (aspect * box.h);
  const view = { x: box.x, y: box.y * imageHeight, w: box.w, h: box.h * imageHeight };
  return (
    <svg
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      preserveAspectRatio={fit === "cover" ? "xMidYMid slice" : "xMidYMid meet"}
      aria-hidden="true"
      className={className}
    >
      {/* With `meet` the frame can be wider than the crop, and the rest of the
          page would show in the margin — so the image is clipped to the crop. */}
      <clipPath id={clipId}>
        <rect x={view.x} y={view.y} width={view.w} height={view.h} />
      </clipPath>
      <image
        href={url}
        x={0}
        y={0}
        width={1}
        height={imageHeight}
        preserveAspectRatio="none"
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
};

export default VocabPicture;
