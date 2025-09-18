async function* linesFromFile(file: File) {
  const stream = file.stream()
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let remainder = ""

  while (true) {
    const {done, value} = await reader.read()
    if (done) break
    remainder += decoder.decode(value, {stream: true})
    let idx: number
    while ((idx = remainder.indexOf("\n")) >= 0) {
      const line = remainder.slice(0, idx)
      remainder = remainder.slice(idx + 1)
      yield line
    }
  }
  if (remainder.length) yield remainder
}