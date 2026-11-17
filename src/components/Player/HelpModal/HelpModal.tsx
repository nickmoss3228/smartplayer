import React, { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { IoChevronBack, IoChevronForward, IoClose, IoPause, IoPlay, IoReload } from "react-icons/io5";
import { MdSos } from "react-icons/md";
import { TimeMarker } from "../../../types";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  helpAudioUrls?: string[];
  timeMarkers: TimeMarker[];
  initialMarkerIndex: number;
}

const fmt = (s: number): string => {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

// The SOS window: the sentence the student is stuck on, recorded again in
// short phrases at normal speed (one clip per marker, uploaded in the Story
// Builder's SOS tab). It plays as soon as it opens, since pressing SOS already
// says "play me this sentence", and again on every Previous / Next.
const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  helpAudioUrls,
  timeMarkers,
  initialMarkerIndex,
}) => {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number | null>(null);
  // Play the next clip once it has loaded: true on open and on Previous/Next.
  const autoplayRef = useRef(false);

  const [markerIdx, setMarkerIdx] = useState(initialMarkerIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [segDur, setSegDur] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const total = timeMarkers.length;
  const currentUrl = helpAudioUrls?.[markerIdx] || "";

  useEffect(() => {
    if (isOpen) {
      setMarkerIdx(initialMarkerIndex);
      autoplayRef.current = true;
    } else {
      audioRef.current?.pause();
      setIsPlaying(false);
      autoplayRef.current = false;
    }
  }, [isOpen, initialMarkerIndex]);

  // Swap the clip whenever the sentence changes.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
    setIsLoaded(false);
    setLoadError(false);
    setProgress(0);
    setElapsed(0);
    setSegDur(0);
    audio.load();
  }, [markerIdx, currentUrl, isOpen]);

  useEffect(() => {
    if (!isPlaying) return;
    const tick = () => {
      const audio = audioRef.current;
      if (!audio) return;
      const dur = audio.duration || 0;
      setElapsed(audio.currentTime);
      setProgress(dur > 0 ? audio.currentTime / dur : 0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isPlaying]);

  const canInteract = isLoaded && !loadError && !!currentUrl;

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      // Autoplay refused (some mobile browsers): the play button still works.
      setIsPlaying(false);
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !canInteract) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      void play();
    }
  }, [isPlaying, canInteract, play]);

  const handleReplay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !canInteract) return;
    audio.currentTime = 0;
    void play();
  }, [canInteract, play]);

  const go = useCallback(
    (step: number) => {
      const next = markerIdx + step;
      if (next < 0 || next >= total) return;
      autoplayRef.current = true;
      setMarkerIdx(next);
    },
    [markerIdx, total],
  );

  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !canInteract) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.currentTime = ratio * (audio.duration || 0);
      setProgress(ratio);
    },
    [canInteract],
  );

  if (!isOpen) return null;

  const canPrev = markerIdx > 0;
  const canNext = markerIdx < total - 1;
  const navButton =
    "flex flex-1 items-center justify-center gap-1 rounded-[3px] bg-gray-50 py-2.5 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="dialog-backdrop-in absolute inset-0 bg-black/60" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sos-title"
        className="dialog-panel-in relative z-10 w-full rounded-t-[3px] bg-white shadow-xl sm:max-w-sm sm:rounded-[3px]"
      >
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-9 rounded-full bg-gray-200" />
        </div>

        <div className="flex flex-col gap-5 px-6 pb-8 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 select-none items-center justify-center rounded-[3px] bg-gray-100">
                <MdSos size={24} aria-hidden />
              </div>
              <div>
                <p id="sos-title" className="text-sm font-bold leading-tight text-gray-800">{t("helpModal.title")}</p>
                <p className="text-xs text-gray-500">{t("helpModal.subtitle", { n: markerIdx + 1, total })}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("helpModal.close")}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <IoClose size={18} aria-hidden />
            </button>
          </div>

          <audio
            ref={audioRef}
            src={currentUrl || undefined}
            preload="auto"
            onLoadedMetadata={(e) => {
              const dur = e.currentTarget.duration;
              setSegDur(isFinite(dur) ? dur : 0);
              setIsLoaded(true);
              setLoadError(false);
              if (autoplayRef.current) {
                autoplayRef.current = false;
                void play();
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              setProgress(0);
              setElapsed(0);
              if (audioRef.current) audioRef.current.currentTime = 0;
            }}
            onError={() => {
              if (!currentUrl) return;
              setIsLoaded(false);
              setLoadError(true);
            }}
          />

          {!currentUrl && <p className="text-center text-xs text-amber-600">{t("helpModal.noClip")}</p>}
          {loadError && <p className="text-center text-xs text-red-500">{t("helpModal.loadError")}</p>}

          <div className="flex flex-col gap-1.5">
            <div className="group relative h-2 cursor-pointer overflow-visible rounded-full bg-gray-100" onClick={handleBarClick}>
              <div className="absolute inset-y-0 left-0 rounded-full bg-gray-900" style={{ width: `${progress * 100}%` }} />
              <div
                className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-gray-900 opacity-0 shadow ring-2 ring-white transition-opacity group-hover:opacity-100"
                style={{ left: `calc(${progress * 100}% - 7px)` }}
              />
            </div>
            <div className="flex justify-between text-[11px] tabular-nums text-gray-400">
              <span>{fmt(elapsed)}</span>
              <span>{segDur > 0 ? fmt(segDur) : "--:--"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => go(-1)} disabled={!canPrev} aria-label={t("helpModal.prev")} className={navButton}>
              <IoChevronBack aria-hidden />
            </button>

            <button
              type="button"
              onClick={handleReplay}
              disabled={!canInteract}
              aria-label={t("helpModal.replay")}
              className="rounded-[3px] bg-gray-50 p-2.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <IoReload size={18} aria-hidden />
            </button>

            <button
              type="button"
              onClick={handlePlayPause}
              disabled={!canInteract}
              aria-label={isPlaying ? t("helpModal.pause") : t("helpModal.play")}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white transition-all duration-150 hover:bg-gray-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPlaying ? <IoPause size={24} aria-hidden /> : <IoPlay size={24} className="ml-0.5" aria-hidden />}
            </button>

            <button type="button" onClick={() => go(1)} disabled={!canNext} aria-label={t("helpModal.next")} className={navButton}>
              <IoChevronForward aria-hidden />
            </button>
          </div>

          {!canInteract && !loadError && currentUrl && (
            <p className="-mt-1 animate-pulse text-center text-xs text-gray-400">{t("helpModal.loading")}</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default HelpModal;
