/**
 * Samples the first bytes of a File to guess whether it's a JSON array or NDJSON.
 * Returns 'full-json' | 'ndjson' | 'unknown'
 */
export const enum InputType {
  json,
  ndjson,
  stream,
  clipboard,
  unknown
}

export async function detectFileFormat(file: File): Promise<InputType> {
  // only read the first small chunk
  const sample = await file.slice(0, 1024).text()
  const trimmedStart = sample.trimStart()
  if (trimmedStart.startsWith("[") || trimmedStart.startsWith("{")) return InputType.json
  if (trimmedStart.includes("\n")) return InputType.ndjson

  return InputType.unknown
}