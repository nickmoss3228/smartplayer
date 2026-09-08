# Dream School — the isometric classroom

> This file replaces the earlier dollhouse concept entirely. Everything the old
> version described (seven purchasable rooms, a furniture shop, per-item prices,
> the SVG cutaway) is gone. What follows is what the game actually is.

## 1. The pitch

A top-down isometric view of your school. You start with **one classroom** — a
handful of desks, a board, a teacher and a few students — and you grow it into a
campus. The room is alive: students write, fidget and glance around, the teacher
paces in front of the board, speech bubbles pop. You watch it more than you play
it.

You grow it by **buying rooms, one at a time**, in whatever order you like. Build
mode puts every room you could add into the scene as a translucent ghost,
standing where it would actually stand, so the question "where does that go"
is answered by looking rather than by reading a list.
Each room has one authored home on the campus and one price in one currency —
BitAward for the corridor and the classrooms, BitWord for the rooms you read and
listen in, BitPhrase for the rooms you talk in. Which currency a room takes is
the point: the way you study decides what you can afford to build.

A room can only be bought once the room you would walk in through has been, so
what you own is always somewhere you can actually walk.

Everything else on screen is the school itself.

## 2. What you can and cannot do

|                              |                                                        |
| ---------------------------- | ------------------------------------------------------ |
| Buy the next room            | yes — any room whose way in you already own            |
| Choose which room comes next | yes — the order is yours                               |
| See it before you buy it     | yes — build mode stands it where it would go           |
| Decorate one room on its own | yes, free — customize mode, per room                   |
| Pay the staff                | yes, weekly. Skipping it costs morale and nothing else |
| Choose where a room goes     | **no.** Each room has one authored home                |
| Change wallpaper / floor     | yes, free; new options unlock with levels              |
| Rearrange the desks          | yes, free — pick one of four layout presets            |
| Pan and zoom the view        | yes, fullscreen, one finger to pan, two to zoom        |
| Poke a student or the teacher| yes — they answer with a speech bubble                 |
| Buy individual furniture     | **no.** Removed. Furniture arrives with stages         |
| Enter/leave rooms, menus     | **no.** One continuous view, always                    |

## 3. The rooms, the levels, and three campuses

One growing floorplan, all on a single ground plane, never a second floor — a
second floor would have to hide the first one, and hiding progress is the
opposite of the point.

**There are three floorplans**, and a player is assigned one for life. The
economy is identical across all three — the gym costs the same whoever you are —
but the shape of the building is not, so visiting somebody else's school shows a
different campus rather than a recolour of your own. The variant is derived from
the user id (stable, no migration) and then persisted, so it can be reassigned
by hand later without the derivation silently overriding it.

| Variant | Feel |
| --- | --- |
| **Courtyard** | rooms wrap a central open yard, hall out to the west |
| **Quad** | one long teaching terrace along the north, everything else hanging off a single corridor |
| **Terrace** | a long east-west street, big spaces stepping down to the south-east |

Every variant uses the same room **ids and kinds**; only the rectangles and the
doorways differ. That is what lets the props, the seating and the routing be
written once and work for all three.

Twenty rooms, each bought on its own, each in one currency. `Needs` is the room
you walk in through, and you cannot buy a room before it.

| Room             | Price       | Needs      | What it brings                                                            |
| ---------------- | ----------- | ---------- | ------------------------------------------------------------------------- |
| Classroom        | — (you start here) | —   | 4 desks, board, teacher, 3 students. Grows to 12 desks with the corridor   |
| Corridor         | 60 Award    | —          | the spine, and corridor walkers. Every other room opens off it             |
| Library          | 80 Word     | corridor   | shelves, rug, armchairs, 2 readers                                        |
| Listening Lab    | 400 Word    | corridor   | booths, lockers, headphones                                               |
| Courtyard        | 160 Phrase  | corridor   | open-air yard: tree, fountain, benches, lamppost                          |
| Assembly Hall    | 900 Word    | corridor   | stage, banner, chair rows, trophy shelf, a second teacher                 |
| Reception        | 1900 Word   | varies     | front desk, sofas, receptionist, cupboards                                |
| Forecourt        | 300 Phrase  | reception  | the way in off the street: gate, sign, lamps                              |
| Second Classroom | 2200 Award  | varies     | another English room — flags, globe, alphabet frieze                      |
| Cafeteria        | 600 Phrase  | varies     | servery, long tables, the loudest room here                               |
| Third Classroom  | 4300 Award  | varies     | a third English room, out past the hall                                   |
| Gymnasium        | 840 Phrase  | varies     | wall bars, hoops, vaulting horse, mats, a scoreboard that keeps score      |

