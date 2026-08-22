# Landing page prototypes

Three standalone HTML prototypes for the malako marketing page. Each is a single
self-contained file — no build step, no dependencies. **Open them directly in a
browser**, or use the published link.

They are prototypes, not shipping code. Nothing here is wired into the Vite app.

---

## ✅ `landing-instrument.html` — approved direction

<https://claude.ai/code/artifact/8277e993-fa59-4f95-bb4f-8371b71d1faf>

**The player is the hero.** The first screen is a working segment strip: sixteen
blank numbered cells, one per sentence, sized to their real durations, with the
playhead sweeping through and the speed / repeat / mode controls live.

What makes it work is that the cells are *empty*. `timeMarkers` for Leo's Life in
`src/modules/audiodata/audioData.tsx` carry labels that are literally `"1"`
through `"16"`, and the subtitle layer is off by design — so the app really does
show numbered slots and no text. The blank tile is the product's argument, not a
placeholder.

Everything on it is pulled from real config rather than invented:

| On the page | Source of truth |
|---|---|
| 16 segments and their durations | `modules/audiodata/audioData.tsx` → `audioTracks[0].timeMarkers` |
| Drill ladder 0.5× → 0.8× → 1.0× | `components/Player/hooks/useSegmentEngine.ts` → `SPEED_SEQUENCES` |
| Red accent | the marker data itself ships `color: "red"` |
| 10 school stages, names, blurbs, prices | `config/schoolCatalog.ts` → `SCHOOL_STAGES` |
| School floorplan | `config/schoolCatalog.ts` → `VARIANT_COURTYARD` |
| Room colours | `config/schoolCatalog.ts` → `SCHOOL_WALLPAPERS` |
| Level fat percentages | `locales/*/translation.json` → `levels.fat*` |

RU/EN toggle, light/dark toggle. Russian is the default when the browser is
Russian.

**Known gaps, if this gets built for real:**

- The player is **silent.** A published artifact can't ship audio files. Options
  are the browser's `speechSynthesis` API (works offline, no network, but the
  voice quality varies by OS) or wiring it to a real clip from the bucket.
- Only the `courtyard` variant is drawn. `quad` and `terrace` exist and use the
  same room ids, so a variant toggle is mostly plumbing.
- Copy is first-draft. The structure is the point, not the wording.

---

## `landing-directions.html` — the four pitches

<https://claude.ai/code/artifact/5a24c952-9348-4b4b-ae9d-1695cbccb5ef>

Four live concept demos used to find the direction above. Kept because two of
them are still unbuilt and might be worth returning to:

1. **Проверь ухо** — the hero runs an actual listening test on you using the
   browser's speech synthesiser. Full speed, you guess, you fail, it replays at
   0.5×. The strongest hook of the four and *not yet used anywhere*.
2. **Осциллограмма** — page-as-player, with a waveform. Rejected: the waveform
   specifically. The underlying idea became `landing-instrument.html`.
3. **Треугольный пакет** — Soviet triangular milk pack, levels as fat content,
   two inks and no gradients.
4. **Твоя школа** — isometric school. Rejected because it used an invented
   6-stage school instead of the real one.

---

## `landing-malako.html` — rejected

<https://claude.ai/code/artifact/e020145a-75bb-4692-a225-4c5d2d203896>

An editorial "exercise sheet": paper, ink, a teacher's red pen, the молоко →
малако strike-through in the hero, and the six objections laid out as a worked
answer sheet with live demos.

Rejected as too quiet — it reads as more restrained than the product it is
selling. Kept because a few pieces may be worth salvaging: the молоко → малако
hero animation, the six-objection worked answer sheet, and the
"he would have gone → hewudov" specimen that runs through it.

---

## Direction notes

Constraints that came out of review, worth not rediscovering:

- **The audience is everyone**, not schoolchildren. No toy palettes, no
  gamified-for-kids framing. Adult and confident.
- **Don't mock up something that already exists in the codebase.** Read the
  config first — the invented school is precisely what got direction 4 rejected.
- The page should be **louder than a document**. Animation and a hook are the
  brief, not typography.
