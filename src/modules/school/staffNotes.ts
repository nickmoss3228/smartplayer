// modules/school/staffNotes.ts
//
// Somebody at the school says something to you every few minutes: a teacher
// with the day's word, the cook announcing lunch, the coach, the librarian, the
// head. The advisor (advisor.ts) is the one voice with a chore for you; these
// are the rest of the staff, and all they want is to make the place feel lived
// in.
//
// Pure, like advisor.ts and bubbles.ts: no React, no clock, no i18n. It returns
// translation KEYS and their parameters, and the card translates them. That is
// what lets the rotation be tested, and what keeps the English and the Russian
// on the same line of the same person.

import type { Season } from "./atmosphere";

/** One member of staff, and the room they can be found in. */
export interface Speaker {
  id: string;
  roomId: string;
  /** Face colours for the card, matching how they are dressed in the scene. */
  face: { skin: string; hair: string; shirt: string; hat?: string };
  /** What they talk about: their own lines, and whether the shared teaching
   *  lines are theirs to say too. */
  lines: string[];
  teaches: boolean;
}

// The five English teachers, one per classroom, in the order classrooms come.
const TEACHERS: { id: string; roomId: string; face: Speaker["face"] }[] = [
  { id: "parker", roomId: "classroom", face: { skin: "#e8b98a", hair: "#4a3b2f", shirt: "#5c6b8a" } },
  { id: "hughes", roomId: "classroomB", face: { skin: "#c98c5b", hair: "#2b2d2f", shirt: "#6a8a5c" } },
  { id: "okafor", roomId: "classroomC", face: { skin: "#8a5a3b", hair: "#1f1f22", shirt: "#8a5c7a" } },
  { id: "novak", roomId: "classroomD", face: { skin: "#f2c48d", hair: "#a8742f", shirt: "#5c7f8a" } },
  { id: "lindqvist", roomId: "classroomE", face: { skin: "#f7d7b5", hair: "#e8c873", shirt: "#8a6a5c" } },
];

const TEACHING_LINES = ["listenTwice", "quizCoins", "slowDown", "accents", "everyDay", "rewind", "ownWords"];

/** Everybody who could speak up, given the rooms the school has. A teacher
 *  whose classroom has not been built yet does not work here yet. */
export function speakersFor(owned: readonly string[]): Speaker[] {
  const has = (id: string) => owned.includes(id);
  const out: Speaker[] = TEACHERS.filter((t) => has(t.roomId)).map((t) => ({
    ...t,
    lines: t.id === "parker" ? ["welcome"] : [],
    teaches: true,
  }));
  if (has("office")) {
    out.push({
      id: "head",
      roomId: "office",
      face: { skin: "#e0a870", hair: "#8a8a8a", shirt: "#3d4557" },
      lines: ["proud", "grown"],
      teaches: false,
    });
  }
  if (has("cafeteria")) {
    out.push({
      id: "cook",
      roomId: "cafeteria",
      face: { skin: "#e0a870", hair: "#2b2d2f", shirt: "#f1efe8", hat: "#ffffff" },
      lines: ["lunch", "queue", "pie"],
      teaches: false,
    });
  }
  if (has("gym")) {
    out.push({
      id: "coach",
      roomId: "gym",
      face: { skin: "#c98c5b", hair: "#2b2d2f", shirt: "#c43d3d", hat: "#2e3a58" },
      lines: ["training", "laps"],
      teaches: false,
    });
  }
  if (has("library")) {
    out.push({
      id: "librarian",
      roomId: "library",
      face: { skin: "#f2c48d", hair: "#8a8a8a", shirt: "#7a8f6a" },
      lines: ["quiet", "newBooks"],
      teaches: false,
    });
  }
  if (has("musicRoom")) {
    out.push({
      id: "music",
      roomId: "musicRoom",
      face: { skin: "#f7d7b5", hair: "#6b4423", shirt: "#7b4fa3" },
      lines: ["piano", "sing"],
      teaches: false,
    });
  }
  if (has("garden")) {
    out.push({
      id: "gardener",
      roomId: "garden",
      face: { skin: "#c98c5b", hair: "#5a5a5a", shirt: "#4f8a54" },
      lines: ["garden"],
      teaches: false,
    });
  }
  return out;
}

export interface NoteContext {
  owned: readonly string[];
  learnedWords: readonly string[];
  hour: number;
  season: Season;
  /** Whether a room is affordable right now. */
  canBuild: boolean;
}

/** One thing somebody says. `line` is a key under `school.notes.lines`, and
 *  `speaker` one under `school.notes.names`. */
export interface StaffNote {
  speaker: Speaker;
  line: string;
  params: Record<string, string | number>;
}

/**
 * Everything that could be said right now, in the order it will be said.
 *
 * Round-robin across the staff, so one talkative teacher does not hold the
 * floor for half an hour: first everybody's first line, then everybody's
 * second. The time of day and the season go to the first teacher — the one
 * the player has had since the day they started — and the day's word goes to
 * every teacher in turn, each quoting a different one.
 */
export function noteRota(ctx: NoteContext): StaffNote[] {
  const speakers = speakersFor(ctx.owned);
  if (!speakers.length) return [];
  const words = ctx.learnedWords.map((w) => w.trim()).filter((w) => w.length > 0 && w.length <= 24);

  const lists = speakers.map((sp, i) => {
    const said: StaffNote[] = sp.lines.map((line) => ({
      speaker: sp,
      line,
      params: { rooms: ctx.owned.length },
    }));
    if (sp.teaches) {
      if (words.length) {
        said.push({ speaker: sp, line: "word", params: { word: words[(i * 7) % words.length] } });
      }
      for (const line of TEACHING_LINES) said.push({ speaker: sp, line, params: {} });
    }
    if (i === 0) {
      // School time (schoolClock.ts), where the small hours come round every
      // eighteen minutes — and "lessons start in five minutes" at 3am is wrong.
      const time =
        ctx.hour >= 18 || ctx.hour < 7 ? "evening" : ctx.hour < 12 ? "morning" : "afternoon";
      said.splice(1, 0, { speaker: sp, line: time, params: {} });
      said.push({ speaker: sp, line: ctx.season, params: {} });
    }
    if (sp.id === "head" && ctx.canBuild) said.unshift({ speaker: sp, line: "anotherRoom", params: {} });
    return said;
  });

  const rota: StaffNote[] = [];
  const longest = Math.max(...lists.map((l) => l.length));
  for (let k = 0; k < longest; k++) {
    for (const list of lists) if (k < list.length) rota.push(list[k]);
  }
  return rota;
}

/** The note at a position in the rota, wrapping round. Total by construction:
 *  null only when the school has nobody to say anything yet. */
export function noteAt(ctx: NoteContext, index: number): StaffNote | null {
  const rota = noteRota(ctx);
  if (!rota.length) return null;
  const i = ((Math.floor(index) % rota.length) + rota.length) % rota.length;
  return rota[i];
}

/** How often somebody speaks up, and how long before the first time. */
export const NOTE_EVERY_MS = 5 * 60 * 1000;
export const NOTE_FIRST_MS = 20 * 1000;
/** When now is a bad moment (building, the advisor is talking), try again in. */
export const NOTE_RETRY_MS = 30 * 1000;
/** How long a note stays up if nobody dismisses it. */
export const NOTE_SHOW_MS = 12 * 1000;
