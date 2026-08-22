# `useSegmentEngine` — how it works, step by step

> Interview prep notes for `src/components/Player/hooks/useSegmentEngine.ts`.
> Read top to bottom: **what it does → the mental model → the machinery → the tricky parts → likely questions.**

---

## 1. The one-sentence version

`useSegmentEngine` is the **autopilot of the audio player**: it watches playback ~60 times per second, notices when the current sentence has finished, and then decides whether to **replay that sentence faster**, **move to the next one**, or **stop**.

Everything else in the file exists to make that one decision reliable.

---

## 2. The mental model: markers → segments

The story audio is one long MP3. A **marker** is just a timestamp saying "a new sentence starts here."

```
time (seconds)
0        3.2         7.0        11.4              18.9 = end of audio
|---------|-----------|----------|-----------------|
 markers[0] markers[1] markers[2] markers[3]

   seg 0       seg 1      seg 2        seg 3
 (0→3.2)    (3.2→7.0)  (7.0→11.4)   (11.4→end)
```

A **segment** = the window between one marker and the next. That's it. "Repeat this sentence" and "next sentence" are both just *"pick a `[start, end)` window and seek into it."*

That conversion lives in one shared helper, [segmentBounds.ts](../src/lib/segmentBounds.ts):

```ts
computeSegmentBounds(markers, index, duration) → { start, end }
```

Two details worth knowing (they show up in interviews as "why is this defensive?"):

