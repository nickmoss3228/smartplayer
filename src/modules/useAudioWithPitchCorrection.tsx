// import { useEffect, useRef } from "react";
// import { PitchShifter } from "@soundtouchjs/audio-worklet"

// export const useAudioWithPitchCorrection = (src: string, playbackRate: number) => {
//   const audioContextRef = useRef<AudioContext | null>(null);
//   const shifterRef = useRef<any>(null);
//   const sourceRef = useRef<AudioBufferSourceNode | null>(null);
 
//   useEffect(() => {
//     let isCancelled = false;

//     const setup = async () => {
//       if (!audioContextRef.current) {
//         audioContextRef.current = new AudioContext();
//       }

//       const ctx = audioContextRef.current;
//       const res = await fetch(src);
//       const arrayBuffer = await res.arrayBuffer();
//       const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

//       if (isCancelled) return;

//       // Clean up old nodes
//       sourceRef.current?.disconnect();
//       shifterRef.current?.disconnect();

//       const source = ctx.createBufferSource();
//       source.buffer = audioBuffer;

//       // PitchShifter keeps pitch stable while changing tempo
//       const shifter = new PitchShifter(ctx, audioBuffer, 16384);
//       shifter.tempo = playbackRate;  // change speed ✅
//       shifter.pitch = 1.0;           // keep pitch ✅

//       source.connect(shifter.node);
//       shifter.connect(ctx.destination);

//       sourceRef.current = source;
//       shifterRef.current = shifter;

//       source.start();
//     };

//     setup();
//     return () => { isCancelled = true; };
//   }, [src, playbackRate]);
// };