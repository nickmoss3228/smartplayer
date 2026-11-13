import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Marine snow: specks drifting in a band of water, drawn with three.js as one
 * point cloud. Each speck sinks slowly and sways; scrolling moves them too,
 * slower than the page and the slower the farther they are, so going down the
 * page feels like sinking past them, and going up like rising through them.
 *
 * One orthographic camera with one unit per CSS pixel, so the cloud is sized
 * straight from the canvas.
 */

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform float uHeight;
  uniform float uPixelRatio;
  attribute float aSeed;
  attribute float aDepth;
  varying float vDepth;
  void main() {
    vec3 p = position;
    // sink with time, move against the scroll (nearer specks faster), wrap around the band
    float y = p.y - uTime * (6.0 + aSeed * 10.0) + uScroll * (0.25 + aDepth * 0.55);
    y = mod(y + uHeight * 0.5, uHeight) - uHeight * 0.5;
    p.y = y;
    p.x += sin(uTime * (0.25 + aSeed * 0.3) + aSeed * 6.2831) * (6.0 + aDepth * 14.0);
    vDepth = aDepth;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (2.5 + aDepth * 6.5) * uPixelRatio;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vDepth;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, a * (0.32 + vDepth * 0.6));
  }
`;

function Specks({ count }: { count: number }) {
  const { size, viewport } = useThree();
  const material = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const depth = new Float32Array(count);
    // a deterministic scatter, so the band looks the same on every visit
    let s = 1234567;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rnd() - 0.5) * size.width;
      pos[i * 3 + 1] = (rnd() - 0.5) * size.height;
      pos[i * 3 + 2] = 0;
      seed[i] = rnd();
      depth[i] = rnd() * rnd();
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aDepth', new THREE.BufferAttribute(depth, 1));
    return g;
  }, [count, size.width, size.height]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uHeight: { value: size.height },
      uPixelRatio: { value: viewport.dpr },
      uColor: { value: new THREE.Color('#e6f4ff') },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame(({ clock }) => {
    const m = material.current;
    if (!m) return;
    m.uniforms.uTime.value = clock.elapsedTime;
    m.uniforms.uScroll.value = window.scrollY;
    m.uniforms.uHeight.value = size.height;
    m.uniforms.uPixelRatio.value = viewport.dpr;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function MarineSnow({ density = 1 }: { density?: number }) {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 100], zoom: 1 }}
      dpr={[1, 1.75]}
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <Specks count={Math.round(420 * density)} />
    </Canvas>
  );
}
