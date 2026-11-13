import { useTranslation } from 'react-i18next';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import m4Quiz from '../../assets/landing/m4-quiz.webp';
import m6Dashboard from '../../assets/landing/m6-dashboard.webp';
import m6Pdf from '../../assets/landing/m6-pdf.webp';
import m6Comic from '../../assets/landing/m6-comic.webp';

/**
 * What else malako has: the comparison with podcasts and AI tutors, then the
 * features the five steps do not already show (the audio dictionary and the
 * voice recording are in steps 1 and 5, with their screenshots), as a short
 * row of ice floes.
 */

interface Item {
  title: string;
  text: string;
}

/** Positions in `iceberg.features.items` of the features left for this row, with their screenshots. */
const LEFT: [number, string][] = [[0, m4Quiz], [2, m6Dashboard], [4, m6Pdf], [5, m6Comic]];

export default function Features() {
  const { t } = useTranslation();
  const cols = t('iceberg.features.cols', { returnObjects: true }) as string[];
  const auto = t('iceberg.features.auto', { returnObjects: true }) as string[];
  const items = t('iceberg.features.items', { returnObjects: true }) as Item[];
  const rows = [...auto, ...items.map((it) => it.title)];

  const mark = (on: boolean) =>
    on ? (
      <span className="ib-yes">
        <CheckIcon aria-hidden="true" />
        <span className="ib-sr">{t('iceberg.features.yes')}</span>
      </span>
    ) : (
      <span className="ib-no">
        <XMarkIcon aria-hidden="true" />
        <span className="ib-sr">{t('iceberg.features.no')}</span>
      </span>
    );

  return (
    <section className="ib-sec ib-features" aria-labelledby="ib-features-title">
      <div className="ib-wrap">
        <p className="ib-kicker">{t('iceberg.features.micro')}</p>
        <h2 id="ib-features-title" className="ib-h2">{t('iceberg.features.title')}</h2>

        <table className="ib-table">
          <thead>
            <tr>
              <td />
              {cols.map((c, i) => (
                <th key={c} scope="col" className={i === 0 ? 'ib-us' : undefined}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r} className={i === auto.length ? 'ib-row-gap' : undefined}>
                <th scope="row">{r}</th>
                <td className="ib-us">{mark(true)}</td>
                <td>{mark(false)}</td>
                <td>{mark(false)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <ul className="ib-feat-grid dv-feat-row">
          {LEFT.map(([i, src]) => (
            <li key={items[i].title} className="ib-feat">
              <div className="ib-shot">
                <img src={src} alt={items[i].title} loading="lazy" />
              </div>
              <h3 className="ib-h3">{items[i].title}</h3>
              <p>{items[i].text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
