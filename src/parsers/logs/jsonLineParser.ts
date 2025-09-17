async function* linesFromFile(file: File) {
  const stream = file.stream();
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let remainder = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    remainder += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = remainder.indexOf("\n")) >= 0) {
      const line = remainder.slice(0, idx);
      remainder = remainder.slice(idx + 1);
      yield line;
    }
  }
  if (remainder.length) yield remainder;
}

// usage — iterate lines and parse NDJSON:
// async function parseNdjsonFile(file: File) {
//   for await (const line of linesFromFile(file)) {
//     if (!line.trim()) continue;
//     try {
//       const event = JSON.parse(line);
//       // handle event...
//     } catch (err) {
//       console.warn("invalid JSON line", line, err);
//     }
//   }
// }