type Controller = {
  controller: ReadableStreamDefaultController<string>;
  heartbeat: ReturnType<typeof setInterval>;
};

interface EventSourceState {
  stringToToken: Map<string, string>;
  stringToRawToken: Map<string, string>;
  tokenToController: Map<string, Controller>;
}

// Global singleton across route modules (within the same runtime instance)
const g = globalThis as unknown as { __esState?: EventSourceState };

if (!g.__esState) {
  g.__esState = {
    stringToToken: new Map(),
    stringToRawToken: new Map(),
    tokenToController: new Map(),
  };
}

export const state = g.__esState;

// small helper to format SSE frames
export function sse(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}