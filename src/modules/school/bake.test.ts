import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { LIVE, merge, walk } from "./bake";

/** A material as JSX makes it: R3F tags what it creates with `__r3f`. */
const jsx = (color: string) => {
  const m = new THREE.MeshLambertMaterial({ color });
  (m as unknown as { __r3f: object }).__r3f = {};
  return m;
};

const box = (material: THREE.Material, x = 0) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.position.x = x;
  return mesh;
};

const sceneOf = (...children: THREE.Object3D[]) => {
  const root = new THREE.Group();
  root.add(...children);
  return root;
};

const bake = (root: THREE.Object3D) => merge(walk(root, new Set()).items, new THREE.Matrix4());

describe("merging the still scenery", () => {
  it("draws boxes of different colours as one mesh, each keeping its colour", () => {
    const red = jsx("#ff0000");
    const blue = jsx("#0000ff");
    const baked = bake(sceneOf(box(red, 0), box(blue, 3)));

    expect(baked.meshes).toHaveLength(1);
    expect(baked.replaced).toHaveLength(2);
    const [mesh] = baked.meshes;
    const colour = mesh.geometry.getAttribute("color");
    const pos = mesh.geometry.getAttribute("position");
    // Every vertex carries the colour of the box it came from.
    for (let i = 0; i < pos.count; i++) {
      const fromRed = pos.getX(i) < 1.5;
      expect(colour.getX(i)).toBeCloseTo(fromRed ? red.color.r : 0);
      expect(colour.getZ(i)).toBeCloseTo(fromRed ? 0 : blue.color.b);
    }
    expect((mesh.material as THREE.MeshLambertMaterial).vertexColors).toBe(true);
  });

  it("keeps a shared material the same object, so what animates it still reaches the merge", () => {
    const tube = new THREE.MeshBasicMaterial({ color: "#56d6ff" });
    const baked = bake(sceneOf(box(tube, 0), box(tube, 2), box(jsx("#ffffff"), 4)));

    const drawnWith = baked.meshes.map((m) => m.material);
    expect(drawnWith).toContain(tube);
    expect(baked.meshes).toHaveLength(2);
  });

  it("leaves anything marked live, and everything under it, exactly as it is", () => {
    const hand = new THREE.Group();
    hand.userData = { ...LIVE };
    hand.add(box(jsx("#222222")));
    const still = box(jsx("#ffffff"));
    const root = sceneOf(still, hand);

    const { items } = walk(root, new Set());
    expect(items.map((i) => i.mesh)).toEqual([still]);
    expect(hand.matrixAutoUpdate).toBe(true);
    expect(still.matrixAutoUpdate).toBe(false);
  });

  it("does not merge a mirrored mesh, which would come out inside out", () => {
    const mirrored = box(jsx("#ffffff"));
    mirrored.scale.x = -1;
    expect(walk(sceneOf(mirrored), new Set()).items).toHaveLength(0);
  });

  it("changes its signature when a colour or a place changes, and only then", () => {
    const mat = jsx("#ffffff");
    const mesh = box(mat);
    const root = sceneOf(mesh);
    const first = walk(root, new Set()).signature;

    expect(walk(root, new Set()).signature).toBe(first);
    mat.color.set("#ff0000");
    const recoloured = walk(root, new Set()).signature;
    expect(recoloured).not.toBe(first);
    // Frozen after the first walk, and still noticed: the walk recomputes it.
    mesh.position.x = 2;
    expect(walk(root, new Set()).signature).not.toBe(recoloured);
  });

  it("counts a mesh hidden by the last merge as still there", () => {
    const mesh = box(jsx("#ffffff"));
    const root = sceneOf(mesh);
    mesh.visible = false;
    expect(walk(root, new Set()).items).toHaveLength(0);
    expect(walk(root, new Set([mesh])).items).toHaveLength(1);
  });

  it("places the merge where the originals were", () => {
    const baked = bake(sceneOf(box(jsx("#ffffff"), 5)));
    baked.meshes[0].geometry.computeBoundingBox();
    const bb = baked.meshes[0].geometry.boundingBox!;
    expect(bb.min.x).toBeCloseTo(4.5);
    expect(bb.max.x).toBeCloseTo(5.5);
  });
});