And the second ring, which arrives once the first twelve are up:

| Room             | Price       | Needs      | What it brings                                                            |
| ---------------- | ----------- | ---------- | ------------------------------------------------------------------------- |
| Staff Room       | 900 Phrase  | varies     | armchairs round a low table, and three teachers off duty in them          |
| Music Room       | 1400 Phrase | varies     | a piano, a riser, speakers, and an audience of three                      |
| Garden           | 1900 Phrase | varies     | walled and planted: raised beds, a tree, two benches                      |
| Archive          | 2400 Word   | varies     | a second library — stacks, a reading corner, study desks                  |
| Head's Office    | 3000 Award  | varies     | a desk, a trophy shelf, and whoever is running the place                  |
| Study Hall       | 4900 Word   | varies     | a third library, quieter than either                                      |
| Fourth Classroom | 5200 Award  | varies     | another English room, out at the east end                                 |
| Fifth Classroom  | 6400 Award  | varies     | the far corner — the first room whose board hangs on its WEST wall        |

"Varies" means the parent differs by campus — the Terrace hangs its second
classroom off the hall, the Quad off the corridor. The tree is in each variant's
`doors` map.

A whole campus costs **21160 BitAward, 10580 BitWord and 6100 BitPhrase** — the
same 2 : 1 : 0.57 ratio the ten stages charged in, about three times as much of
it. Prices are steep on purpose — a quiz pass mints 5 BitAward — so a finished
school is a long-term goal, not an afternoon of play.

All prices live in `backend/src/config/schoolCatalog.js`; the client only ever
sends a room id, never a price.

**Levels** are what the ten stages became. `levelFor(owned)` maps the room count
through `LEVEL_AT_ROOMS` onto the same ten records, which still carry the desk
counts, the student counts and how many people wander and commute. Buying a room
is what moves it; nothing charges for it.

**Two rules govern where a room may go**, and both are forced by the fixed
camera. Break either and the damage is invisible until you look at a render:

1. A room placed north or west of another sits **behind** it, so wherever two
   rooms meet that span of wall drops to knee height and the room behind stays
   visible. Height is computed **span by span**, not per wall, so a wall can be
   full height for part of its run and knee-high for the rest.
2. Therefore **every classroom needs one drawn wall with room for a board on
   it** — north for preference, else west. A board on a knee-high partition
   floats in mid-air, and the cutaway draws only those two walls, so those are
   the only two a board can go on at all.

   This used to be the flat rule "nothing may be built directly north of a
   classroom", which pinned every classroom to the campus's northern edge. It
   was true while the board was nailed to the north wall regardless, and it is
   what `boardFrameOf` replaced: a classroom now lays itself out in board-local
   space and gets mapped onto whichever of the two walls it actually has. The
   fifth classroom in every campus is the one that uses it.

`schoolCatalog.test.ts` asserts rule 2, no-overlap, never-shrinking and a dozen
other invariants across **all three variants over a spread of owned sets** —
see §10.

## 3a. Doors are real holes, not decoration

Each room records the point where it meets the room you pass through to reach
the corridor. That single door map drives **both** things that used to disagree:

- the router sends people through the door point, and
- `Building.tsx` cuts the wall geometry open at exactly that point, framing it
  with jambs and a lintel.

Before this they were independent, and the result was the obvious bug: people
walked through solid walls, and there were no doors to walk through. The
regression test is not "does a door produce an opening" — that just restates the
implementation — but **walk every route anybody actually follows and check each
wall crossing lands inside a hole**. That test immediately caught a second case
nobody had noticed: the wanderer loop cut a diagonal from the courtyard back to
the corridor straight through the lab's north wall. Wanderers now travel by real
routes, exactly as commuters do.

## 3b. Rooms are deliberately not a subject list

