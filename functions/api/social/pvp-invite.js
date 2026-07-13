import { requireUser } from "../_auth.js";
import { dbFirst, dbRun, getDb, handleOptions, json, nowMs, readJson } from "../_db.js";
import { clampUid } from "../_uid.js";

const TTL_MS = 24 * 60 * 60 * 1000;

function normalizeTeamData(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const m of arr.slice(0, 6)) {
    if (!m || typeof m !== "object") continue;
    const name = typeof m.name === "string" ? m.name.slice(0, 32) : "";
    if (!name) continue;
    const hp = Math.max(1, Math.min(9999, Math.floor(Number(m.hp) || 100)));
    const attack = Math.max(1, Math.min(9999, Math.floor(Number(m.attack) || 50)));
    const defense = Math.max(1, Math.min(9999, Math.floor(Number(m.defense) || 50)));
    const speed = Math.max(1, Math.min(9999, Math.floor(Number(m.speed) || 50)));
    const level = Math.max(1, Math.min(100, Math.floor(Number(m.level) || 1)));
    const types = Array.isArray(m.types) ? m.types.filter((t) => typeof t === "string").slice(0, 2) : [];
    out.push({
      id: typeof m.id === "number" ? m.id : undefined,
      name,
      dex: typeof m.dex === "number" ? Math.floor(m.dex) : 0,
      isShiny: Boolean(m.isShiny),
      level,
      hp,
      attack,
      defense,
      speed,
      types,
      stats: { hp, atk: attack, def: defense, spe: speed },
    });
  }
  return out;
}

export async function onRequest(context) {
  const req = context.request;
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405, req });

  const db = getDb(context.env);
  const user = await requireUser(db, req);
  if (!user) return json({ error: "unauthorized" }, { status: 401, req });

  const body = await readJson(req);
  const fromUid = user.uid;
  const toUid = clampUid(body?.toUid);
  const teamData = normalizeTeamData(body?.teamData);
  if (!toUid || toUid === fromUid) return json({ error: "bad request" }, { status: 400, req });
  if (teamData.length < 1) return json({ error: "empty team" }, { status: 400, req });

  const friendship = await dbFirst(
    db,
    `SELECT id FROM friends WHERE (uid1 = ? AND uid2 = ?) OR (uid1 = ? AND uid2 = ?)`,
    [fromUid, toUid, toUid, fromUid]
  );
  if (!friendship) return json({ error: "not friends" }, { status: 403, req });

  const now = nowMs();
  await dbRun(
    db,
    "INSERT INTO pvp_invites(from_uid, to_uid, status, team_data, created_at, expires_at) VALUES(?, ?, 'pending', ?, ?, ?)",
    [fromUid, toUid, JSON.stringify(teamData), now, now + TTL_MS]
  );
  return json({ ok: true }, { req });
}
