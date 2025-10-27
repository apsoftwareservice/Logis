import { state, sse } from "@/lib/sse-state";
import { hashToken } from "@/lib/crypto-util";
import { corsHeaders, noContent, badJSON } from "@/lib/cors";

export const runtime = "edge";

export async function OPTIONS() {
  return noContent();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const key = searchParams.get("key");

  let tokenHash: string | null = null;
  if (token) tokenHash = await hashToken(token);
  else if (key) tokenHash = state.stringToToken.get(key) ?? null;

  if (!tokenHash) {
    return badJSON("Missing or invalid 'key'", 401);
  }

  const stream = new ReadableStream<string>({
    start(controller) {
      // Send initial connected event
      controller.enqueue(sse({ type: "connected", token: tokenHash }));

      // Heartbeat to keep some proxies happy
      const heartbeat = setInterval(() => controller.enqueue(": ping\n\n"), 15000);

      // Remember this controller so /log can push to it
      state.tokenToController.set(tokenHash!, { controller, heartbeat });

      // Clean up when client disconnects
      const signal = req.signal;
      const onAbort = () => {
        clearInterval(heartbeat);
        state.tokenToController.delete(tokenHash!);
        try { controller.close(); } catch {}
        signal.removeEventListener("abort", onAbort);
      };
      signal.addEventListener("abort", onAbort);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // for proxies/CDNs that buffer:
      "X-Accel-Buffering": "no",
    },
  });
}