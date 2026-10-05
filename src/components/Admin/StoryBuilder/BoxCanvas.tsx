import React, { useRef, useState } from "react";
import {
  boxFromPoints,
  isUsableBox,
  moveBox,
  resizeBox,
  type Box,
  type Corner,
} from "../../../modules/comicPractice/boxes";

export type BoxTone = "default" | "selected" | "accent" | "done" | "muted";

interface BoxCanvasProps {
  src: string;
  boxes: Box[];
  /** Index into `boxes`, or null. Selected boxes get handles when editable. */
  selected: number | null;
  onSelect?: (index: number | null) => void;
  /** Present: a drag on empty image space draws a box and hands it here. */
  onDraw?: (box: Box) => void;
  /** Present: boxes can be moved and resized; the whole list comes back. */
  onBoxesChange?: (boxes: Box[]) => void;
  /** Present: a click on a box goes here instead of selecting or moving it. */
  onBoxClick?: (index: number) => void;
  label?: (index: number) => React.ReactNode;
  tone?: (index: number) => BoxTone;
  onNaturalSize?: (width: number, height: number) => void;
  /** Tailwind max-height for the image, so a tall page fits the panel. */
  maxHeightClass?: string;
}

type Drag =
  | { kind: "draw"; ax: number; ay: number }
  | { kind: "move"; index: number; px: number; py: number; start: Box }
  | { kind: "resize"; index: number; corner: Corner; start: Box };

const TONES: Record<BoxTone, string> = {
  default: "border-amber-400 bg-amber-300/10",
  selected: "border-amber-500 bg-amber-300/25 border-[3px]",
  accent: "border-sky-500 bg-sky-400/30 border-[3px]",
  done: "border-emerald-500 bg-emerald-400/15",
  muted: "border-gray-400 border-dashed bg-black/10",
};

const CORNERS: { corner: Corner; className: string }[] = [
  { corner: "nw", className: "-left-1.5 -top-1.5 cursor-nwse-resize" },
  { corner: "ne", className: "-right-1.5 -top-1.5 cursor-nesw-resize" },
  { corner: "sw", className: "-left-1.5 -bottom-1.5 cursor-nesw-resize" },
  { corner: "se", className: "-right-1.5 -bottom-1.5 cursor-nwse-resize" },
];

/**
 * An image with rectangles on it, kept as fractions of the image (see
 * modules/comicPractice/boxes.ts). The Builder uses it twice: for the panels
 * of a comic page, and for cutting word pictures out of a page or a sheet.
 *
 * The wrapper shrink-wraps the <img>, so a percentage inside it is a
 * percentage of the picture itself — which is what makes the stored fractions
 * land in the same place on the student's phone.
 */
const BoxCanvas = ({
  src,
  boxes,
  selected,
  onSelect,
  onDraw,
  onBoxesChange,
  onBoxClick,
  label,
  tone,
  onNaturalSize,
  maxHeightClass = "max-h-[70vh]",
}: BoxCanvasProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [draft, setDraft] = useState<Box | null>(null);

  const toFraction = (e: React.PointerEvent) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    const p = toFraction(e);
    const handle = target.closest<HTMLElement>("[data-handle]");
    const boxEl = target.closest<HTMLElement>("[data-box]");

    if (handle && onBoxesChange) {
      const index = Number(handle.dataset.box);
      dragRef.current = { kind: "resize", index, corner: handle.dataset.handle as Corner, start: boxes[index] };
    } else if (boxEl) {
      const index = Number(boxEl.dataset.box);
      if (onBoxClick) {
        onBoxClick(index);
        return;
      }
      onSelect?.(index);
      if (onBoxesChange) dragRef.current = { kind: "move", index, px: p.x, py: p.y, start: boxes[index] };
    } else {
      onSelect?.(null);
      if (onDraw) dragRef.current = { kind: "draw", ax: p.x, ay: p.y };
    }
    if (dragRef.current) {
      e.preventDefault();
      wrapRef.current!.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = toFraction(e);
    if (drag.kind === "draw") {
      setDraft(boxFromPoints(drag.ax, drag.ay, p.x, p.y));
      return;
    }
    const next =
      drag.kind === "move"
        ? moveBox(drag.start, p.x - drag.px, p.y - drag.py)
        : resizeBox(drag.start, drag.corner, p.x, p.y);
    if (drag.kind === "resize" && !isUsableBox(next)) return;
    onBoxesChange?.(boxes.map((b, i) => (i === drag.index ? next : b)));
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.kind === "draw" && draft && isUsableBox(draft)) onDraw?.(draft);
    setDraft(null);
  };

  const pct = (b: Box): React.CSSProperties => ({
    left: `${b.x * 100}%`,
    top: `${b.y * 100}%`,
    width: `${b.w * 100}%`,
    height: `${b.h * 100}%`,
  });

  return (
    <div
      ref={wrapRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`relative inline-block align-top select-none touch-none ${onDraw ? "cursor-crosshair" : ""}`}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        onLoad={(e) => onNaturalSize?.(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
        className={`block w-auto max-w-full ${maxHeightClass} rounded-[3px]`}
      />
      {boxes.map((b, i) => {
        const look = tone?.(i) ?? (selected === i ? "selected" : "default");
        return (
          <div
            key={i}
            data-box={i}
            className={`absolute border-2 rounded-[2px] ${TONES[look]} ${
              onBoxClick ? "cursor-pointer hover:bg-sky-300/30" : onBoxesChange ? "cursor-move" : ""
            }`}
            style={pct(b)}
          >
            {label && (
              <span className="absolute left-0 top-0 max-w-full truncate bg-black/75 text-white text-[11px] font-mono leading-none px-1 py-0.5 rounded-br-[2px] pointer-events-none">
                {label(i)}
              </span>
            )}
            {selected === i &&
              onBoxesChange &&
              CORNERS.map(({ corner, className }) => (
                <span
                  key={corner}
                  data-box={i}
                  data-handle={corner}
                  className={`absolute w-3 h-3 bg-white border-2 border-amber-500 rounded-full ${className}`}
                />
              ))}
          </div>
        );
      })}
      {draft && (
        <div className="absolute border-2 border-dashed border-sky-500 bg-sky-400/20 pointer-events-none" style={pct(draft)} />
      )}
    </div>
  );
};

export default BoxCanvas;
