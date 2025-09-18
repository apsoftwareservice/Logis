// ws-server.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

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

interface WebsocketState {
    clients: Set<WebSocket>;
    stringToToken: Map<string, string>;
    stringToRawToken: Map<string, string>;
    tokenToSocket: Map<string, WebSocket>;
}

// Global state (shared across imports)
declare global {
    // eslint-disable-next-line no-var
    var __wsState: WebsocketState | undefined;
}

if (!global.__wsState) {
    global.__wsState = {
        clients: new Set(),
        stringToToken: new Map(),
        stringToRawToken: new Map(),
        tokenToSocket: new Map(),
    };
}

const state = global.__wsState!;

// Create HTTP server (so we can also handle register & POST endpoints)
const server = createServer(async (req, res) => {
    if (!req.url) return;

    const url = new URL(req.url, `http://${req.headers.host}`);

    // Register endpoint: /register?key=abc
    if (req.method === "POST" && url.pathname === "/register") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
            try {
                const { key } = JSON.parse(body);
                if (!key || typeof key !== "string") {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: "Missing or invalid 'key'" }));
                    return;
                }

                // If key already registered, reuse token
                const existing = state.stringToRawToken.get(key);
                if (existing) {
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ token: existing, reused: true }));
                    return;
                }

                // New token
                const token = generateToken();
                const tokenHash = await hashToken(token);

                state.stringToToken.set(key, tokenHash);
                state.stringToRawToken.set(key, token);

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ token, reused: false }));
            } catch {
                res.writeHead(400);
                res.end(JSON.stringify({ error: "Invalid JSON" }));
            }
        });
        return;
    }

    // Log send endpoint: /send?token=xxx
    if (req.method === "POST" && url.pathname === "/send") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
            const token = url.searchParams.get("token");
            const key = url.searchParams.get("key");

            let tokenHash: string | null = null;
            if (token) tokenHash = await hashToken(token);
            else if (key) tokenHash = state.stringToToken.get(key) ?? null;

            if (!tokenHash) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: "Missing or invalid token/key" }));
                return;
            }

            const ws = state.tokenToSocket.get(tokenHash);
            const payload = JSON.stringify({ type: "log", data: body ? JSON.parse(body) : {} });

            if (ws) {
                try {
                    ws.send(payload);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ ok: true, delivered: true }));
                } catch {
                    ws.close();
                    state.clients.delete(ws);
                    state.tokenToSocket.delete(tokenHash);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ ok: true, delivered: false, reason: "socket_error" }));
                }
            } else {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: true, delivered: false, reason: "no_active_socket" }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end("Not found");
});

// Attach WebSocket server
const wss = new WebSocketServer({ server });

wss.on("connection", async (socket, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    if (!token) {
        socket.close(1008, "Missing token");
        return;
    }

    const tokenHash = await hashToken(token);
    const authorized = Array.from(state.stringToToken.values()).includes(tokenHash);

    if (!authorized) {
        socket.close(1008, "Invalid token");
        return;
    }

    state.clients.add(socket);
    state.tokenToSocket.set(tokenHash, socket);

    let alive = true;
    const interval = setInterval(() => {
        if (!alive) {
            socket.terminate();
            clearInterval(interval);
            return;
        }
        alive = false;
        socket.ping();
    }, 30_000);

    socket.on("pong", () => {
        alive = true;
    });

    socket.on("message", (msg) => {
        alive = true;
        console.log("Client message:", msg.toString());
    });

    socket.on("close", () => {
        clearInterval(interval);
        state.clients.delete(socket);
        for (const [tk, ws] of state.tokenToSocket.entries()) {
            if (ws === socket) state.tokenToSocket.delete(tk);
        }
    });

    socket.on("error", () => {
        clearInterval(interval);
        state.clients.delete(socket);
        for (const [tk, ws] of state.tokenToSocket.entries()) {
            if (ws === socket) state.tokenToSocket.delete(tk);
        }
    });
});

// Start server
const PORT = 4000;
server.listen(PORT, () => {
    console.log(`WebSocket server running at http://localhost:${PORT}`);
});
