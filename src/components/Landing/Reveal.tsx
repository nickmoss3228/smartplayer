import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * Rises into place the first time it scrolls into view (landing.css `.rv`).
 * Hidden only once it knows it can be shown again: without
 * IntersectionObserver it simply stays visible, and reduced motion keeps it
 * still. `delay` staggers neighbours, in ms.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
  style,
  as: Tag = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  as?: 'div' | 'li' | 'article' | 'section';
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [phase, setPhase] = useState<'idle' | 'armed' | 'in'>('idle');

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    setPhase('armed');
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPhase('in');
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cls = ['rv', phase === 'armed' || phase === 'in' ? 'armed' : '', phase === 'in' ? 'in' : '', className].filter(Boolean).join(' ');
  return (
    <Tag ref={ref as never} className={cls} style={{ ...style, ['--d' as string]: `${delay}ms` }}>
      {children}
    </Tag>
  );
}
