# Rebranding: "The Infinity Player" → **malako**

Date: 2026-08-16

The project was renamed from *The Infinity Player* to **malako** (EN) /
**малако** (RU). The name is a deliberate misspelling of *молоко* — milk — and
is **always lowercase**, in both alphabets. Do not "correct" it to `молоко`,
`Malako`, or Title Case anywhere.

The domain is **малако.рф**. See the "Still open" section at the bottom before
touching anything domain-related.

---

## 1. Where the name lives

The brand string is a translation key, not a literal, so the two alphabets stay
separated:

| File | Key | EN | RU |
|---|---|---|---|
| `src/locales/{en,ru}/translation.json` | `brand` | `malako` | `малако` |

Everything user-facing reads `t('brand')`. Renamed in this pass:

- `index.html` — `<title>`, plus a new `<meta name="description">`. The old
  title was `the Infintiy Player`, typo included.
- `src/pages/Homepage.tsx` — the hero `<h1>`. It used to be three hard-coded
  spans (`The` / `Infinity` / `Player`) that stacked on mobile; one word needs
  no split, so the spans are gone.
- `src/components/Navbar/Navbar.tsx` — was an `<img>` of `infinity.svg` with
  `alt="Haila Logo"` (a leftover from an even earlier name). Now `<BrandMark>`
  plus the wordmark.
- `src/pages/HowToUse.tsx` — via `howToUse.hero.title1/title2` and
  `howToUse.footer`.
- `backend/src/services/email.service.js` — password-reset subject line, body
  and footer copyright.
- `README.md`, `readme-claude.md`.
- `smartplayer-native/src/locales/{en,ru}/translation.json` — the same
  `howToUse` strings exist in the native app and were updated to match.

**Deliberately not renamed:** the npm package name and folder (`smartplayer`).
It is internal and never shown to a user.

---

## 2. The mark

`src/components/Brand/BrandMark.tsx`

### White fill, outline stroke — not a silhouette

Milk reads as white. Filling the shape black fights the thing it depicts, so
every variant is **white-filled and defined by its outline**. On the white site
that means only the line is visible; the fill quietly occludes whatever is
behind it.

### Why `vector-effect="non-scaling-stroke"`

The same component renders at ~28px in the navbar and ~55vw on the homepage.
With a normal stroke, a width that looks right at 28px becomes a ~40px black
band at 800px. `non-scaling-stroke` measures the stroke in device pixels
instead of shape units, so one component gives a proportionate edge at small
sizes and a hairline at large ones.

Two gotchas, both already handled — do not "simplify" them away:

- `vector-effect` is **not an inherited property**. It has to sit on every
  painted `<path>`; putting it on the `<svg>` or a wrapping `<g>` does nothing.
  The `ns` spread constant in the file exists for this.
- `strokeWidth` is therefore in **device pixels**, not viewBox units.

### Variants

`drop` · `carton` · `glass` · `splash`

`ACTIVE_MARK` at the top of the file selects the one the navbar wears. It is a
one-line swap. Any component can override per-instance with the `variant` prop,
which is how the homepage uses `splash` while the navbar uses `ACTIVE_MARK`.

---

## 3. The favicon

**The bug:** `index.html` had `<link rel="icon" type="image/svg+xml" href="" />`.
An empty `href` resolves to the page's own URL, so every page load fetched the
HTML document, tried to decode it as SVG, and logged a decode error.

**The fix:** `public/favicon.svg` — the drop in white on a near-black
(`#0a0a0a`) rounded tile, plus a `mask-icon` link and a `theme-color` meta.

Near-black was chosen over a transparent all-white mark because a white mark
with no tile is invisible on a light browser tab bar, which is what most people
use. The tile also means the mark can stay solid white (the outline is the same
near-black as the tile, so it disappears — by design).

If `ACTIVE_MARK` changes, swap the path inside `favicon.svg` to match; the
paths are identical to the ones in `BrandMark.tsx`.

---

## 4. The homepage watermark

`src/pages/Homepage.tsx`

The old `∞` text glyph at `#f5f5f5` is now the **splash** variant: white fill,
black outline, **blurred**. A crisp outline at that scale competed with the hero
text for attention; the blur pushes it back into the page so it reads as
atmosphere.

Three numbers move together — raising the blur requires raising the stroke,
because blur eats thin lines:

```
variant="splash"  strokeWidth={6}  filter: blur(7px)  opacity: 0.5
```

`transform: translateZ(0)` promotes it to its own composited layer so the blur
rasterizes once instead of repainting on scroll.

> **Performance note.** `src/components/Homepage/WhyClouds/Cloud.tsx` documents a
> real iPhone 12 report where a `filter: blur()` was smooth on desktop and
> visibly choppy on mobile — that one was animated, i.e. blurred *per frame*,
> and had to be replaced with gradients. The watermark blur is static, so it
> only needs to avoid repainting, which the layer promotion handles. Do not add
> a blur to anything that animates.

