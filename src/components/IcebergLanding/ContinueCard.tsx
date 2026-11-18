import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRightIcon, PlayIcon } from '@heroicons/react/24/outline';
import { loadLastPlayed, lastPlayedHref, lastPlayedTitle } from '../../services/lastPlayed';

/**
 * «Продолжить» at the top of the landing: one tap back to the part this
 * browser last opened. First-time visitors have no record and see nothing.
 */
export default function ContinueCard() {
  const { t, i18n } = useTranslation();
  const [record] = useState(loadLastPlayed);
  if (!record) return null;

  const story = lastPlayedTitle(record, i18n.language);
  const n = record.part;
  return (
    <Link to={lastPlayedHref(record)} className="dv-continue" aria-label={t('iceberg.continue.label', { story, n })}>
      <PlayIcon aria-hidden="true" />
      <span className="dv-continue-text">
        <span className="ib-micro">{t('iceberg.continue.eyebrow')}</span>
        <span className="dv-continue-line">{t('iceberg.continue.part', { story, n })}</span>
      </span>
      <ArrowRightIcon aria-hidden="true" />
    </Link>
  );
}
