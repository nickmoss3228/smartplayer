// services/adminStoryServices.ts
// Fetch calls for the admin Story Builder. Reuses the admin_token convention
// (and the fetch/error-handling helpers) from adminServices.ts. `id` below is
// always the Mongo _id (not the storyId slug) — matches the backend routes.
import { API_URL, authHeaders, parseOrThrow } from "./adminServices";

export type Difficulty = "easy" | "medium" | "hard";

export interface TimeMarker {
  time: number;
  label: string;
  color: string;
}

export interface VocabEntry {
  word: string; // Russian text shown to the student
  definition: string;
  audioKey: string; // English filename stem, also the progress key
  audioUrl: string;
}

export interface QuizQuestion {
  question: string;
  options: string[]; // always 4
  correctAnswer: number; // index 0-3
  referenceTime: number;
  audio: { fast: string; slow: string };
}

export interface StoryPart {
  partNumber: number;
  audioUrl: string | null;
  timeMarkers: TimeMarker[];
  vocabulary: VocabEntry[];
  phrasalVerbs: VocabEntry[];
  quiz: QuizQuestion[];
}

export interface AdminStory {
  _id: string;
  difficulty: Difficulty;
  storyId: string;
  storyName: string;
  description: string;
  characterIcon: string;
  totalParts: number;
  published: boolean;
  parts: StoryPart[];
  createdAt: string;
}

export type AdminStoryListItem = Omit<AdminStory, "parts">;

export const createStory = async (
  token: string,
  payload: {
    difficulty: Difficulty;
    storyId: string;
    storyName: string;
    description: string;
    characterIcon: string;
    totalParts: number;
  }
): Promise<AdminStory> => {
  const res = await fetch(`${API_URL}/api/admin/stories`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  const data = await parseOrThrow(res);
  return data.story;
};

export interface ImportStoryPayload {
  difficulty: Difficulty;
  storyId: string;
  storyName: string;
  description: string;
  characterIcon: string;
  totalParts: number;
  parts: StoryPart[];
}

// Imports a built-in (static-file) story's full content, assembled by the
// caller from audioDataByDifficulty.ts/Vocabulary.ts/quizData.js, into a new
// draft Story doc — see fetchStaticQuizSource for the one piece (answer
// keys) the frontend can't already see itself.
export const importStory = async (
  token: string,
  payload: ImportStoryPayload
): Promise<AdminStory> => {
  const res = await fetch(`${API_URL}/api/admin/stories/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  const data = await parseOrThrow(res);
  return data.story;
};

export interface StaticQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  referenceTime: number;
  audio: { fast: string; slow: string };
}

// Raw static quizData.js slice for a built-in story, WITH correctAnswer —
// admin-only, used solely to assemble an import payload.
export const fetchStaticQuizSource = async (
  token: string,
  difficulty: Difficulty,
  storyId: string
): Promise<Record<string, StaticQuizQuestion[]>> => {
  const res = await fetch(`${API_URL}/api/admin/stories/quiz-source/${difficulty}/${storyId}`, {
    headers: authHeaders(token),
  });
  const data = await parseOrThrow(res);
  return data.parts;
};

export const listStories = async (
  token: string,
  difficulty?: Difficulty
): Promise<AdminStoryListItem[]> => {
  const params = difficulty ? `?difficulty=${difficulty}` : "";
  const res = await fetch(`${API_URL}/api/admin/stories${params}`, {
    headers: authHeaders(token),
  });
  const data = await parseOrThrow(res);
  return data.stories;
};

export const getStory = async (token: string, id: string): Promise<AdminStory> => {
  const res = await fetch(`${API_URL}/api/admin/stories/${id}`, {
    headers: authHeaders(token),
  });
  const data = await parseOrThrow(res);
  return data.story;
};

export const deleteStory = async (token: string, id: string): Promise<void> => {
  const res = await fetch(`${API_URL}/api/admin/stories/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  await parseOrThrow(res);
};

export type UploadKind = "audio" | "vocab" | "phrasal" | "quizFast" | "quizSlow";

export const uploadPartAsset = async (
  token: string,
  id: string,
  partNumber: number,
  file: File,
  kind: UploadKind,
  extra?: { audioKey?: string; index?: number }
): Promise<string> => {
  const params = new URLSearchParams({ kind });
  if (extra?.audioKey) params.set("audioKey", extra.audioKey);
  if (extra?.index !== undefined) params.set("index", String(extra.index));

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    `${API_URL}/api/admin/stories/${id}/parts/${partNumber}/upload?${params}`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: formData,
    }
  );
  const data = await parseOrThrow(res);
  return data.url;
};

export const saveMarkers = async (
  token: string,
  id: string,
  partNumber: number,
  timeMarkers: TimeMarker[],
  audioUrl?: string
): Promise<StoryPart> => {
  const res = await fetch(`${API_URL}/api/admin/stories/${id}/parts/${partNumber}/markers`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ timeMarkers, audioUrl }),
  });
  const data = await parseOrThrow(res);
  return data.part;
};

export const saveVocabulary = async (
  token: string,
  id: string,
  partNumber: number,
  vocabulary: VocabEntry[]
): Promise<StoryPart> => {
  const res = await fetch(`${API_URL}/api/admin/stories/${id}/parts/${partNumber}/vocabulary`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ vocabulary }),
  });
  const data = await parseOrThrow(res);
  return data.part;
};

export const savePhrasalVerbs = async (
  token: string,
  id: string,
  partNumber: number,
  phrasalVerbs: VocabEntry[]
): Promise<StoryPart> => {
  const res = await fetch(
    `${API_URL}/api/admin/stories/${id}/parts/${partNumber}/phrasal-verbs`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({ phrasalVerbs }),
    }
  );
  const data = await parseOrThrow(res);
  return data.part;
};

export const saveQuiz = async (
  token: string,
  id: string,
  partNumber: number,
  quiz: QuizQuestion[]
): Promise<StoryPart> => {
  const res = await fetch(`${API_URL}/api/admin/stories/${id}/parts/${partNumber}/quiz`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ quiz }),
  });
  const data = await parseOrThrow(res);
  return data.part;
};

export const setStoryPublished = async (
  token: string,
  id: string,
  published: boolean
): Promise<AdminStory> => {
  const res = await fetch(`${API_URL}/api/admin/stories/${id}/publish`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ published }),
  });
  const data = await parseOrThrow(res);
  return data.story;
};
