import WaveSurfer from "wavesurfer.js";
import type { PanelQuiz } from "./services/storyServices";
import type { PracticeKind } from "./components/Player/Practice/PracticeModal";

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
  /** The comic-page game ("where did it happen?"); null when the part has none. */
  panelQuiz?: PanelQuiz | null;
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
  /** Comic page for this track, resolved by modules/story/resolveStory.ts. */
  comicUrl?: string | null;
  /** The part's name, used as the comic page's title. */
  trackTitle?: string;
  /**
   * The track’s words, already resolved to a single source with their clip
   * URLs filled in. Passed down rather than looked up here, so the chips
   * cannot disagree with the Vocab Quiz about what this track contains.
   */
  vocabulary: { word: string; definition: string; audioKey: string; audioUrl: string }[];
  phrasalVerbs: { word: string; definition: string; audioKey: string; audioUrl: string }[];
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
  /** What this part offers once heard, quiz first — the icons on «Практика». */
  practices?: PracticeKind[];
  /** Opens the practice window. */
  onOpenPractice?: () => void;
  /** How many of `practices` are finished — shown as "2/3" on the button. */
  practicesDone?: number;
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
