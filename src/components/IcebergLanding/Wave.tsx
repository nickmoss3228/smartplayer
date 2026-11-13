/**
 * A moving waterline between two bands of the dive: the band above shows
 * through as the background, the band below rises in two waves (a pale one
 * behind, the real one in front), each sliding sideways on its own beat.
 * Each path spans twice the width, so sliding it by half loops seamlessly.
 */

const path = (amp: number, mid: number, h: number) => {
  let d = `M0 ${mid}`;
  for (let x = 0; x < 2400; x += 200) d += ` q50 ${-amp} 100 0 t100 0`;
  return `${d} V${h} H0Z`;
};

export default function Wave({ from, to, flip = false, tall = false }: { from: string; to: string; flip?: boolean; tall?: boolean }) {
  const h = tall ? 96 : 64;
  return (
    <div className={`dv-wave${flip ? ' dv-wave-flip' : ''}`} style={{ background: from, height: h }} aria-hidden="true">
      <svg className="dv-wave-back" viewBox={`0 0 2400 ${h}`} preserveAspectRatio="none">
        <path d={path(tall ? 22 : 16, h * 0.42, h)} fill={to} opacity={0.45} />
      </svg>
      <svg className="dv-wave-front" viewBox={`0 0 2400 ${h}`} preserveAspectRatio="none">
        <path d={path(tall ? 26 : 18, h * 0.6, h)} fill={to} />
      </svg>
    </div>
  );
}
