import { hashToken, generateToken } from "@/lib/crypto-util";
import { state } from "@/lib/sse-state";
import { okJSON, badJSON, noContent } from "@/lib/cors";

export const runtime = "edge"; // gives Web Crypto + Web Streams by default

export async function OPTIONS() {
  return noContent();
}

export async function POST(req: Request) {
  try {
    const { key } = await req.json();
    if (!key || typeof key !== "string") {
      return badJSON("Missing or invalid 'key'");
    }

    const existing = state.stringToRawToken.get(key);
    if (existing) {
      return okJSON({ token: existing, reused: true });
    }

    const token = generateToken();
    const tokenHash = await hashToken(token);

    state.stringToToken.set(key, tokenHash);
    state.stringToRawToken.set(key, token);
    console.log(state)
    return okJSON({ token, reused: false });
  } catch {
    return badJSON("Invalid JSON");
  }
}