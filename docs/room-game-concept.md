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

There is exactly **one button**: _Upgrade the school_. It costs BitAward,
BitWord and BitPhrase together. Press it and the school gets visibly bigger.

Everything else on screen is the school itself.

## 2. What you can and cannot do

|                              |                                                        |
| ---------------------------- | ------------------------------------------------------ |
| Upgrade to the next stage    | yes — the one button, costs all three currencies       |
| Change wallpaper / floor     | yes, free; new options unlock with stages              |
| Rearrange the desks          | yes, free — pick one of four layout presets            |
| Pan and zoom the view        | yes, fullscreen, one finger to pan, two to zoom        |
| Poke a student or the teacher| yes — they answer with a speech bubble                 |
| Buy individual furniture     | **no.** Removed. Furniture arrives with stages         |
| Enter/leave rooms, menus     | **no.** One continuous view, always                    |

## 3. The ten stages, and three campuses

One growing floorplan, all on a single ground plane, never a second floor — a
second floor would have to hide the first one, and hiding progress is the
opposite of the point.

**There are three floorplans**, and a player is assigned one for life. The
economy is identical across all three — stage 7 costs the same whoever you are —
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

| Stage | Name             | What appears                                                             | Cost (Award / Word / Phrase) |
| ----- | ---------------- | ------------------------------------------------------------------------ | ---------------------------- |
| 0     | One Room         | small classroom, 4 desks, board, teacher, 3 students                      | — (you start here)           |
| 1     | Full Class       | classroom grows, 9 desks, bookshelf, plants, more windows                 | 40 / 20 / 10                 |
| 2     | Reading Corner   | library wing: shelves, rug, armchairs, 2 readers                          | 90 / 45 / 25                 |
| 3     | Listening Lab    | corridor + lab: booths, lockers, corridor walkers, the first commuter     | 180 / 90 / 50                |
| 4     | Courtyard        | open-air yard: tree, fountain, benches, lamppost                          | 320 / 160 / 90               |
| 5     | Assembly Hall    | hall wing: stage, banner, chair rows, trophy shelf, second teacher        | 550 / 275 / 160              |
| 6     | Front Desk       | reception + the way in: gate, sign, lamps, sofas, receptionist, cupboards | 800 / 400 / 230              |
| 7     | Second Classroom | a second English room — flags, globe, alphabet frieze                     | 1100 / 550 / 320             |
| 8     | Cafeteria        | servery, long tables, **a third classroom**, computers appear             | 1500 / 750 / 430             |
| 9     | Gymnasium        | wall bars, hoops, vaulting horse, mats, a scoreboard that keeps score     | 2000 / 1000 / 580            |

Prices are steep on purpose — a quiz pass mints 5 BitAward, so stage 9 is a
long-term goal, not an afternoon of play. All prices live in
`backend/src/config/schoolCatalog.js`; the client only ever sends a stage
number, never a price.

**Two rules govern where a room may go**, and both are forced by the fixed
camera. Break either and the damage is invisible until you look at a render:

1. A room placed north or west of another sits **behind** it, so wherever two
   rooms meet that span of wall drops to knee height and the room behind stays
   visible. Height is computed **span by span**, not per wall, so a wall can be
   full height for part of its run and knee-high for the rest.
2. Therefore **nothing may be built directly north of a classroom** — that is
   the wall its board hangs on, and a knee-high partition leaves the board
   floating in mid-air. In practice every classroom sits on the campus's
   northern edge.

`schoolCatalog.test.ts` asserts rule 2, no-overlap, never-shrinking and a dozen
other invariants across **all three variants at all ten stages**.

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

The whole save is four fields:

```js
school: {
  stage:       Number,  // 0..9
  layoutId:    String,  // "rows" | "u-shape" | "clusters" | "circle"
  wallpaperId: String,
  floorId:     String,
  variantId:   String,  // "courtyard" | "quad" | "terrace" — fixed per player
}
```

The old `unlockedRoomIds` / `ownedItemIds` / `ownedActionIds` / `placed` are
dropped, along with everything that read them. Coins already spent on old
furniture are not refunded.

Endpoints:

|                                |                                                    |
| ------------------------------ | -------------------------------------------------- |
| `GET /progress/school`         | your school + wallet                                |
| `GET /progress/school/:userId` | someone else's school, no wallet (visiting)         |
| `POST /progress/school/upgrade`| the one button. Server re-reads the price           |
| `PATCH /progress/school/look`  | `{ layoutId?, wallpaperId?, floorId? }`, free       |
| `GET /progress/school/catalog` | stages + looks, for sanity-checking the mirror      |

The upgrade endpoint takes **no** body. It charges whatever the catalog says the
_next_ stage costs, and it debits all three currencies or none.

## 8. Non-goals

Not a management sim. No staff to hire, no timetable, no money loop of its own,
no failure state, nothing to lose. If a feature needs a second button on the
main view, it does not belong here.

## 9. Still open

- Whether stage 9 is really the end, or the campus keeps extending.
- Whether three campus variants is enough, or new players should get more.
- Whether visiting another player's school should show their people animated
  (currently yes) or frozen.
- The real art. Everything above is placeholder geometry.
