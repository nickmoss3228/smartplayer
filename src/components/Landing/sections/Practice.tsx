import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { IoGridOutline, IoListOutline, IoVolumeHighOutline } from 'react-icons/io5';
import Quiz from '../../Quiz/Quiz';
import { WordBoard } from '../../Player/Vocabulary/WordBoard';
import { questionsFromClips } from '../../../modules/comicPractice/panelQuizRounds';
import { LEO, useLandingData } from '../leoPart1';
import { useLeoQuizSubmit } from '../leoProgress';
import { Reveal } from '../Reveal';

/** What the tiles count until the part has loaded: Leo's part 1 as it stands. */
const GUESS = { questions: 5, words: 11, lines: 8 };

const NEXT_PART = LEO.partNumber + 1;
const partPath = (part: number) => `/levels/${LEO.difficulty}/${LEO.storyId}/${part}`;

/**
 * «После части»: what the practice window offers, and two of its three
 * exercises to try on the spot — the app's own word game and quiz, playing
 * Leo's part 1.
 *
 * Both were made for a modal or a sheet, opened by a tap. Their cards are
 * `flex-1 overflow-y-auto` to fill whatever height that gives them; in a plain
 * block, as here, that is inert and a card is as tall as its content, so no
 * wrapper is needed for the size. What does need handling is sound: both sit on
 * the page rather than being opened by a tap, so neither may start talking on
 * its own (`autoPlay`, `autoStart`). The tiles' icons are the ones the player's
 * «Практика» button uses.
 */
export function Practice() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { leo, failed, learnedWords, markLearned, playWord } = useLandingData();
  const { submit, submitting } = useLeoQuizSubmit(leo?.totalParts ?? 10);
  const loading = !leo && !failed;

  const questions = leo ? leo.quiz.length : GUESS.questions;
  const words = leo ? leo.words.length : GUESS.words;
  // As the practice window counts the comic game: lines that follow each other on one panel are one question.
  const lines = leo?.panelQuiz ? questionsFromClips(leo.panelQuiz.clips).length : GUESS.lines;
  // The quiz tile's second line, as the practice window words it.
  const quizMeta = `${t('practice.questions', { count: questions })} · ${t('practice.opensPart', { n: NEXT_PART })}`;

  return (
    <section className="reg" id="practice">
      <div className="wrap">
        <Reveal className="sec-head">
          <p className="eyebrow">{t('landing.practice.label')}</p>
          <h2 className="h2">{t('landing.practice.title')}</h2>
          <p className="body">{t('landing.practice.text')}</p>
        </Reveal>
        <div className="grid2">
          <Reveal style={{ display: 'grid', gap: 14 }}>
            <p className="h3">{t('practice.title')}</p>
            <p className="body" style={{ fontSize: 14 }}>
              {t('landing.practice.tilesText')}
            </p>
            <div className="tiles">
              <div className="tile wide">
                <IoListOutline aria-hidden="true" />
                <div>
                  <span className="dot">
                    <i />
                    {t('practice.next')}
                  </span>
                  <br />
                  <b>{t('practice.quizTitle')}</b>
                  <br />
                  <small>{quizMeta}</small>
                </div>
              </div>
              <div className="tile">
                <IoVolumeHighOutline aria-hidden="true" />
                <b>{t('practice.wordsTitle')}</b>
                <small>{t('practice.words', { count: words })}</small>
              </div>
              <div className="tile">
                <IoGridOutline aria-hidden="true" />
                <b>{t('practice.comicTitle')}</b>
                <small>{t('practice.lines', { count: lines })}</small>
              </div>
            </div>
            {leo && (
              <WordBoard
                words={leo.words}
                onPlay={playWord}
                learnedWords={learnedWords}
                onComplete={markLearned}
                eyebrow={t('words.eyebrow', { n: LEO.partNumber })}
                autoStart={false}
              />
            )}
            {/* About the height of the board once it is there, so the page does not jump. */}
            {loading && <div aria-busy="true" className="min-h-[440px] rounded-card bg-ink" />}
          </Reveal>
          {!failed && (
            <Reveal delay={120}>
              {leo ? (
                <Quiz
                  questions={leo.quiz}
                  difficulty={LEO.difficulty}
                  storyId={LEO.storyId}
                  partNumber={LEO.partNumber}
                  nextPart={NEXT_PART}
                  autoPlay={false}
                  onQuizComplete={submit}
                  isSubmitting={submitting}
                  onClose={() => navigate(partPath(LEO.partNumber))}
                  onNextPart={() => navigate(partPath(NEXT_PART))}
                />
              ) : (
                <div aria-busy="true" className="min-h-[620px] rounded-card bg-ink" />
              )}
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
