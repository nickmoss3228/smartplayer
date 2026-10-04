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
 * The scenes themselves live in components/Method/MethodScene.tsx, because the
 * why-clouds (homepage, /how-to-use, onboarding) show the same pictures. What
 * is the panel's own is the rotation, the rail and the caption.
 *
 * A scene plays a whole number of its own rounds before handing over (two or
 * three, whichever lands near 20 seconds), so none is ever cut mid-sentence.
 * The remount via `playKey` is what restarts its CSS clock from zero.
 *
 * The whole panel is aria-hidden: it illustrates, it does not inform, and five
 * rotating descriptions would be noise to a screen reader sitting on a form.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { SceneStage, STAGE_H } from '../components/Method/MethodScene'
import { SCENE_CYCLE_S, type SceneId } from '../components/Method/scenes'
import './authPanel.css'

// rounds = how many of its own cycles each scene plays before the next.
const SCENES: { id: SceneId; rounds: number }[] = [
  { id: 'passes', rounds: 2 },
  { id: 'subtitles', rounds: 3 },
  { id: 'word', rounds: 2 },
  { id: 'comic', rounds: 3 },
  { id: 'loop', rounds: 2 },
]

const FADE_MS = 400

const sceneSeconds = (s: (typeof SCENES)[number]) => SCENE_CYCLE_S[s.id] * s.rounds

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
  const maxStageHeight = useIsLg() ? STAGE_H : PHONE_MAX_STAGE_H

  const scene = reduce ? SCENES[0] : SCENES[index]

  useEffect(() => {
    if (reduce) return
    const total = sceneSeconds(scene) * 1000
    const out = setTimeout(() => setVisible(false), total - FADE_MS)
    const next = setTimeout(() => {
      setIndex((i) => (i + 1) % SCENES.length)
      setVisible(true)
    }, total)
    return () => { clearTimeout(out); clearTimeout(next) }
  }, [index, reduce, scene])

  return (
    <div aria-hidden="true" className="flex flex-col gap-5 lg:gap-7 w-full">
      <SceneStage
        scene={scene.id}
        maxHeight={maxStageHeight}
        playKey={`${scene.id}-${index}`}
        style={{ opacity: visible ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}
      />

      <div className="flex items-center justify-between gap-4">
        <p className="m-0 font-mono text-[10px] lg:text-[11px] tracking-[0.16em] uppercase text-[#7d8d9c]">
          {t(`auth.panel.${scene.id}`)}
        </p>
        {!reduce && (
          <div className="flex gap-1.5 flex-none">
            {SCENES.map((s, i) => (
              <span key={s.id} className="ap-dot">
                {i === index && (
                  <i key={index} style={{ animationDuration: `${sceneSeconds(s)}s` }} />
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
