/**
 * The animated picture on the auth screens' dark panel.
 *
 * Five scenes, each one the method from /how-to-use told in a few seconds:
 * three passes at three speeds, the subtitle that goes away, a heard word
 * becoming an imagined thing, a heard word matched to its comic picture, and
 * the five-step loop of every story. They play in that order — the order is
 * the argument — starting from a random one, so someone who signs in daily
 * does not open on the same picture every time.
 *
 * A scene plays a whole number of its own rounds before handing over (two or
 * three, whichever lands near 20 seconds), so none is ever cut mid-sentence.
 * The remount via `key` is what restarts its CSS clock from zero.
 *
 * The whole panel is aria-hidden: it illustrates, it does not inform, and five
 * rotating descriptions would be noise to a screen reader sitting on a form.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import './authPanel.css'

const STAGE_W = 440
const STAGE_H = 300

type SceneId = 'passes' | 'subtitles' | 'word' | 'comic' | 'loop'

// cycle = one round in seconds, matching the keyframe durations in authPanel.css.
const SCENES: { id: SceneId; cycle: number; rounds: number }[] = [
  { id: 'passes', cycle: 9, rounds: 2 },
  { id: 'subtitles', cycle: 7, rounds: 3 },
  { id: 'word', cycle: 9, rounds: 2 },
  { id: 'comic', cycle: 7, rounds: 3 },
  { id: 'loop', cycle: 10, rounds: 2 },
]

const FADE_MS = 400

/* ── scenes ────────────────────────────────────────────────────────────── */

