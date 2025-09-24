import { state, sse } from "@/lib/sse-state";
import { hashToken } from "@/lib/crypto";
import { okJSON, badJSON, noContent } from "@/lib/cors";

export const runtime = "edge";

export async function OPTIONS() {
  return noContent();
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const key = searchParams.get("key");

  let tokenHash: string | null = null;
  if (token) tokenHash = await hashToken(token);
  else if (key) tokenHash = state.stringToToken.get(key) ?? null;

  if (!tokenHash) {
    return badJSON("Missing or invalid token/key", 401);
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    // tolerate non-JSON bodies
    body = {};
  }

  const entry = { type: "log", data: body };
  const controller = state.tokenToController.get(tokenHash);
  let delivered = false;

  if (controller) {
    try {
      controller.controller.enqueue(sse(entry));
      delivered = true;
    } catch {
      clearInterval(controller.heartbeat);
      state.tokenToController.delete(tokenHash);
    }
  }

  // Mirrors your original response shape
  return okJSON({ ok: true, delivered, reason: delivered ? "ok" : "no_active_connection", tokenHash, size:state.tokenToController.size });
}