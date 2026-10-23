import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoPause, IoPlay } from "react-icons/io5";

interface AudioScrubberProps {
  /** null while the track is being made or fetched. */
  url: string | null;
  /** Shown in place of the length while `url` is null. */
  pendingText: string;
}

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

const clock = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/**
 * A big play button over a seekable bar, on the ink panel — the playback in
 * «Послушай себя» and on a shared recording's page. Give it a new `key` when
 * the track changes so it starts from the top.
 */
export const AudioScrubber: React.FC<AudioScrubberProps> = ({ url, pendingText }) => {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // The bar follows the audio every frame while it plays; timeupdate alone
  // moves it in visible steps.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio && audio.duration) {
        if (fillRef.current) fillRef.current.style.transform = `scaleX(${audio.currentTime / audio.duration})`;
        setTime(audio.currentTime);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || !url) return;
    if (audio.paused) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = value;
    setTime(value);
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${value / duration})`;
  };

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <button
        type="button"
        onClick={toggle}
        disabled={!url}
        aria-label={playing ? t("repeatMode.pause") : t("repeatMode.play")}
        className={`grid h-20 w-20 place-items-center rounded-full bg-panel-text text-ink shadow-lg transition-transform active:scale-95 disabled:opacity-40 ${focus}`}
      >
        {playing ? <IoPause size={34} /> : <IoPlay size={34} className="translate-x-[2px]" />}
      </button>

      <div className="flex w-full max-w-md flex-col gap-2">
        <div className="relative h-11">
          <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
            <span ref={fillRef} className="absolute inset-0 origin-left bg-panel-text" style={{ transform: "scaleX(0)" }} />
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={time}
            onChange={(e) => seek(Number(e.target.value))}
            disabled={!url}
            aria-label={t("repeatMode.position")}
            className={`absolute inset-0 h-full w-full cursor-pointer opacity-0 ${focus}`}
          />
        </div>
        <div className="flex justify-between font-mono text-[11px] tabular-nums text-panel-dim">
          <span>{clock(time)}</span>
          <span>{url && duration ? clock(duration) : pendingText}</span>
        </div>
      </div>

      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="auto"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            seek(0);
          }}
        />
      )}
    </div>
  );
};

AudioScrubber.displayName = "AudioScrubber";
export default AudioScrubber;
