/**
 * A piece of a real app screenshot for one of the five steps: the screenshot
 * is cropped to a box (in its own pixels) and, where given, one control in it
 * is lit by a spotlight, the rest dimmed: "this is the button that does it".
 */

export interface Crop {
  src: string;
  /** The screenshot's full size, in pixels. */
  size: [number, number];
  /** The part shown: x, y, width, height in the screenshot's pixels. */
  box: [number, number, number, number];
  /** The control to light, in the screenshot's pixels. */
  spot?: [number, number, number, number];
}

export default function StepShot({ crop, alt, className }: { crop: Crop; alt: string; className?: string }) {
  const [W] = crop.size;
  const [x, y, w, h] = crop.box;
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  return (
    <div className={`dv-shot${className ? ` ${className}` : ''}`} style={{ aspectRatio: `${w} / ${h}` }}>
      <img src={crop.src} alt={alt} loading="lazy" style={{ width: pct(W, w), left: pct(-x, w), top: pct(-y, h) }} />
      {crop.spot && (
        <span
          className="dv-spot"
          aria-hidden="true"
          style={{ left: pct(crop.spot[0] - x, w), top: pct(crop.spot[1] - y, h), width: pct(crop.spot[2], w), height: pct(crop.spot[3], h) }}
        />
      )}
    </div>
  );
}