This is an English school. The second and third classrooms are **more English
rooms** — flags, a globe, an A–Z frieze — never a maths room or a science lab.
Everything the campus adds is either a different *kind* of space (somewhere to
eat, to exercise, to be met at the door) or more of the same subject. A
timetable of unrelated subjects would make it a school simulator, which §8 says
it is not.

## 4. Making it alive

This is where the effort goes. Nothing here needs a button.

- **Students** sit at desks. Each one writes, pauses, leans back, looks at a
  neighbour, on its own slightly-offset loop, so no two are ever in sync.
- **The teacher** walks a patrol path in front of the board, stops, turns to the
  class, talks (bubble), walks on.
- **Wanderers** (stage 3+) drift along the corridor and around the courtyard
  between waypoints. From stage 6 their loop runs in through the gate and
  across reception, so the school visibly has people arriving.
- **Commuters** (stage 3+) are the ones with somewhere to be: they sit in one
  room, get up, walk a real route across the campus — out of their room, along
  the corridor, into another — and sit down at the far end for a while before
  walking back. Routing is a doorway tree rather than a navmesh: every room
  hangs off the corridor by a chain of doorways, so a path is "walk out to the
  corridor, cross it, walk in the other side". Each stage adds another journey,
  so the campus gets busier as well as bigger.
- **Props with a pulse**: the globe turns, flags stir, the fountain jets, the
  water cooler burps a bubble, the computer screen drifts in brightness, the
  gym scoreboard ticks over, the tree sways, and the wall clock's hand moves.
  None of them need a button and none of them are interactive — they exist so
  that no part of the frame is ever completely still.
- **Speech bubbles** fire on a scheduler — one NPC every 4–7 seconds, visible
  for ~3 seconds. Content is mixed: generic classroom chatter for everyone, and
  once you have learned words in your profile, real words you learned get mixed
  into the pool. The room slowly starts quoting your own vocabulary back at you.
- **Your avatar** (the dress-up character that already exists) sits at the front
  desk wearing whatever you equipped, with a small ring under it so you can find
  yourself.
- **Ambient**: a slow day→evening tint through the windows, and a wall clock
  whose hand actually moves.

Interactivity is deliberately thin: tap a person → bubble + a small hop. Tap the
board → a learned word gets written on it. That is the whole list.

## 5. Look

Isometric, orthographic camera locked at a fixed angle. No rotation — rotation
makes an isometric scene read as "a 3D app" and invites people to fight the
camera. Flat, low-saturation palette. **Rendered at ~35% resolution and upscaled
with nearest-neighbour**, which is what makes it pixelated.

The pixelation is one number (`PIXEL_DPR` in `SchoolCanvas.tsx`). Set it to 1
and the same scene renders crisp. That is the intended path when the real art
arrives.

**The camera is yours once you touch it.** It frames the whole campus on load
and glides out to reveal a new wing when you buy one, but any drag cancels that
animation and nothing ever re-centres the view afterwards. What keeps the school
from being lost is a leash, not a spring: the view centre is clamped to the
campus bounds plus a margin, and inside that range there is no pull at all.
It aims at the area-weighted centroid of the rooms rather than the centre of the
bounding box, because an L-shaped campus has a large empty quarter and aiming at
the box centre points the camera at grass.

## 6. How to plug in the designer's 3D models

This is the reason the scene is real 3D (React Three Fiber) rather than 2D
sprites: a pixel-art sprite scene would have to be thrown away when models
arrive. Here the models drop into place.

**What to ask the designer for**

- Format: **glTF binary (`.glb`)**, one file per prop. Not FBX, not OBJ, and not
  one giant scene file — a file per prop keeps loading lazy and lets you replace
  a single desk without re-exporting the school.
- Scale: **1 unit = 1 metre**, and the scene grid is 1 tile = 1 metre. A student
  desk should measure about 1.2 × 0.6 m.
- Origin: **on the floor, centred** — pivot at the bottom centre of the
  footprint, not the visual middle. Every prop in `furniture.tsx` is anchored
  that way, so a correctly-pivoted model needs no offset.
- Facing: **+Z is the front** of the prop. Rotation in the config is in 90°
  steps around Y.
- Budget: a few thousand triangles per prop, one material, one 512² texture. The
  scene draws 60–100 props at stage 5, on a phone.
