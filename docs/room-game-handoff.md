# Dream School — where things stand (2026-08-22)

Working notes for picking this up again. The design itself is in
`room-game-concept.md`; this file is only "what is done, what is not".

## State: green

`tsc -b`, `npm run typecheck:test`, `npm run build` and lint (0 errors) all
pass. **198 tests, all passing.**

The school suite is `src/config/schoolCatalog.test.ts`, 40 tests, and every
geometry test sweeps **all 3 campus variants × all 10 stages**.

## Done

- **10 stages**, `one-room` → `gymnasium`. Prices in
  `backend/src/config/schoolCatalog.js` are the only source of truth.
- **3 campus variants** — `courtyard`, `quad`, `terrace`. Same economy,
  different floorplans. `school.variantId` is derived from the user id (stable,
  no migration) then persisted. Verified end to end: a throwaway user gets a
  variant, upgrades 0→9, wallet drains to exactly zero.
- **Three classrooms** per variant by stage 9, all English rooms (flags, globe,
  A–Z frieze), never other subjects.
- **Doors are real holes.** Walls are built span by span and cut open at each
  doorway, with jambs and a lintel. Wall height is also per-span (full where
  nothing is behind, knee where a room is).
- **Nothing walks through anything.** Two tests, and they are the important
  part of this whole subsystem — see below.
- **Commuters and wanderers** travel by authored routes through doorways.

## The two invariants that matter

Nobody steers at runtime — every actor follows an authored polyline exactly —
so a static check over those polylines is a **complete** guarantee, not a
sample. That is why these are tests and not eyeballing:

1. `never walks anybody through a wall` — walks every route and asserts each
   wall crossing lands inside an opening.
2. `never routes a person through a piece of furniture` — same sweep against
   every solid prop footprint (`FOOTPRINTS` in `props.ts`; `null` means
   passable — wall-mounted things, rugs, mats, the gate arch).

**Do not weaken either into "every door has an opening"** — that just restates
the implementation, and it would have missed the wanderer loop cutting
diagonally through the lab wall, which is how that bug was found.

Supporting pieces:

- `doorZones()` + `clearDoorways()` drop any prop standing in a doorway. This is
  a backstop; the big identity props are placed clear of doors by construction.
- `still keeps the prop that makes each room that room` guards against that
  backstop silently eating the servery or the wall bars.
- Rooms a route passes **through** (not into) need a clear lane at the door's x.
  `lobbyProps`, `labProps` and `cafeteriaProps` take `doorX` and lay themselves
  out around it — that is what `pushWithDoor` is for.
- `visitSeats()` returns `{ spot, via }`. `via` is the approach lane from the
  doorway to the seat, because a straight line from door to chair crosses
  whatever is in between.

## Not done — next task

**The exterior view the user asked for**: a toggle to turn off the cutaway and
see the whole building from outside. Sketch:

- `Building` takes `exterior?: boolean`. In that mode draw all four walls at
  full height (interior ones end up hidden under the roof, so no special
  casing) plus a roof slab per indoor room at `WALL_H`, with a parapet lip.
  Outdoor rooms keep their ground.
- Hide the interior: people inside are occluded by the roof automatically
  through depth testing, **but drei's `<Html>` bubbles are DOM overlays and
  ignore depth** — they would float over the roof. So suppress speech bubbles
  and the chalkboard word whenever `exterior` is on. People in the courtyard and
  forecourt then stay visible, which is the nice outcome.
- Toggle lives in `Room.tsx` next to the palette button, and passes through
  `SchoolCanvas`.

## Odds and ends

- `PIXEL_DPR = 0.38` in `SchoolCanvas.tsx` is the pixelation; `MIN_READABLE_ZOOM
  = 15` is the zoom floor (chosen so the widest variant, Terrace at 55 tiles,
  still fits a desktop at stage 9).
- The deployed Yandex backend still runs the **old** school code. The live site
  will keep failing on `/room` until it is redeployed.
- Visual checks were done with a throwaway `preview.html` + `src/preview-main.tsx`
  at the smartplayer root, driven by Playwright. Both are deleted; recreate them
  the same way rather than trying to log in — see the memory note.
