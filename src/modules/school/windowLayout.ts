// modules/school/windowLayout.ts
//
// Where the windows go, for the rooms and for the facade alike.
//
// They used to be placed twice, by two different rules: indoors every 2.2m
// from the start of each stretch of outside wall, outdoors every 2.6m from the
// start of each facade segment, at another height and another size. From
// outside that read as one tidy row; from inside the same school had windows
// bunched into corners and missing from the middle of walls, at whatever
// offset each room's wall happened to start.
//
// Now there is one size, one sill and one grid for the whole school, in world
// metres. A window stands wherever a grid line falls on a stretch of outside
// wall with room for it — so windows line up from room to room, and a room's
// windows sit in the same columns as the building's.

/** One window, frame included. Metres; `sill` and `head` are heights.
 *  `dressed` is the width it takes up on a wall indoors, curtains and rail
 *  included — what nothing else hung on that wall (a poster, a noticeboard)
 *  may overlap. */
export const WINDOW = { width: 1.3, dressed: 1.9, sill: 0.9, head: 2.3 } as const;

/** Centre to centre, across the whole school. The rooms' old spacing rather
 *  than the facade's 2.6m: a classroom wall shares its length with a board,
 *  and on the coarser grid the board's neighbours kept missing it. */
export const WINDOW_PITCH = 2.2;
/** Where the grid starts: windows centred on x = 1.1, 3.3, 5.5, … */
const GRID_OFFSET = WINDOW_PITCH / 2;
/** Clear wall kept between a window's frame and the end of its stretch of
 *  wall — a corner, a doorway, or the wall of the room next door. Enough for
 *  the curtain rail, which reaches a quarter of a metre past the frame. */
const END_CLEAR = 0.3;
/** How close a window's centre may come to a span already booked on the wall.
 *  The frame and a finger's width, not the curtains: the board's span carries
 *  half a metre of padding of its own, and a curtain hanging into that is
 *  fine — insisting on the full dressed width as well cost the classrooms
 *  most of the windows beside their boards. */
const TAKEN_REACH = WINDOW.width / 2 + 0.05;

const round = (v: number) => Math.round(v * 100) / 100;

/**
 * Window centres along one straight stretch of wall, `from` to `to`, on the
 * school's grid. `taken` are spans already in use (a board, a clock): no
 * window overlaps one.
 *
 * A stretch too short for the grid to land on still gets one window, in its
 * middle — a small room with one outside wall should not be the room with no
 * window. Only when the grid misses it altogether, though: a grid window
 * skipped because a board is in the way is not replaced by one somewhere else,
 * or the rhythm of the wall is lost again.
 */
export function windowSpots(from: number, to: number, taken: readonly [number, number][] = []): number[] {
  const half = WINDOW.width / 2;
  const lo = from + END_CLEAR + half;
  const hi = to - END_CLEAR - half;
  if (hi < lo - 1e-6) return [];
  const clear = (at: number) => !taken.some(([s, e]) => at + TAKEN_REACH > s && at - TAKEN_REACH < e);

  const onGrid: number[] = [];
  for (let k = Math.ceil((lo - GRID_OFFSET) / WINDOW_PITCH - 1e-9); GRID_OFFSET + k * WINDOW_PITCH <= hi + 1e-6; k++) {
    onGrid.push(round(GRID_OFFSET + k * WINDOW_PITCH));
  }
  if (onGrid.length) return onGrid.filter(clear);

  const middle = round((from + to) / 2);
  return clear(middle) ? [middle] : [];
}

/** Whether `at` is on the school's window grid. */
export const onWindowGrid = (at: number) => {
  const k = (at - GRID_OFFSET) / WINDOW_PITCH;
  return Math.abs(k - Math.round(k)) < 1e-3;
};
