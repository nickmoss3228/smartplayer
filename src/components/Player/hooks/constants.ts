export const SPEED_SEQUENCES: Record<number, number[]> = {
  1: [1.0],
  2: [0.8, 1.0],
  3: [0.5, 0.8, 1.0],
};

export const PLAYBACK_RATES: number[] = [0.5, 0.8, 1.0];

export const formatTime = (time: number): string => {
  if (!isFinite(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};