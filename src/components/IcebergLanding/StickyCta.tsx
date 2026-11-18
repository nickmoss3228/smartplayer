import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { TRY_IT_PATH, TRY_IT_STATE } from './tryIt';

/**
 * The way in, following the reader down the page. It shows once the hero's
 * button has scrolled away and hides again wherever it would get in the way:
 * - over the steps (`.dv-ascent`), where the reader is following the rope;
 * - beside the final button, so the page never shows two of them at once.
 *
 * Without IntersectionObserver it never shows: the two buttons in the page are
 * enough.
 */
const HIDE_NEAR = ['.dv-hero-cta', '.dv-ascent', '.dv-final .ib-cta'];

export default function StickyCta({ label }: { label: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const nodes = HIDE_NEAR.map((sel) => document.querySelector(sel)).filter((n): n is Element => n !== null);
    if (!nodes.length) return;
    const onScreen = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) onScreen.add(e.target);
        else onScreen.delete(e.target);
      });
      setShow(onScreen.size === 0);
    });
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  return (
    <div className={`dv-sticky${show ? ' on' : ''}`} aria-hidden={!show}>
      <Link to={TRY_IT_PATH} state={TRY_IT_STATE} className="ib-cta" tabIndex={show ? 0 : -1}>
        {label}
        <ArrowRightIcon aria-hidden="true" />
      </Link>
    </div>
  );
}
