// app/api/ingest/route.ts
import { NextRequest } from "next/server"

export const runtime = "edge" // required for WebSocketPair
export const dynamic = "force-dynamic"

declare global {
   
  var __wsState: | undefined;
}

if (!globalThis.__wsState) {
  globalThis.__wsState = {
    clients: new Set<WebSocket>(),
    stringToToken: new Map<string, string>(),
    stringToRawToken: new Map<string, string>(),
    tokenToSocket: new Map<string, WebSocket>(),
  } as const;
}

const state = globalThis.__wsState as {
  clients: Set<WebSocket>;
  stringToToken: Map<string, string>;
  stringToRawToken: Map<string, string>;
  tokenToSocket: Map<string, WebSocket>;
};

async function hashToken(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw)
  const digest = await crypto.subtle.digest("SHA-256", data)
  const bytes = new Uint8Array(digest)
  let hex = ""
  for (let i = 0; i < bytes.length; i++) {
    const h = bytes[i].toString(16).padStart(2, "0")
    hex += h
  }
  return hex
}

function generateToken() {
  // Prefer native UUID when available (Edge runtime provides global Web Crypto)
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 20)
  }
  // Fallback: random base36 string
  return (Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 20)
}

export async function GET(req: NextRequest) {
  console.log('asdasda')
  const token = req.nextUrl.searchParams.get("token")
  if (!token) return new Response("Missing token", {status: 401})

  // TODO: look up tokenHash in DB like you do in POST (Edge: use HTTP DB, KV, or JWT)
  const tokenHash = await hashToken(token)

  // Create the socket pair and accept the server side
  // @ts-ignore: WebSocketPair is provided in Edge runtime
  const {0: client, 1: server} = new WebSocketPair()
  server.accept()

  // Authorized only if this token was issued via POST register (exists in our registry)
  const authorized = Array.from(state.stringToToken.values()).includes(tokenHash)
  if (!authorized) {
    try {
      server.close(1008, "Invalid token")
    } catch {
    }
    return new Response("Unauthorized", {status: 401})
  }

  // Register client
  state.clients.add(server)

  // Bind this socket to the provided token for targeted sends
  state.tokenToSocket.set(tokenHash, server)

  // Optional: heartbeat to detect dead connections
  let alive = true
  const ping = setInterval(() => {
    try {
      // @ts-ignore: ping is supported in Cloudflare; fallback: send a heartbeat msg
      server.send(JSON.stringify({type: "ping", t: Date.now()}))
      if (!alive) server.close(1011, "Heartbeat failed")
      alive = false
    } catch {
    }
  }, 30_000)

  server.addEventListener("message", (event: MessageEvent) => {
    alive = true
    // echo or handle client messages
    // server.send(JSON.stringify({ type: "echo", data: event.data }));
  })

  server.addEventListener("close", () => {
    clearInterval(ping)
    state.clients.delete(server)
    // Unbind any token pointing to this socket
    for (const [ tk, ws ] of state.tokenToSocket.entries()) {
      if (ws === server) state.tokenToSocket.delete(tk)
    }
  })
  server.addEventListener("error", () => {
    clearInterval(ping)
    state.clients.delete(server)
    // Unbind any token pointing to this socket
    for (const [ tk, ws ] of state.tokenToSocket.entries()) {
      if (ws === server) state.tokenToSocket.delete(tk)
    }
  })

  // Handshake complete
  // Edge-only: `webSocket` isn't in lib.dom typings
  return new Response(null, {status: 101, webSocket: client} as any)
}

// Keep your POST; broadcast new logs to connected clients
export async function POST(req: NextRequest) {
  // Support sub-endpoint: POST /api/ingest?op=register  with body: { key: string }
  const op = req.nextUrl.searchParams.get("op")
  if (op === "register") {
    const {key} = await req.json().catch(() => ({}))
    if (!key || typeof key !== "string" || !key.trim()) {
      return Response.json({error: "Missing or invalid 'key' string"}, {status: 400})
    }

    // If this key was already registered, return the same token (idempotent)
    const existing = state.stringToRawToken.get(key)
    if (existing) {
      return Response.json({token: existing, reused: true})
    }

    // Otherwise, create and persist a new token
    const token = generateToken()
    const tokenHash = await hashToken(token)
    state.stringToToken.set(key, tokenHash)
    state.stringToRawToken.set(key, token)

    return Response.json({token, reused: false})
  }

  const tokenParam = req.nextUrl.searchParams.get("token")
  const keyParam = req.nextUrl.searchParams.get("key")

  // Allow sending with either a token or a previously registered key
  let tokenHash: string | null = null

  if (tokenParam) {
    tokenHash = await hashToken(tokenParam)
  } else if (keyParam) {
    tokenHash = state.stringToToken.get(keyParam) ?? null
  }

  if (!tokenHash) {
    return Response.json({error: "Missing token or key"}, {status: 401})
  }

  // TODO: validate tokenHash against DB/KV and get connectionId

  const body = await req.json()

  // TODO: persist body as you already planned

  // Targeted delivery: send only to the socket bound to this token
  const ws = state.tokenToSocket.get(tokenHash)
  const payload = JSON.stringify({type: "log", data: body})

  if (ws) {
    try {
      ws.send(payload)
      return Response.json({ok: true, delivered: true})
    } catch {
      try {
        ws.close()
      } catch {
      }
      state.clients.delete(ws)
      // remove broken binding
      state.tokenToSocket.delete(tokenHash)
      return Response.json({ok: true, delivered: false, reason: "socket_error"})
    }
  } else {
    // No active socket for this token
    return Response.json({ok: true, delivered: false, reason: "no_active_socket"})
  }
}