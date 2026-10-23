import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { IoArrowForward, IoMicOutline, IoPlay, IoPlaySkipForward, IoTimeOutline } from "react-icons/io5";
import type { MicState, RepeatPhase } from "../hooks/useRepeatMode";

interface RepeatModeBarProps {
  phase: RepeatPhase;
  mic: MicState;
  /** The fixed wait in progress (no microphone), for the countdown bar; `id` is new per wait. */
  count: { ms: number; id: number };
  /** 0–1, read every frame while waiting for the student. */
  levelRef: React.MutableRefObject<number>;
  onSkip: () => void;
}

const BARS = 5;
// The middle bar reacts most, so it reads as a voice, not a meter.
const BAR_GAIN = [0.55, 0.8, 1, 0.8, 0.55];

/**
 * What «Повтори за мной» is doing right now, in one strip under the title:
 * listen (the sentence plays), your turn (the microphone is open and the bars
 * move with the student's voice), or a countdown when there is no microphone;
 * then a beat of «Хорошо, дальше» before the next sentence — a plain
 * go-ahead, not a grade, so no green tick.
 *
 * The bars are written straight to the DOM from a frame loop — the level
 * changes 60 times a second and a React render per frame is not needed for
 * five transforms.
 */
export const RepeatModeBar: React.FC<RepeatModeBarProps> = ({ phase, mic, count, levelRef, onSkip }) => {
  const { t } = useTranslation();
  const barsRef = useRef<HTMLSpanElement>(null);
  const live = phase === "wait" || phase === "hear";

  useEffect(() => {
    if (!live) return;
    let raf = 0;
    let smooth = 0;
    const tick = () => {
      // Quick to rise, slower to fall, like a VU meter.
      const level = levelRef.current;
      smooth = level > smooth ? level : smooth * 0.88 + level * 0.12;
      const bars = barsRef.current?.children;
      if (bars) {
        for (let i = 0; i < bars.length; i++) {
          const scale = 0.18 + Math.min(1, smooth * BAR_GAIN[i] * 1.6) * 0.82;
          (bars[i] as HTMLElement).style.transform = `scaleY(${scale.toFixed(3)})`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live, levelRef]);

  if (phase === "off") return null;

  const waiting = live || phase === "count";

  let icon: React.ReactNode;
  let text: string;
  if (phase === "listen") {
    icon = (
      <span className="flex h-4 items-end gap-[3px]" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-[3px] origin-bottom rounded-full bg-current repeat-listen-bar"
            style={{ animationDelay: `${i * 140}ms` }}
          />
        ))}
      </span>
    );
    text = t("repeatMode.listen");
  } else if (live) {
    icon = (
      <span className="relative grid h-7 w-7 place-items-center" aria-hidden="true">
        {phase === "wait" && <span className="absolute inset-0 rounded-full bg-white/40 repeat-ring" />}
        <span className="relative grid h-7 w-7 place-items-center rounded-full bg-white text-ink">
          <IoMicOutline size={16} />
        </span>
      </span>
    );
    text = phase === "hear" ? t("repeatMode.hearing") : t("repeatMode.yourTurn");
  } else if (phase === "count") {
    icon = <IoTimeOutline size={20} aria-hidden="true" />;
    text = t("repeatMode.sayAloud");
  } else if (phase === "next") {
    icon = (
      <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-ink quiz-pip-in" aria-hidden="true">
        <IoArrowForward size={16} />
      </span>
    );
    text = t("repeatMode.next");
  } else {
    icon = <IoPlay size={16} aria-hidden="true" />;
    text = mic === "asking" ? t("repeatMode.asking") : t("repeatMode.idle");
  }

  return (
    <div className="shrink-0 flex justify-center px-3 pb-2 md:px-0 md:pb-0 md:justify-start">
      <div
        role="status"
        aria-live="polite"
        className="relative flex min-h-11 w-full max-w-md items-center gap-3 overflow-hidden rounded-tile bg-ink/85 py-1.5 pl-3 pr-1.5 text-left text-panel-text shadow-lg repeat-bar-in"
      >
        <span className="grid w-7 shrink-0 place-items-center">{icon}</span>
        <span key={phase} className="min-w-0 flex-1 truncate text-sm font-semibold repeat-text-in">
          {text}
          {phase === "count" && mic === "off" && (
            // The crossed-out microphone in the header says it on a phone.
            <span className="ml-2 hidden font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-panel-dim sm:inline">
              {t("repeatMode.noMic")}
            </span>
          )}
        </span>

        {live && (
          <span ref={barsRef} className="flex h-5 shrink-0 items-center gap-[3px]" aria-hidden="true">
            {Array.from({ length: BARS }, (_, i) => (
              <span
                key={i}
                className={`h-5 w-[3px] rounded-full transition-colors ${phase === "hear" ? "bg-white" : "bg-white/45"}`}
                style={{ transform: "scaleY(0.18)" }}
              />
            ))}
          </span>
        )}

        {waiting ? (
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1 rounded-[3px] px-2.5 text-xs font-semibold text-panel-dim transition-colors hover:bg-white/10 hover:text-panel-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          >
            {t("repeatMode.skip")}
            <IoPlaySkipForward size={13} aria-hidden="true" />
          </button>
        ) : (
          <span className="w-1.5 shrink-0" />
        )}

        {phase === "count" && (
          // Remounted per wait (the key), so the bar always starts full.
          <span
            key={count.id}
            className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-white/70 repeat-countdown"
            style={{ animationDuration: `${count.ms}ms` }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
};

RepeatModeBar.displayName = "RepeatModeBar";
export default RepeatModeBar;
