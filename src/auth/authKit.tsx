/**
 * The shared pieces of the sign-in, sign-up and password-reset screens.
 *
 * Why a kit rather than three hand-built pages: the auth flow is not three
 * screens, it is one surface a person walks through — details, SMS code,
 * device picker, reset — and every step used to restyle itself slightly
 * differently (the sign-up email field had no focus ring at all, the phone
 * step dropped the page chrome entirely). One set of parts means a step cannot
 * quietly drift.
 *
 * The look follows the approved landing (docs/landing-instrument.html): a light
 * room with one solid dark panel in it, red used ONLY as a signal, 3px radii,
 * mono micro-labels. Red is deliberately not a button fill — #e5484d behind
 * white 15px text is 3.9:1, which fails AA — so the primary button is the dark
 * panel colour and red is kept for focus, markers and errors.
 */
import { ReactNode, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { IoSyncOutline } from 'react-icons/io5'

/* ── tokens ────────────────────────────────────────────────────────────────
   Written out as literals rather than a Tailwind theme extension: this palette
   belongs to the auth surface and the landing, not (yet) to the whole app, and
   inlining them keeps the port reviewable in one place. */
export const ink = '#0f151c'
export const room = '#f5f8fa'
export const line = '#e0e7ed'
export const lineStrong = '#c8d3dc'
export const dim = '#5b6b7a'
export const muted = '#9aa8b5'
export const signal = '#e5484d'
export const signalInk = '#c2262b'

const microLabel =
  'block font-mono text-[10px] tracking-[0.16em] uppercase text-[#5b6b7a]'

const fieldBase =
  'w-full h-12 px-3.5 bg-white border border-[#e0e7ed] rounded-[3px] text-[15px] text-[#0f1720] ' +
  'placeholder:text-[#9aa8b5] transition-colors ' +
  'focus:outline-2 focus:outline-offset-2 focus:outline-[#e5484d] focus:border-[#0f151c]'

/* ── brand ─────────────────────────────────────────────────────────────── */

/** The milk drop, same path the landing uses. White fill in both themes. */
export const BrandMark = () => (
  <span className="flex items-center gap-2.5 text-[17px] font-semibold tracking-[-0.01em]">
    <svg viewBox="0 0 24 24" className="w-[19px] h-[19px]" aria-hidden="true">
      <path
        d="M12 2C8.2 7.4 4.9 11.6 4.9 14.6a7.1 7.1 0 0 0 14.2 0C19.1 11.6 15.8 7.4 12 2Z"
        fill="#ffffff"
        stroke="#0f151c"
        strokeWidth="1.4"
      />
    </svg>
    малако
  </span>
)

/**
 * The waveform on the dark panel.
 *
 * Decorative only, and deliberately carrying no numbers: nobody is signed in on
 * these screens, so a "segment 14/26" readout would be invented data about a
 * person the page has never met. The bar heights are a fixed literal path —
 * a stable brand mark rather than a fake reading.
 */
const WAVE_PLAYED =
  'M2.5 27.5V32.5 M10.5 13V47 M18.5 7.5V52.5 M26.5 14V46 M34.5 25.5V34.5 M42.5 22V38 M50.5 24.5V35.5 M58.5 19.5V40.5 M66.5 10V50 M74.5 10V50 M82.5 21V39 M90.5 18.5V41.5 M98.5 8V52 M106.5 9V51 M114.5 19.5V40.5 M122.5 24.5V35.5 M130.5 22V38 M138.5 25.5V34.5 M146.5 14.5V45.5 M154.5 9.5V50.5 M162.5 15.5V44.5 M170.5 24.5V35.5 M178.5 10.5V49.5 M186.5 6.5V53.5 M194.5 13.5V46.5 M202.5 25.5V34.5'
const WAVE_REST =
  'M210.5 21.5V38.5 M218.5 24.5V35.5 M226.5 20.5V39.5 M234.5 11.5V48.5 M242.5 12V48 M250.5 23.5V36.5 M258.5 15.5V44.5 M266.5 6V54 M274.5 8.5V51.5 M282.5 19.5V40.5 M290.5 24V36 M298.5 21.5V38.5 M306.5 26.5V33.5 M314.5 15.5V44.5 M322.5 11V49 M330.5 18V42 M338.5 22V38 M346.5 8.5V51.5 M354.5 5.5V54.5 M362.5 13.5V46.5'

export const Waveform = () => (
  <svg
    viewBox="0 0 365 60"
    preserveAspectRatio="xMinYMid meet"
    className="w-full max-w-[365px] h-[46px] sm:h-[60px] block"
    aria-hidden="true"
  >
    <path d={WAVE_PLAYED} fill="none" stroke="#eef4f8" strokeWidth="5" strokeLinecap="round" />
    <path d={WAVE_REST} fill="none" stroke="#2b3644" strokeWidth="5" strokeLinecap="round" />
    <line x1="206.5" y1="0" x2="206.5" y2="60" stroke={signal} strokeWidth="2" />
  </svg>
)

/* ── layout ────────────────────────────────────────────────────────────── */

interface AuthShellProps {
  /** The dark panel's middle block. Collapses to a strip under lg. */
  aside: ReactNode
  /** Mono line pinned to the panel's bottom on desktop. */
  asideFoot?: string
  children: ReactNode
}

/**
 * The split: one dark machine on the left, the form in the light room on the
 * right. Under lg the panel becomes a header strip rather than disappearing —
 * a phone still needs to know which product it is signing in to.
 */
export const AuthShell = ({ aside, asideFoot, children }: AuthShellProps) => (
  <div className="min-h-screen flex flex-col lg:flex-row bg-[#f5f8fa] text-[#0f1720]">
    <aside className="flex-none lg:w-[42%] lg:max-w-[560px] bg-[#0f151c] text-[#eef4f8] px-6 py-6 lg:px-12 lg:py-14 flex flex-col justify-between gap-8 lg:gap-10">
      <BrandMark />
      {aside}
      {asideFoot && (
        <p className="hidden lg:block font-mono text-[11px] tracking-[0.16em] uppercase text-[#5b6b7a]">
          {asideFoot}
        </p>
      )}
    </aside>

    <main className="flex-1 flex items-start lg:items-center justify-center px-4 py-10 sm:px-8 lg:p-14">
      <div className="w-full max-w-[460px] bg-white border border-[#e0e7ed] rounded-[3px] p-6 sm:p-10 animate-fade-in">
        {children}
      </div>
    </main>
  </div>
)

/** The panel's headline, and optionally a paragraph under it. */
export const AsideCopy = ({ title, body }: { title: string; body?: string }) => (
  <div className="flex flex-col gap-5 lg:gap-7">
    <h2 className="m-0 text-2xl lg:text-[38px] font-extrabold leading-[1.1] tracking-[-0.03em] max-w-[13ch]">
      {title}
    </h2>
    {body && (
      <p className="m-0 text-[15px] lg:text-base leading-relaxed text-[#93a4b4] max-w-[34ch]">{body}</p>
    )}
  </div>
)

/** Step rail: details → code → first story. `done` steps show a tick. */
export const StepRail = ({ current }: { current: 1 | 2 | 3 }) => {
  const { t } = useTranslation()
  const steps = [t('auth.steps.details'), t('auth.steps.code'), t('auth.steps.start')]

  return (
    <ol className="hidden lg:flex flex-col m-0 p-0 list-none">
      {steps.map((label, i) => {
        const n = i + 1
        const active = n === current
        const done = n < current
        return (
          <li key={label} className="contents">
            {i > 0 && <span className="w-px h-[18px] ml-[15px] bg-[#2b3644]" aria-hidden="true" />}
            <span className="flex items-center gap-4 h-[52px]">
              <span
                className={`w-[30px] h-[30px] flex-none flex items-center justify-center rounded-[2px] font-mono text-[13px] ${
                  active
                    ? 'bg-[#eef4f8] text-[#0f151c] font-bold'
                    : 'border border-[#2b3644] text-[#93a4b4]'
                }`}
                aria-hidden="true"
              >
                {done ? (
                  <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="#93a4b4" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12.5 9.5 18 20 6.5" />
                  </svg>
                ) : (
                  n
                )}
              </span>
              <span className={active ? 'text-[15px] font-semibold' : 'text-[15px] text-[#93a4b4]'}>
                {label}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/* ── card header ───────────────────────────────────────────────────────── */

export const Eyebrow = ({ children }: { children: ReactNode }) => (
  <p className="m-0 mb-3.5 font-mono text-[11px] tracking-[0.18em] uppercase text-[#e5484d]">
    {children}
  </p>
)

export const CardTitle = ({ children }: { children: ReactNode }) => (
  <h1 className="m-0 mb-2 text-[26px] sm:text-[30px] font-extrabold tracking-[-0.03em]">{children}</h1>
)

export const CardLede = ({ children }: { children: ReactNode }) => (
  <p className="m-0 mb-7 text-[15px] leading-relaxed text-[#5b6b7a]">{children}</p>
)

/* ── messages ──────────────────────────────────────────────────────────── */

type NoticeKind = 'error' | 'warn' | 'info' | 'success'

const NOTICE: Record<NoticeKind, { box: string; text: string; stroke: string; path: ReactNode }> = {
  error: {
    box: 'bg-[#fdf4f4] border-[#f3cdce] border-l-[3px] border-l-[#e5484d]',
    text: 'text-[#8f2126]',
    stroke: '#c2262b',
    path: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v6" /><path d="M12 17v.1" /></>),
  },
  warn: {
    box: 'bg-[#fdf7ea] border-[#ecd9ad] border-l-[3px] border-l-[#b37f11]',
    text: 'text-[#79540a]',
    stroke: '#8a5f0b',
    path: (<><path d="M12 4 2.8 20h18.4z" /><path d="M12 10v4" /><path d="M12 17.2v.1" /></>),
  },
  info: {
    box: 'bg-[#f0f5fb] border-[#ccdcee] border-l-[3px] border-l-[#2f6db3]',
    text: 'text-[#1b5288]',
    stroke: '#1b5288',
    path: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v6" /><path d="M12 7.6v.1" /></>),
  },
  success: {
    box: 'bg-[#eff7f2] border-[#c8e3d3] border-l-[3px] border-l-[#1f8a4c]',
    text: 'text-[#1f6b3f]',
    stroke: '#1f6b3f',
    path: <path d="M4 12.5 9.5 18 20 6.5" />,
  },
}

/**
 * Every message on these screens goes through here, and every one of them is
 * announced: an error banner that only changes colour is silence to a screen
 * reader, which is how a failed sign-in used to read.
 *
 * `error` and `warn` get role="alert" (interrupt); the rest get role="status"
 * (announced at the next pause), because "a new code is on its way" should not
 * cut across what the user is already being told.
 */
export const Notice = ({ kind, children }: { kind: NoticeKind; children: ReactNode }) => {
  const s = NOTICE[kind]
  return (
    <div
      role={kind === 'error' || kind === 'warn' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 mb-5 px-3.5 py-3 border rounded-[3px] animate-fade-in ${s.box}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-[18px] h-[18px] flex-none mt-px"
        fill="none"
        stroke={s.stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {s.path}
      </svg>
      <span className={`text-sm leading-snug ${s.text}`}>{children}</span>
    </div>
  )
}

/* ── fields ────────────────────────────────────────────────────────────── */

interface TextFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  name?: string
  autoComplete?: string
  placeholder?: string
  required?: boolean
  inputMode?: 'text' | 'numeric' | 'tel' | 'email'
  /** Small grey note on the label row — what the field is actually for. */
  hint?: string
}

export const TextField = ({
  id, label, value, onChange, type = 'text', name, autoComplete, placeholder, required, inputMode, hint,
}: TextFieldProps) => (
  <div>
    <div className="flex items-baseline justify-between gap-3 mb-2">
      <label htmlFor={id} className={microLabel}>{label}</label>
      {hint && <span className="text-xs text-[#9aa8b5]">{hint}</span>}
    </div>
    <input
      id={id}
      name={name}
      type={type}
      inputMode={inputMode}
      autoComplete={autoComplete}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      placeholder={placeholder}
      className={fieldBase}
    />
  </div>
)

/**
 * "Показать" as a word, not an eye glyph.
 *
 * The icon-only toggle needed an aria-label to mean anything, and that label
 * was hardcoded English on a Russian-first page for as long as it existed. A
 * word needs no label and no translation of its own beyond the word itself.
 */
export const PasswordField = ({
  id, label, value, onChange, show, onToggleShow, autoComplete = 'current-password', name, required, children,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  show: boolean
  onToggleShow: () => void
  autoComplete?: string
  name?: string
  required?: boolean
  /** Rendered under the input — a strength meter, or a "forgot?" link. */
  children?: ReactNode
}) => {
  const { t } = useTranslation()
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <label htmlFor={id} className={microLabel}>{label}</label>
        <button
          type="button"
          onClick={onToggleShow}
          className="font-mono text-[10px] tracking-[0.16em] uppercase text-[#5b6b7a] hover:text-[#0f151c] py-1 cursor-pointer"
        >
          {t(show ? 'auth.hidePassword' : 'auth.showPassword')}
        </button>
      </div>
      <input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={fieldBase}
      />
      {children}
    </div>
  )
}

/**
 * The country code is a fixed affix, not part of the editable value.
 *
 * The field used to hold "+7 999 123-45-67" and reformat it on every keystroke,
 * which meant the user could delete into the country code and watch the
 * formatter put it back. Here the input holds only the national part; the
 * component still hands the parent the full formatted string the API expects,
 * so `isValidPhoneNumber` and the submit path are unchanged.
 */
export const PhoneField = ({
  id, label, value, onChange, format, autoComplete = 'tel-national', required,
}: {
  id: string
  label: string
  /** Full formatted value, e.g. "+7 999 123-45-67". */
  value: string
  onChange: (fullValue: string) => void
  /** The shared formatPhoneInput — passed in so this file imports no utils. */
  format: (raw: string) => string
  autoComplete?: string
  required?: boolean
}) => (
  <div>
    <label htmlFor={id} className={`${microLabel} mb-2`}>{label}</label>
    <div className="flex items-stretch h-12 bg-white border border-[#e0e7ed] rounded-[3px] overflow-hidden focus-within:border-[#0f151c] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#e5484d]">
      <span
        className="w-[52px] flex-none flex items-center justify-center border-r border-[#e0e7ed] bg-[#f5f8fa] font-mono text-sm text-[#5b6b7a]"
        aria-hidden="true"
      >
        +7
      </span>
      <input
        id={id}
        name="tel"
        type="tel"
        inputMode="numeric"
        autoComplete={autoComplete}
        required={required}
        value={value.replace(/^\+7\s?/, '')}
        onChange={(e) => onChange(format(e.target.value))}
        placeholder="999 123-45-67"
        className="flex-1 min-w-0 px-3.5 bg-transparent border-0 font-mono text-[15px] tracking-[0.04em] text-[#0f1720] placeholder:text-[#9aa8b5] focus:outline-none"
      />
    </div>
  </div>
)

/**
 * The SMS code as six boxes.
 *
 * Worth the extra code over one text input: the boxes say how many digits are
 * expected before the user starts, a wrong digit is fixable in place, and a
 * pasted "123456" fills the row instead of landing in whichever box had focus.
 * The value stays a plain string, so the callers' `verificationCode` state and
 * their `length < 6` submit guards are untouched.
 */
export const OtpField = ({
  value, onChange, label, length = 6,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  length?: number
}) => {
  const { t } = useTranslation()
  const boxes = useRef<(HTMLInputElement | null)[]>([])

  const write = (next: string, focusIndex: number) => {
    onChange(next.slice(0, length))
    const target = Math.min(focusIndex, length - 1)
    boxes.current[target]?.focus()
  }

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return
    // A paste lands as many digits in one box: spread them from here rather
    // than keeping only the first, which is what a plain maxLength would do.
    const next = (value.slice(0, index) + digits + value.slice(index + digits.length)).slice(0, length)
    write(next, index + digits.length)
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      // Backspace on an empty box steps back and clears the previous one, so
      // correcting a typo is one key rather than "move left, then delete".
      const at = value[index] ? index : Math.max(0, index - 1)
      write(value.slice(0, at) + value.slice(at + 1), at)
    } else if (e.key === 'ArrowLeft') {
      boxes.current[Math.max(0, index - 1)]?.focus()
    } else if (e.key === 'ArrowRight') {
      boxes.current[Math.min(length - 1, index + 1)]?.focus()
    }
  }

  return (
    <div>
      <label htmlFor="code-0" className={`${microLabel} mb-2.5`}>{label}</label>
      <div className="flex gap-2 sm:gap-2.5">
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            id={`code-${i}`}
            ref={(el) => { boxes.current[i] = el }}
            type="text"
            inputMode="numeric"
            // Only the first box claims the one-time-code hint: on iOS every
            // box offering the same autofill fights over the same SMS.
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={t('auth.codeDigit', { n: i + 1 })}
            value={value[i] ?? ''}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            className="w-full min-w-0 h-[60px] sm:h-[68px] border border-[#c8d3dc] rounded-[3px] bg-white text-center font-mono text-[22px] sm:text-[26px] text-[#0f1720] focus:outline-2 focus:outline-offset-2 focus:outline-[#e5484d] focus:border-[#0f151c]"
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Four segments, not a percentage — a bar that reads "3 of 4" is a nudge, and
 * a number invites arguing with it. Advisory only: the server's rule is still
 * the six-character minimum, and nothing here blocks submission.
 */
export const PasswordStrength = ({ value }: { value: string }) => {
  const { t } = useTranslation()
  if (!value) return null

  let score = 0
  if (value.length >= 6) score += 1
  if (value.length >= 10) score += 1
  if (/\d/.test(value) && /[^\d]/.test(value)) score += 1
  if (value.length >= 14 || /[^\p{L}\p{N}]/u.test(value)) score += 1

  const tone = score <= 1 ? signalInk : score === 4 ? '#1f8a4c' : ink
  const label = ['weak', 'weak', 'fair', 'good', 'great'][score]

  return (
    <div className="flex items-center gap-2.5 mt-2.5">
      <div className="flex gap-1 flex-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-[3px] flex-1 rounded-[1px]"
            style={{ background: i < score ? tone : line }}
          />
        ))}
      </div>
      <span className="font-mono text-[10px] tracking-[0.14em] uppercase" style={{ color: tone }}>
        {t(`auth.strength.${label}`)}
      </span>
    </div>
  )
}

/* ── actions ───────────────────────────────────────────────────────────── */

export const SubmitButton = ({
  loading, disabled, children, loadingLabel,
}: {
  loading?: boolean
  disabled?: boolean
  children: ReactNode
  loadingLabel: string
}) => (
  <button
    type="submit"
    disabled={disabled || loading}
    className="w-full h-[52px] flex items-center justify-center gap-2.5 bg-[#0f151c] text-white rounded-[3px] text-[15px] font-semibold cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-45 disabled:cursor-not-allowed focus:outline-2 focus:outline-offset-2 focus:outline-[#e5484d]"
  >
    {loading ? (
      <>
        <IoSyncOutline size={18} className="animate-spin" />
        {loadingLabel}
      </>
    ) : (
      children
    )}
  </button>
)

export const SecondaryButton = ({
  onClick, children,
}: { onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full h-12 flex items-center justify-center bg-transparent border border-[#c8d3dc] rounded-[3px] text-[15px] font-semibold text-[#0f151c] cursor-pointer hover:border-[#0f151c] focus:outline-2 focus:outline-offset-2 focus:outline-[#e5484d]"
  >
    {children}
  </button>
)

export const OutlineLink = ({ to, state, children }: { to: string; state?: unknown; children: ReactNode }) => (
  <Link
    to={to}
    state={state}
    className="w-full h-12 flex items-center justify-center border border-[#0f151c] rounded-[3px] text-[15px] font-semibold text-[#0f151c] no-underline hover:bg-[#0f151c] hover:text-white transition-colors focus:outline-2 focus:outline-offset-2 focus:outline-[#e5484d]"
  >
    {children}
  </Link>
)

/** A quiet link, underlined by a hairline rather than by weight. */
export const QuietLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link
    to={to}
    className="text-sm text-[#5b6b7a] no-underline border-b border-[#c8d3dc] hover:text-[#0f151c] hover:border-[#0f151c]"
  >
    {children}
  </Link>
)

/** The "впервые здесь" rule between the form and the alternative action. */
export const Divider = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center gap-3.5 my-7">
    <span className="flex-1 h-px bg-[#e0e7ed]" />
    <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-[#9aa8b5]">{children}</span>
    <span className="flex-1 h-px bg-[#e0e7ed]" />
  </div>
)

/** Back arrow used by every step that can be stepped out of. */
export const BackButton = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-2 text-sm text-[#5b6b7a] hover:text-[#0f151c] cursor-pointer py-1"
  >
    <svg viewBox="0 0 24 24" className="w-[15px] h-[15px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 5 7 12l7 7" />
    </svg>
    {children}
  </button>
)
