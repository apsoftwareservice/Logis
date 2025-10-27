// server.ts
import { createServer } from "http";

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

interface EventSourceState {
    stringToToken: Map<string, string>;
    stringToRawToken: Map<string, string>;
    tokenToStream: Map<string, NodeJS.WritableStream>;
}

// Global state (shared across imports)
declare global {
     
    var __esState: EventSourceState | undefined;
}

if (!global.__esState) {
    global.__esState = {
        stringToToken: new Map(),
        stringToRawToken: new Map(),
        tokenToStream: new Map(),
    };
}

const state = global.__esState!;

// Create HTTP server (so we can also handle register & POST endpoints)
const server = createServer(async (req, res) => {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

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

    // Register endpoint: /stream?token=abc
    if (req.method === "GET" && url.pathname === "/stream") {
        const token = url.searchParams.get("token");
        const key = url.searchParams.get("key");
        let tokenHash: string | null = null;

        if (token) tokenHash = await hashToken(token);
        else if (key) tokenHash = state.stringToToken.get(key) ?? null;

        if (!tokenHash) {
            res.writeHead(401);
            res.end(JSON.stringify({ error: "Missing or invalid 'key'" }));
            return;
        }

        // Set headers for EventSource (SSE)
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        });

        res.write(`data: {"type": "connected", "token": "${tokenHash}"}\n\n`);

        // Store the stream in the map
        state.tokenToStream.set(tokenHash, res);

        req.on("close", () => {
           state.tokenToStream.delete(tokenHash);
           res.end();
        });

        return;
    }

    // Log send endpoint: /send?token=xxx
    if (req.method === "POST" && url.pathname === "/log") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
            const token = url.searchParams.get("token");
            const key = url.searchParams.get("key");
            let delivered = false

            let tokenHash: string | null = null;
            if (token) tokenHash = await hashToken(token);
            else if (key) tokenHash = state.stringToToken.get(key) ?? null;

            if (!tokenHash) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: "Missing or invalid token/key" }));
                return;
            }

            const stream = state.tokenToStream.get(tokenHash);
            const payload = JSON.stringify({ type: "log", data: body ? JSON.parse(body) : {} });
            console.log(payload);

            if (stream) {
                try {
                    stream.write(`data: ${payload}\n\n`)
                    delivered = true;
                } catch {
                    state.tokenToStream.delete(tokenHash);
                }
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true, delivered, reason: delivered ? null : "no_active_socket" }));
        });
        return;
    }

    res.writeHead(404);
    res.end("Not found");
});

// Start server
const PORT = 4000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