const Speaker = ({ size }: { size: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#eef4f8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    <path className="ap-arc" d="M15.5 9a4.5 4.5 0 0 1 0 6" />
    <path className="ap-arc b" d="M18 6.5a8 8 0 0 1 0 11" />
  </svg>
)

const UMBRELLA =
  'M12 52 Q50 6 88 52 Q78.5 43 69 52 Q59.5 43 50 52 Q40.5 43 31 52 Q21.5 43 12 52 M50 52 V82 Q50 90 42 90 Q36 90 35 84'

const PHRASE = ['What', 'do', 'you', 'want', 'to', 'do', 'tonight']

const Passes = () => (
  <div className="ap-scene">
    <div className="ap-a-rows">
      <span className="ap-a-mark" />
      {(['1.0×', '0.8×', '0.5×'] as const).map((tag, i) => (
        <div key={tag} className={`ap-a-row r${i + 1}`}>
          <span className="ap-a-tag ap-mono">{tag}</span>
          <span className="ap-a-ph">
            {PHRASE.map((w, j) => <span key={j}>{w}</span>)}
          </span>
        </div>
      ))}
    </div>
  </div>
)

const Subtitles = ({ off }: { off: string }) => (
  <div className="ap-scene ap-b">
    <div className="ap-b-ear">
      <span className="ap-b-ring" />
      <span className="ap-b-ring b" />
      <span className="ap-b-ring c" />
      <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="#eef4f8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8.5a6 6 0 1 1 12 0c0 3.6-3.2 4.6-3.2 7.6A3.4 3.4 0 0 1 11.4 19.5c-1.4 0-2.3-.7-2.8-1.6" />
        <path d="M9.2 9a2.8 2.8 0 0 1 5.6 0c0 1.4-1.3 1.9-1.3 3.1" />
      </svg>
    </div>
    <div className="ap-b-cap">
      <span className="ap-b-txt">I like the way you move</span>
      <span className="ap-b-off ap-mono">{off}</span>
    </div>
  </div>
)

// Chair, key, umbrella — drawn in one stroke each so they can draw themselves.
const OBJECTS = [
  'M34 12 V88 M34 54 H74 V88 M34 12 H48 V54',
  'M16 50 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0 M44 50 H86 M74 50 V62 M84 50 V60',
  UMBRELLA,
]

const WordToThing = () => (
  <div className="ap-scene ap-c">
    <Speaker size={46} />
    <svg viewBox="0 0 40 12" width="52" height="16" fill="none" stroke="#e5484d" strokeWidth="1.6" strokeLinecap="round">
      <path d="M2 6h34M31 1.5 36 6l-5 4.5" />
    </svg>
    <div className="ap-c-pics">
      {OBJECTS.map((d, i) => (
        <svg key={i} className={`ap-c-obj o${i + 1}`} viewBox="0 0 100 100" fill="none" stroke="#eef4f8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path pathLength={1} d={d} />
        </svg>
      ))}
    </div>
  </div>
)

const CELL = { fill: 'none', stroke: '#3a4654', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const Comic = ({ correct }: { correct: string }) => (
  <div className="ap-scene ap-d">
    <div className="ap-d-word">
      <Speaker size={30} />
      <span className="ap-d-say">umbrella</span>
    </div>
    <div className="ap-d-grid">
      <div className="ap-d-cell"><svg viewBox="0 0 64 64" {...CELL}><circle cx="46" cy="18" r="7" /><path d="M4 50 Q20 36 32 46 T60 44" /></svg></div>
      <div className="ap-d-cell"><svg viewBox="0 0 64 64" {...CELL}><circle cx="32" cy="18" r="8" /><path d="M18 58 V42 a14 14 0 0 1 28 0 V58" /></svg></div>
      <div className="ap-d-cell"><svg viewBox="0 0 64 64" {...CELL}><rect x="12" y="14" width="40" height="36" rx="2" /><path d="M12 30 H52 M32 14 V50" /></svg></div>
      <div className="ap-d-cell"><svg viewBox="0 0 64 64" {...CELL}><path d="M8 54 H56 M16 54 V30 L32 16 L48 30 V54 M27 54 V40 H37 V54" /></svg></div>
      <div className="ap-d-cell"><svg viewBox="0 0 100 100" className="ap-d-hit" {...CELL} strokeWidth={3}><path d={UMBRELLA} /></svg></div>
      <div className="ap-d-cell"><svg viewBox="0 0 64 64" {...CELL}><path d="M10 44 H54 M16 44 V28 H48 V44 M22 28 V20 H42 V28" /></svg></div>
      <span className="ap-d-focus" />
      <span className="ap-d-ok ap-mono">{correct}</span>
    </div>
  </div>
)

const RING_R = 120
const Loop = ({ steps }: { steps: string[] }) => (
  <div className="ap-scene">
    <div className="ap-e">
      <svg viewBox="0 0 300 300" width="300" height="300" style={{ position: 'absolute', inset: 0 }}>
        <circle cx="150" cy="150" r={RING_R} fill="none" stroke="#2b3644" strokeWidth="1" />
        <circle className="ap-e-prog" cx="150" cy="150" r={RING_R} fill="none" stroke="#e5484d" strokeWidth="2" pathLength={1} strokeDasharray="1" transform="rotate(-90 150 150)" />
      </svg>
      {steps.map((_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / steps.length
        return (
          <span
            key={i}
            className={`ap-e-node ap-mono s${i}`}
            style={{ left: 150 + RING_R * Math.cos(a) - 20, top: 150 + RING_R * Math.sin(a) - 20 }}
          >
            0{i + 1}
          </span>
        )
      })}
      <div className="ap-e-center">
        {steps.map((s, i) => <span key={i} className={`ap-e-lbl s${i}`}>{s}</span>)}
      </div>
    </div>
  </div>
)

/* ── panel ─────────────────────────────────────────────────────────────── */

/**
 * Under lg the panel is a band above the form, and every pixel it takes pushes
 * the sign-in button further down a phone screen — so the drawing is capped
 * lower there. Read from matchMedia rather than rendering two panels and
 * hiding one: two would run two clocks and two random starts.
 */
const PHONE_MAX_STAGE_H = 210
const LG = '(min-width: 1024px)'

const useIsLg = () => {
  const [isLg, setIsLg] = useState(() => typeof window !== 'undefined' && window.matchMedia(LG).matches)
  useEffect(() => {
    const mq = window.matchMedia(LG)
    const on = () => setIsLg(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return isLg
}

export const AuthPanel = () => {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(() => Math.floor(Math.random() * SCENES.length))
  const [visible, setVisible] = useState(true)
  const [scale, setScale] = useState(1)
  const hostRef = useRef<HTMLDivElement>(null)
  const maxStageHeight = useIsLg() ? STAGE_H : PHONE_MAX_STAGE_H

  const scene = reduce ? SCENES[0] : SCENES[index]

  useEffect(() => {
    if (reduce) return
    const total = scene.cycle * scene.rounds * 1000
    const out = setTimeout(() => setVisible(false), total - FADE_MS)
    const next = setTimeout(() => {
      setIndex((i) => (i + 1) % SCENES.length)
      setVisible(true)
    }, total)
    return () => { clearTimeout(out); clearTimeout(next) }
  }, [index, reduce, scene.cycle, scene.rounds])

  // Scale the fixed stage to whatever width the panel has — the desktop column
  // or a phone's full width — and never above 1.
  useLayoutEffect(() => {
    const el = hostRef.current
    if (!el) return
    const fit = () => setScale(Math.min(1, el.clientWidth / STAGE_W, maxStageHeight / STAGE_H))
    fit()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [maxStageHeight])

  const steps = [1, 2, 3, 4, 5].map((n) => t(`howToUse.loop.s${n}.title`))

  return (
    <div aria-hidden="true" className="flex flex-col gap-5 lg:gap-7 w-full">
      <div ref={hostRef} className="w-full flex justify-center" style={{ height: STAGE_H * scale }}>
        <div style={{ width: STAGE_W * scale, height: STAGE_H * scale }}>
          <div
            key={`${scene.id}-${index}`}
            className="ap-stage"
            style={{ transform: `scale(${scale})`, opacity: visible ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}
          >
            {scene.id === 'passes' && <Passes />}
            {scene.id === 'subtitles' && <Subtitles off={t('auth.panel.subtitlesOff')} />}
            {scene.id === 'word' && <WordToThing />}
            {scene.id === 'comic' && <Comic correct={t('auth.panel.correct')} />}
            {scene.id === 'loop' && <Loop steps={steps} />}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="m-0 font-mono text-[10px] lg:text-[11px] tracking-[0.16em] uppercase text-[#7d8d9c]">
          {t(`auth.panel.${scene.id}`)}
        </p>
        {!reduce && (
          <div className="flex gap-1.5 flex-none">
            {SCENES.map((s, i) => (
              <span key={s.id} className="ap-dot">
                {i === index && (
                  <i key={index} style={{ animationDuration: `${s.cycle * s.rounds}s` }} />
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
