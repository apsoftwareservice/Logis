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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
// ws-server.ts
var http_1 = require("http");
var ws_1 = require("ws");
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
if (!global.__wsState) {
    global.__wsState = {
        clients: new Set(),
        stringToToken: new Map(),
        stringToRawToken: new Map(),
        tokenToSocket: new Map(),
    };
}
var state = global.__wsState;
// Create HTTP server (so we can also handle register & POST endpoints)
var server = (0, http_1.createServer)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var url, body_1, body_2;
    return __generator(this, function (_a) {
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
        // Log send endpoint: /send?token=xxx
        if (req.method === "POST" && url.pathname === "/send") {
            body_2 = "";
            req.on("data", function (chunk) { return (body_2 += chunk); });
            req.on("end", function () { return __awaiter(void 0, void 0, void 0, function () {
                var token, key, tokenHash, ws, payload;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            token = url.searchParams.get("token");
                            key = url.searchParams.get("key");
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
                            ws = state.tokenToSocket.get(tokenHash);
                            payload = JSON.stringify({ type: "log", data: body_2 ? JSON.parse(body_2) : {} });
                            if (ws) {
                                try {
                                    ws.send(payload);
                                    res.writeHead(200, { "Content-Type": "application/json" });
                                    res.end(JSON.stringify({ ok: true, delivered: true }));
                                }
                                catch (_c) {
                                    ws.close();
                                    state.clients.delete(ws);
                                    state.tokenToSocket.delete(tokenHash);
                                    res.writeHead(200, { "Content-Type": "application/json" });
                                    res.end(JSON.stringify({ ok: true, delivered: false, reason: "socket_error" }));
                                }
                            }
                            else {
                                res.writeHead(200, { "Content-Type": "application/json" });
                                res.end(JSON.stringify({ ok: true, delivered: false, reason: "no_active_socket" }));
                            }
                            return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        }
        res.writeHead(404);
        res.end("Not found");
        return [2 /*return*/];
    });
}); });
// Attach WebSocket server
var wss = new ws_1.WebSocketServer({ server: server });
wss.on("connection", function (socket, req) { return __awaiter(void 0, void 0, void 0, function () {
    var url, token, tokenHash, authorized, alive, interval;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                url = new URL(req.url || "", "http://".concat(req.headers.host));
                token = url.searchParams.get("token");
                if (!token) {
                    socket.close(1008, "Missing token");
                    return [2 /*return*/];
                }
                return [4 /*yield*/, hashToken(token)];
            case 1:
                tokenHash = _a.sent();
                authorized = Array.from(state.stringToToken.values()).includes(tokenHash);
                if (!authorized) {
                    socket.close(1008, "Invalid token");
                    return [2 /*return*/];
                }
                state.clients.add(socket);
                state.tokenToSocket.set(tokenHash, socket);
                alive = true;
                interval = setInterval(function () {
                    if (!alive) {
                        socket.terminate();
                        clearInterval(interval);
                        return;
                    }
                    alive = false;
                    socket.ping();
                }, 30000);
                socket.on("pong", function () {
                    alive = true;
                });
                socket.on("message", function (msg) {
                    alive = true;
                    console.log("Client message:", msg.toString());
                });
                socket.on("close", function () {
                    var e_1, _a;
                    clearInterval(interval);
                    state.clients.delete(socket);
                    try {
                        for (var _b = __values(state.tokenToSocket.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var _d = __read(_c.value, 2), tk = _d[0], ws = _d[1];
                            if (ws === socket)
                                state.tokenToSocket.delete(tk);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                });
                socket.on("error", function () {
                    var e_2, _a;
                    clearInterval(interval);
                    state.clients.delete(socket);
                    try {
                        for (var _b = __values(state.tokenToSocket.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var _d = __read(_c.value, 2), tk = _d[0], ws = _d[1];
                            if (ws === socket)
                                state.tokenToSocket.delete(tk);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                });
                return [2 /*return*/];
        }
    });
}); });
// Start server
var PORT = 4000;
server.listen(PORT, function () {
    console.log("WebSocket server running at http://localhost:".concat(PORT));
});
