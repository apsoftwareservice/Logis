/**
 * Samples the first bytes of a File to guess whether it's a JSON array or NDJSON.
 * Returns 'full-json' | 'ndjson' | 'unknown'
 */
export async function detectFileFormat(file: File): Promise<"full-json" | "ndjson" | "unknown"> {
  // only read the first small chunk
  const sample = await file.slice(0, 1024).text();
  const trimmedStart = sample.trimStart();
  if (trimmedStart.startsWith("[")) return "full-json";
  // NDJSON lines usually start with "{" or whitespace and contain newlines
  if (trimmedStart.includes("\n")) return "ndjson";
  return "unknown";
}