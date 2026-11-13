import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Mounts a three.js scene only while its box is on (or near) the screen, so
 * the page never runs more than a canvas or two at a time, and the three.js
 * chunk loads only when the first scene is about to show. Until then, and
 * where WebGL is missing, it shows `fallback`. Under reduced motion it shows
 * the fallback too, unless `still` says the scene can be drawn standing still.
 */

const hasWebGL = (() => {
  if (typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
})();

export const prefersStill = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Lazy3D({ children, fallback = null, className, still = false }: { children: ReactNode; fallback?: ReactNode; className?: string; still?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const allowed = hasWebGL && (still || !prefersStill());

  useEffect(() => {
    const el = ref.current;
    if (!el || !allowed || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => setNear(entries.some((e) => e.isIntersecting)), { rootMargin: '200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [allowed]);

  return (
    <div ref={ref} className={className} aria-hidden="true">
      {allowed && near ? <Suspense fallback={fallback}>{children}</Suspense> : fallback}
    </div>
  );
}
