/** Bubbles rising through a band of water, spread out so no two start together. */
export default function Bubbles({ count }: { count: number }) {
  return (
    <div className="dv-bubbles" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`dv-bubble${i % 2 ? ' dv-bubble-s' : ''}`}
          style={{ left: `${(i * 37 + 9) % 94}%`, animationDelay: `${(i * 1.7) % 7}s`, animationDuration: `${7 + (i % 3) * 1.5}s` }}
        />
      ))}
    </div>
  );
}
