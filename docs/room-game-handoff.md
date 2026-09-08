# Dream School — where things stand (2026-09-08, all five phases)

Working notes for picking this up again. The design itself is in
`room-game-concept.md`; this file is only "what is done, what is not".

## State: green

`tsc -b` and `npm run build` pass; lint reports nothing in `modules/school`
beyond two long-standing fast-refresh warnings. **283 tests, all passing.**

> `npm run typecheck:test` has one error, in `src/config/catalogMirror.test.ts`
> around the `pack-*` entitlement map. It is in **uncommitted payments work**,
> not in anything the school touches, and it predates this change — `git stash`
> that one file and the typecheck is clean.

The school suite is `src/config/schoolCatalog.test.ts`, 69 tests. Because rooms
are now bought one at a time, the old exhaustive sweep is gone and the suite
samples the owned-set space instead — the chain, four seeded scrambles per
variant, and the full set, about 160 plans across twenty rooms. See §10 and §11
of the concept doc for why, and for the six latent bugs the sampling has found
so far. None of them were introduced by the changes that exposed them.

## Done

- **Per-room purchase.** Twelve rooms, each priced in one currency, bought in
  whatever order the player likes, gated only on owning the room you walk in
  through. `backend/src/config/schoolCatalog.js` is the only source of truth;
  the buy request names a room id and never a price.
- **The level is derived**, not stored — `levelFor(ownedRoomIds)` onto the same
  ten records the stages used to be. `plan.stage` is still a resolved level
  record, which is why nothing in `props.ts` had to change beyond `buildPlan`.
- **Migration is done and verified.** `ensureSchool` grants a legacy player
  exactly the rooms their old stage drew, from a frozen `LEGACY_STAGE_ROOMS`
  table. Checked against `smartplayer-dev` over all 10 old stages × 3 variants,
  plus a brand-new account and a dollhouse-era document: every one lands on
  exactly its rooms, and no level ever goes down (the old `school.stage` is kept
  as the level floor for precisely that).
- **Twenty rooms**, up from twelve, identical on all three campuses. Four new
  kinds — `staff`, `office`, `music`, `garden` — and only two new props
  (`piano`, `planter`); everything else is furnished from what the first twelve
  already had. Every new room has residents, so none of them is ever empty.
- **Props dispatch on KIND, not room id** (`FURNISHERS` in props.ts). Keyed on
  the id, a second library-kind room rendered as an empty box, which is why a
  campus could only ever hold one of each. Adding a room to the catalog now
  costs nothing in props.ts at all.
- **The director** (`src/modules/school/advisor.ts`). Wages come due weekly and
  the deputy head asks for them from the bottom-right corner. The entire save is
  ONE DATE, `school.payroll.lastPaidAt`: weeks owed, morale and the bill are all
  derived from it, the same way the level is derived from the room list. Arrears
  cap at 8 weeks, morale is `100 * (1 - weeks / cap)` so it lands exactly on 0
  where the arrears stop, and its only effect is `attend()` in peoplePlan —
  `0.45 + 0.55 * morale/100`, which is exactly the identity at 100 and is why
  morale could be added without moving a single existing count. **Nothing is
  ever taken away.** There is a test that says so.
- **Customize mode.** `school.presets` is a sparse map of room id to any of the
  three free preferences; what a room does not override falls through to the
  school's own setting, so a player who never opens it sees what they always
  saw. `customisable(kind, outdoor)` gates which of the three a room may set
  (no desk layout outside a classroom, no flooring outdoors) and it is enforced
  on the server, not just hidden in the UI. `CameraRig` gained a `focus` rect
  that reuses the existing easing path.
- **Build mode** (`src/modules/school/Ghosts.tsx`). Every buildable room is
  drawn as a translucent slab with a knee band, corner posts and an `<Html>`
  label, standing on the rect it would actually occupy — including any growth
  the purchase triggers, which is drawn for the SELECTED ghost only. Green
  affordable, amber too dear, grey still locked (with the reason: "needs the
  Courtyard"). `CameraRig` widens its existing bounds to take the ghosts in,
  rather than growing a second camera path, so the leash and the glide keep
  working. People, bubbles and the chalkboard mute; the view and palette
  buttons hide.
- **Classrooms are no longer pinned to the north edge.** `boardFrameOf` picks
  the wall the board hangs on — north for preference, else west, the only two
  the cutaway draws — and the four desk presets are authored in board-local
  space and mapped through it. The whole refactor landed with all 60 existing
  tests passing unchanged, which is the proof that the north frame is exactly
  the identity. The fifth classroom on every campus faces west.
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
so within one floorplan, a static check over those polylines is a **complete**
guarantee rather than a sample. That is why these are tests and not eyeballing.

What is now sampled is the set of floorplans, not the checking of any one of
them: rooms are bought individually, so the suite covers about a hundred owned
sets instead of all thirty that used to exist (§10 of the concept doc). If you
add a room, add it to the chain and let the scrambles find the rest.

1. `never walks anybody through a wall` — walks every route and asserts each
   wall crossing lands inside an opening.
2. `never routes a person through a piece of furniture` — same sweep against
   every solid prop footprint (`FOOTPRINTS` in `props.ts`; `null` means
   passable — wall-mounted things, rugs, mats, the gate arch). The first and
   last leg of a commuter's route may enter the one piece of furniture their
   seat is on: sitting down is not walking through. It collects every collision
   and asserts once at the end rather than asserting per leg — this is the
   innermost loop in the suite and an `expect()` per combination cost several
   times what the geometry did.
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

All five planned phases are in. Nothing is queued.

### Worth doing next, in rough order of value

- **The assembly hall has no through-lane.** A route from a room behind it cuts
  corner to corner across its chair rows. Long-standing — `classroomC` has
  always sat behind it with exactly that route and nothing has ever walked it —
  and it is why the **study hall is not a roam stop or a commuter destination**.
  Give `hallProps` the `doorX` treatment reception, the lab and the cafeteria
  already have and the study hall can join the rota. The staff room, the music
  room and the head's office are out for the same class of reason; they have
  their own residents instead, so they are never empty.
- **Payroll is unproven in the wild.** Every branch is tested against a
  backdated clock and the numbers mirror the server, but no real player has
  ever seen the advisor. Watch the first week: `weeklyWage` is
  `teachers * 8 + rooms * 2`, which is about fourteen quiz passes a week for a
  finished campus and two for a young one. It is meant to be a nudge. If it
  reads as a treadmill, that constant is the dial.
- **The build sheet's stage-up reveal still says "Unlocked".** It fires per room
  now, which is right, but the copy was written for a stage.
- **Second floor.** Still the biggest unbuilt idea: rooms get a `level`, stacked
  flush in the exterior view and EXPLODED apart in the cutaway so no progress is
  ever hidden behind a floor switcher. The campus is 61-67 tiles wide now, so
  the alternative to going up is going further sideways than a phone can frame.

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
