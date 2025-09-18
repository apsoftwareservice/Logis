/**
 * Samples the first bytes of a File to guess whether it's a JSON array or NDJSON.
 * Returns 'full-json' | 'ndjson' | 'unknown'
 */
export const enum FileFormat {
  json,
  ndjson,
  unknown
}

export async function detectFileFormat(file: File): Promise<FileFormat> {
  // only read the first small chunk
  const sample = await file.slice(0, 1024).text()
  const trimmedStart = sample.trimStart()
  if (trimmedStart.startsWith("[") || trimmedStart.startsWith("{")) return FileFormat.json
  if (trimmedStart.includes("\n")) return FileFormat.ndjson

  return FileFormat.unknown
}