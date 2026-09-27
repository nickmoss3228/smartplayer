// modules/school/TeacherNotes.tsx
//
// A member of staff speaking up every few minutes — see staffNotes.ts for who
// says what, and in what order. This is only the card and its clock.
//
// It shares a corner with the advisor and never shows at the same time: the
// advisor has a chore for you, and a note about lunch should not crowd out the
// one about wages. When now is a bad moment — building, customizing, the
// advisor talking, a new room being unveiled — the note waits half a minute
// and tries again rather than being lost.

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { IoClose, IoEyeOutline } from "react-icons/io5";
import {
  NOTE_EVERY_MS,
  NOTE_FIRST_MS,
  NOTE_RETRY_MS,
  NOTE_SHOW_MS,
  NoteContext,
  StaffNote,
  noteAt,
} from "./staffNotes";
import { schoolNow } from "./schoolClock";

const INDEX_KEY = "school.noteIndex";

/** Where in the rota this visit is up to. Per tab session, so a reload does
 *  not replay the same line, and wrapped in try/catch because storage can be
 *  unavailable (private windows) — which just means starting from the top. */
function nextIndex(): number {
  let i = 0;
  try {
    i = Number(sessionStorage.getItem(INDEX_KEY) ?? "0") || 0;
    sessionStorage.setItem(INDEX_KEY, String(i + 1));
  } catch {
    /* start from the top */
  }
  return i;
}

const Face = ({ face }: { face: StaffNote["speaker"]["face"] }) => (
  // The same box vocabulary as the advisor's face and the people in the
  // scene, in this person's own colours.
  <span className="relative block h-9 w-9 shrink-0 rounded-[3px] bg-[#e6e9ef] overflow-hidden">
    <span className="absolute inset-x-1.5 top-1 h-3.5 rounded-[2px]" style={{ background: face.hat ?? face.hair }} />
    <span className="absolute inset-x-2 top-2.5 h-3 rounded-[2px]" style={{ background: face.skin }} />
    <span className="absolute inset-x-1 bottom-0 h-3.5 rounded-t-[3px]" style={{ background: face.shirt }} />
  </span>
);

export const TeacherNotes = ({
  blocked,
  context,
  roomName,
  onShow,
}: {
  /** Something else has the player's attention; hold the note back. */
  blocked: boolean;
  context: NoteContext;
  roomName: (roomId: string) => string;
  /** "Show me": glide to the room and have them say it there. */
  onShow: (roomId: string, text: string) => void;
}) => {
  const { t } = useTranslation();
  const [note, setNote] = useState<StaffNote | null>(null);
  const due = useRef(Date.now() + NOTE_FIRST_MS);
  // Read by the interval, which is set up once and must see current values.
  const blockedRef = useRef(blocked);
  const contextRef = useRef(context);
  useEffect(() => {
    blockedRef.current = blocked;
    contextRef.current = context;
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden || Date.now() < due.current) return;
      if (blockedRef.current) {
        due.current = Date.now() + NOTE_RETRY_MS;
        return;
      }
      due.current = Date.now() + NOTE_EVERY_MS;
      // The hour as it is NOW by the school clock, not as it was when the
      // page last rendered: the school's day goes by in eighteen minutes.
      const next = noteAt({ ...contextRef.current, hour: schoolNow().hour }, nextIndex());
      if (next) setNote(next);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!note) return;
    const id = window.setTimeout(() => setNote(null), NOTE_SHOW_MS);
    return () => window.clearTimeout(id);
  }, [note]);

  // Whatever took the player's attention takes the corner too.
  useEffect(() => {
    if (blocked) setNote(null);
  }, [blocked]);

  const text = note ? t(`school.notes.lines.${note.line}`, note.params) : "";

  return (
    <AnimatePresence>
      {note && (
        <motion.div
          key={`${note.speaker.id}-${note.line}`}
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="pointer-events-auto w-[min(17rem,72vw)] rounded-[3px] bg-white/95 shadow-xl overflow-hidden"
          role="status"
        >
          <div className="flex items-start gap-2.5 px-3 pt-3 pb-2">
            <Face face={note.speaker.face} />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-black/45 leading-tight truncate">
                {t(`school.notes.names.${note.speaker.id}`)} · {roomName(note.speaker.roomId)}
              </div>
              <p className="text-[12px] leading-snug text-black/75 font-medium mt-0.5">{text}</p>
            </div>
            <button
              type="button"
              onClick={() => setNote(null)}
              aria-label={t("school.look.close")}
              className="shrink-0 -mr-1 -mt-1 p-1 text-black/30 active:text-black/60"
            >
              <IoClose size={15} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              onShow(note.speaker.roomId, text);
              setNote(null);
            }}
            className="flex w-full items-center justify-center gap-1.5 border-t border-black/10 py-2 text-[12px] font-bold text-gray-900 active:bg-black/5"
          >
            <IoEyeOutline size={14} />
            {t("school.notes.show")}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
