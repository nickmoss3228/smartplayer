// components/Admin/StoryBuilder/MarkerTrack.tsx
//
// The markers, drawn on the waveform rather than beside it.
//
// They used to live in a 12px strip underneath, which meant you could see that
// a marker existed but never that it sat two syllables into a word — the one
// thing the waveform is there to show. Putting them on the wave also makes
// them draggable, which turns "wrong by 200ms" from delete-and-redo into a
// nudge.
//
// It renders through a portal into WaveSurfer's own wrapper element (the same
// place the regions plugin appends to). That is what makes zoom work for free:
// the wrapper is the element that widens and scrolls, so a marker positioned
// at a percentage of it stays on its sample at any zoom.
//
// EVERY STYLE HERE IS INLINE, and has to be. WaveSurfer v7 renders into a
// shadow root, and a shadow root does not inherit the document's stylesheets —
// Tailwind classes on these elements would parse fine and apply nothing, which
// is a silent failure that looks like the markers never rendered at all.

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface MarkerTrackProps {
  /** WaveSurfer's wrapper, from ws.getWrapper(). Null until the wave exists. */
  wrapper: HTMLElement | null;
  duration: number;
  times: readonly number[];
  /** Index of the sentence being auditioned, or -1. */
  selected: number;
  onSelect: (index: number) => void;
  /** Fires continuously while dragging, so the wave and the clock keep up. */
  onDrag: (index: number, time: number) => void;
  /** Fires once, when the drag finishes — the point worth saving. */
  onDragEnd: () => void;
  /** Markers named by markerIssues(), drawn in amber so they stand out. */
  flagged: ReadonlySet<number>;
}

const SELECTED = "#f59e0b";
const FLAGGED = "#fbbf24";
const NORMAL = "#f43f5e";

const MarkerTrack = ({
  wrapper,
  duration,
  times,
  selected,
  onSelect,
  onDrag,
  onDragEnd,
  flagged,
}: MarkerTrackProps) => {
  // A drag has to survive the re-renders caused by its own onDrag calls, so
  // the in-flight gesture lives in a ref rather than in state.
  const drag = useRef<{ index: number; startX: number; startTime: number; moved: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (!wrapper) return;

    const onMove = (event: PointerEvent) => {
      const gesture = drag.current;
      if (!gesture) return;
      // The wrapper's own width is the zoomed width, so this stays honest at
      // any zoom level without the component knowing what the zoom is.
      const width = wrapper.getBoundingClientRect().width;
      if (width <= 0) return;
      const delta = ((event.clientX - gesture.startX) / width) * duration;
      if (Math.abs(event.clientX - gesture.startX) > 2) gesture.moved = true;
      onDrag(gesture.index, Math.min(duration, Math.max(0, gesture.startTime + delta)));
    };

    const onUp = () => {
      const gesture = drag.current;
      drag.current = null;
      if (gesture?.moved) onDragEnd();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [wrapper, duration, onDrag, onDragEnd]);

  if (!wrapper || duration <= 0) return null;

  const bandStart = selected >= 0 ? times[selected] : null;
  const bandEnd =
    selected >= 0 ? (selected + 1 < times.length ? times[selected + 1] : duration) : null;

  return createPortal(
    <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none" }}>
      {/* The sentence being auditioned, shaded across the wave — the thing a
          producer is actually judging when they press play. */}
      {bandStart !== null && bandEnd !== null && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${(bandStart / duration) * 100}%`,
            width: `${((bandEnd - bandStart) / duration) * 100}%`,
            background: "rgba(245, 158, 11, 0.18)",
            borderLeft: "1px solid rgba(245, 158, 11, 0.55)",
            borderRight: "1px solid rgba(245, 158, 11, 0.55)",
            boxSizing: "border-box",
          }}
        />
      )}

      {times.map((time, index) => {
        const isSelected = index === selected;
        const colour = isSelected ? SELECTED : flagged.has(index) ? FLAGGED : NORMAL;
        // The handle is centred on its line, so at the very ends half of it
        // falls outside the wave and the scroll container clips it. The first
        // marker is at 0:00 on every well-formed part, so this is the common
        // case, not an edge case.
        const fraction = time / duration;
        const handleLeft = fraction < 0.01 ? 0 : fraction > 0.99 ? -16 : -8;
        return (
          <div
            key={index}
            style={{ position: "absolute", top: 0, bottom: 0, left: `${(time / duration) * 100}%` }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: -1,
                width: 2,
                background: colour,
              }}
            />
            <button
              type="button"
              // The grab area is deliberately wider than the 2px line: the line
              // is the readable thing, the handle is the touchable thing.
              style={{
                position: "absolute",
                top: -2,
                left: handleLeft,
                width: 16,
                height: 16,
                padding: 0,
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.75)",
                background: colour,
                color: "#fff",
                font: "700 8px/1 ui-sans-serif, system-ui, sans-serif",
                fontVariantNumeric: "tabular-nums",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "grab",
                pointerEvents: "auto",
                transform: isSelected ? "scale(1.3)" : undefined,
                boxShadow: isSelected ? "0 0 0 2px rgba(245,158,11,0.35)" : undefined,
              }}
              title={`Sentence ${index + 1} starts here — drag to move`}
              aria-label={`Sentence ${index + 1} start, ${time.toFixed(2)} seconds`}
              onPointerDown={(event) => {
                // Without this, WaveSurfer's own wrapper click seeks the
                // playhead out from under the grab.
                event.stopPropagation();
                event.preventDefault();
                drag.current = { index, startX: event.clientX, startTime: time, moved: false };
                onSelect(index);
              }}
            >
              {index + 1}
            </button>
          </div>
        );
      })}
    </div>,
    wrapper,
  );
};

export default MarkerTrack;
