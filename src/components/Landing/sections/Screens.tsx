import { useTranslation } from 'react-i18next';

/**
 * Screenshots of the app as they are, no device frames: the computer's screen
 * with the phone's overlapping its corner, so a visitor sees the same thing
 * works on both. The page shows pictures, not working
 * copies: it is a short guide, and the app is for using.
 */
export function Screens({
  desktop,
  mobile,
  label,
}: {
  desktop: string;
  mobile: string;
  /** What the screens show; it captions them and names both images. */
  label?: string;
}) {
  const { t } = useTranslation();
  const name = (device: string) => (label ? `${label} · ${device}` : device);

  return (
    <figure className="screens">
      <div className="screens-set">
        <img className="screens-d" src={desktop} alt={name(t('landing.devices.desktop'))} loading="lazy" />
        <img className="screens-m" src={mobile} alt={name(t('landing.devices.phone'))} loading="lazy" width={780} height={1688} />
      </div>
      {label && <figcaption>{label}</figcaption>}
    </figure>
  );
}

/**
 * One window of the app (the quiz, the Words game, the word list), cut out of
 * its screen: no player around it, so it can be shown large. A phone gets the
 * phone's window; a wider screen the computer's.
 */
export function AppWindow({ desktop, mobile, label }: { desktop: string; mobile: string; label: string }) {
  return (
    <figure className="app-window">
      <picture>
        <source media="(max-width: 639px)" srcSet={mobile} />
        <img src={desktop} alt={label} loading="lazy" />
      </picture>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
