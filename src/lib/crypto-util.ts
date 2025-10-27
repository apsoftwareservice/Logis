export async function hashToken(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

export function generateToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  }
  // Shouldn’t really happen on Next.js, but keep a fallback:
  return (Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 20);
}

export function randomUUID() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}