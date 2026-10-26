import { useTranslation } from 'react-i18next';
import quizDesktop from '../../../assets/landing/d4-quiz.webp';
import gameDesktop from '../../../assets/landing/d4-wordgame.webp';
import quizPhone from '../../../assets/landing/m4-quiz.webp';
import gamePhone from '../../../assets/landing/m4-wordgame.webp';
import { Reveal } from '../Reveal';
import { AppWindow } from './Screens';

/**
 * «После части»: what practice looks like after a part — the spoken quiz and
 * the Words game, each as its own window of the app, shown large (the phone's
 * window on a phone, the computer's on a wider screen).
 */
export function Practice() {
  const { t } = useTranslation();

  return (
    <section className="reg" id="practice">
      <div className="wrap">
        <Reveal className="sec-head">
          <p className="eyebrow">{t('landing.practice.label')}</p>
          <h2 className="h2">{t('landing.practice.title')}</h2>
          <p className="body">{t('landing.practice.text')}</p>
        </Reveal>
        <div className="windows">
          <Reveal>
            <AppWindow desktop={quizDesktop} mobile={quizPhone} label={t('landing.practice.quiz')} />
          </Reveal>
          <Reveal delay={120}>
            <AppWindow desktop={gameDesktop} mobile={gamePhone} label={t('landing.practice.game')} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
