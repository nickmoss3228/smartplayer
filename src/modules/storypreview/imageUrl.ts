export function getOptimizedImageUrl(url: string): string {
  const base = url.split("?")[0];
  return `${base}?w=680&h=208&auto=format&fit=crop&q=75`;
}