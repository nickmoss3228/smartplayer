import { useEffect, useRef, useState } from 'react';
import { SceneStage } from '../../Method/MethodScene';
import type { SceneId } from '../../Method/scenes';

/**
 * A method scene on its dark panel: what a card shows in place of the 3D in
 * the still version (reduced motion, or no WebGL). ScenePanel would do, but it
 * cannot be shortened and the cards have little room, so this is its panel
 * around a SceneStage limited to 200px. The scene restarts the first time it is
 * seen, as ScenePanel's `startWhenSeen` does.
 */
export function StillScene({ scene }: { scene: SceneId }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = panelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="still">
      <div ref={panelRef} aria-hidden="true" className="overflow-hidden rounded-card bg-ink px-2 py-3.5">
        <SceneStage scene={scene} maxHeight={200} playKey={`${scene}-${seen ? 'on' : 'off'}`} />
      </div>
    </div>
  );
}
