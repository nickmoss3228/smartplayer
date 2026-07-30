import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const fetchLearnedWords = async (token: string): Promise<string[]> => {
  const res = await axios.get(`${API_BASE}/api/progress/vocab-learned`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.learnedWords;
};

export const submitLearnedWords = async (
  token: string,
  words: string[],
): Promise<string[]> => {
  const res = await axios.post(
    `${API_BASE}/api/progress/vocab-complete`,
    { words },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return res.data.learnedWords;
};
