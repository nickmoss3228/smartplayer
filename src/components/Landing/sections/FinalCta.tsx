import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Slogan from '../../Brand/Slogan';

/** The last word: the name, the slogan, and the one button into the app. */
export function FinalCta() {
  const { t } = useTranslation();

  return (
    <section className="reg final">
      <div className="wrap">
        <p className="h-display">{t('brand')}</p>
        <Slogan className="slogan" />
        <Link to="/levels" className="btn btn-primary btn-hero">
          {t('homepage.startFree')}
        </Link>
        <p className="micro" style={{ marginTop: 14 }}>
          {t('landing.final.text')}
        </p>
      </div>
    </section>
  );
}

/** Styled by landing.css under `.landing`, so it belongs inside the page's root element. */
export function LandingFooter() {
  const { t } = useTranslation();

  return (
    <footer>
      <p className="micro">{t('howToUse.footer')}</p>
    </footer>
  );
}
