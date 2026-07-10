export function clampStr(v, maxLen) {
  const s = typeof v === "string" ? v : String(v ?? "");
  return s.trim().slice(0, maxLen);
}

export function clampUid(v) {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, 128);
  return s || null;
}

export function clampName(v) {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, 32) : "训练家";
}

export function clampUsername(v) {
  const s = clampStr(v, 32);
  if (!s || s.length < 2) return null;
  if (!/^[a-zA-Z0-9_\u4e00-\u9fff.-]+$/.test(s)) return null;
  return s;
}

export function intOr(v, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}
