"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// ws-server.ts
var http_1 = require("http");
function hashToken(raw) {
    return __awaiter(this, void 0, void 0, function () {
        var data, digest, bytes, hex, i, h;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    data = new TextEncoder().encode(raw);
                    return [4 /*yield*/, crypto.subtle.digest("SHA-256", data)];
                case 1:
                    digest = _a.sent();
                    bytes = new Uint8Array(digest);
                    hex = "";
                    for (i = 0; i < bytes.length; i++) {
                        h = bytes[i].toString(16).padStart(2, "0");
                        hex += h;
                    }
                    return [2 /*return*/, hex];
            }
        });
    });
}
function generateToken() {
    // Prefer native UUID when available (Edge runtime provides global Web Crypto)
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
    }
    // Fallback: random base36 string
    return (Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 20);
}
if (!global.__esState) {
    global.__esState = {
        stringToToken: new Map(),
        stringToRawToken: new Map(),
        tokenToStream: new Map(),
    };
}
var state = global.__esState;
// Create HTTP server (so we can also handle register & POST endpoints)
var server = (0, http_1.createServer)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var url, body_1, token, key, tokenHash_1, body_2;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                // Add CORS headers
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                // Handle preflight
                if (req.method === 'OPTIONS') {
                    res.writeHead(204);
                    res.end();
                    return [2 /*return*/];
                }
                if (!req.url)
                    return [2 /*return*/];
                url = new URL(req.url, "http://".concat(req.headers.host));
                // Register endpoint: /register?key=abc
                if (req.method === "POST" && url.pathname === "/register") {
                    body_1 = "";
                    req.on("data", function (chunk) { return (body_1 += chunk); });
                    req.on("end", function () { return __awaiter(void 0, void 0, void 0, function () {
                        var key, existing, token, tokenHash, _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 2, , 3]);
                                    key = JSON.parse(body_1).key;
                                    if (!key || typeof key !== "string") {
                                        res.writeHead(400);
                                        res.end(JSON.stringify({ error: "Missing or invalid 'key'" }));
                                        return [2 /*return*/];
                                    }
                                    existing = state.stringToRawToken.get(key);
                                    if (existing) {
                                        res.writeHead(200, { "Content-Type": "application/json" });
                                        res.end(JSON.stringify({ token: existing, reused: true }));
                                        return [2 /*return*/];
                                    }
                                    token = generateToken();
                                    return [4 /*yield*/, hashToken(token)];
                                case 1:
                                    tokenHash = _b.sent();
                                    state.stringToToken.set(key, tokenHash);
                                    state.stringToRawToken.set(key, token);
                                    res.writeHead(200, { "Content-Type": "application/json" });
                                    res.end(JSON.stringify({ token: token, reused: false }));
                                    return [3 /*break*/, 3];
                                case 2:
                                    _a = _b.sent();
                                    res.writeHead(400);
                                    res.end(JSON.stringify({ error: "Invalid JSON" }));
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    return [2 /*return*/];
                }
                if (!(req.method === "GET" && url.pathname === "/stream")) return [3 /*break*/, 4];
                token = url.searchParams.get("token");
                key = url.searchParams.get("key");
                tokenHash_1 = null;
                if (!token) return [3 /*break*/, 2];
                return [4 /*yield*/, hashToken(token)];
            case 1:
                tokenHash_1 = _b.sent();
                return [3 /*break*/, 3];
            case 2:
                if (key)
                    tokenHash_1 = (_a = state.stringToToken.get(key)) !== null && _a !== void 0 ? _a : null;
                _b.label = 3;
            case 3:
                if (!tokenHash_1) {
                    res.writeHead(401);
                    res.end(JSON.stringify({ error: "Missing or invalid 'key'" }));
                    return [2 /*return*/];
                }
                // Set headers for EventSource (SSE)
                res.writeHead(200, {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                });
                res.write("data: {\"type\": \"connected\", \"token\": \"".concat(tokenHash_1, "\"}\n\n"));
                // Store the stream in the map
                state.tokenToStream.set(tokenHash_1, res);
                req.on("close", function () {
                    state.tokenToStream.delete(tokenHash_1);
                    res.end();
                });
                return [2 /*return*/];
            case 4:
                // Log send endpoint: /send?token=xxx
                if (req.method === "POST" && url.pathname === "/log") {
                    body_2 = "";
                    req.on("data", function (chunk) { return (body_2 += chunk); });
                    req.on("end", function () { return __awaiter(void 0, void 0, void 0, function () {
                        var token, key, delivered, tokenHash, stream, payload;
                        var _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    token = url.searchParams.get("token");
                                    key = url.searchParams.get("key");
                                    delivered = false;
                                    tokenHash = null;
                                    if (!token) return [3 /*break*/, 2];
                                    return [4 /*yield*/, hashToken(token)];
                                case 1:
                                    tokenHash = _b.sent();
                                    return [3 /*break*/, 3];
                                case 2:
                                    if (key)
                                        tokenHash = (_a = state.stringToToken.get(key)) !== null && _a !== void 0 ? _a : null;
                                    _b.label = 3;
                                case 3:
                                    if (!tokenHash) {
                                        res.writeHead(401);
                                        res.end(JSON.stringify({ error: "Missing or invalid token/key" }));
                                        return [2 /*return*/];
                                    }
                                    stream = state.tokenToStream.get(tokenHash);
                                    payload = JSON.stringify({ type: "log", data: body_2 ? JSON.parse(body_2) : {} });
                                    console.log(payload);
                                    if (stream) {
                                        try {
                                            stream.write("data: ".concat(payload, "\n\n"));
                                            delivered = true;
                                        }
                                        catch (_c) {
                                            state.tokenToStream.delete(tokenHash);
                                        }
                                    }
                                    res.writeHead(200, { "Content-Type": "application/json" });
                                    res.end(JSON.stringify({ ok: true, delivered: delivered, reason: "no_active_socket" }));
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    return [2 /*return*/];
                }
                res.writeHead(404);
                res.end("Not found");
                return [2 /*return*/];
        }
    });
}); });
// Start server
var PORT = 4000;
server.listen(PORT, function () {
    console.log("Server running at http://localhost:".concat(PORT));
});
