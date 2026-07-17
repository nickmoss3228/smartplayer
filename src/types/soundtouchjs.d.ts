declare module "soundtouchjs" {
  export class PitchShifter {
    constructor(context: AudioContext, buffer: AudioBuffer, bufferSize?: number);
    tempo: number;
    pitch: number;
    percentagePlayed: number;
    on(event: "play", cb: (detail: {
      timePlayed: number;
      formattedTimePlayed: string;
      percentagePlayed: number;
    }) => void): void;
    off(): void;
    connect(node: AudioNode): void;
    disconnect(): void;
  }
}