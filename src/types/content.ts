/** Same bound as the backend and the story_total_parts_range DB check. */
export const MAX_PARTS = 20;

export const validPartCount = (value: number): boolean =>
  Number.isInteger(value) && value >= 1 && value <= MAX_PARTS;
