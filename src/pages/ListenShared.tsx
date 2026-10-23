import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { buttonPrimary } from "../components/ui/buttonStyles";
import { AudioScrubber } from "../components/Player/RepeatMode/AudioScrubber";
import { fetchVoiceShare, voiceShareAudioUrl, type VoiceShare } from "../services/voiceShareServices";

type State = { status: "loading" } | { status: "gone" } | { status: "error" } | { status: "ready"; share: VoiceShare };

/**
 * A shared «Послушай себя» recording: what a share link opens. Public — the
 * person listening (a parent, a teacher, a friend) has no account — and
 * never indexed. The link's id is the only key; there is nothing to browse.
 */
const ListenShared = () => {
  const { t } = useTranslation();
  const { shareId = "" } = useParams<{ shareId: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetchVoiceShare(shareId)
      .then((share) => {
        if (!cancelled) setState(share ? { status: "ready", share } : { status: "gone" });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  const share = state.status === "ready" ? state.share : null;
  const title = share
    ? share.storyTitle
      ? t("listenShared.title", { story: share.storyTitle, part: share.part })
      : t("listenShared.titleNoStory", { part: share.part })
    : "";

  return (
    <div className="min-h-dvh flex flex-col bg-room pt-14 sm:pt-20">
      <title>{share ? `${title} · ${t("brand")}` : t("brand")}</title>
      <meta name="robots" content="noindex, nofollow" />

      <div className="flex flex-1 items-center justify-center px-4 py-6 sm:py-10">
        <section className="flex w-full max-w-md flex-col gap-5 rounded-card bg-ink px-5 pb-6 pt-6 text-panel-text shadow-xl dialog-panel-in sm:px-7">
          {state.status === "gone" || state.status === "error" ? (
            <div className="flex flex-col gap-2 py-6 text-center">
              <h1 className="text-[22px] font-extrabold leading-tight tracking-tight">
                {state.status === "gone" ? t("listenShared.goneTitle") : t("listenShared.errorTitle")}
              </h1>
              <p className="text-sm text-panel-dim">
                {state.status === "gone" ? t("listenShared.goneBody") : t("listenShared.errorBody")}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-panel-dim">
                  {t("listenShared.eyebrow")}
                </span>
                <h1 className="min-h-[1.2em] text-balance text-[24px] font-extrabold leading-tight tracking-tight sm:text-[28px]">
                  {title}
                </h1>
                {share && (
                  <p className="text-sm text-panel-dim">
                    {share.partTitle ? `${share.partTitle} · ` : ""}
                    {share.kind === "dialogue" ? t("listenShared.dialogue") : t("listenShared.me")}
                  </p>
                )}
              </div>
              <div className="py-3">
                <AudioScrubber
                  url={share ? voiceShareAudioUrl(share.id) : null}
                  pendingText={t("listenShared.loading")}
                />
              </div>
            </>
          )}
        </section>
      </div>

      <div className="flex justify-center px-4 pb-10">
        <Link to="/" className={buttonPrimary}>
          {t("listenShared.cta")}
        </Link>
      </div>
    </div>
  );
};

export default ListenShared;
