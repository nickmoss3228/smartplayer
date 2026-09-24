import { Link } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';
import { motionEnter } from '../components/ui/motion';
import { useTranslation } from 'react-i18next';
import { buttonPrimary, buttonSecondary } from '../components/ui/buttonStyles';

/**
 * Real 404 page.
 *
 * Replaces the old catch-all `<Route path="*" element={<Navigate to="/" />} />`,
 * which silently teleported anyone on a bad URL to the homepage. That was bad
 * two ways round:
 *
 *   - For a person, the error vanishes. A typo in a shared link looks like the
 *     link worked and just went somewhere unexpected, so there is nothing to
 *     report and nothing to correct.
 *   - For a crawler, every invented URL rendered homepage content. Paired with
 *     nginx answering 200 for those paths, that is a textbook soft 404 — see
 *     the long comment in nginx.conf, which is the other half of this fix. The
 *     server now sends a real 404 status and this component is what fills the
 *     body.
 *
 * Deliberately carries `noindex`: React 19 hoists these tags into <head> on its
 * own, no react-helmet needed. The status code already tells a well-behaved
 * crawler to drop the URL; the meta tag covers the ones that only look at
 * markup.
 */
const NotFound = () => {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-dvh flex flex-col bg-room pt-14 sm:pt-20">
      <title>{t('notFound.title')}</title>
      <meta name="robots" content="noindex, nofollow" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 sm:py-10">
        <motion.div
          className="text-center max-w-md"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={motionEnter}
        >
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase text-gray-400 mb-2">
            {t('notFound.eyebrow')}
          </p>

          <h1
            className="text-6xl sm:text-8xl font-extrabold text-black
              tracking-tighter leading-none mb-4"
          >
            404
          </h1>

          <p className="text-base sm:text-lg text-gray-500 mb-8">
            {t('notFound.body')}
          </p>

          {/* Both destinations on purpose: home for someone who arrived from a
              broken external link, levels for someone who mistyped a story
              slug and actually wants the catalogue. */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className={buttonPrimary}
            >
              {t('notFound.home')}
            </Link>
            <Link
              to="/levels"
              className={buttonSecondary}
            >
              {t('notFound.levels')}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
