/**
 * Fish crossing a band of water behind its content: silhouettes in the band's
 * own tint (set in the CSS), every other one swimming the other way, each at
 * its own depth, size and pace. The delays are negative, so the band is
 * already populated when it scrolls into view. `seed` shifts the pattern so
 * two bands don't repeat each other.
 */
export default function Fish({ count, seed = 0 }: { count: number; seed?: number }) {
  return (
    <div className="dv-fishes" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const n = i + seed;
        const duration = 30 + ((n * 7) % 5) * 6;
        return (
          <span
            key={i}
            className={`dv-fish${n % 2 ? ' dv-fish-left' : ''}`}
            style={{
              top: `${((n * 29 + 11) % 84) + 6}%`,
              width: 36 + ((n * 13) % 4) * 12,
              animationDuration: `${duration}s`,
              animationDelay: `${-((n * 11) % duration)}s`,
            }}
          >
            <svg viewBox="0 0 64 32" style={{ animationDelay: `${-(n % 5)}s` }}>
              <path className="dv-fish-tail" d="M16 16 L2 6 L6 16 L2 26Z" />
              <path d="M30 7 L40 1 L43 7Z" />
              <path fillRule="evenodd" d="M12 16 C22 3 46 3 62 16 C46 29 22 29 12 16Z M51.8 13a1.8 1.8 0 1 0-3.6 0a1.8 1.8 0 1 0 3.6 0Z" />
            </svg>
          </span>
        );
      })}
    </div>
  );
}
