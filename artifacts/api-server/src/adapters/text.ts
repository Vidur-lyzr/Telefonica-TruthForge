// Shared lightweight text utilities for the local vector store.

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are",
  "was", "were", "be", "been", "with", "as", "at", "by", "it", "its", "this",
  "that", "these", "those", "from", "what", "which", "who", "whom", "how",
  "when", "where", "why", "do", "does", "did", "has", "have", "had", "will",
  "would", "can", "could", "should", "about", "into", "over", "any", "all",
  "s", "our", "we", "you", "your", "their", "there", "here",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t));
}
