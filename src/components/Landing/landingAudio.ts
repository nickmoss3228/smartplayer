/**
 * The landing's sound: one element for Leo's part 1 (the demo player, the
 * dancer's phrase and «Найди сцену» all play ranges of it, as the app's
 * player and comic game share one track) and short clips for everything else.
 *
 * Only one thing sounds at a time: whatever starts claims the audio, and the
 * previous owner is told to stop, so its button goes back to "play".
 *
 * The story element is unlocked on the first touch anywhere on the page: iOS
 * lets an element play later without a gesture only once it has played inside
 * one, and the dancer's phrase starts from a button that may come after a
 * scroll, not a tap on the element itself.
 */

export interface AudioOwner {
  stop(): void;
}

/** Why a range or clip ended early: the browser refused to play it. */
export type EndReason = 'blocked' | undefined;

export interface LandingAudio {
  readonly story: HTMLAudioElement;
  /** Stop whoever is playing now (unless it is `owner`) and make `owner` the one playing. */
  claim(owner: AudioOwner): void;
  /** Forget `owner` if it is the one playing, without stopping anyone. */
  release(owner: AudioOwner): void;
  /**
   * Play [start, end) of the story at `rate`, then call `done`. `onTick` gets the
   * playhead every frame. Returns a cancel function that stops it without calling `done`.
   */
  playRange(start: number, end: number, rate: number, onTick?: (t: number) => void, done?: (why: EndReason) => void): () => void;
  /** Play a short clip (a word, «autumn»). Returns a cancel function. */
  playClip(src: string, done?: (why: EndReason) => void): () => void;
  /** The story's length once its metadata is in, else the fallback given at creation. */
  duration(): number;
  dispose(): void;
}

function makeElement(src?: string): HTMLAudioElement {
  const a = new Audio();
  a.preload = 'none';
  if (src) a.src = src;
  a.preservesPitch = true;
  return a;
}

export function createLandingAudio(storyUrl: string, fallbackDuration: number): LandingAudio {
  const story = makeElement(storyUrl);
  // Just the header, for the real length (the demo player's phrase dots); the rest waits for a tap.
  story.preload = 'metadata';
  const clip = makeElement();
  let owner: AudioOwner | null = null;
  let unlocked = false;
  /** A range is waiting to start; the unlock must not pause it. */
  let wanted = false;
  let raf = 0;
  let duration = fallbackDuration;
  // Each range and each clip replaces the one before it on the same element. A
  // play() still pending when that happens rejects later (AbortError); these
  // counters let the replaced one's callbacks see they are stale and stay quiet.
  let rangeGen = 0;
  let clipGen = 0;

  const onMeta = () => {
    if (Number.isFinite(story.duration) && story.duration > 0) duration = story.duration;
  };
  story.addEventListener('loadedmetadata', onMeta);

  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    story.preload = 'auto';
    if (wanted) return;
    story.muted = true;
    story
      .play()
      .then(() => {
        if (!wanted) story.pause();
        story.muted = false;
      })
      .catch(() => {
        story.muted = false;
      });
  };
  const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;
  UNLOCK_EVENTS.forEach((ev) => window.addEventListener(ev, unlock, { capture: true, passive: true }));

  /** Seeking needs metadata; before it, setting currentTime is lost on some browsers. */
  const whenReady = (cb: () => void) => {
    if (story.readyState >= 1) return cb();
    story.addEventListener('loadedmetadata', cb, { once: true });
    if (story.preload === 'none') story.preload = 'auto';
    // load() over a pending play() would abort it — and on iOS that play is the unlock.
    if (story.networkState !== HTMLMediaElement.NETWORK_LOADING) story.load();
  };

  const playRange: LandingAudio['playRange'] = (start, end, rate, onTick, done) => {
    cancelAnimationFrame(raf);
    const gen = ++rangeGen;
    let cancelled = false;
    const live = () => !cancelled && gen === rangeGen;
    wanted = true;
    story.playbackRate = rate;
    story.defaultPlaybackRate = rate;
    whenReady(() => {
      if (!live()) return;
      story.currentTime = start;
      story.playbackRate = rate;
      story.play().catch(() => {
        if (!live()) return;
        cancelled = true;
        wanted = false;
        done?.('blocked');
      });
      const tick = () => {
        if (!live()) return;
        onTick?.(story.currentTime);
        if (story.currentTime >= end - 0.02 || story.ended) {
          story.pause();
          wanted = false;
          done?.(undefined);
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    return () => {
      cancelled = true;
      wanted = false;
      cancelAnimationFrame(raf);
      story.pause();
    };
  };

  const playClip: LandingAudio['playClip'] = (src, done) => {
    const gen = ++clipGen;
    clip.pause();
    clip.src = src;
    clip.onended = () => {
      if (gen === clipGen) done?.(undefined);
    };
    clip.play().catch(() => {
      if (gen === clipGen) done?.('blocked');
    });
    return () => {
      if (gen !== clipGen) return;
      clipGen++;
      clip.onended = null;
      clip.pause();
    };
  };

  return {
    story,
    claim(next) {
      if (owner && owner !== next) owner.stop();
      owner = next;
    },
    release(prev) {
      if (owner === prev) owner = null;
    },
    playRange,
    playClip,
    duration: () => duration,
    dispose() {
      cancelAnimationFrame(raf);
      UNLOCK_EVENTS.forEach((ev) => window.removeEventListener(ev, unlock, { capture: true }));
      story.removeEventListener('loadedmetadata', onMeta);
      owner?.stop();
      owner = null;
      story.pause();
      clip.pause();
      story.removeAttribute('src');
      clip.removeAttribute('src');
    },
  };
}
