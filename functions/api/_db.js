// Shared D1 / HTTP helpers for Pages Functions
export function corsHeaders(req) {
  const origin = req?.headers?.get?.("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin === "null" ? "*" : origin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function json(data, { status = 200, req = null } = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(req),
    },
  });
}

export function noContent({ req = null } = {}) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export function methodNotAllowed(req) {
  return json({ error: "method not allowed" }, { status: 405, req });
}

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function getDb(env) {
  const db = env?.DB;
  if (!db) throw new Error("DB binding missing");
  return db;
}

export async function dbFirst(db, sql, binds = []) {
  const stmt = db.prepare(sql);
  const row = binds.length ? await stmt.bind(...binds).first() : await stmt.first();
  return row || null;
}

export async function dbAll(db, sql, binds = []) {
  const stmt = db.prepare(sql);
  const res = binds.length ? await stmt.bind(...binds).all() : await stmt.all();
  return Array.isArray(res?.results) ? res.results : [];
}

export async function dbRun(db, sql, binds = []) {
  const stmt = db.prepare(sql);
  return binds.length ? await stmt.bind(...binds).run() : await stmt.run();
}

export function nowMs() {
  return Date.now();
}

export function handleOptions(req) {
  if (req.method === "OPTIONS") return noContent({ req });
  return null;
}
