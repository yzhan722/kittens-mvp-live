// Auth helpers: PBKDF2 password hash + Bearer sessions
import { dbFirst, dbRun, nowMs } from "./_db.js";
import { clampStr } from "./_uid.js";

const PBKDF2_ITERS = 100000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

function b64(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const enc = new TextEncoder().encode(String(password || ""));
  const key = await crypto.subtle.importKey("raw", enc, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERS },
    key,
    KEY_BYTES * 8
  );
  return `pbkdf2$${PBKDF2_ITERS}$${b64(salt)}$${b64(bits)}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iters = Number(parts[1]);
  if (!Number.isFinite(iters) || iters < 1000) return false;
  const salt = fromB64(parts[2]);
  const expect = fromB64(parts[3]);
  const enc = new TextEncoder().encode(String(password || ""));
  const key = await crypto.subtle.importKey("raw", enc, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: iters },
    key,
    expect.length * 8
  );
  const got = new Uint8Array(bits);
  if (got.length !== expect.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ expect[i];
  return diff === 0;
}

export function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function newUid() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function bearerToken(req) {
  const h = req.headers.get("Authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? clampStr(m[1], 256) : "";
}

// ponytail: 90d TTL via created_at only — no schema migration; upgrade = expires_at column if need revoke-before-TTL
export const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export function isSessionExpired(createdAt, now = nowMs()) {
  const t = Number(createdAt);
  if (!Number.isFinite(t) || t <= 0) return true;
  return now - t > SESSION_TTL_MS;
}

export async function requireUser(db, req) {
  const token = bearerToken(req);
  if (!token) return null;
  const row = await dbFirst(
    db,
    `SELECT u.id, u.uid, u.username, s.created_at AS sessionCreatedAt
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`,
    [token]
  );
  if (!row) return null;
  if (isSessionExpired(row.sessionCreatedAt)) {
    await destroySession(db, token);
    return null;
  }
  return { id: row.id, uid: row.uid, username: row.username };
}

export async function createSession(db, userId) {
  const token = newToken();
  await dbRun(db, "INSERT INTO sessions(token, user_id, created_at) VALUES(?, ?, ?)", [
    token,
    userId,
    nowMs(),
  ]);
  return token;
}

export async function destroySession(db, token) {
  if (!token) return;
  await dbRun(db, "DELETE FROM sessions WHERE token = ?", [token]);
}
