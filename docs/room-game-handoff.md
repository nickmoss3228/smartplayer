# Dream School — where things stand (2026-09-30, fifth round)

Working notes for picking this up again. The design itself is in
`room-game-concept.md`; this file is only "what is done, what is not".

## 2026-09-30: the fifth round — the grounds in use

Three asks from the user; §15 of the concept doc has the reasoning.

- **Board words only when zoomed in** (`ChalkWord` in `furniture.tsx`): the
  word fades in once the board is 130–170 CSS pixels wide on screen (a zoom of
  about 37–48 for a five-metre board) and grows with it, capped at 44px.
  Written into the element's style per frame, not React state.
- **A voice per kind of person** (`bubbles.ts`, `school.speech.*`): new roles
  `head`, `staff`, `coach`, `musician`, `performer`, `director`, `reader`
  (the librarian is now only the one shelving), `researcher` (archive),
  `reviser` (study hall), `friend` (courtyard, garden), `walker` (corridors),
  `arriving` (morning lines up the path, going-home lines after school),
  `footballer`, `keeper`, `kid`. `roleForRoom` and the placements in
  `peoplePlan` hand them out; `roles.test.ts` pins who is who.
- **The grounds in use** (`playLayout.ts` pure + `Playtime.tsx`): a kickabout
  on the pitch (two or three a side, a keeper in each goal, passes timed by
  distance) and, where there is a playground, two on the swings, one on the
  slide, one in the sandpit and two playing tag. Morning, after school and
  evening (`outdoors` in `SchoolCanvas`), never in lessons or at night.
  Positions are pure functions of the clock and tested: nobody leaves the
  pitch or enters a goal, nobody comes within 0.9m of anybody, the ball never
  jumps, tag keeps clear of the equipment. The pitch has floodlight masts
  whose pools come on with the school's other lights (19:00).
- `Bubble`/`HitBox` moved to `personBits.tsx`, `useHop` to `hop.ts`, and
  `GROUND_Y` to `groundsLayout.ts`, so `Playtime.tsx` can share them.

The Courtyard campus has a pitch but no playground (its plot has no room for
one), so it only gets the kickabout.

- **Double-tap to zoom** (`CameraRig`, touch only): twice as close, the tapped
  spot staying under the finger (ray onto the target plane, centre scaled
  toward it by old/new zoom, then leashed); at max zoom it glides back to the
  opening framing. A second finger, a move over 10px or a press over 300ms
  make it not a tap.

### 2026-10-02: the night is the caretaker's

The user: students and teachers kept talking at night, when nobody is in.
`castFor("night")` is now the caretaker alone (no head working late, no
reader). The player's own character, out walking at night, keeps quiet
(`People` `playerQuiet`). Staff note cards between 21:00 and 07:00 come only
from `nightSpeaker` in `staffNotes.ts` — Mr Grant, security, the caretaker's
face, rooms "corridor" (or "classroom" before there is one), lines
`rounds`/`lockedUp`/`lightsLeft`/`allQuiet` in both locales. The evening
(19–21) still belongs to the staff.

### 2026-10-01: wallet, build preview, less text, walking

- **Wallet on screen** (`WalletBadge.tsx`): all three balances under the
  clock, every mode; a figure pops when it changes.
- **Build preview**: tap a buyable ghost and `Scene` draws `shown` — the
  plan as if bought (`buildPlan` of owned + room + bundle, in catalog order)
  — for the building, furniture, desks and lamps. People stay on the real
  plan, so the new room is empty. The ghost keeps only a floor-level frame.
  Locked ghosts are tappable; the card says what they wait for.
- **Less text in build mode**: ghost labels are a price chip (or a lock);
  no names, no "build X first" in the scene. The card is name + price +
  one button (no blurb). Hint is "Tap a room". Page chrome is z-30, above
  drei Html labels (z 10-20).
- **Walking (first try)**: walk button (`IoWalkOutline`) in play mode.
  `walkGrid.ts` = 0.25m grid, open inside rooms 0.3m off walls, through
  `boundaryOpenings` doorways that lead into another room, closed round
  `blockers` (+0.18m); A* + string-pulling. `avatar.ts` = mutable
  `AvatarState` + pure `stepAvatar` (2.4 m/s, keys cancel a path, slides
  along obstacles) + `keysToGround` (screen up = -x,-z). `Walking.tsx` =
  invisible `FloorCatcher` (tap, ignores drags >8px) + `WalkTarget` ring;
  `walkKeys.ts` = arrows/WASD. People draws `WalkingPlayer` instead of the
  seated player; it registers presence so doors open. CameraRig `follow`:
  closes in once, then drifts after the character past 1.5m slack; any pan
  lets go until the next tap/key. Tests: `walkGrid.test.ts` (every room
  reachable in every campus; no path through furniture or a wall),
  `avatar.test.ts`.

### Windows, 2026-09-30

