import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * The whole iceberg, in 3D, for the final call to try it: a faceted berg with
 * a small tip in the air and the big body under the water, slowly turning and
 * bobbing. The waterline is the middle of the canvas: the camera sits exactly
 * at water level, and the berg is drawn twice, clipped at y = 0: bright ice
 * above, a sea-tinted, see-through body below. The sky and the sea behind it
 * are the page's own CSS, so canvas and page meet on the same line.
 */

/** A deterministic 0..1 hash of a vertex, so the berg has the same shape every time. */
const hash = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

function makeBerg(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    // same corner, same jitter: the hash is taken before the shape changes
    const n = hash(Math.round(v.x * 100), Math.round(v.y * 100), Math.round(v.z * 100));
    const k = 0.82 + n * 0.36;
    if (v.y > 0.25) {
      // the tip: narrow, leaning a little, about a seventh of the height
      v.set(v.x * 0.42 * k + 0.12, (v.y - 0.25) * 1.35 * k + 0.02, v.z * 0.4 * k);
    } else {
      // the body: wide and deep, widening into ledges as it goes down
      const t = (0.25 - v.y) / 1.25;
      const w = (1.05 + t * 0.5) * k;
      v.set(v.x * w, 0.02 - t * 2.9 * (0.9 + n * 0.2), v.z * w * 0.9);
    }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

const ABOVE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const BELOW = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

function Berg({ still }: { still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(makeBerg, []);

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g || still) return;
    g.rotation.y += dt * 0.12;
    g.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.045;
    g.rotation.z = Math.sin(clock.elapsedTime * 0.55) * 0.025;
  });

  return (
    <group ref={group} rotation={[0, 0.6, 0]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#ffffff" flatShading roughness={0.55} metalness={0} clippingPlanes={[ABOVE]} />
      </mesh>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#d6ecf8"
          emissive="#5fa8cf"
          emissiveIntensity={0.25}
          flatShading
          transparent
          opacity={0.55}
          roughness={0.8}
          depthWrite={false}
          clippingPlanes={[BELOW]}
        />
      </mesh>
    </group>
  );
}

export default function Iceberg3D({ still = false }: { still?: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 7.2], fov: 38, near: 0.1, far: 50 }}
      dpr={[1, 2]}
      frameloop={still ? 'demand' : 'always'}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => { gl.localClippingEnabled = true; }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#ffffff', '#5fa8cf', 1.3]} />
      <directionalLight position={[-3, 5, 4]} intensity={2.2} />
      <directionalLight position={[4, -2, 2]} intensity={0.35} color="#9fd4ff" />
      <Berg still={still} />
    </Canvas>
  );
}