- Animated characters: a single `.glb` with the mesh plus named clips — `idle`,
  `write`, `walk`, `talk`. Named exactly like that.

**What to change in the code**

1. Drop the files in `public/models/`.
2. In `src/modules/school/furniture.tsx`, each prop is one component that today
   returns a few `<mesh>` boxes. Replace the body with drei's `useGLTF`:

   ```tsx
   const Desk = (props: PropProps) => {
     const { scene } = useGLTF("/models/desk.glb");
     return <primitive object={scene.clone()} {...props} />;
   };
   ```

   The prop's position, rotation and scale come from the caller and do not
   change. Props can be converted one at a time — a half-converted scene works.

3. For people, `src/modules/school/People.tsx` drives limbs by writing to mesh
   refs in `useFrame`. Swap that for drei's `useAnimations` and play the named
   clip the NPC's state machine already picks (`idle` / `write` / `walk` /
   `talk`) — the state machine stays, only the thing it drives changes.
4. Set `PIXEL_DPR = 1` and turn antialiasing on in `SchoolCanvas.tsx`.
5. Preload what stage 0 needs (`useGLTF.preload(...)`) and let later stages load
   on unlock, so the first paint stays fast.

Nothing in the catalog, the backend, the state hook or the page needs touching
for any of that.

## 7. Data

The room list is the whole save:

```js
school: {
  ownedRoomIds: [String], // THE save. Everything on screen derives from it
  stage:        Number,   // 0..9 — dead as progress, kept as the LEVEL FLOOR
  layoutId:     String,   // "rows" | "u-shape" | "clusters" | "circle"
  wallpaperId:  String,
  floorId:      String,
  variantId:    String,   // "courtyard" | "quad" | "terrace" — fixed per player
}
```

**How developed the school is, is derived, not stored.** `levelFor(owned)` maps
the room count onto the same ten levels that used to be stages, and those levels
still drive how many people turn up and which free looks are selectable. Keeping
the level derived is what let the whole rendering layer stay untouched: `plan.stage`
is still a resolved level record, so every `stage.students` and
`stage.index >= 7` downstream reads exactly as before.

`stage` survives as the **level floor** and nothing else. A player migrated off
the ten-stage economy does not always re-earn the level they paid for — the old
stage 1 bought the classroom's extension rather than a room — and a level that
went *down* would drop a wallpaper they had already chosen out of the unlocked
list, leaving the server refusing their own save. The floor makes that
impossible. A player who never saw that economy has 0 here, which floors nothing.

Migration runs lazily on first read, in `ensureSchool`, from a frozen
`LEGACY_STAGE_ROOMS` table rather than from the live catalog — the catalog is
free to move from here on, and that table has to keep saying what the game
looked like on the day it changed.

The dollhouse's `unlockedRoomIds` / `ownedItemIds` / `ownedActionIds` / `placed`
are still stripped on read rather than migrated. Coins already spent on old
furniture are not refunded.

Endpoints:

|                                |                                                    |
| ------------------------------ | -------------------------------------------------- |
| `GET /progress/school`         | your school + wallet                                |
| `GET /progress/school/:userId` | someone else's school, no wallet (visiting)         |
| `POST /progress/school/rooms`  | `{ roomId }`. Server reads the price and the rules |
| `PATCH /progress/school/look`  | `{ layoutId?, wallpaperId?, floorId? }`, free       |
| `GET /progress/school/catalog` | rooms + levels + looks, for checking the mirror     |

The buy endpoint's body names a room and **nothing else**. The price, the
currency, and whether the room may be bought at all are read from the server's
own catalog when the request lands, so a client can never name a price, a
currency or a discount. It charges one currency, and the `$ne` guard on the
recording write is what stops a double tap paying twice.

## 8. Non-goals

A management sim only in the gentlest sense. There is a weekly payroll and a
morale number, and that is the whole of it: **nothing can ever be taken away**.
No room closes, no teacher leaves, no progress is lost. A school left unpaid gets
quieter — fewer students turn up — and recovers the moment you pay. The currency
here comes from studying, and a fortnight of real life must not be able to
dismantle what somebody built. Still no timetable and no failure state.

