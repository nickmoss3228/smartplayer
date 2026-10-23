import React, { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { IoClose, IoCopyOutline, IoShareSocialOutline } from "react-icons/io5";
import { AudioScrubber } from "./AudioScrubber";

type TrackKind = "me" | "dialogue";

interface RepeatReplayProps {
  /** The part, as students count it. */
  part: number;
  /** How many sentences the student said. */
  count: number;
  /** Builds the track (useRepeatMode.buildTrack); the URL is revoked here. */
  build: (kind: TrackKind) => Promise<string | null>;
  /** Uploads this version and resolves to the link that plays it; absent = no sharing. */
  share?: (kind: TrackKind) => Promise<{ url: string; expiresAt: string }>;
  onClose: () => void;
}

type ShareState =
  | { step: "idle" | "confirm" | "uploading" | "error" }
  | { step: "done"; url: string; expiresAt: string };

const micro = "font-mono text-[10px] uppercase tracking-[0.16em] text-panel-dim";
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";
const panelButton = `inline-flex min-h-11 items-center justify-center gap-2 rounded-[3px] px-4 text-sm font-semibold transition-colors ${focus}`;

/**
 * «Послушай себя» — the part as the student said it in «Повтори за мной»,
 * opened from the practice window. Two versions of one recording: the
 * student alone, or the narrator's sentence before each of theirs.
 *
 * «Поделиться» uploads the version on screen and makes a link anyone can open
 * (pages/ListenShared.tsx). It asks first: until then nothing leaves the device.
 *
 * Same ink card as the word game, so it reads as one of the practice games.
 */
export const RepeatReplay: React.FC<RepeatReplayProps> = ({ part, count, build, share, onClose }) => {
  const { t, i18n } = useTranslation();
  const titleId = useId();
  const [kind, setKind] = useState<TrackKind>("me");
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // One link per version, kept while the view is open.
  const [shares, setShares] = useState<Record<TrackKind, ShareState>>({
    me: { step: "idle" },
    dialogue: { step: "idle" },
  });
  const [copied, setCopied] = useState(false);
  const shareState = shares[kind];
  const setShare = (state: ShareState) => setShares((prev) => ({ ...prev, [kind]: state }));

  useEffect(() => {
    let cancelled = false;
    let made: string | null = null;
    setUrl(null);
    setFailed(false);
    build(kind)
      .then((u) => {
        made = u;
        if (cancelled) {
          if (u) URL.revokeObjectURL(u);
          return;
        }
        if (u) setUrl(u);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [kind, build]);

  const createLink = async () => {
    if (!share) return;
    const forKind = kind;
    setShares((prev) => ({ ...prev, [forKind]: { step: "uploading" } }));
    try {
      const made = await share(forKind);
      setShares((prev) => ({ ...prev, [forKind]: { step: "done", ...made } }));
    } catch {
      setShares((prev) => ({ ...prev, [forKind]: { step: "error" } }));
    }
  };

  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // The field is selectable; copying by hand still works.
    }
  };

  const until = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "long" });

  const versionName = kind === "me" ? t("repeatMode.onlyMe") : t("repeatMode.dialogue");

  return (
    <section
      aria-labelledby={titleId}
      className="relative flex min-h-0 w-full flex-1 flex-col gap-4 overflow-y-auto rounded-card bg-ink px-4 pb-4 pt-5 text-left text-panel-text shadow-xl dialog-panel-in sm:px-6 md:mx-auto md:max-w-[680px]"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("practice.close")}
        className={`absolute right-1.5 top-1.5 grid h-11 w-11 place-items-center text-panel-dim transition-colors hover:text-panel-text ${focus}`}
      >
        <IoClose size={20} />
      </button>

      <div className="flex flex-col gap-1 pr-10">
        <span className={micro}>{t("repeatMode.replayEyebrow", { n: part })}</span>
        <h2 id={titleId} className="text-[22px] font-extrabold leading-tight tracking-tight md:text-[28px]">
          {t("practice.voiceTitle")}
        </h2>
        <p className="text-sm text-panel-dim">
          {t("practice.lines", { count })} · {t("repeatMode.replayNote")}
        </p>
      </div>

      <div role="radiogroup" aria-label={t("practice.voiceTitle")} className="grid grid-cols-2 gap-1 rounded-tile bg-white/[0.06] p-1">
        {(["me", "dialogue"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`min-h-11 rounded-[3px] text-sm font-semibold transition-colors ${focus} ${
              kind === k ? "bg-panel-text text-ink" : "text-panel-dim hover:text-panel-text"
            }`}
          >
            {k === "me" ? t("repeatMode.onlyMe") : t("repeatMode.dialogue")}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-4">
        <AudioScrubber
          key={url ?? "pending"}
          url={url}
          pendingText={failed ? t("repeatMode.replayError") : t("repeatMode.preparing")}
        />
      </div>

      {share && (
        <div className="flex flex-col gap-2" aria-live="polite">
          {shareState.step === "idle" && (
            <button
              type="button"
              onClick={() => setShare({ step: "confirm" })}
              disabled={!url}
              className={`${panelButton} self-center border border-panel-line text-panel-text hover:border-panel-dim disabled:opacity-40`}
            >
              <IoShareSocialOutline size={18} aria-hidden="true" />
              {t("repeatMode.share")}
            </button>
          )}

          {shareState.step === "confirm" && (
            <div className="flex flex-col gap-3 rounded-tile border border-panel-line p-3 repeat-text-in">
              <p className="text-sm leading-relaxed">{t("repeatMode.shareConfirm", { version: versionName })}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={createLink} className={`${panelButton} bg-panel-text text-ink`}>
                  {t("repeatMode.shareCreate")}
                </button>
                <button
                  type="button"
                  onClick={() => setShare({ step: "idle" })}
                  className={`${panelButton} text-panel-dim hover:text-panel-text`}
                >
                  {t("repeatMode.shareCancel")}
                </button>
              </div>
            </div>
          )}

          {shareState.step === "uploading" && (
            <p className="flex min-h-11 items-center justify-center gap-2 text-sm text-panel-dim">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-panel-dim border-t-transparent" aria-hidden="true" />
              {t("repeatMode.shareUploading")}
            </p>
          )}

          {shareState.step === "error" && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <p className="text-sm text-panel-dim">{t("repeatMode.shareError")}</p>
              <button type="button" onClick={createLink} className={`${panelButton} border border-panel-line text-panel-text`}>
                {t("repeatMode.shareRetry")}
              </button>
            </div>
          )}

          {shareState.step === "done" && (
            <div className="flex flex-col gap-2 rounded-tile border border-panel-line p-3 repeat-text-in">
              <span className={micro}>{t("repeatMode.shareReady", { version: versionName })}</span>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareState.url}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label={t("repeatMode.shareLink")}
                  className={`min-h-11 min-w-0 flex-1 rounded-[3px] border border-panel-line bg-white/[0.04] px-3 font-mono text-xs text-panel-text ${focus}`}
                />
                <button
                  type="button"
                  onClick={() => copy(shareState.url)}
                  className={`${panelButton} shrink-0 bg-panel-text text-ink`}
                >
                  <IoCopyOutline size={16} aria-hidden="true" />
                  {copied ? t("repeatMode.shareCopied") : t("repeatMode.shareCopy")}
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-panel-dim">{t("repeatMode.shareUntil", { date: until(shareState.expiresAt) })}</span>
                {typeof navigator.share === "function" && (
                  <button
                    type="button"
                    onClick={() => navigator.share({ url: shareState.url, title: t("practice.voiceTitle") }).catch(() => {})}
                    className={`${panelButton} min-h-9 px-3 text-xs text-panel-dim hover:text-panel-text`}
                  >
                    <IoShareSocialOutline size={15} aria-hidden="true" />
                    {t("repeatMode.shareSend")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <button type="button" onClick={onClose} className={`min-h-11 self-center px-4 text-sm font-semibold text-panel-dim hover:text-panel-text ${focus}`}>
        {t("repeatMode.done")}
      </button>
    </section>
  );
};

RepeatReplay.displayName = "RepeatReplay";
export default RepeatReplay;
