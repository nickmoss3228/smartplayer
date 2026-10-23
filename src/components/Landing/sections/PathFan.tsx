import { useTranslation } from 'react-i18next';
import { Reveal } from '../Reveal';
import mLevels from '../../../assets/landing/m-levels.webp';
import mList from '../../../assets/landing/m-list.webp';
import mStory from '../../../assets/landing/m-story.webp';
import m2Player from '../../../assets/landing/m2-player.webp';
import mPractice from '../../../assets/landing/m-practice.webp';

interface PathStep {
  tag: string;
  title: string;
  text: string;
}

/**
 * The five screens, in the order of landing.path.steps. The frame's status bar
 * takes the colour of the shot's top edge (landing.css `.phone.green` / `.dark`):
 * the player is the easy level's green, the practice window the ink panel.
 */
const SHOTS: { src: string; tone?: 'green' | 'dark' }[] = [
  { src: mLevels },
  { src: mList },
  { src: mStory },
  { src: m2Player, tone: 'green' },
  { src: mPractice, tone: 'dark' },
];

/** «Где что находится»: the path from the first tap to the first line, as five phones in a row. */
export function PathFan() {
  const { t } = useTranslation();
  const raw = t('landing.path.steps', { returnObjects: true, defaultValue: null });
  const steps = Array.isArray(raw) ? (raw as PathStep[]).slice(0, SHOTS.length) : [];

  return (
    <section className="reg" id="path">
      <div className="wrap">
        <Reveal className="sec-head">
          <p className="eyebrow">{t('landing.path.label')}</p>
          <h2 className="h2">{t('landing.path.title')}</h2>
          <p className="body">{t('landing.path.text')}</p>
        </Reveal>
        <ol className="fan">
          {steps.map((step, i) => {
            const { src, tone } = SHOTS[i];
            return (
              <Reveal as="li" delay={i * 70} key={step.tag}>
                <div className={tone ? `phone sm ${tone}` : 'phone sm'}>
                  <div className="screen">
                    <img src={src} alt="" loading="lazy" width={780} height={1688} />
                  </div>
                </div>
                <span className="n">{`0${i + 1} · ${step.tag}`}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
