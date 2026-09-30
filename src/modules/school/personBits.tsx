// modules/school/personBits.tsx
//
// What every person in the school has, whoever animates them: a speech bubble
// over their head and a tap target big enough for a thumb. Shared by People.tsx
// (everybody indoors) and Playtime.tsx (the children out on the grounds).

import { Html } from "@react-three/drei";

export const Bubble = ({ text }: { text: string }) => (
  <Html position={[0, 1.75, 0]} center style={{ pointerEvents: "none" }} zIndexRange={[20, 0]}>
    <div
      style={{
        background: "rgba(255,255,255,0.96)",
        color: "#1f2430",
        border: "2px solid #2b3040",
        borderRadius: 10,
        padding: "4px 9px",
        fontSize: 12,
        fontWeight: 700,
        // Chatter is a few words on one line. A note from the staff repeated
        // in the room is a whole sentence, and wraps rather than stretching
        // across half the school.
        whiteSpace: text.length > 32 ? "normal" : "nowrap",
        width: text.length > 32 ? 220 : undefined,
        textAlign: "center",
        boxShadow: "0 2px 0 rgba(43,48,64,0.35)",
        transform: "translateY(-6px)",
      }}
    >
      {text}
    </div>
  </Html>
);

// A hit target big enough for a thumb. The body is a stack of thin boxes with
// gaps between the limbs, so tapping the actual geometry misses about half the
// time on a phone.
export const HitBox = ({ onTap }: { onTap: () => void }) => (
  <mesh
    position={[0, 0.75, 0]}
    onClick={(e) => {
      e.stopPropagation();
      onTap();
    }}
  >
    <boxGeometry args={[0.75, 1.5, 0.75]} />
    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
  </mesh>
);