- Markers are **either** a plain number **or** `{ time: number }` — old static stories store numbers, the Story Builder writes objects. `markerTime()` unwraps both.
- If `duration` is still `0` (audio metadata hasn't loaded yet), the end falls back to **`Infinity`** = "play to the end." A `0` end would mean an empty segment and playback would stop instantly.

---

## 3. The two dimensions of "mode"

There are **two independent toggles**, and confusing them is the #1 way to misread this file.

|  | **Enhanced mode ON** | **Enhanced mode OFF (Free Play)** |
|---|---|---|
| What it does | Sentence-by-sentence drilling with auto-repeat | Plain audio player, plays straight through |
| Engine active? | Yes — segment logic runs | **No** — the whole decision block is skipped |

Inside Enhanced mode, a second toggle decides what happens *after* a sentence's repeats are done:

|  | **Controlled mode ON** | **Controlled mode OFF (auto-advance)** |
|---|---|---|
| After repeats finish | Move to next sentence and **pause** — the learner presses play | Move to next sentence and **keep playing** |
| Why | Gives the user a beat to repeat the phrase out loud | Hands-free listening |

---

## 4. The speed ladder

```ts
SPEED_SEQUENCES = {
  1: [1.0],            // repeatCount 1 → hear it once, normal speed
  2: [0.8, 1.0],       // repeatCount 2 → slow, then normal
  3: [0.5, 0.8, 1.0],  // repeatCount 3 → very slow, slow, normal
}
```

So with `repeatCount = 3`, one sentence sounds like:

```
pass 1 ──0.5x──▶  "The… quick… brown… fox…"
pass 2 ──0.8x──▶  "The quick brown fox…"
pass 3 ──1.0x──▶  "The quick brown fox."
                        │
                        └─▶ sentence done → next sentence
```

**Who sets the speed for pass 1?** Not this hook — `usePlayerControls` applies `seq[0]` when you hit play or change the repeat count. This engine only sets the speed for passes **2…N**, and then restores the user's own preferred rate when the sentence is finished.

---

## 5. The architecture: one loop, many mailboxes

### 5a. Why everything is a `useRef`

Look at the top of the hook — almost every prop gets mirrored into a ref:

```ts
const isPlayingRef          = useRef(isPlaying);
const currentMarkerIndexRef = useRef(currentMarkerIndex);
const repeatCountRef        = useRef(repeatCount);
// …and a tiny useEffect for each one that keeps it in sync
useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
```

This looks like boilerplate. It's actually the **central design decision**.

The problem it solves: the animation loop is created inside a `useEffect`. A closure captures the values that existed *when it was created*. If the loop read `repeatCount` directly, it would forever see the value from mount — **stale closure**.

The naive fix is to put every prop in the dependency array — but then the effect tears down and rebuilds the whole loop every time the user nudges a slider, and any in-flight segment transition gets destroyed mid-flight.

The refs are the fix:

```
   props (change often)                 the RAF loop (created ONCE)
  ┌────────────────────┐               ┌──────────────────────────┐
  │ repeatCount = 3    │──useEffect──▶ │ repeatCountRef ──────────┼─▶ reads .current
  │ isPlaying = true   │──useEffect──▶ │ isPlayingRef             │   → always fresh
  │ timeMarkers = [..] │──useEffect──▶ │ timeMarkersRef           │
  └────────────────────┘               └──────────────────────────┘
                                        deps: [isInitialized,
                                               getSegmentBounds,
                                               dispatch]   ← all stable
```

**The soundbite:** *a ref is a mailbox. React drops new values in; the long-lived loop reads the mailbox instead of holding a copy. The loop gets fresh data without being rebuilt.*

Not all refs are mirrors, though. Three of them are **real state that only the engine owns**:

| Ref | Meaning |
|---|---|
| `currentRepeatRef` | how many times the current sentence has played (0, 1, 2…) |
| `isSegmentTransitioningRef` | **the lock** — "a handover is in progress, don't start another" |
| `pausedByVisibilityRef` | "*we* paused this because the tab was hidden, so *we* should resume it" |

These are refs not because of closures, but because changing them must **not** trigger a re-render — they change many times per second.

### 5b. The heartbeat: `requestAnimationFrame`

```ts
const tick = () => {
  if (isCancelled) return;
  if (isPlayingRef.current && instance) {
    const now = instance.getCurrentTime();
    dispatch(setCurrentTime(formatTime(now)));
    /* …segment-end check… */
  }
  rafRef.current = requestAnimationFrame(tick);   // schedule the next frame
};
rafRef.current = requestAnimationFrame(tick);      // kick it off
```

It's a self-rescheduling loop — roughly 60 checks per second, synced to the browser's paint cycle.

**Why RAF rather than the audio element's `timeupdate` event?** `timeupdate` only fires ~4 times a second and its rate isn't guaranteed. At 4 Hz you could overshoot a sentence boundary by 250 ms — you'd hear the first word of the next sentence bleed in. RAF gives ~16 ms precision, and it automatically throttles when the tab is hidden.

**Two shutdown mechanisms, on purpose:**

```ts
return () => {
  isCancelled = true;                    // ① flag, checked inside pending setTimeouts
  cancelAnimationFrame(rafRef.current);  // ② stop the next frame
};
```

`cancelAnimationFrame` stops the loop, but it can't stop the `setTimeout`s that a transition already scheduled. The `isCancelled` flag is what those timeouts check before touching a possibly-unmounted player.

---

## 6. The core decision — one tick, step by step

Every frame, while playing:

```
      ┌─────────────────────────────────────────────┐
      │ now = wavesurfer.getCurrentTime()           │
      │ dispatch(setCurrentTime(...))  ← UI clock   │
      └──────────────────┬──────────────────────────┘
                         │
          Enhanced mode? ─┴─ no ──▶ do nothing, just keep the clock ticking
                         │ yes
          markers exist? ─┴─ no ──▶ do nothing
                         │ yes
          lock is free?  ─┴─ no ──▶ do nothing (a handover is already running)
                         │ yes
      ┌──────────────────▼──────────────────────────┐
      │ { end } = getSegmentBounds(currentIndex)    │
      │ now >= end - 0.05 ?                         │
      └──────────────────┬──────────────────────────┘
                    no ──┴── yes
                    │        │
                 keep      TAKE THE LOCK, pause, currentRepeat += 1
                 playing         │
                                 ▼
                  ┌──────────────────────────────┐
                  │ currentRepeat < repeatCount? │
                  └───────┬──────────────┬───────┘
                        yes              no
                          │              │
                   ┌──────▼─────┐   ┌────▼────────────────────┐
                   │ (A) REPEAT │   │ sentence done:          │
                   │ same       │   │ • fire BitPhrase reward │
                   │ sentence,  │   │ • reset repeat counter  │
                   │ next speed │   │ • restore user's speed  │
                   └────────────┘   └────┬────────────────────┘
                                         │
                              more sentences left?
                                  ┌──────┴──────┐
                                yes            no
                                  │             │
                        controlled mode?   ┌────▼──────────────┐
                          ┌──────┴─────┐   │ (D) FINISH        │
                        yes            no  │ stop, fire        │
                          │             │  │ onAudioComplete   │
                  ┌───────▼──────┐ ┌────▼─────────┐ └──────────┘
                  │ (B) NEXT +   │ │ (C) NEXT +   │
                  │     PAUSE    │ │  KEEP PLAYING│
                  └──────────────┘ └──────────────┘
```

### Why `end - 0.05`?

The loop can only check every ~16 ms, and the audio engine has its own latency. Firing 50 ms **early** means you cut the sentence a hair short instead of leaking the first syllable of the next one. In a language-learning app, a clean cut beats a perfect one.

### Why the lock (`isSegmentTransitioningRef`)?

Because a transition is not instant — it takes over a second of `setTimeout`s. Without the lock:

```
frame 1: now >= end → start transition
frame 2: now >= end (still! audio hasn't seeked yet) → start ANOTHER transition
frame 3: … → and another
```

You'd get dozens of overlapping transitions and the player would skip several sentences at once. The lock is set **before** `pause()` and cleared only at the very end of the handover — exactly the `if (busy) return;` guard from any state machine.

---

## 7. The four outcomes in detail

### (A) Repeat the same sentence, one notch faster

```ts
const seq = SPEED_SEQUENCES[repeatCountRef.current] ?? [1.0];
const nextSpeed = seq[currentRepeatRef.current] ?? 1.0;

dispatch(setPlaybackRate(nextSpeed));   // Redux → the UI badge updates
playbackRateRef.current = nextSpeed;    // ref → other hooks read it

setTimeout(() => {                      // ── 1000 ms ──
  wavesurfer.current.setPlaybackRate(nextSpeed);
  wavesurfer.current.setTime(start);    // rewind to the sentence start
  setTimeout(() => {                    // ── 50 ms ──
    isSegmentTransitioningRef.current = false;   // release the lock
    isPlayingRef.current = true;
    wavesurfer.current.play();
  }, 50);
}, 1000);
```

**Why the nested `setTimeout`s?** They're two different things:

- **1000 ms** is a *pedagogical* pause — a beat of silence so the learner can process (or repeat) the phrase before hearing it again. It's a product decision, not a technical one.
- **50 ms** is a *technical* pause — `setTime()` is asynchronous inside the audio pipeline. Calling `play()` in the same frame as a seek can produce a click or a moment of the old position. One frame of breathing room makes it clean.

Note the guard repeated inside **both** timeouts:

```ts
if (isCancelled || !wavesurfer.current || !isEnhancedModeRef.current) return;
```

A lot can happen in a second: the user unmounts the player, switches to Free Play, or changes track. Each timeout re-validates the world before acting on decisions made in the past.

### (B) Next sentence + pause (Controlled mode)

```ts
setTimeout(() => {
  dispatch(setCurrentMarkerIndex(nextIdx));   // highlight the new sentence
  wavesurfer.current.setTime(nextTime);       // park the playhead there
  isSegmentTransitioningRef.current = false;
  isPlayingRef.current = false;
  dispatch(setIsPlaying(false));              // UI shows the play button
}, 200);
```

Only **200 ms** here, and no second nested timeout — there's no `play()` to protect, so there's nothing to race.

### (C) Next sentence + keep playing (auto-advance)

Same as (B), but the speed is reset to `seq[0]` (start the ladder over for the new sentence) and it uses the same **1000 ms → seek → 50 ms → play** choreography as (A).

### (D) End of track

```ts
isSegmentTransitioningRef.current = false;
isPlayingRef.current = false;
dispatch(setIsPlaying(false));
onAudioCompleteRef.current?.();   // parent unlocks the quiz, marks progress, etc.
```

### The reward hook

Right when a sentence completes its full cycle:

```ts
onSegmentRepeatCompleteRef.current?.(repeatCountRef.current);
```

The engine doesn't know what a "BitPhrase" is — it just announces *"a sentence was fully drilled at repeat-level N."* `WaveformPlayer` turns that into a wallet API call. Clean separation: **the engine reports events, the parent decides what they mean.**

---

## 8. The two side-effects that keep it honest

### 8a. Leaving Enhanced mode

```ts
useEffect(() => {
  if (isEnhancedMode) return;                  // only runs when the mode goes OFF
  isSegmentTransitioningRef.current = false;   // drop any stale lock
  currentRepeatRef.current = 0;                // forget mid-sentence progress
  const rate = userPlaybackRateRef.current ?? 1.0;
  /* restore the user's own speed everywhere */
  if (isPlayingRef.current && !wavesurfer.current.isPlaying()) {
    wavesurfer.current.play();                 // rescue: we paused mid-transition
  }
}, [isEnhancedMode, …]);
```

The last line matters. If the user flips to Free Play at the exact moment a transition had called `pause()`, nothing would ever call `play()` again — the pending timeout bails out on its `isEnhancedModeRef` guard. This effect notices "React thinks we're playing but the audio isn't" and repairs it. **A stuck player is the worst possible bug here, so there's an explicit recovery path.**

Note `userPlaybackRateRef` vs `playbackRateRef` — a genuinely nice distinction:

- `userPlaybackRateRef` = *what the user chose* (their preference; only `changePlaybackRate` writes it)
- `playbackRateRef` = *what is playing right now* (the engine overwrites it constantly during the speed ladder)

When a sentence finishes, the engine restores the first from the second. Without two refs, the drill's 0.5x would silently become the user's new "preference."

### 8b. Tab visibility

```ts
document.addEventListener("visibilitychange", handleVisibilityChange);
```

- **Free Play** → ignore it entirely, let audio keep playing in the background.
- **Enhanced, tab hidden** → clear the lock, reset the repeat counter and the speed, pause, and **snap back to the start of the current sentence**.
- **Tab visible again** → if *we* were the ones who paused it (`pausedByVisibilityRef`), resume after 100 ms.

**Why this exists at all:** browsers throttle (and Chrome may freeze) timers and RAF in background tabs. A segment transition that started right before you switched tabs would resume in an unpredictable state — half-seeked, wrong speed, playing over the next sentence. Rather than trying to survive that, the handler **abandons the transition and rewinds to a known-good point.** The learner comes back to a clean sentence start, which is also the nicest UX.

`pausedByVisibilityRef` prevents a real bug: if the user had *deliberately* paused before switching tabs, coming back must **not** start playing at them.

---

## 9. What the hook returns, and why

```ts
return {
  getSegmentBounds, currentRepeatRef, isSegmentTransitioningRef,
  currentMarkerIndexRef, repeatCountRef, timeMarkersRef,
  durationSecondsRef, isEnhancedModeRef,
};
```

It returns its **internal refs** so `usePlayerControls` can share the same state. Example: when you click a different sentence on the waveform, `usePlayerControls` resets `currentRepeatRef` to 0 and clears `isSegmentTransitioningRef` — otherwise the engine would think it was still mid-repeat on the sentence you just left.

Trade-off worth naming out loud: this is **shared mutable state across hooks**. It's fast and avoids re-renders, but it means the engine isn't fully encapsulated — another module can reach in and change its internals. A stricter design would expose functions (`resetRepeatState()`) instead of raw refs. That's a fair thing to say in an interview: *"I know what I traded away here."*

---

## 10. The full picture on one page

```
┌─────────────────────────────────────────────────────────────────┐
│                        WaveformPlayer                           │
│  state: isPlaying, repeatCount, isControlledMode, isEnhanced…   │
└───────┬──────────────────────────────────────┬──────────────────┘
        │ props                                │ shared refs
        ▼                                      ▼
┌───────────────────────────┐        ┌──────────────────────────┐
│     useSegmentEngine      │◀──────▶│    usePlayerControls     │
│                           │  refs  │  play/pause, speed,      │
│  props ─▶ mirror refs     │        │  marker click, repeat #  │
│              │            │        └──────────────────────────┘
│              ▼            │
│   ┌──────────────────┐    │                ┌───────────────┐
│   │  RAF loop ~60fps │────┼── reads ──────▶│  WaveSurfer   │
│   │  "are we at the  │    │   commands ───▶│  (the audio)  │
│   │   end yet?"      │    │                └───────────────┘
│   └────────┬─────────┘    │
│            │ dispatch     │                ┌───────────────┐
│            └──────────────┼───────────────▶│ Redux store   │
│                           │                │ time, index,  │
│   visibilitychange ───────┤                │ rate, playing │
│   enhanced-mode reset ────┘                └───────────────┘
└───────────────────────────┘
```

**One line each:**
1. Markers cut the audio into sentences.
2. A RAF loop asks 60×/sec: "have we reached the end of this sentence?"
3. Refs feed that loop fresh data without ever rebuilding it.
4. At the boundary, a lock is taken so only one handover can run.
5. Four outcomes: repeat faster / next+pause / next+play / finish.
6. Timed `setTimeout` steps make seeks and speed changes glitch-free — each one re-validating that the world hasn't changed.
7. Two guardian effects (mode-off, tab-hidden) restore a clean state when the world *does* change.

---

## 11. Likely interview questions — with answers

**Q: Why `requestAnimationFrame` instead of the `timeupdate` event?**
Precision. `timeupdate` fires ~4×/sec, so you'd overshoot a sentence boundary by up to 250 ms and hear the next sentence bleed in. RAF gives ~16 ms and self-throttles in hidden tabs.

**Q: Why so many refs? Isn't that fighting React?**
It's working *with* React's model. The loop is long-lived; props are snapshots. Refs are the escape hatch React provides for exactly this: mutable values that survive re-renders and don't cause them. The alternative — putting props in the dependency array — would tear down and rebuild the loop on every slider nudge, killing in-flight transitions.

**Q: What is `isSegmentTransitioningRef` for?**
It's a mutex. A transition spans >1 s of async work while the playhead is still past the boundary, so without it the loop would fire dozens of overlapping transitions and skip several sentences.

**Q: Why `end - 0.05`?**
Anticipation. The check is quantised to a frame and the audio engine adds latency, so firing 50 ms early trims a hair of silence rather than leaking the first syllable of the next sentence.

**Q: Why does every `setTimeout` re-check the same three conditions?**
Because a second is a long time. Unmount, mode switch, or track change can all happen between scheduling and firing. Each callback re-validates the world before acting on a decision made in the past — decisions expire.

**Q: Why does the cleanup use both `isCancelled` and `cancelAnimationFrame`?**
They cover different things. `cancelAnimationFrame` stops the loop; it can't stop already-scheduled `setTimeout`s. `isCancelled` is what those timeouts read to know they're obsolete.

**Q: How would you test this?**
Extract and unit-test the pure parts first — `computeSegmentBounds` and `findMarkerIndexAt` already live in `lib/` for exactly that reason, with `constants.test.ts` covering the speed table. For the loop itself: fake timers, a stubbed WaveSurfer (`getCurrentTime`/`setTime`/`play`/`pause` as spies), and assert the call sequence for each of the four outcomes. The refactor that makes it truly testable is pulling the decision out of the loop into a pure `decideNextAction(state) → Action` function, then having the loop just execute the returned action.

**Q: What would you improve?**
Three honest ones:
1. **`dispatch(setCurrentTime(...))` fires every frame** (~60 Redux actions/sec) even though the formatted string only changes once a second. Compare with the previous value and dispatch only on change.
2. **The magic numbers** (1000, 200, 50, 0.05) are scattered inline. They're product decisions and belong in `constants.ts` with names like `PAUSE_BETWEEN_REPEATS_MS`.
3. **The visibility handler doesn't truly cancel in-flight transitions.** It clears the lock, but the pending `setTimeout`s only bail on `isCancelled`/unmount/mode-change — none of which are true when a tab merely hides. Storing the timeout IDs (or bumping a `transitionGenerationRef` that each callback compares against) would make the abort real rather than best-effort.

Naming that third one yourself is worth more than pretending the code is perfect — it shows you can read your own work critically.