> The original rule here was "if a feature needs a second button on the main
> view, it does not belong here", and per-room purchase broke it deliberately
> rather than by accident. The one button was a good constraint while the game
> was a progress bar you pressed ten times; it stops being one the moment the
> player has a real choice to make about what to build next. Three more buttons
> are planned — build preview, per-room customization, and a director who asks
> you to make payroll — and each of them has to earn its place the same way:
> by giving the player a decision, not a setting.

## 9. Still open

- Whether the campus keeps extending past its current twelve rooms.
- Whether three campus variants is enough, or new players should get more.
- Whether visiting another player's school should show their people animated
  (currently yes) or frozen.
- The real art. Everything above is placeholder geometry.

## 10. How the invariants are still checked

Rooms used to be a pure function of one integer, so thirty plans — three
variants at ten stages — was the *whole* space, and `schoolCatalog.test.ts`
swept it exhaustively. Buying rooms one at a time makes the space 2^12 per
variant, and an exhaustive sweep is no longer on the table.

So the suite samples, and the sampling is chosen to cover the shapes that
actually break things:

- **The chain.** Buying in catalog order, one room at a time, yielding the owned
  set after every purchase. This is the run almost every real player is
  somewhere along.
- **Four scrambled runs per variant**, seeded from a tiny LCG so a failure
  reproduces from its label alone. These reach the lopsided campuses the chain
  never does — a gym and no library, a cafeteria wing with nothing east of the
  corridor — and they are where a room that quietly depended on a neighbour
  existing shows up.
- **The full set.** The only plan with every room in it at once.

Both run kinds only ever buy what `canBuy` allows, so nothing is checked against
a campus a player could not be holding. About a hundred plans, against thirty
before.

The sampling found two real bugs on its first run, both latent under the old
fixed unlock order:

1. **Commuters vanished on a lopsided campus.** The list of journeys worth
   walking was hardcoded and assumed the stage unlock order, so a player who
   bought seven rooms in their own order could end up with one commuter where
   the level promised three. Journeys are now generated from the destinations
   the campus actually has, and walked in rounds — two students on the same
   library-to-cafeteria run is what a small school looks like.
2. **Reception's trophy shelf stood across a seat approach.** The far end of the
   near sofa is only reached once reception is busy enough to need all three
   seats, which no fixed unlock order ever produced. The shelf moved to the east
   wall.

Neither was introduced by per-room purchase. Both were always there, waiting for
a player to buy rooms in an order nobody had tried.

## 11. What the second ring taught us

Twelve rooms became twenty, and the sampling found the same class of bug three
more times. All of it was latent; none of it was caused by the new rooms.

**A route to a room cuts straight through whatever room it hangs off.**
`routeBetween` walks door to door in straight lines up the parent chain, so
passing through a room is a straight line between two of its doorways. The first
twelve rooms hid this by hanging almost everything directly off the corridor —
the three that did not (reception, the lab, the cafeteria) already took a `doorX`
and laid themselves out around that lane, which is the documented fix and was
already in the code. The second ring is two rooms deep, so it had nowhere to hide.

The fix is to put doors on the lane the room already keeps clear: a library-kind
room reserves its east aisle, and the music room now reserves one too. Where a
lane could not be found the room was re-parented instead — the garden hangs off
the forecourt in two campuses because hanging it off the archive meant walking
over the reading table.

**A prop that ignores its own `len` is a collision bug waiting for a second
caller.** `StagePlatform` was hardcoded at 7.2m while `footprintOf` believed
whatever `len` it was handed. Invisible for as long as only the hall used it;
the moment the music room asked for a 2.8m riser, two and a half metres of
visible stage had no collision box behind it. Anything that takes a `len` has to
be built from it.

**A wander stop is somewhere on a circuit, not a destination.** Adding the second
ring to `ROAM_STOPS` put two walkers half a metre apart: those rooms are leaves,
so a lap that went in had to come back out the way it went and retrace its own
approach. They get commuters and their own residents instead — which is the truer
reading of a staff room or an archive anyway.

**`visitSeats` offered a bench that `clearDoorways` had already deleted.** A
doorway carries a 1.9m clearance zone and anything standing in it is dropped;
put one halfway down the cafeteria's east wall and it takes a long table with it,
while the seating logic went on offering seats at that table. The backstop is
there to catch a stray plant, not to cover for a door placed through the
furniture.
