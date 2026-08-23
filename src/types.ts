import WaveSurfer from "wavesurfer.js";

export interface Subtitle {
  startTime: number;
  endTime: number;
  text: string;
}

export interface AudioTrack {
  id: string;
  title: string;
  audio: string;
  subtitles: Subtitle[];
  timeMarkers: TimeMarker[];
  helpAudio?: string[];
  /**
   * Comic page for this track. Only DB-backed stories set it — static stories
   * resolve theirs from the comicManifest by difficulty, which cannot name a
   * second story on the same level.
   */
  comicUrl?: string | null;
}
export interface TimeMarker {
  time: number;
  label: string;
  color: string;
}

export interface WaveformPlayerProps {
  audioUrl: string;
  trackId: string;
  difficulty: string;
  storySlug: string;
  /** Comic page for this track, when the story carries its own (DB stories). */
  comicUrl?: string | null;
  level: string; // "easy" | "medium" | "hard"
  onAudioComplete?: () => void;
  subtitles: {
    startTime: number;
    endTime: number;
    text: string;
  }[];
  timeMarkers: {
    time: number;
    label: string;
    color: string;
  }[];
  onWavesurferMount: (wavesurfer: WaveSurfer) => void;
  helpAudioUrls?: string[];
  hasListenedFully?: boolean;
  onOpenQuiz?: () => void;
  onOpenVocabQuiz?: () => void;
  /** Vocab word keys (lowercased audioKey ?? word) already answered correctly */
  learnedWords?: Set<string>;
}

export interface Meaning {
  meaning: string;
  example: string;
  translation: string;
}

export interface VerbData {
  verb: string;
  meanings: Meaning[];
}

export interface PhrasalData {
  mainMeaning?: string;
  verbs: VerbData[];
}

export interface PhrasalVerbData extends Array<PhrasalData> {}

export interface PhrasalsModelProps {
  isOpen: boolean;
  onClose: () => void;
  preposition: string;
  data: PhrasalVerbData | null;
}

export interface PhrasalVerbsType {
  [key: string]: PhrasalVerbData[];
}

export interface SelectedExamples {
  meanings: string[];
  examples: string[];
  translations: string[];
}

export interface PlayerProps {
  // Add any props if needed
}

export type AudioRef = React.RefObject<HTMLAudioElement>;

export type AudioData = {
  url: string;
  title: string;
};

export type UnitData = {
  [key: string]: AudioData[];
};

export type AspectData = {
  [key: string]: UnitData;
};

export type LevelData = {
  [key: string]: Array<{ [key: string]: UnitData }>;
};

// Props interfaces
export interface LevelSelectorProps {
  onChange: (level: string) => void;
}

export interface AspectSelectorProps {
  onChange: (aspect: string) => void;
  level: string;
}

export interface UnitSelectorProps {
  onChange: (unit: string) => void;
  aspect: string;
  data: UnitData;
  level: string;
}

export interface AudioListProps {
  aspect: string;
  unit: string;
  level: string;
  data: UnitData;
}
