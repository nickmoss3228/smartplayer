/**
 * Says a word with the browser's own voice (Web Speech API), for the letter-O
 * section. No audio files: every word on the page can be heard, and the best
 * voice the device has is used (the neural / "natural" ones where they exist).
 */

export type Lang = 'en-US' | 'ru-RU';

export const canSpeak =
  typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

/** Voices whose names promise a natural sound, best first. */
const GOOD = [/natural/i, /neural/i, /premium|enhanced/i, /google/i, /samantha|ava|allison|milena|yuri|katya/i];

function score(v: SpeechSynthesisVoice, lang: Lang): number {
  const tag = v.lang.replace('_', '-').toLowerCase();
  if (!tag.startsWith(lang.slice(0, 2).toLowerCase())) return -1;
  let s = tag === lang.toLowerCase() ? 10 : 0;
  GOOD.forEach((re, i) => {
    if (re.test(v.name)) s += 20 - i * 2;
  });
  if (v.localService) s += 1;
  return s;
}

function pick(lang: Lang): SpeechSynthesisVoice | undefined {
  let best: SpeechSynthesisVoice | undefined;
  let top = -1;
  for (const v of window.speechSynthesis.getVoices()) {
    const s = score(v, lang);
    if (s > top) {
      top = s;
      best = v;
    }
  }
  return best;
}

// Chrome fills the voice list asynchronously: asking once early starts that.
if (canSpeak) window.speechSynthesis.getVoices();

/** Says `text`; `onEnd` runs when it is done, fails, or is cut off by the next word. */
export function say(text: string, lang: Lang, onEnd: () => void): void {
  if (!canSpeak) {
    onEnd();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  const voice = pick(lang);
  if (voice) u.voice = voice;
  u.rate = 0.8;
  let done = false;
  const end = () => {
    if (done) return;
    done = true;
    onEnd();
  };
  u.onend = end;
  u.onerror = end;
  // Some engines never fire onend for a cancelled utterance.
  window.setTimeout(end, 4000);
  synth.speak(u);
}

export function hush(): void {
  if (canSpeak) window.speechSynthesis.cancel();
}
