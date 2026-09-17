"use client"

// A single offscreen span, reused across calls, styled to match the title's
// font classes exactly (text-lg font-semibold) and appended under <body> so it
// inherits the real font-family from next/font's Outfit class - measuring via
// a hardcoded font string would drift out of sync with the actual rendered font.
let measureEl: HTMLSpanElement | null = null

function getMeasureEl(): HTMLSpanElement | null {
  if (typeof document === "undefined") return null
  if (!measureEl) {
    const el = document.createElement("span")
    el.style.position = "absolute"
    el.style.visibility = "hidden"
    el.style.whiteSpace = "pre"
    el.style.left = "-9999px"
    el.style.top = "-9999px"
    el.className = "text-lg font-semibold"
    document.body.appendChild(el)
    measureEl = el
  }
  return measureEl
}

export function measureTitleWidth(text: string): number {
  const el = getMeasureEl()
  if (!el) return 0
  el.textContent = text || ""
  return el.getBoundingClientRect().width
}