The user: windows were plain squares, and indoors they sat "a bit randomly"
while outside they ran in a straight line. They were placed by two rules
(indoors every 2.2m from each wall run's start, outdoors every 2.6m from each
facade segment's start) at two heights and two sizes.

- `windowLayout.ts`: one size (1.3m, sill 0.9, head 2.3), one grid for the
  whole school in world metres (pitch 2.2, centres 1.1 + 2.2k). Rooms
  (`windowsOn`) and the facade (`Shell`) both call `windowSpots`, so windows
  line up room to room and with the building's columns. A run the grid misses
  entirely gets one centred window; a grid spot blocked by a board is just
  left out.
- `windowModel.tsx` (`SchoolWindow`): frame, mullion + transom (top light),
  sill, glint by day; indoors curtains on a rail and dark panes at night,
  outdoors a lintel and a lit pane at night.
- Classrooms hang windows right after the board, THEN the clock and posters
  (the other order left classrooms with none). Staff room, office and music
  room pass `windowAvoid(p)` to their `hang` calls. `clearWindows` in
  `stageProps` drops any window a hung prop still overlaps (`hungWidth`).
- Tests: `windowLayout.test.ts`; catalog "lines every window up on the one
  grid" and "hangs nothing over a window". Full campuses: courtyard 11 (was
  10), quad 16 (13), terrace 16 (19).

### Performance, measured 2026-09-30

Headless Chromium on SwiftShader, so milliseconds are only relative; counts
are exact. A full campus (all three variants alike) draws **~3,200–4,000
draw calls a frame for ~65–75k triangles**: one per box. ~3,770 meshes, of
which only ~560 move (people, doors, swings, ball); 3,212 material objects
for 142 distinct looks. One first room is 192 calls and runs at 60fps.
A CPU profile puts >95% of the busy time in three.js's per-object loop
(projectObject, setProgram, renderBufferDirect, updateMatrixWorld); the
game's own code is under 1%.

Experiments in the harness (not in the code):
- Merging every still mesh into one per material: 3,767 → 735 calls,
  render CPU 29ms → 7ms, frame 70ms → 27ms. Looked identical.
- Sharing materials only: 3,212 → 333 materials, render CPU −12%.
- Night, with 16 point lights: after merging, render CPU is 4ms but the frame
  is still 66ms — the cost moves to per-pixel lighting.

**Done the same day: the scenery is merged** (`bake.ts` pure + tested,
`Baked.tsx`). User's calls: merge yes; keep the 16 room lights for now; no
30fps cap on phones for now, measure first.

- One `<Baked>` in `Scene` wraps grounds, building, furniture, porch, lamp
  pools, pendants and desks. People, ghosts, room picks, the sign and the
  room lights are outside it.
- The originals stay (React owns them) but are hidden and frozen
  (`matrixAutoUpdate = false`). After every commit — Baked also reads the
  atmosphere context, the one context the scenery re-renders on — a walk
  fingerprints the still meshes; only a different fingerprint re-merges.
- JSX-made materials (tagged `__r3f`) are grouped by everything but colour,
  colour going into a vertex attribute. Materials passed in as objects (neon
  tubes, bulbs, lamp pools) keep their identity, so NightDriver's fading
  still reaches the merge.
- **Anything moved or recoloured by a frame loop must carry
  `userData={LIVE}`**, or it freezes: clock hands, tree canopies, fountain
  jet, globe, computer screens, flags, cooler bubble, scoreboard, front-door
  leaves, street cars; `Rise`/`PopIn` are LIVE only while `active`. Trees and
  cars have a `<Baked>` of their own inside (one draw each while moving).
- Tapping the board still works on the hidden original (R3F raycasts
  regardless of `visible`).

After (same harness): full campus by day 715–921 draw calls (was
3,600–4,000), frame ~27–32ms (was ~70); night 180 calls; exterior 880 (was
1,696). What is left by day is almost all people (~560 moving meshes) —
instancing them is the next lever. A full re-merge is 35–60ms on a desktop
CPU (4,900 objects → 42 meshes), paid on purchase, repaint, and at 07:00/19:00;
the per-commit walk is ~5ms. On a phone expect ~3–4× both.

## 2026-09-29: the fourth round — you, in your school

Five asks from the user; §14 of the concept doc has the reasoning.

- **Sharper on phones** (`renderScale.ts`): the render scale follows the
  screen's short side — 0.38 from a small laptop up (unchanged), rising to
  about 0.93 on a 390-pixel phone. Still pixel art, just finer pixels.
- **Every line is translated.** Speech bubbles now come from
  `school.speech.*` in the locales, handed to the canvas as a `PhraseBook`
  (`phraseBook.ts`, a required `phrases` prop); the deputy head's lines are
  keys under `school.advisor.*` with Russian plurals. Learned words stay in
  English — «journey» in Russian, "journey" in English.
- **A character creator on the dashboard** (`modules/character/`): free; skin,
  8 hairstyles, 4 tops, 3 bottoms, glasses, hats, colours. Its own small
  three.js canvas, lazy-loaded. Saved whole with `PUT
  /progress/character/look` into `users.character_look` (jsonb, migration
  `0004_character_look`, additive; validated by `config/characterLook.js`).
  Anybody who has not made one is drawn from the old item shop's columns
  (`lookFromLegacy`).
