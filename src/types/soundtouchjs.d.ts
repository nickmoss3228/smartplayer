// declare module "soundtouchjs" {
//   /**
//    * Any object that can feed interleaved stereo frames to SimpleFilter.
//    * target  — interleaved Float32Array [L0, R0, L1, R1, …]
//    * position — absolute read offset in sample frames
//    * returns   number of frames actually written
//    */
//   interface SoundTouchSource {
//     extract(target: Float32Array, numFrames: number, position: number): number;
//   }

//   /**
//    * Core DSP engine.
//    * Set tempo < 1.0 to slow down while keeping pitch constant.
//    */
//   export class SoundTouch {
//     /** Speed ratio — 1.0 = normal, 0.75 = 75% speed. Pitch is unaffected. */
//     tempo: number;
//     /** Pitch ratio — 1.0 = no change. */
//     pitch: number;
//     /** Pitch in semitones — 0 = no change. */
//     pitchSemitones: number;
//     /** Tape-style combined rate (speed + pitch). Keep at 1.0. */
//     rate: number;
//   }

//   /**
//    * Bridges a SoundTouchSource with a SoundTouch DSP pipe.
//    * Set sourcePosition (sample frames) to seek without rebuilding.
//    */
//   export class SimpleFilter {
//     constructor(source: SoundTouchSource, pipe: SoundTouch);
//     /** Read/write seek position in sample frames */
//     sourcePosition: number;
//   }

//   /**
//    * Returns a ScriptProcessorNode that pulls time-stretched frames
//    * from the filter on every Web Audio callback.
//    */
//   export function getWebAudioNode(
//     context: AudioContext,
//     filter: SimpleFilter,
//     bufferSize?: number,
//   ): ScriptProcessorNode;
// }