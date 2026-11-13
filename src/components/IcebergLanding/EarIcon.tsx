/** An ear, in a 24×24 box (heroicons has none). */
export function EarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6 9.5a6 6 0 1 1 12 0c0 2.6-1.6 3.9-2.9 5.1-1 .9-1.6 1.7-1.6 3a3.4 3.4 0 0 1-6.3 1.8" />
      <path d="M9.2 9.5a2.8 2.8 0 0 1 5.6 0c0 1.2-.8 1.8-1.6 2.4" />
    </svg>
  );
}
