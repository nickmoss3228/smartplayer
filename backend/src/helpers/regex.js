// Escapes regex metacharacters so a search term is matched literally instead
// of being interpreted as a (possibly expensive/crashy) regex pattern.
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
