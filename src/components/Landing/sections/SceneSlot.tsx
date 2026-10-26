/**
 * A card's own window onto the 3D, on phones: the one canvas moves into
 * whichever slot is most on screen and leaves a still frame behind in the
 * one it left. From 960px the slots are hidden and the scene fills the
 * pinned stage instead. The scene adds the canvases; React never renders
 * children here.
 */
export function SceneSlot({ ch }: { ch: number }) {
  return <div className="slot only3d" data-slot={ch} aria-hidden="true" />;
}
