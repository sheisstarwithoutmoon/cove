export async function rewriteAcademicQuery(query) {

  let cleaned = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const stopWords = new Set([
    "what",
    "is",
    "are",
    "the",
    "in",
    "on",
    "of",
    "for",
    "and",
    "a",
    "an",
    "how",
    "to",
    "show",
    "find"
  ]);

  const words = cleaned
    .split(" ")
    .filter(word => !stopWords.has(word));

  return words.join(" ");
}