- **One figure for everybody** (`figureParts.ts` → `figureGeometry.ts` →
  `Figure.tsx`): the player, every student, the staff, the creator's model
  and the navbar portrait are the same boxes. Each joint's boxes are merged
  into one vertex-coloured mesh, so a person is seven draw calls instead of
  about thirteen — that is what pays for the finer phone render. Students now
  have varied hair, tops and skirts (`crowdLook`).
- **The navbar portrait** is a photo of the 3D figure (`portrait.ts`, loaded on
  demand), cached in memory and the last six in localStorage (`portrait.v1`);
  a flat 2D stand-in shows for the moment it takes the first time.
- **You in the school**: the front desk of the first classroom (as before),
  now with your nickname over your head, a "Find me" button that glides the
  camera there (a toast after dark: you have gone home), and a card pointing
  to the dashboard until you have made a character. `/room?me=1` glides on
  arrival — the creator's "See me in school" uses it.

The old item shop's endpoints (`/progress/character/purchase|equip|skin-tone`)
are still there and unused by the UI.

## 2026-09-28: the third round

Five asks from the user; §13 of the concept doc has the reasoning.

- **Sound effects** (`sfx.ts`, Web Audio, its own context): knocks and a bell
  arpeggio when a room is built, a brush for a new look, a bell for a new
  facade or roof, the school bell, and a babble voice per person when tapped
  (pitched by role, varied by key). Its own on/off button under the music one,
  on by default, remembered as `school.sfx`.
- **The school grounds** (`groundsLayout.ts` + `Grounds.tsx`): a diorama plot
  sized for the finished campus — fence, pavement, road with two cars, bus
  stop, lamps, a row of houses behind, and a pitch, playground and car park in
  whatever space the finished school leaves. The camera may pan over and zoom
  out to the whole plot.
- **One Decorate sheet** replaces the palette drawer and the brush mode: Whole
  school (every room, via `everywhere: true`), One room (a one-room school has
  it picked already), Outside. Locked swatches say which stage opens them.
- **School time** (`schoolClock.ts`, `ClockBadge.tsx`): an 18-minute day, the
  light eased every frame, fewer people after school and almost nobody at night
  (`castFor`, a strict subset of the cast), students walking in and out up the
  front path, night music, and the wall clock telling the same time.
  `?clock=HH:MM` pins it in development.
- **One roof** (`roof.ts`): a hip roof over the whole footprint instead of a
  prism per room; flat finishes and fittings laid across room lines.

Files named apart on purpose: `groundsLayout.ts`/`Grounds.tsx` and
`schoolClock.ts`/`ClockBadge.tsx`. Windows resolves imports case-insensitively,
and `Grounds.ts` next to `grounds.ts` broke the type-check.

## 2026-09-27: the second overhaul

Asked for by the user in one list; §12 of the concept doc has the reasoning.

- **Music**: `ambient.ts` generates it in the browser (Web Audio: pad, music
  box, bass). Toggle top-right, remembered, never autoplays past the browser.
- **Doors open** from outside: `presence.ts` registry, hinged leaves, a dark
  lobby behind so an open door is not a peephole.
- **No "school is built" pill** once the offer is empty.
- **Nobody is drawn inside anything** — the sixth invariant, see below — and
  everybody sits ON their seat (`SEAT_TOP`).
- **The canteen** is a kitchen, a cook, a queue, café tables and long tables
  (`cafeteriaLayout`). Gym players with a ball and a coach, a librarian, a
  rehearsal on the hall stage and two students chatting in the yard are
  `roomLoops`. `PatrolPerson.group` names a shared loop so the spacing test
  holds it to the wanderers' promise.
- **Reception + forecourt** are one early purchase (70 BitWord); old saves get
  the forecourt on read (`withBundles` in `knownRooms`). **`frontDoor`** gives
  every campus a way in before that.
- **The outside is bought**: facade, roof (flat finishes or pitched), trim;
  `POST /progress/school/exterior`, worn via `PATCH /progress/school/look`.
  Migration `0003_school_exterior` (additive only). **The school name** on the
  gate: `PATCH /progress/school/name`, visitors see it.
- **Build animation** (`Arrival.tsx`), **night windows and seasons**
  (`atmosphere.ts`), **teacher notes** every 5 minutes (`staffNotes.ts`,
  `TeacherNotes.tsx`) with "Show me" gliding the camera to them.

The sixth invariant: `never draws a walker inside furniture, a desk or a seated
person`. It samples `walkerAt` (lane included) against footprints grown by the
body radius, in all four desk layouts. Do not relax it to the centre line.

Open from this round:

- (Done 2026-09-27: the API tests for the bundle, the exterior and the name
  have run and pass.)
- The study hall still is not a commuter destination: its route crosses
  classroomC's desks, not only the hall's chairs, so a hall lane alone would
  not have been enough.
- Nothing moderates a school name beyond `cleanSchoolName`; an admin "clear
  name" (without a full school reset, which also clears it) would be the next
  step if a bad one ever appears.

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

- `renderScale.ts` is the pixelation (0.38 on a desktop, finer on a phone); `MIN_READABLE_ZOOM
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
