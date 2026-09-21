import { useParams, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LEGAL_DOCS } from '../content/legal/ru';
import { LEGAL_DOC_IDS, LegalDocId, legalPath, LEGAL_VERSION } from '../config/legal';

/**
 * One legal document, at /legal/:docId.
 *
 * The three documents are a set — someone who opened the consent from the
 * signup form usually wants the policy it refers to next — so all three are
 * always reachable from the footer of whichever one is open, and the page is
 * public: 152-ФЗ art. 18.1 requires the privacy policy to be readable without
 * an account, and a document you have to sign up to read cannot be the one you
 * agreed to *while* signing up.
 */
const Legal = () => {
  const { docId } = useParams<{ docId: string }>();
  const { i18n, t } = useTranslation();

  if (!docId || !LEGAL_DOC_IDS.includes(docId as LegalDocId)) {
    return <Navigate to="/legal/terms" replace />;
  }

  const id = docId as LegalDocId;
  const doc = LEGAL_DOCS[id];
  const isEnglish = i18n.language?.startsWith('en');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-3xl px-5 pb-20 pt-24 sm:px-8">
        <Link
          to="/"
          className="text-sm text-gray-400 underline underline-offset-4 transition-colors hover:text-black"
        >
          {t('legal.backHome')}
        </Link>

        <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">{doc.title}</h1>
        <p className="mt-2 text-xs uppercase tracking-widest text-gray-400">
          {t('legal.updated')} {doc.updated} · {t('legal.version')} {LEGAL_VERSION}
        </p>

        {/* Two different warnings, and they are not the same warning. */}
        {doc.draft && (
          <p className="mt-6 border-l-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t('legal.draftNotice')}
          </p>
        )}
        {isEnglish && (
          <p className="mt-3 border-l-2 border-gray-300 bg-white px-4 py-3 text-sm text-gray-600">
            {t('legal.russianOnlyNotice')}
          </p>
        )}

        <article className="mt-8 space-y-7">
          {doc.sections.map((section, i) => (
            <section key={i}>
              {section.heading && (
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-800">
                  {section.heading}
                </h2>
              )}
              <div className="space-y-2.5">
                {section.paragraphs.map((paragraph, j) => (
                  <p key={j} className="text-[15px] leading-relaxed text-gray-700">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </article>

        <nav className="mt-14 flex flex-wrap gap-x-5 gap-y-2 border-t border-gray-200 pt-5 text-sm">
          {LEGAL_DOC_IDS.filter((other) => other !== id).map((other) => (
            <Link
              key={other}
              to={legalPath(other)}
              className="text-gray-500 underline underline-offset-4 transition-colors hover:text-black"
            >
              {LEGAL_DOCS[other].title}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Legal;
