# Dream School — where things stand (2026-08-23)

Working notes for picking this up again. The design itself is in
`room-game-concept.md`; this file is only "what is done, what is not".

## State: green

`tsc -b`, `npm run typecheck:test` and `npm run build` pass; lint reports
nothing in `modules/school` beyond two long-standing fast-refresh warnings.
**204 tests, all passing.**

The school suite is `src/config/schoolCatalog.test.ts`, 46 tests, and every
geometry test sweeps **all 3 campus variants × all 10 stages** — 30 floorplans.
That sweep is the whole point: three of the bugs fixed on 2026-08-23 were only
ever visible in a campus or at a stage nobody had looked at.

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

## The five invariants that matter

Nobody steers at runtime — every actor follows an authored polyline exactly —
so a static check over those polylines is a **complete** guarantee, not a
sample. That is why these are tests and not eyeballing:

1. `never walks anybody through a wall` — walks every route and asserts each
   wall crossing lands inside an opening.
2. `never routes a person through a piece of furniture` — same sweep against
   every solid prop footprint (`FOOTPRINTS` in `props.ts`; `null` means
   passable — wall-mounted things, rugs, mats, the gate arch). The first and
   last leg of a commuter's route may enter the one piece of furniture their
   seat is on: sitting down is not walking through.
3. `never seats anybody on thin air` — every seated person, in every desk
   preset, has to land inside a seat surface (`SEAT_AREAS`). This is the one
   that would have caught the lab booths with no stools, the receptionist
   behind a desk with no chair, readers sitting on the library rug at chair
   height, and everybody parked three quarters of a metre in front of the
   bench they were meant to be on.
4. `mounts every wall prop on a wall that is actually drawn there` — anything
   that hangs rather than stands has to be inside a `freeWallRuns` span: no
   room behind it to drop the wall to a 0.95m partition, and no doorway cut
   through it. Reception's clock, the corridor's poster and the gym's
   scoreboard were all hanging in mid-air over knee-high walls.
5. `never lets two of them stand in the same place` — samples half an hour of
   `walkerAt` for every plan. See "Why roamers do not pile up" below.

**Do not weaken any of these into "every door has an opening"** — that just
restates the implementation, and it would have missed the wanderer loop cutting
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

## Why roamers do not pile up

The reported bug was people walking into a room, stopping, and standing inside
one another. The fix is arithmetic, not collision detection — collision would
mean steering at runtime, and steering would destroy invariants 1 and 2, which
are only complete guarantees *because* nobody steers.

Four pieces, all in `props.ts`, and they only work together:

- **`walkerAt` is a pure function of the clock**, not a per-frame integration.
  Two walkers accumulating `dt` separately drift apart; two reading the same
  clock cannot.
- **Everyone on a loop is identical**: same path, same `WALK_SPEED`, same
  `hold` at the same waypoints. `hold` lives on the WAYPOINT for this reason —
  when it was derived from the walker's own phase, two people took different
  amounts of time per lap and slowly closed on each other.
- **`spaceOut` spreads them by DISTANCE**, not by array index. Two door points
  a metre apart are one index apart, and the two people given those indices
  stood on top of each other.
- **`WALK_LANE` — everybody walks on the right.** Every roaming loop is a tour
  of a tree, so every corridor is walked twice a lap, once each way; without a
  lane, two walkers meet head-on and pass straight through each other.

Two consequences worth knowing before changing any of it:

- A room's stop is a PAIR of points, not one. A single point makes the visit a
  dead-on out-and-back, and a 180° turn has no right-hand side to walk on, so
  the lane collapses to zero exactly where people stand.
- Stops sit 1.0m to the side of the door line, because some rooms are walked
  THROUGH — everyone bound for the gym crosses the courtyard on its door's own
  line, and a stop on that line is somebody standing in the traffic.

## Walls, doors and the grounds

- Only north and west walls are drawn in the cutaway. `wallOpenings` is the
  north/west view of `boundaryOpenings`, which knows all four sides — the
  exterior view needs south and east.
- **The grounds are walled.** Courtyard and forecourt draw a `GARDEN_H` wall on
  the two sides the camera looks past and a low `GARDEN_LIP` on the two it
  looks over, so the garden reads as enclosed without hiding the people in it.
- **The building has a front door.** In the exterior view the facade is cut at
  every real doorway and the hole is filled with a `FrontDoor` leaf. Cutting it
  and leaving it open would be a peephole into the interior the roof exists to
  hide; not cutting it at all left people walking out through blank brickwork.
- A classroom's west doorway is always cut, but the 2.1m door FRAME is only
  drawn where the wall is full height — over a knee-high partition it would
  stand a metre proud of the wall it is set into.

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
- **Deployed 2026-08-23** (commit `a57a293`, both CI workflows green). The
  backend had been running pre-rewrite school code until then, so `/room` could
  not have worked in production at all; all three school routes now answer 401
  rather than 404, which is how you tell the new code is live. When the catalog
  changes, **both copies have to go up together** — the client draws the
  building from its mirror and the server charges from its own.
- Every seat in `furniture.tsx` has its **backrest on local +z**, and `sitOn`
  in `props.ts` depends on that holding without exception. The sofa used to be
  the exception, and people sat in it back to front.
- Visual checks were done with a throwaway `preview.html` + `src/preview-main.tsx`
  at the smartplayer root, driven by Playwright. Both are deleted; recreate them
  the same way rather than trying to log in — see the memory note.