---

## 5. The slogan

`src/components/Brand/Slogan.tsx`, rendered under the `<h1>` on the homepage.

A fixed prefix plus a **rotating last word** in colour, swapping every 2.2s:

| | prefix | words |
|---|---|---|
| RU | `как услышишь — так и` | правильно · надо · запомнится · поплывёт · задумано |
| EN | `as you hear it, so it` | is right · should be · will stick · will sail · was meant |

The Russian is a double proverb pun — *как слышится, так и пишется* crossed with
*как корабль назовёшь, так он и поплывёт*, which is why «поплывёт» is in the
list. The English keeps "will sail" so the ship joke survives the translation.

Both live under `homepage.slogan.{prefix,words}`; `words` is an array read with
i18next's `returnObjects: true`. **To add a word, add it to both locales** — the
component reads whatever length the array is, so no code change is needed.

Two implementation details worth keeping:

- The rotating word is a separate node from the prefix, so the prefix never
  re-renders and the eye stays parked on the slot that changes.
- The slot is an `inline-grid` whose entries all share one cell. Without it the
  outgoing and incoming words sit side by side during the crossfade and the
  line visibly jumps as each word's width lands.

Colour cycles through the three level accents (see below) rather than
introducing a new hue. Five words over three colours means the pairing never
settles, which reads as motion rather than as a fixed label.

---

## 6. The level picker

`src/pages/Levels.tsx` + `src/components/Levels/MilkGlass.tsx`

Rebuilt around the milk metaphor. **How full the glass is *is* the difficulty**,
so the three options are comparable at a glance without reading a word — which
matters most on a phone, where all three share one screen width. The layout is
three columns at every breakpoint for exactly that reason.

The percentages are *жирность* — Russian milk is sold by fat content, printed
larger than the brand on the carton. `1%` / `2,5%` / `6%`, with a Russian
decimal comma in RU and a period in EN (`levels.fat*` keys).

### Colour comes from the theme file

`src/modules/levelprogress/themes.levelprogress.tsx` already defined the
mapping — its own comments say *easy = green, medium = orange, hard = purple*,
via `lastListenedBorder`. That file gained an `accent` field per level:

```ts
accent: "var(--color-green-500)"   // orange-500, purple-500
```

**Why a CSS variable and not a hex.** Tailwind v4 emits its whole palette as
`--color-*` custom properties on `:root` (verified in the built CSS), so the SVG
can reference the exact same value the utility classes use and cannot drift from
them. The tempting alternative — deriving `text-green-500` from the stored
`border-green-500` string at runtime — **silently fails**: Tailwind's scanner
never sees dynamically constructed class names, so the class is never generated.

### Milk is always white

One constant, `MILK = '#ffffff'`, at full opacity whether or not a level is
selected. An earlier version faded unselected milk and tinted it per fat level;
both were wrong. The fill level is the information on this page, so dimming it
hid the thing the user is meant to compare.

Contrast comes from **inside** the glass: the empty portion carries a faint wash
of the level accent, so white milk reads against tinted glass. This is why the
page background could go back to plain `bg-white` — the ground was never what
made the milk legible.

Selection is carried by outline weight, the lift, and the label colour.

### Animation

Everything moves by `transform` only — the wave translates on `x`, the fill
translates on `y`. No filters on animated nodes (see the performance note above).

- The surface wave is 200 units wide with a 50-unit period, so translating it
  exactly `-50` returns it to an identical position and the loop has no seam.
- The fill uses an under-damped spring so the milk overshoots and settles.
- The clip-path sits on a **static** `<g>`, never the animated one: a clip-path
  on a transformed element resolves in that element's own moved coordinate
  system, so the mask would slide up and down with the milk.
- The pour animates the `height` attribute rather than `scaleY`, to sidestep SVG
  `transform-origin` differences between browsers.

`useReducedMotion` disables the wave and the pour and shortens the fill
transition.

---

## 7. Still open

- **The navbar mark is not final.** `ACTIVE_MARK` is `drop`; the glass was the
  other candidate. At 16px the glass loses its milk line and reads as a tapered
  rectangle, which is the argument for the drop.
- **The domain.** `infinityplayer.xyz` is still referenced in `Caddyfile`,
  `backend/src/middleware/cors.js`, `.env.example` and
  `docs/yandex-cloud-deployment.md`. These were left alone deliberately while
  DNS for малако.рф is still resolving.

  When it goes live, note that browsers send the Origin header
  **punycode-encoded** as `https://xn--80abhbmc2b.xn--p1ai`, *not* as Cyrillic.
  That exact string is what the CORS allowlist needs, or the API will reject the
  new domain.
