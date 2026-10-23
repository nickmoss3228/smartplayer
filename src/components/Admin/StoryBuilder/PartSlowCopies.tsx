import { useCallback, useEffect, useRef, useState } from "react";
import { IoRefreshOutline, IoTrashOutline, IoTimeOutline } from "react-icons/io5";
import {
  SLOW_SPEEDS,
  StoryPart,
  makeSlowAudio,
  removeSlowAudio,
} from "../../../services/adminStoryServices";
import AudioPreview from "./AudioPreview";

interface PartSlowCopiesProps {
  token: string;
  storyId: string;
  part: StoryPart;
  onPartUpdated: (part: StoryPart) => void;
  /** True right after a new recording was uploaded in this editor: make the copies without asking. */
  autoStart: boolean;
}

type Busy = "make" | "remove" | null;

/**
 * The part's slowed copies: the 0.65x and 0.8x versions the player plays
 * instead of stretching the recording itself, which sounds echoey. They are
 * made on the server (audio-worker) in a few seconds per speed, and replaced
 * whenever the recording is.
 */
const PartSlowCopies = ({ token, storyId, part, onPartUpdated, autoStart }: PartSlowCopiesProps) => {
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState("");
  const [switchedOff, setSwitchedOff] = useState(false);
  const autoStartedFor = useRef<string | null>(null);

  const slow = part.slowAudio ?? null;
  const fresh = Boolean(slow && part.audioUrl && slow.source === part.audioUrl);

  const run = useCallback(
    async (what: Exclude<Busy, null>) => {
      setBusy(what);
      setError("");
      try {
        const updated =
          what === "make"
            ? await makeSlowAudio(token, storyId, part.partNumber)
            : await removeSlowAudio(token, storyId, part.partNumber);
        onPartUpdated(updated);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong.";
        // The server answers 503 when it has no audio worker: say so once, quietly.
        if (/switched off/i.test(message)) setSwitchedOff(true);
        else setError(message);
      } finally {
        setBusy(null);
      }
    },
    [token, storyId, part.partNumber, onPartUpdated],
  );

  useEffect(() => {
    if (!autoStart || !part.audioUrl || fresh || busy) return;
    if (autoStartedFor.current === part.audioUrl) return;
    autoStartedFor.current = part.audioUrl;
    void run("make");
  }, [autoStart, part.audioUrl, fresh, busy, run]);

  if (!part.audioUrl) return null;

  const status = busy === "make"
    ? { text: "Making…", className: "text-gray-600 bg-gray-50 border-gray-200" }
    : fresh
      ? { text: "Ready", className: "text-green-700 bg-green-50 border-green-200" }
      : slow
        ? { text: "Out of date", className: "text-amber-700 bg-amber-50 border-amber-200" }
        : { text: "None yet", className: "text-gray-600 bg-gray-50 border-gray-200" };

  return (
    <section className="rounded-[3px] border border-gray-200 bg-white px-3 py-3 space-y-2" aria-labelledby={`slow-${part.partNumber}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <IoTimeOutline className="text-gray-400" aria-hidden="true" />
        <h4 id={`slow-${part.partNumber}`} className="text-sm font-semibold text-black">
          Slow copies
        </h4>
        <span className={`text-[11px] font-semibold rounded-[2px] border px-2 py-0.5 ${status.className}`}>
          {status.text}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => void run("make")}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-[3px] px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
          >
            <IoRefreshOutline aria-hidden="true" />
            {fresh ? "Make again" : "Make slow copies"}
          </button>
          {slow && (
            <button
              type="button"
              onClick={() => void run("remove")}
              disabled={busy !== null}
              title="The player stretches the recording itself again"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 rounded-[3px] px-2 py-1.5 hover:bg-gray-100 disabled:opacity-40"
            >
              <IoTrashOutline aria-hidden="true" />
              Remove
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        At 0.65× and 0.8× the player plays these instead of stretching the recording, which sounds
        echoey. They take a few seconds per speed and are made again whenever the recording changes.
        {!fresh && slow && " These were made from an earlier recording, so the player is not using them."}
      </p>

      {fresh && slow && (
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {SLOW_SPEEDS.filter((speed) => slow.copies[speed]).map((speed) => (
            <li key={speed} className="flex items-center gap-2 text-xs text-gray-600">
              <span className="font-semibold tabular-nums text-black">{speed}×</span>
              <AudioPreview url={slow.copies[speed]} label={`${speed}× copy`} />
            </li>
          ))}
        </ul>
      )}

      {switchedOff && (
        <p className="text-xs text-gray-500">
          This server has no audio worker (AUDIO_WORKER_URL is not set), so the player stretches the
          recording itself.
        </p>
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </section>
  );
};

export default PartSlowCopies;
