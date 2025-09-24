// lib/cors.ts
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function okJSON<T>(body: T, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders, ...extra },
  });
}

export function badJSON(message: string, code = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status: code,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export function noContent() {
  return new Response(null, { status: 204, headers: corsHeaders });
}